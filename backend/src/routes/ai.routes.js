import express from 'express';
import multer from 'multer';
import { handleVoiceChat, explainGrammar, handleQuiz, handleTextChat } from '../controllers/ai.controller.js';

const router = express.Router();

// Cấu hình multer để xử lý file upload (nhận file audio từ mobile)
// Sử dụng bộ nhớ đệm (memoryStorage) để không cần lưu file cứng, truyền thẳng buffer cho API
const upload = multer({ storage: multer.memoryStorage() });

// 1. API Trò chuyện Voice-to-Voice
// Route này nhận vào 1 file âm thanh (audio) và trả về text + file âm thanh phản hồi
router.post('/voice-chat', upload.single('audio'), handleVoiceChat);

// 2. API Giải thích Ngữ pháp / Dịch thuật
router.post('/explain', explainGrammar);

// 3. API sinh câu hỏi quiz cho từ vựng
router.post('/quiz', handleQuiz);

// 4. API Chat văn bản (dùng DeepSeek)
router.post('/chat', handleTextChat);

export default router;
