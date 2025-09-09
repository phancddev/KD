-- Hệ thống Tăng Tốc hoàn toàn độc lập
-- Không đụng chạm gì đến hệ thống khởi động

USE nqd_database;

-- =============================================
-- BẢNG CÂU HỎI TĂNG TỐC RIÊNG BIỆT
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_number INT NOT NULL,
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  image_url TEXT NULL,
  time_limit INT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng lưu các đáp án chấp nhận thêm cho mỗi câu hỏi Tăng Tốc
CREATE TABLE IF NOT EXISTS tangtoc_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES tangtoc_questions(id) ON DELETE CASCADE
);

-- =============================================
-- BẢNG BÁO LỖI CÂU HỎI TĂNG TỐC
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_question_reports (
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
  question_number INT NULL,
  image_url TEXT NULL,
  time_limit INT NULL,
  status ENUM('open','resolved') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (question_id) REFERENCES tangtoc_questions(id) ON DELETE SET NULL
);

-- =============================================
-- BẢNG ĐỀ XUẤT ĐÁP ÁN TĂNG TỐC
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_answer_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  question_id INT NULL,
  user_id INT NULL,
  suggested_answer TEXT NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES tangtoc_question_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES tangtoc_questions(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- BẢNG LOG XỬ LÝ ĐỀ XUẤT TĂNG TỐC
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_answer_suggestion_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestion_id INT NOT NULL,
  admin_id INT NULL,
  action VARCHAR(20) NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suggestion_id) REFERENCES tangtoc_answer_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- BẢNG GAME SESSIONS TĂNG TỐC RIÊNG
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_game_sessions (
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

-- =============================================
-- BẢNG USER ANSWERS TĂNG TỐC RIÊNG
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_user_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  answer_time INT,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES tangtoc_game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES tangtoc_questions(id) ON DELETE CASCADE
);

-- =============================================
-- BẢNG ROOMS TĂNG TỐC RIÊNG
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_by INT NOT NULL,
  status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- BẢNG ROOM PARTICIPANTS TĂNG TỐC RIÊNG
-- =============================================
CREATE TABLE IF NOT EXISTS tangtoc_room_participants (
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  score INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES tangtoc_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_room_user (room_id, user_id)
);

-- =============================================
-- TẠO INDEX ĐỂ TỐI ƯU HIỆU SUẤT
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tangtoc_questions_number ON tangtoc_questions(question_number);
CREATE INDEX IF NOT EXISTS idx_tangtoc_questions_created ON tangtoc_questions(created_at);

CREATE INDEX IF NOT EXISTS idx_tangtoc_reports_status ON tangtoc_question_reports(status);
CREATE INDEX IF NOT EXISTS idx_tangtoc_reports_created ON tangtoc_question_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_tangtoc_reports_user ON tangtoc_question_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_tangtoc_suggestions_report ON tangtoc_answer_suggestions(report_id);
CREATE INDEX IF NOT EXISTS idx_tangtoc_suggestions_status ON tangtoc_answer_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_tangtoc_sessions_user ON tangtoc_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tangtoc_sessions_room ON tangtoc_game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_tangtoc_sessions_started ON tangtoc_game_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_tangtoc_answers_session ON tangtoc_user_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_tangtoc_answers_question ON tangtoc_user_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_tangtoc_rooms_code ON tangtoc_rooms(code);
CREATE INDEX IF NOT EXISTS idx_tangtoc_rooms_status ON tangtoc_rooms(status);
CREATE INDEX IF NOT EXISTS idx_tangtoc_rooms_created ON tangtoc_rooms(created_at);