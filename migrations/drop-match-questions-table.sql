-- Migration: Drop match_questions table
-- Date: 2025-10-08
-- Reason: Tất cả dữ liệu câu hỏi giờ lưu trong match.json trên data node

-- Backup table trước khi xóa (optional)
CREATE TABLE IF NOT EXISTS match_questions_backup AS 
SELECT * FROM match_questions;

-- Xóa bảng match_questions
DROP TABLE IF EXISTS match_questions;

-- Verify
SELECT 'match_questions table dropped successfully' AS status;

