-- Migration để thêm bảng báo lỗi câu hỏi riêng cho Tăng Tốc
USE nqd_database;

-- Tạo bảng báo lỗi câu hỏi Tăng Tốc riêng biệt
CREATE TABLE IF NOT EXISTS tangtoc_question_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  session_id INT NULL,
  room_id INT NULL,
  mode ENUM('solo','room') NOT NULL,
  question_id INT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT NULL,
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

-- Tạo bảng lưu đề xuất đáp án từ người dùng cho mỗi report Tăng Tốc
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
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tạo bảng log lịch sử xử lý đề xuất đáp án Tăng Tốc
CREATE TABLE IF NOT EXISTS tangtoc_answer_suggestion_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestion_id INT NOT NULL,
  admin_id INT NULL,
  action VARCHAR(20) NOT NULL, -- update, approve, reject
  old_value TEXT NULL,
  new_value TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suggestion_id) REFERENCES tangtoc_answer_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tạo bảng logs để ghi lại các hành động xóa câu hỏi Tăng Tốc và cho phép khôi phục
CREATE TABLE IF NOT EXISTS tangtoc_question_deletion_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_answer TEXT NOT NULL,
  question_image_url TEXT NULL,
  question_number INT NULL,
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
  FOREIGN KEY (report_id) REFERENCES tangtoc_question_reports(id) ON DELETE SET NULL,
  FOREIGN KEY (restored_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Tạo bảng lưu các đáp án bổ sung đã bị xóa cho câu hỏi Tăng Tốc
CREATE TABLE IF NOT EXISTS deleted_tangtoc_question_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id INT NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP NULL,
  FOREIGN KEY (log_id) REFERENCES tangtoc_question_deletion_logs(id) ON DELETE CASCADE
);

-- Tạo index để tối ưu hiệu suất cho bảng báo lỗi Tăng Tốc
CREATE INDEX idx_tangtoc_question_reports_status ON tangtoc_question_reports(status);
CREATE INDEX idx_tangtoc_question_reports_created_at ON tangtoc_question_reports(created_at);
CREATE INDEX idx_tangtoc_question_reports_user_id ON tangtoc_question_reports(user_id);
CREATE INDEX idx_tangtoc_question_reports_question_id ON tangtoc_question_reports(question_id);

-- Tạo index để tối ưu hiệu suất cho bảng logs xóa câu hỏi Tăng Tốc
CREATE INDEX idx_tangtoc_question_deletion_logs_deleted_at ON tangtoc_question_deletion_logs(deleted_at);
CREATE INDEX idx_tangtoc_question_deletion_logs_deleted_by ON tangtoc_question_deletion_logs(deleted_by);
CREATE INDEX idx_tangtoc_question_deletion_logs_can_restore ON tangtoc_question_deletion_logs(can_restore);
CREATE INDEX idx_tangtoc_question_deletion_logs_question_id ON tangtoc_question_deletion_logs(question_id);
