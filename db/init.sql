-- Tạo database nếu chưa có
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
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(50),
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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

-- Tạo tài khoản admin mặc định
INSERT IGNORE INTO users (username, password, full_name, is_admin) VALUES 
('admin', 'admin123', 'Administrator', TRUE);

-- Thêm một số câu hỏi mẫu
INSERT IGNORE INTO questions (text, answer, category, difficulty) VALUES 
('Thủ đô của Việt Nam là gì?', 'Hà Nội', 'geography', 'easy'),
('Ngôn ngữ lập trình nào không phải là ngôn ngữ hướng đối tượng?', 'C', 'programming', 'medium'),
('Đâu là một hệ điều hành mã nguồn mở?', 'Linux', 'technology', 'easy'),
('HTML là viết tắt của gì?', 'Hyper Text Markup Language', 'web', 'easy'),
('Đâu là một ngôn ngữ lập trình phía máy chủ (server-side)?', 'PHP', 'programming', 'easy'),
('Hệ quản trị cơ sở dữ liệu nào là mã nguồn mở?', 'MySQL', 'database', 'medium'),
('Giao thức nào được sử dụng để truyền tải trang web?', 'HTTP', 'networking', 'easy'),
('Đơn vị đo tốc độ xử lý của CPU là gì?', 'Hertz', 'hardware', 'medium'),
('Ngôn ngữ lập trình nào được phát triển bởi Google?', 'Go', 'programming', 'medium'),
('Đâu là một framework JavaScript phổ biến?', 'React', 'web', 'medium'),
('Hệ điều hành Android được phát triển dựa trên nhân (kernel) nào?', 'Linux', 'mobile', 'medium'),
('Đâu là một công cụ quản lý phiên bản mã nguồn?', 'Git', 'development', 'easy'); 