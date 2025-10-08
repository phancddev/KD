-- Migration: Add storage_folder column to matches table (IDEMPOTENT)
-- Date: 2025-10-08
-- Description: Add storage_folder to store the folder name on Data Node
-- Logic: IF EXISTS -> SKIP, IF NOT EXISTS -> CREATE
-- Safe: Can run multiple times without errors or data loss

-- ============================================
-- STEP 1: Add column if not exists
-- ============================================
SET @dbname = DATABASE();
SET @tablename = 'matches';
SET @columnname = 'storage_folder';

-- Check if column exists
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
);

-- Add column only if it doesn't exist
SET @sql = IF(
  @column_exists > 0,
  'SELECT "Column storage_folder already exists - SKIP" as status',
  'ALTER TABLE matches ADD COLUMN storage_folder VARCHAR(255) NULL COMMENT "Tên folder lưu trữ trên Data Node (format: YYYYMMDD_CODE_TenTran)" AFTER data_node_id'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- STEP 2: Add index if not exists
-- ============================================
SET @indexname = 'idx_storage_folder';

-- Check if index exists
SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
);

-- Add index only if it doesn't exist
SET @sql2 = IF(
  @index_exists > 0,
  'SELECT "Index idx_storage_folder already exists - SKIP" as status',
  'CREATE INDEX idx_storage_folder ON matches(storage_folder)'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ============================================
-- STEP 3: Update NULL values (IDEMPOTENT)
-- ============================================
-- This only updates rows where storage_folder IS NULL
-- Safe to run multiple times - will only update NULL values

-- Note: Complex string replacement is done in application code
-- This is just a placeholder to ensure the column is populated
-- The actual update will be done by check-and-migrate.js

