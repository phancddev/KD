-- Migration: Tạo bảng data_nodes và matches (CHỈ metadata)
-- Version: 2.1.0
-- Date: 2025-10-08
-- Description:
--   - Bảng data_nodes: Quản lý các Data Node servers
--   - Bảng matches: CHỈ lưu metadata mapping (match_id → data_node_id)
--   - KHÔNG tạo bảng match_questions, match_participants, etc.
--   - TẤT CẢ dữ liệu trận đấu lưu trong match.json trên Data Node
-- Auto-run khi docker-compose up: Kiểm tra và chỉ tạo khi chưa có

-- Disable foreign key checks tạm thời
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- BẢNG 1: DATA_NODES
-- ============================================
-- Quản lý các Data Node servers (server phụ lưu trữ dữ liệu)

CREATE TABLE IF NOT EXISTS data_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT 'Tên server phụ',
  host VARCHAR(255) NOT NULL COMMENT 'IP hoặc domain của server phụ',
  port INT NOT NULL COMMENT 'Port để kết nối',
  status ENUM('online', 'offline', 'error') DEFAULT 'offline' COMMENT 'Trạng thái kết nối',
  storage_used BIGINT DEFAULT 0 COMMENT 'Dung lượng đã sử dụng (bytes)',
  storage_total BIGINT DEFAULT 0 COMMENT 'Tổng dung lượng (bytes)',
  last_ping DATETIME NULL COMMENT 'Lần ping cuối cùng',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_port (port),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quản lý các Data Node servers';

-- ============================================
-- BẢNG 2: MATCHES (CHỈ METADATA)
-- ============================================

-- Kiểm tra xem bảng matches đã tồn tại chưa
SET @table_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'matches'
  AND TABLE_COMMENT LIKE '%Metadata mapping%'
);

-- Nếu bảng cũ tồn tại (không có comment mới), drop và tạo lại
DROP TABLE IF EXISTS match_participants;
DROP TABLE IF EXISTS match_questions;

-- Chỉ drop bảng matches cũ nếu nó không phải là bảng mới
SET @drop_old_matches = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'matches'
  AND (TABLE_COMMENT NOT LIKE '%Metadata mapping%' OR TABLE_COMMENT IS NULL)
);

-- Drop bảng cũ nếu cần
DROP TABLE IF EXISTS matches;

-- Tạo bảng matches mới (IF NOT EXISTS để an toàn)
CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id VARCHAR(100) NOT NULL UNIQUE COMMENT 'ID trận đấu (format: YYYYMMDD_CODE_Name)',
  match_code VARCHAR(50) NOT NULL COMMENT 'Mã trận đấu (VD: ABC123)',
  match_name VARCHAR(255) NOT NULL COMMENT 'Tên trận đấu',
  data_node_id INT NOT NULL COMMENT 'ID của Data Node lưu trữ trận đấu này',
  storage_folder VARCHAR(255) NOT NULL COMMENT 'Tên folder trong storage (giống match_id)',
  status ENUM('draft', 'ready', 'playing', 'finished', 'archived') DEFAULT 'draft' COMMENT 'Trạng thái trận đấu',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tạo',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời gian cập nhật',
  created_by VARCHAR(100) DEFAULT 'admin' COMMENT 'Người tạo',

  -- Foreign key
  CONSTRAINT fk_matches_data_node
    FOREIGN KEY (data_node_id)
    REFERENCES data_nodes(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  -- Indexes
  INDEX idx_match_id (match_id),
  INDEX idx_data_node_id (data_node_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Metadata mapping: match_id → data_node_id. Questions lưu trong match.json trên Data Node.';

-- Enable lại foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

