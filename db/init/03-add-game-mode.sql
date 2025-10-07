-- Migration: Add game_mode field to game_sessions table
-- This allows tracking whether a game is 'khoidong' (warmup) or 'tangtoc' (speed-up) mode

USE nqd_database;

-- Check if column exists before adding
SET @dbname = DATABASE();
SET @tablename = 'game_sessions';
SET @columnname = 'game_mode';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(''khoidong'', ''tangtoc'') DEFAULT ''khoidong'' AFTER is_solo')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create index for better query performance (only if not exists)
SET @indexname = 'idx_game_sessions_game_mode';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, '(game_mode)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Update existing records to set game_mode based on context
-- This is a best-effort migration for existing data
UPDATE game_sessions
SET game_mode = 'khoidong'
WHERE game_mode IS NULL;

