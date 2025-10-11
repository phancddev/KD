-- Migration: Thêm cột avatar vào bảng users
-- Date: 2025-10-10
-- Description: Thêm cột avatar để lưu đường dẫn ảnh đại diện của user

USE nqd_database;

-- Thêm cột avatar nếu chưa tồn tại
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT NULL 
COMMENT 'Đường dẫn ảnh đại diện của user';

-- Tạo thư mục uploads/avatars nếu chưa có (sẽ được tạo bởi Node.js)
-- Cấu trúc: /uploads/avatars/{user_id}/{filename}

SELECT 'Migration completed: Added avatar column to users table' AS status;

