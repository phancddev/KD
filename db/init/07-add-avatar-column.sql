-- Migration: Thêm cột avatar vào bảng users
-- Date: 2025-10-10
-- Description: Thêm cột avatar để lưu đường dẫn ảnh đại diện của user

USE nqd_database;

-- Kiểm tra và thêm cột avatar nếu chưa tồn tại
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'nqd_database'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'avatar';

SET @query = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT NULL COMMENT "Đường dẫn ảnh đại diện của user"',
    'SELECT "Column avatar already exists" AS status');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Log kết quả
SELECT 'Migration 07: Checked and added avatar column to users table' AS status;

