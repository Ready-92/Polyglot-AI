import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import net from 'net';
import aiRoutes from './routes/ai.routes.js';

// Nạp biến môi trường từ file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/ai', aiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'PolyglotAI Backend is running!' });
});

// Kiểm tra port trước, nếu bận → giải phóng rồi start
const startServer = (port, retries = 3) => {
    const server = app.listen(port, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
            console.warn(`⚠️ Cổng ${port} đang được dùng. Thử giải phóng...`);
            // Kill process giữ port rồi thử lại
            const killer = net.createServer(s => s.end());
            killer.listen(port, () => {
                killer.close(() => {
                    console.log(`✅ Đã giải phóng cổng ${port}. Thử lại...`);
                    startServer(port, retries - 1);
                });
            });
            killer.on('error', () => {
                // Không kill được → tăng port
                console.warn(`⚠️ Chuyển sang cổng ${port + 1}`);
                startServer(port + 1, 0);
            });
        } else {
            console.error('❌ Lỗi server:', err.message);
            process.exit(1);
        }
    });

    // Graceful shutdown
    const shutdown = (signal) => {
        console.log(`\n📴 Nhận ${signal}. Đóng server...`);
        server.close(() => {
            console.log('✅ Server đã dừng.');
            process.exit(0);
        });
        // Force close sau 5s
        setTimeout(() => process.exit(1), 5000);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer(PORT);
