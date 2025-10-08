-- Migration: Fix match_questions table schema
-- Date: 2025-10-08
-- Description: Add missing columns to match_questions table
-- Safe: Idempotent - can run multiple times

-- Add answer_text if not exists
SET @dbname = DATABASE();
SET @tablename = 'match_questions';
SET @columnname = 'answer_text';

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
);

SET @sql = IF(
  @column_exists > 0,
  'SELECT "Column answer_text already exists - SKIP" as status',
  'ALTER TABLE match_questions ADD COLUMN answer_text TEXT NULL COMMENT "Đáp án đúng" AFTER media_type'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add answer_options if not exists
SET @columnname = 'answer_options';

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
);

SET @sql = IF(
  @column_exists > 0,
  'SELECT "Column answer_options already exists - SKIP" as status',
  'ALTER TABLE match_questions ADD COLUMN answer_options JSON NULL COMMENT "Các lựa chọn (nếu có)" AFTER answer_text'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add points if not exists
SET @columnname = 'points';

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
);

SET @sql = IF(
  @column_exists > 0,
  'SELECT "Column points already exists - SKIP" as status',
  'ALTER TABLE match_questions ADD COLUMN points INT DEFAULT 10 COMMENT "Điểm cho câu hỏi" AFTER answer_options'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add time_limit if not exists
SET @columnname = 'time_limit';

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
);

SET @sql = IF(
  @column_exists > 0,
  'SELECT "Column time_limit already exists - SKIP" as status',
  'ALTER TABLE match_questions ADD COLUMN time_limit INT NULL COMMENT "Thời gian giới hạn (giây)" AFTER points'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

