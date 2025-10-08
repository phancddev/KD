-- Migration cho hệ thống Host Dan Data Node
-- Tạo các bảng quản lý server phụ, trận đấu, câu hỏi, người chơi

-- Bảng quản lý các Data Nodes (server phụ)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quản lý các server phụ (data nodes)';

-- Bảng quản lý trận đấu
CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL COMMENT 'Mã trận đấu (unique)',
  name VARCHAR(255) NOT NULL COMMENT 'Tên trận đấu',
  host_user_id INT NOT NULL COMMENT 'ID người tạo trận đấu',
  max_players INT DEFAULT 4 COMMENT 'Số người chơi tối đa',
  status ENUM('draft', 'ready', 'playing', 'finished') DEFAULT 'draft' COMMENT 'Trạng thái trận đấu',
  data_node_id INT NULL COMMENT 'ID của data node lưu trữ dữ liệu',
  storage_folder VARCHAR(255) NULL COMMENT 'Tên folder lưu trữ trên Data Node (format: YYYYMMDD_CODE_TenTran)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  started_at DATETIME NULL COMMENT 'Thời gian bắt đầu',
  finished_at DATETIME NULL COMMENT 'Thời gian kết thúc',
  UNIQUE KEY unique_code (code),
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (data_node_id) REFERENCES data_nodes(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_host (host_user_id),
  INDEX idx_created (created_at),
  INDEX idx_storage_folder (storage_folder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quản lý các trận đấu';

-- Bảng quản lý câu hỏi theo từng phần thi
CREATE TABLE IF NOT EXISTS match_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL COMMENT 'ID trận đấu',
  section ENUM('khoi_dong_rieng', 'khoi_dong_chung', 'vcnv', 'tang_toc', 've_dich') NOT NULL COMMENT 'Phần thi',
  question_order INT NOT NULL COMMENT 'Thứ tự câu hỏi trong phần thi',
  player_index INT NULL COMMENT 'Index người chơi (cho khởi động riêng và về đích)',
  
  -- Nội dung câu hỏi
  question_type ENUM('text', 'image', 'video') NOT NULL DEFAULT 'text' COMMENT 'Loại câu hỏi',
  question_text TEXT NULL COMMENT 'Nội dung text câu hỏi',
  media_url VARCHAR(500) NULL COMMENT 'URL media (ảnh/video) từ data node',
  media_type VARCHAR(50) NULL COMMENT 'Loại media (image/jpeg, video/mp4, etc)',
  
  -- Đáp án
  answer_text TEXT NULL COMMENT 'Đáp án đúng',
  answer_options JSON NULL COMMENT 'Các lựa chọn (nếu có)',
  
  -- Điểm số và thời gian
  points INT DEFAULT 10 COMMENT 'Điểm cho câu hỏi',
  time_limit INT NULL COMMENT 'Thời gian giới hạn (giây)',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  INDEX idx_match_section (match_id, section),
  INDEX idx_order (match_id, section, question_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Câu hỏi cho từng phần thi của trận đấu';

-- Bảng quản lý người chơi trong trận đấu
CREATE TABLE IF NOT EXISTS match_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL COMMENT 'ID trận đấu',
  user_id INT NOT NULL COMMENT 'ID người chơi',
  player_index INT NOT NULL COMMENT 'Vị trí người chơi (0-3)',
  is_host BOOLEAN DEFAULT FALSE COMMENT 'Có phải host không',
  status ENUM('waiting', 'ready', 'playing', 'finished') DEFAULT 'waiting' COMMENT 'Trạng thái',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_match_user (match_id, user_id),
  UNIQUE KEY unique_match_index (match_id, player_index),
  INDEX idx_match (match_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Người chơi tham gia trận đấu';

-- Bảng lưu kết quả trận đấu
CREATE TABLE IF NOT EXISTS match_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL COMMENT 'ID trận đấu',
  user_id INT NOT NULL COMMENT 'ID người chơi',
  
  -- Điểm từng phần
  score_khoi_dong_rieng INT DEFAULT 0 COMMENT 'Điểm khởi động riêng',
  score_khoi_dong_chung INT DEFAULT 0 COMMENT 'Điểm khởi động chung',
  score_vcnv INT DEFAULT 0 COMMENT 'Điểm vượt chướng ngại vật',
  score_tang_toc INT DEFAULT 0 COMMENT 'Điểm tăng tốc',
  score_ve_dich INT DEFAULT 0 COMMENT 'Điểm về đích',
  
  -- Tổng điểm
  total_score INT DEFAULT 0 COMMENT 'Tổng điểm',
  rank INT NULL COMMENT 'Xếp hạng',
  
  -- Thống kê
  correct_answers INT DEFAULT 0 COMMENT 'Số câu trả lời đúng',
  wrong_answers INT DEFAULT 0 COMMENT 'Số câu trả lời sai',
  total_time_seconds INT DEFAULT 0 COMMENT 'Tổng thời gian (giây)',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_match_user_result (match_id, user_id),
  INDEX idx_match (match_id),
  INDEX idx_total_score (total_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kết quả trận đấu của người chơi';

-- Bảng lưu chi tiết câu trả lời
CREATE TABLE IF NOT EXISTS match_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL COMMENT 'ID trận đấu',
  question_id INT NOT NULL COMMENT 'ID câu hỏi',
  user_id INT NOT NULL COMMENT 'ID người chơi',
  
  answer_text TEXT NULL COMMENT 'Câu trả lời',
  is_correct BOOLEAN DEFAULT FALSE COMMENT 'Đúng hay sai',
  points_earned INT DEFAULT 0 COMMENT 'Điểm nhận được',
  time_taken INT NULL COMMENT 'Thời gian trả lời (giây)',
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES match_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_match_user (match_id, user_id),
  INDEX idx_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiết câu trả lời của người chơi';

-- Bảng lưu log upload files
CREATE TABLE IF NOT EXISTS match_upload_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL COMMENT 'ID trận đấu',
  data_node_id INT NOT NULL COMMENT 'ID data node',
  file_name VARCHAR(255) NOT NULL COMMENT 'Tên file',
  file_type VARCHAR(50) NOT NULL COMMENT 'Loại file',
  file_size BIGINT NOT NULL COMMENT 'Kích thước file (bytes)',
  storage_path VARCHAR(500) NOT NULL COMMENT 'Đường dẫn lưu trữ',
  stream_url VARCHAR(500) NOT NULL COMMENT 'URL stream',
  upload_status ENUM('uploading', 'success', 'failed') DEFAULT 'uploading',
  error_message TEXT NULL COMMENT 'Thông báo lỗi nếu có',
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (data_node_id) REFERENCES data_nodes(id) ON DELETE CASCADE,
  INDEX idx_match (match_id),
  INDEX idx_node (data_node_id),
  INDEX idx_status (upload_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log upload files lên data nodes';

