import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// ==================== DeepSeek Client (dùng cho text tasks) ====================
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';

const callDeepSeek = async (prompt) => {
    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('Chưa cấu hình DEEPSEEK_API_KEY trong file .env');
    }
    const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `DeepSeek API error ${res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
};

// ==================== Gemini Client (chỉ dùng cho audio) ====================
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Hàm gửi tin nhắn văn bản (dùng DeepSeek)
 */
export const generateResponse = async (prompt) => {
    try {
        return await callDeepSeek(prompt);
    } catch (error) {
        console.error('Lỗi khi gọi DeepSeek:', error.message);
        throw error;
    }
};

/**
 * Hàm gửi audio cho Gemini xử lý (STT + phản hồi)
 * DeepSeek không hỗ trợ audio → giữ Gemini
 */
export const generateResponseFromAudio = async (audioBuffer, mimeType, promptText) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env');
        }

        const formattedMimeType = mimeType === 'audio/m4a' ? 'audio/mp4' : mimeType;

        const response = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    inlineData: {
                        data: audioBuffer.toString("base64"),
                        mimeType: formattedMimeType
                    }
                },
                promptText
            ]
        });

        return response.text;
    } catch (error) {
        console.error('Lỗi khi gửi Audio cho Gemini:', error.message);
        throw error;
    }
};

/**
 * Hàm sinh câu hỏi quiz hàng loạt (1 API call cho cả bài học)
 * @param {string[]} words - Tất cả từ trong bài
 * @param {string} language - Ngôn ngữ đích
 * @param {string} baseLanguage - Ngôn ngữ mẹ đẻ
 * @returns {Object} - Map: { [word]: { correctAnswer, options, correctIndex } }
 */
export const generateBatchQuiz = async (words, language, baseLanguage) => {
    try {
        const wordList = words.join('", "');
        const prompt = `Bạn là trợ lý học ngôn ngữ. Dịch TẤT CẢ các từ sau từ ${language} sang ${baseLanguage}.

Trả về CHỈ một object JSON (không markdown, không giải thích) với format:
{
  "translations": {
    "từ_gốc_1": "bản_dịch_1",
    "từ_gốc_2": "bản_dịch_2",
    ...
  }
}

Danh sách từ cần dịch: ["${wordList}"]`;

        const text = await callDeepSeek(prompt);
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        const translations = parsed.translations || {};

        // Với mỗi từ, sinh quiz từ bản dịch + đáp án sai
        const result = {};
        for (const word of words) {
            const correctAnswer = translations[word] || `[?] ${word}`;
            const otherWords = words.filter(w => w !== word);
            // Lấy bản dịch của 3 từ khác làm đáp án sai
            const wrongOptions = [];
            for (const other of otherWords) {
                if (wrongOptions.length >= 3) break;
                const translated = translations[other];
                if (translated && translated !== correctAnswer) {
                    wrongOptions.push(translated);
                }
            }
            // Đệm thêm nếu thiếu
            while (wrongOptions.length < 3) {
                wrongOptions.push(`[?] ${otherWords[wrongOptions.length] || '...'}`);
            }

            const options = [correctAnswer, ...wrongOptions];
            // Fisher-Yates shuffle
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }
            const correctIndex = options.indexOf(correctAnswer);

            result[word] = { correctAnswer, options, correctIndex };
        }

        return result;
    } catch (error) {
        console.error('Lỗi khi sinh batch quiz:', error.message);
        throw error;
    }
};

/**
 * @deprecated Dùng generateBatchQuiz thay cho hiệu suất
 */
export const generateQuiz = async (word, language, baseLanguage, allWords) => {
    try {
        const otherWords = allWords.filter(w => w !== word);
        const prompt = `Bạn là trợ lý học ngôn ngữ. Dịch từ "${word}" từ ${language} sang ${baseLanguage}.

Trả về CHỈ một object JSON (không markdown, không giải thích):
{
  "correctAnswer": "<bản dịch sang ${baseLanguage}>",
  "wrongOptions": ["<đáp án sai 1>", "<đáp án sai 2>", "<đáp án sai 3>"]
}

Quy tắc đáp án sai:
- Lấy từ danh sách sau: [${otherWords.join(', ')}]
- Dịch 3 từ bất kỳ trong danh sách sang ${baseLanguage} làm đáp án sai
- Đáp án sai phải khác đáp án đúng, khác nhau
- Nếu danh sách từ có ít hơn 3 từ, tự nghĩ thêm đáp án sai hợp lý`;

        const text = await callDeepSeek(prompt);
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        const options = [parsed.correctAnswer, ...(parsed.wrongOptions || [])];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        const correctIndex = options.indexOf(parsed.correctAnswer);

        return {
            correctAnswer: parsed.correctAnswer,
            options,
            correctIndex,
        };
    } catch (error) {
        console.error('Lỗi khi sinh quiz:', error.message);
        throw error;
    }
};
