import { generateResponse, generateResponseFromAudio, generateBatchQuiz } from '../services/llmService.js';

export const handleVoiceChat = async (req, res) => {
    try {
        const audioFile = req.file; // Buffer âm thanh gửi từ điện thoại
        const mode = req.body.mode || 'tutor'; // Lấy chế độ từ Frontend
        const language = req.body.language || 'Tiếng Anh'; // Lấy ngôn ngữ đang học
        const baseLanguage = req.body.baseLanguage || 'Tiếng Việt'; // Lấy ngôn ngữ giải thích

        if (!audioFile) {
            return res.status(400).json({ error: 'Không tìm thấy file audio trong request' });
        }

        console.log('Nhận được file audio:', audioFile.originalname, 'mimetype:', audioFile.mimetype, 'Mode:', mode, 'Lang:', language);

        // Chuyển âm thanh trực tiếp cho Gemini xử lý
        let prompt = "";
        
        if (mode === 'conversation') {
            prompt = `Bạn là trợ lý trò chuyện ngôn ngữ.

[BƯỚC 1 - PHÁT HIỆN NGÔN NGỮ]
Lắng nghe đoạn audio. Xác định ngôn ngữ người dùng đang nói.

[BƯỚC 2 - KIỂM TRA]
Ngôn ngữ học viên ĐÃ CHỌN để luyện tập: ${language}.
Ngôn ngữ mẹ đẻ của học viên: ${baseLanguage}.

Nếu người dùng nói bằng ${baseLanguage} (ngôn ngữ mẹ đẻ): KHÔNG SAO, trả lời bình thường bằng ${language} để khuyến khích họ chuyển sang ${language}. Không cảnh báo.

Nếu người dùng nói bằng MỘT NGÔN NGỮ KHÁC không phải ${language} và không phải ${baseLanguage} (ví dụ: họ chọn học Tiếng Anh nhưng lại nói Tiếng Trung):
- Phản hồi BẰNG ${baseLanguage}.
- Dòng đầu tiên PHẢI LÀ: "⚠️ Có vẻ bạn đang nói [TÊN NGÔN NGỮ]. Bạn đã chọn học ${language}. Bạn có muốn chuyển sang học [TÊN NGÔN NGỮ] không?"
- Sau đó giải thích ngắn gọn bằng ${baseLanguage}.

Nếu người dùng nói đúng bằng ${language}: Trò chuyện tự nhiên, thân thiện bằng ${language}. Phản hồi ngắn gọn.`;

        } else {
            // Chế độ Tutor
            prompt = `Bạn là giáo viên ngôn ngữ chuyên nghiệp.

[BƯỚC 1 - PHÁT HIỆN NGÔN NGỮ]
Lắng nghe đoạn audio của học viên. Xác định ngôn ngữ họ đang nói.

[BƯỚC 2 - KIỂM TRA SAI NGÔN NGỮ]
Ngôn ngữ học viên ĐÃ CHỌN để học: ${language}.
Ngôn ngữ giải thích (base): ${baseLanguage}.

Nếu học viên nói bằng ${baseLanguage}: Bình thường. Họ đang hỏi bằng tiếng mẹ đẻ. Trả lời như giáo viên bình thường.

Nếu học viên nói bằng MỘT NGÔN NGỮ KHÁC không phải ${language} và không phải ${baseLanguage}:
- Phản hồi BẰNG ${baseLanguage}.
- Dòng đầu tiên PHẢI LÀ: "⚠️ Cảnh báo: Tôi phát hiện bạn đang nói [TÊN NGÔN NGỮ]. Nhưng bạn đã chọn học ${language}. Vui lòng chuyển sang ${language} để tiếp tục bài học, hoặc đổi ngôn ngữ học trong menu."
- KHÔNG dạy hay sửa lỗi. Chỉ cảnh báo.

Nếu học viên nói đúng bằng ${language}:
- Giải thích, nhận xét, hướng dẫn HOÀN TOÀN bằng ${baseLanguage}.
- Chỉ ra lỗi sai (nếu có), sửa đúng, giải thích bằng ${baseLanguage}.
- Đưa câu hỏi/câu giao tiếp tiếp theo bằng ${language} để họ thực hành.
- Phần giải nghĩa với tư cách giáo viên: dùng ${baseLanguage}.`;
        }
        
        const aiResponseText = await generateResponseFromAudio(
            audioFile.buffer,
            audioFile.mimetype,
            prompt
        );

        console.log(`AI Response (${mode}): ${aiResponseText}`);

        // Phát hiện cảnh báo sai ngôn ngữ từ response
        const languageMismatch = aiResponseText.startsWith('⚠️');

        // TODO: Text-to-Speech (TTS) - Chuyển câu trả lời của AI thành giọng nói (Sau này)
        const aiAudioBase64 = null;

        res.status(200).json({
            userText: "(Bản ghi âm)",
            aiText: aiResponseText,
            aiAudio: aiAudioBase64,
            languageMismatch,
        });

    } catch (error) {
        console.error('Lỗi trong quá trình voice chat:', error.message);
        const isQuotaError = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota');
        if (isQuotaError) {
            res.status(429).json({
                error: 'Hết quota Gemini hôm nay (20 req/ngày). Vui lòng dùng chat văn bản hoặc thử lại vào ngày mai.',
                retryAfter: 'tomorrow',
            });
        } else {
            res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống' });
        }
    }
};

