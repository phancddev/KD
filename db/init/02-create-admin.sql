-- Tạo người dùng admin mặc định
-- Mật khẩu: admin123 (plain text vì password-utils.js đang so sánh trực tiếp)
INSERT INTO users (username, password, email, full_name, is_admin, is_active)
VALUES 
  ('admin', 'admin123', 'admin@example.com', 'Quản trị viên', TRUE, TRUE)
ON DUPLICATE KEY UPDATE id = id;

-- Thêm một số câu hỏi mẫu
INSERT INTO questions (text, answer, category, difficulty)
VALUES
  ('Thủ đô của Việt Nam là gì?', 'Hà Nội', 'Địa lý', 'easy'),
  ('Ngôn ngữ lập trình nào không phải là ngôn ngữ hướng đối tượng?', 'C', 'Lập trình', 'medium'),
  ('Đâu là một hệ điều hành mã nguồn mở?', 'Linux', 'Công nghệ', 'easy'),
  ('HTML là viết tắt của gì?', 'Hyper Text Markup Language', 'Lập trình', 'easy'),
  ('Đâu là một ngôn ngữ lập trình phía máy chủ (server-side)?', 'PHP', 'Lập trình', 'medium'),
  ('Hệ quản trị cơ sở dữ liệu nào là mã nguồn mở?', 'MySQL', 'Công nghệ', 'medium'),
  ('Giao thức nào được sử dụng để truyền tải trang web?', 'HTTP', 'Công nghệ', 'easy'),
  ('Đơn vị đo tốc độ xử lý của CPU là gì?', 'Hertz', 'Công nghệ', 'medium'),
  ('Ngôn ngữ lập trình nào được phát triển bởi Google?', 'Go', 'Lập trình', 'medium'),
  ('Đâu là một framework JavaScript phổ biến?', 'React', 'Lập trình', 'medium'),
  ('Hệ điều hành Android được phát triển dựa trên nhân (kernel) nào?', 'Linux', 'Công nghệ', 'medium'),
  ('Đâu là một công cụ quản lý phiên bản mã nguồn?', 'Git', 'Công nghệ', 'easy');