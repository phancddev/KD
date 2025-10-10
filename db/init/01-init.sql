-- Tạo cơ sở dữ liệu
CREATE DATABASE IF NOT EXISTS nqd_database;
USE nqd_database;

-- Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  last_ip VARCHAR(45) NULL
);

-- Tạo bảng questions
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_number INT NULL,
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  image_url TEXT NULL,
  category ENUM('khoidong', 'vuotchuongngaivat', 'tangtoc', 'vedich') DEFAULT 'khoidong',
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  time_limit INT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng lưu các đáp án chấp nhận thêm cho mỗi câu hỏi (ngoài đáp án hiển thị)
CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Tạo bảng rooms
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_by INT NOT NULL,
  status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tạo bảng room_participants
CREATE TABLE IF NOT EXISTS room_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  score INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_room_user (room_id, user_id)
);

-- Tạo bảng game_sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NULL,
  is_solo BOOLEAN DEFAULT FALSE,
  game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong' COMMENT 'Chế độ chơi: khoidong hoặc tangtoc',
  score INT DEFAULT 0,
  total_questions INT NOT NULL,
  correct_answers INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Tạo bảng user_answers
CREATE TABLE IF NOT EXISTS user_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  answer_time INT,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Tạo bảng login_logs để lưu trữ thông tin đăng nhập
CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  device_type VARCHAR(20),
  browser_name VARCHAR(50),
  browser_version VARCHAR(20),
  os_name VARCHAR(50),
  os_version VARCHAR(20),
  device_model VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  timezone VARCHAR(50),
  login_status ENUM('success', 'failed') NOT NULL,
  login_method VARCHAR(20) DEFAULT 'password',
  session_id VARCHAR(255),
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP NULL,
  session_duration INT NULL,
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tạo bảng ip_geolocation để lưu thông tin IP
CREATE TABLE IF NOT EXISTS ip_geolocation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  country VARCHAR(100),
  country_code VARCHAR(10),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50),
  isp VARCHAR(200),
  org VARCHAR(200),
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lookup_count INT DEFAULT 1
);

-- Báo lỗi câu hỏi/đáp án do người dùng gửi
CREATE TABLE IF NOT EXISTS question_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  session_id INT NULL,
  room_id INT NULL,
  mode ENUM('solo','room') NOT NULL,
  question_id INT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  user_answer TEXT NULL,
  report_text TEXT NOT NULL,
  accepted_answers JSON NULL,
  status ENUM('open','resolved') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
);

-- Bảng lưu đề xuất đáp án từ người dùng cho mỗi report
CREATE TABLE IF NOT EXISTS answer_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  question_id INT NULL,
  user_id INT NULL,
  suggested_answer TEXT NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES question_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng log lịch sử xử lý đề xuất đáp án
CREATE TABLE IF NOT EXISTS answer_suggestion_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestion_id INT NOT NULL,
  admin_id INT NULL,
  action VARCHAR(20) NOT NULL, -- update, approve, reject
  old_value TEXT NULL,
  new_value TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suggestion_id) REFERENCES answer_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tạo index để tối ưu hiệu suất
-- Comment các dòng này để tránh lỗi duplicate index
-- CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
-- CREATE INDEX idx_login_logs_username ON login_logs(username);
-- CREATE INDEX idx_login_logs_ip_address ON login_logs(ip_address);
-- CREATE INDEX idx_login_logs_login_at ON login_logs(login_at);
-- CREATE INDEX idx_ip_geolocation_ip ON ip_geolocation(ip_address);

-- Bảng logs để ghi lại các hành động xóa câu hỏi và cho phép khôi phục
CREATE TABLE IF NOT EXISTS question_deletion_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_answer TEXT NOT NULL,
  question_category VARCHAR(50) NULL,
  question_difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  question_created_by INT NULL,
  question_created_at TIMESTAMP NULL,
  deleted_by INT NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletion_reason TEXT NULL,
  report_id INT NULL,
  can_restore BOOLEAN DEFAULT TRUE,
  restored_at TIMESTAMP NULL,
  restored_by INT NULL,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (report_id) REFERENCES question_reports(id) ON DELETE SET NULL,
  FOREIGN KEY (restored_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng lưu các đáp án bổ sung đã bị xóa
CREATE TABLE IF NOT EXISTS deleted_question_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id INT NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP NULL,
  FOREIGN KEY (log_id) REFERENCES question_deletion_logs(id) ON DELETE CASCADE
);

-- Bảng đáp án phụ riêng cho câu hỏi Tăng Tốc (đảm bảo tồn tại khi khởi tạo)
CREATE TABLE IF NOT EXISTS tangtoc_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Index tối ưu cho tangtoc_answers (idempotent)
CREATE INDEX IF NOT EXISTS idx_tangtoc_answers_question_id ON tangtoc_answers(question_id);
-- Unique để hạn chế trùng đáp án theo câu hỏi (giới hạn 255 ký tự cho key)
CREATE UNIQUE INDEX IF NOT EXISTS ux_tangtoc_answers_qid_answer ON tangtoc_answers(question_id, answer(255));

-- Tạo index để tối ưu hiệu suất cho bảng logs
CREATE INDEX idx_question_deletion_logs_deleted_at ON question_deletion_logs(deleted_at);
CREATE INDEX idx_question_deletion_logs_deleted_by ON question_deletion_logs(deleted_by);
CREATE INDEX idx_question_deletion_logs_can_restore ON question_deletion_logs(can_restore);
CREATE INDEX idx_question_deletion_logs_question_id ON question_deletion_logs(question_id);

-- Tạo index để tối ưu hiệu suất cho bảng questions
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_tangtoc ON questions(category, question_number);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);