-- Migration để thêm hỗ trợ chế độ Tăng Tốc
USE nqd_database;

-- Thêm cột question_number vào bảng questions để lưu số câu hỏi (1,2,3,4)
ALTER TABLE questions ADD COLUMN question_number INT NULL AFTER category;

-- Thêm cột image_url vào bảng questions để lưu link ảnh
ALTER TABLE questions ADD COLUMN image_url TEXT NULL AFTER answer;

-- Thêm cột time_limit vào bảng questions để lưu thời gian cho mỗi câu hỏi Tăng Tốc
ALTER TABLE questions ADD COLUMN time_limit INT NULL AFTER difficulty;

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

-- Tạo index để tối ưu truy vấn câu hỏi Tăng Tốc
CREATE INDEX idx_questions_tangtoc ON questions(category, question_number);
