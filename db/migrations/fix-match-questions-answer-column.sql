-- Migration: Fix match_questions answer column inconsistency
-- Date: 2025-10-08
-- Description: Rename 'answer' to 'answer_text' and make it nullable
-- Issue: Code uses 'answer_text' but db/index.js creates 'answer NOT NULL'
-- Safe: Idempotent - can run multiple times

SET @dbname = DATABASE();
SET @tablename = 'match_questions';

-- ============================================
-- STEP 1: Check if 'answer' column exists
-- ============================================
SET @answer_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = 'answer'
);

-- ============================================
-- STEP 2: Check if 'answer_text' column exists
-- ============================================
SET @answer_text_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = 'answer_text'
);

-- ============================================
-- STEP 3: Rename 'answer' to 'answer_text' if needed
-- ============================================
SET @sql = CASE
  -- If both exist, drop 'answer' (answer_text is correct)
  WHEN @answer_exists > 0 AND @answer_text_exists > 0 THEN
    'ALTER TABLE match_questions DROP COLUMN answer'
  
  -- If only 'answer' exists, rename it to 'answer_text'
  WHEN @answer_exists > 0 AND @answer_text_exists = 0 THEN
    'ALTER TABLE match_questions CHANGE COLUMN answer answer_text TEXT NULL COMMENT "Đáp án đúng"'
  
  -- If only 'answer_text' exists, do nothing
  WHEN @answer_exists = 0 AND @answer_text_exists > 0 THEN
    'SELECT "Column answer_text already exists - SKIP" as status'
  
  -- If neither exists, create 'answer_text'
  ELSE
    'ALTER TABLE match_questions ADD COLUMN answer_text TEXT NULL COMMENT "Đáp án đúng" AFTER media_type'
END;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- STEP 4: Ensure answer_text is nullable
-- ============================================
SET @answer_text_nullable = (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = 'answer_text'
);

SET @sql2 = IF(
  @answer_text_nullable = 'NO',
  'ALTER TABLE match_questions MODIFY COLUMN answer_text TEXT NULL COMMENT "Đáp án đúng"',
  'SELECT "Column answer_text is already nullable - SKIP" as status'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME IN ('answer', 'answer_text')
ORDER BY COLUMN_NAME;