/**
 * API Chat văn bản (dùng DeepSeek)
 */
export const handleTextChat = async (req, res) => {
    try {
        const { text, mode, language, baseLanguage } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Thiếu nội dung tin nhắn' });
        }

        let prompt;
        if (mode === 'tutor') {
            prompt = `Bạn là giáo viên ngôn ngữ. Học viên đang học ${language}, giải thích bằng ${baseLanguage}.

Học viên nói: "${text}"

Hãy:
1. Nếu có lỗi sai → chỉ ra, sửa đúng, giải thích bằng ${baseLanguage}
2. Trả lời câu hỏi hoặc đưa câu hỏi tiếp theo bằng ${language}
3. Phần giải thích giáo viên: dùng ${baseLanguage}

Nếu học viên nói bằng ngôn ngữ không phải ${language}: cảnh báo nhẹ nhàng.`;
        } else {
            prompt = `Trò chuyện tự nhiên, thân thiện với học viên đang học ${language}. Học viên nói: "${text}". Phản hồi ngắn gọn, chủ yếu bằng ${language}.`;
        }

        const aiText = await generateResponse(prompt); // DeepSeek

        res.status(200).json({ aiText });
    } catch (error) {
        console.error('Lỗi text chat:', error.message);
        res.status(500).json({ error: 'Lỗi xử lý tin nhắn' });
    }
};

export const explainGrammar = async (req, res) => {
    try {
        const { sentence, languageContext } = req.body;

        if (!sentence) {
            return res.status(400).json({ error: 'Vui lòng cung cấp câu cần giải thích' });
        }

        const prompt = `Giải thích ngữ pháp và từ vựng trong câu sau (${languageContext || 'Tiếng Anh'}): "${sentence}". Viết ngắn gọn, dễ hiểu.`;
        const explanation = await generateResponse(prompt);

        res.status(200).json({ explanation });
    } catch (error) {
        console.error('Lỗi khi giải thích ngữ pháp:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống' });
    }
};

/**
 * API sinh câu hỏi quiz cho TOÀN BỘ bài học (1 API call)
 */
export const handleQuiz = async (req, res) => {
    try {
        const { words, language, baseLanguage } = req.body;

        if (!words || !Array.isArray(words) || words.length === 0 || !language || !baseLanguage) {
            return res.status(400).json({ error: 'Thiếu words (mảng), language hoặc baseLanguage' });
        }

        console.log(`Batch Quiz: ${words.length} từ (${language} → ${baseLanguage})`);

        const quizMap = await generateBatchQuiz(words, language, baseLanguage);

        res.status(200).json({ quizMap });
    } catch (error) {
        console.error('Lỗi khi tạo quiz:', error);
        res.status(500).json({ error: 'Không thể tạo câu hỏi. Vui lòng thử lại.' });
    }
};
