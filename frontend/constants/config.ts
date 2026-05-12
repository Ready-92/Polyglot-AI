/**
 * Cấu hình môi trường cho Frontend
 * Thay đổi EXPO_PUBLIC_API_URL trong .env để trỏ đến backend của bạn
 */

// Dùng biến môi trường Expo (tiền tố EXPO_PUBLIC_ để lộ ra client-side)
// Fallback về localhost:3000 nếu chưa set
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Thời gian timeout cho API call (ms)
export const API_TIMEOUT = 15000;
