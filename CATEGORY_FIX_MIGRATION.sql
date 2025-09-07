-- Migration script để sửa category encoding issue
-- Chuyển từ category có dấu sang không dấu

-- 1. Tạo bảng tạm để backup
CREATE TABLE IF NOT EXISTS questions_backup AS SELECT * FROM questions;

-- 2. Alter table để đổi ENUM values
ALTER TABLE questions MODIFY COLUMN category ENUM('khoidong', 'vuotchuongngaivat', 'tangtoc', 'vedich') DEFAULT 'khoidong';

-- 3. Update existing data
UPDATE questions SET category = 'khoidong' WHERE category IN ('Khởi Động', 'geography', 'general');
UPDATE questions SET category = 'vuotchuongngaivat' WHERE category IN ('Vượt Chướng Ngại Vật', 'programming', 'technology');
UPDATE questions SET category = 'tangtoc' WHERE category IN ('Tăng Tốc', 'web', 'database', 'networking');
UPDATE questions SET category = 'vedich' WHERE category IN ('Về Đích', 'hardware', 'mobile', 'development');

-- 4. Set default cho NULL values
UPDATE questions SET category = 'khoidong' WHERE category IS NULL OR category = '';

-- 5. Verify migration
SELECT category, COUNT(*) as count FROM questions GROUP BY category;

-- Note: Nếu migration thành công, có thể xóa backup table:
-- DROP TABLE questions_backup;
