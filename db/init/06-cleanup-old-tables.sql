-- Migration: Xóa các bảng cũ không còn sử dụng
-- Version: 2.1.0
-- Date: 2025-10-08
-- Description: Xóa các bảng lưu dữ liệu trận đấu trong KD Server
--              Theo nguyên tắc mới: TẤT CẢ dữ liệu trận đấu phải nằm ở Data Node
--              KD Server CHỈ lưu metadata mapping (match_id → data_node_id)

-- Disable foreign key checks tạm thời
SET FOREIGN_KEY_CHECKS = 0;

-- Backup các bảng trước khi xóa (để phòng trường hợp cần rollback)
CREATE TABLE IF NOT EXISTS match_questions_backup_20251008 AS SELECT * FROM match_questions WHERE 1=0;
CREATE TABLE IF NOT EXISTS match_participants_backup_20251008 AS SELECT * FROM match_participants WHERE 1=0;
CREATE TABLE IF NOT EXISTS match_results_backup_20251008 AS SELECT * FROM match_results WHERE 1=0;
CREATE TABLE IF NOT EXISTS match_answers_backup_20251008 AS SELECT * FROM match_answers WHERE 1=0;
CREATE TABLE IF NOT EXISTS match_upload_logs_backup_20251008 AS SELECT * FROM match_upload_logs WHERE 1=0;

-- Backup dữ liệu nếu có
INSERT IGNORE INTO match_questions_backup_20251008 SELECT * FROM match_questions;
INSERT IGNORE INTO match_participants_backup_20251008 SELECT * FROM match_participants;
INSERT IGNORE INTO match_results_backup_20251008 SELECT * FROM match_results;
INSERT IGNORE INTO match_answers_backup_20251008 SELECT * FROM match_answers;
INSERT IGNORE INTO match_upload_logs_backup_20251008 SELECT * FROM match_upload_logs;

-- Xóa các bảng không còn sử dụng
-- Lý do: Dữ liệu này giờ lưu trong match.json trên Data Node
DROP TABLE IF EXISTS match_answers;
DROP TABLE IF EXISTS match_results;
DROP TABLE IF EXISTS match_participants;
DROP TABLE IF EXISTS match_upload_logs;
DROP TABLE IF EXISTS match_questions;

-- Enable lại foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Log kết quả
SELECT 'Migration 06 completed: Đã xóa các bảng cũ. Backup lưu tại *_backup_20251008' AS status;

