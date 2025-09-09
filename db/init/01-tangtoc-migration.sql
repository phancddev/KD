-- Migration để thêm hỗ trợ chế độ Tăng Tốc
USE nqd_database;

-- Thêm cột question_number vào bảng questions để lưu số câu hỏi (1,2,3,4)
-- Sử dụng IF NOT EXISTS để tránh lỗi nếu cột đã tồn tại
SET @sql = 'ALTER TABLE questions ADD COLUMN question_number INT NULL AFTER category';
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'nqd_database' 
    AND TABLE_NAME = 'questions' 
    AND COLUMN_NAME = 'question_number') = 0, @sql, 'SELECT "Column question_number already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Thêm cột image_url vào bảng questions để lưu link ảnh
SET @sql = 'ALTER TABLE questions ADD COLUMN image_url TEXT NULL AFTER answer';
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'nqd_database' 
    AND TABLE_NAME = 'questions' 
    AND COLUMN_NAME = 'image_url') = 0, @sql, 'SELECT "Column image_url already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Thêm cột time_limit vào bảng questions để lưu thời gian cho mỗi câu hỏi Tăng Tốc
SET @sql = 'ALTER TABLE questions ADD COLUMN time_limit INT NULL AFTER difficulty';
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'nqd_database' 
    AND TABLE_NAME = 'questions' 
    AND COLUMN_NAME = 'time_limit') = 0, @sql, 'SELECT "Column time_limit already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cập nhật time_limit cho các câu hỏi Tăng Tốc hiện có
UPDATE questions 
SET time_limit = CASE 
    WHEN question_number = 1 THEN 10
    WHEN question_number = 2 THEN 20
    WHEN question_number = 3 THEN 30
    WHEN question_number = 4 THEN 40
    ELSE NULL
END
WHERE category = 'tangtoc' AND question_number IS NOT NULL;

-- Tạo index để tối ưu truy vấn câu hỏi Tăng Tốc (nếu chưa tồn tại)
SET @sql = 'CREATE INDEX idx_questions_tangtoc ON questions(category, question_number)';
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'nqd_database' 
    AND TABLE_NAME = 'questions' 
    AND INDEX_NAME = 'idx_questions_tangtoc') = 0, @sql, 'SELECT "Index idx_questions_tangtoc already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
