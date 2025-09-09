# Hệ thống Báo lỗi Câu hỏi Tăng Tốc

## Tổng quan

Hệ thống báo lỗi câu hỏi Tăng Tốc được thiết kế riêng biệt, tách biệt hoàn toàn với hệ thống báo lỗi câu hỏi khởi động để tránh xung đột và lỗi.

## Tính năng chính

### 1. Trang báo lỗi câu hỏi Tăng Tốc riêng biệt
- **URL**: `/admin/tangtoc-reports`
- **Chức năng**: Quản lý báo lỗi câu hỏi Tăng Tốc
- **Hiển thị hình ảnh**: Có hiển thị hình ảnh câu hỏi như trang quản lý câu hỏi Tăng Tốc
- **Tính năng**: Tương tự trang báo lỗi câu hỏi khởi động

### 2. Cơ sở dữ liệu nhiều đáp án
- **Bảng questions**: Đã thêm cột `accepted_answers` (JSON)
- **Hỗ trợ**: Câu hỏi Tăng Tốc có thể có nhiều đáp án được chấp nhận
- **Tương thích**: Hoạt động với hệ thống socket hiện có

### 3. Hệ thống báo lỗi riêng biệt
- **Bảng chính**: `tangtoc_question_reports`
- **Bảng đề xuất**: `tangtoc_answer_suggestions`
- **Bảng log**: `tangtoc_answer_suggestion_logs`
- **Tách biệt**: Không ảnh hưởng đến database câu hỏi khởi động

### 4. Quy trình xử lý báo lỗi
1. **Báo lỗi**: Người dùng báo lỗi từ game Tăng Tốc
2. **Gửi lên**: Báo lỗi được gửi lên trang báo lỗi Tăng Tốc riêng
3. **Duyệt**: Admin duyệt đề xuất đáp án
4. **Cập nhật**: Đáp án được thêm vào database Tăng Tốc
5. **Hiển thị**: Câu hỏi xuất hiện ở trang quản lý câu hỏi Tăng Tốc

## Cấu trúc Database

### Bảng tangtoc_question_reports
```sql
CREATE TABLE tangtoc_question_reports (
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
  question_number INT NULL,
  image_url TEXT NULL,
  time_limit INT NULL,
  status ENUM('open','resolved') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL
);
```

### Bảng tangtoc_answer_suggestions
```sql
CREATE TABLE tangtoc_answer_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  question_id INT NULL,
  user_id INT NULL,
  suggested_answer TEXT NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### Admin API
- `GET /api/admin/tangtoc-reports` - Lấy danh sách báo lỗi
- `GET /api/admin/tangtoc-reports/:id` - Lấy chi tiết báo lỗi
- `POST /api/admin/tangtoc-reports/:id/status` - Cập nhật trạng thái
- `POST /api/admin/tangtoc-reports/:id/suggestions` - Thêm đề xuất
- `POST /api/admin/tangtoc-reports/:id/suggestions/approve` - Duyệt đề xuất

### User API
- `POST /api/report-tangtoc-question` - Báo lỗi câu hỏi Tăng Tốc

## Cài đặt

### 1. Chạy Migration
```bash
node run-tangtoc-migration.js
```

### 2. Khởi động Server
```bash
npm start
```

### 3. Truy cập Admin
- Trang báo lỗi Tăng Tốc: `http://localhost:3000/admin/tangtoc-reports`
- Trang quản lý câu hỏi Tăng Tốc: `http://localhost:3000/admin/tangtoc-questions`

## Tính năng đặc biệt

### 1. Hiển thị hình ảnh
- Hỗ trợ hiển thị hình ảnh câu hỏi trong trang báo lỗi
- Tương thích với format `@https://... data:image/...`

### 2. Nhiều đáp án
- Câu hỏi Tăng Tốc có thể có nhiều đáp án được chấp nhận
- Hiển thị trong trang quản lý câu hỏi
- Tương thích với hệ thống socket hiện có

### 3. Tách biệt hoàn toàn
- Database riêng cho báo lỗi Tăng Tốc
- Không ảnh hưởng đến hệ thống khởi động
- Dễ bảo trì và mở rộng

## Lưu ý

1. **Tuyệt đối không thao tác đến database câu hỏi khởi động** từ hệ thống Tăng Tốc
2. **Báo lỗi Tăng Tốc chỉ được gửi lên trang báo lỗi Tăng Tốc**
3. **Sau khi duyệt, câu hỏi sẽ vào database Tăng Tốc và hiện ở trang quản lý câu hỏi Tăng Tốc**
4. **Navbar admin đã được cập nhật** với trang báo lỗi Tăng Tốc mới

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra thông tin kết nối trong file `.env`
- Đảm bảo database `nqd_database` đã tồn tại

### Lỗi migration
- Kiểm tra quyền truy cập database
- Đảm bảo không có bảng trùng tên

### Lỗi hiển thị
- Kiểm tra console browser để xem lỗi JavaScript
- Đảm bảo các file CSS/JS đã được load đúng
