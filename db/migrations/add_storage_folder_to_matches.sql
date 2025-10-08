-- Migration: Add storage_folder column to matches table
-- Date: 2025-10-08
-- Description: Add storage_folder to store the folder name on Data Node

ALTER TABLE matches 
ADD COLUMN storage_folder VARCHAR(255) NULL COMMENT 'Tên folder lưu trữ trên Data Node (format: YYYYMMDD_CODE_TenTran)' 
AFTER data_node_id;

-- Add index for faster lookup
CREATE INDEX idx_storage_folder ON matches(storage_folder);

