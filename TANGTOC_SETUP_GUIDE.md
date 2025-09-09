# Hướng dẫn thiết lập hệ thống Tăng Tốc độc lập

## 🎯 Mục tiêu
Tạo hệ thống Tăng Tốc hoàn toàn độc lập, không đụng chạm gì đến hệ thống khởi động.

## 📋 Các bước thực hiện

### 1. Dừng Docker hiện tại
```bash
docker-compose down
```

### 2. Xóa volume cũ (nếu muốn reset hoàn toàn)
```bash
docker volume rm kd_mariadb_data
```

### 3. Khởi động lại Docker
```bash
docker-compose up --build -d
```

### 4. Kiểm tra cấu hình
```bash
node test-tangtoc-config.js
```

## 🗄️ Cấu trúc database mới

### Bảng Tăng Tốc riêng biệt:
- `tangtoc_questions` - Câu hỏi Tăng Tốc
- `tangtoc_question_reports` - Báo lỗi câu hỏi Tăng Tốc
- `tangtoc_answer_suggestions` - Đề xuất đáp án Tăng Tốc
- `tangtoc_answer_suggestion_logs` - Log xử lý đề xuất
- `tangtoc_game_sessions` - Phiên chơi Tăng Tốc
- `tangtoc_user_answers` - Câu trả lời người dùng Tăng Tốc
- `tangtoc_rooms` - Phòng chơi Tăng Tốc
- `tangtoc_room_participants` - Thành viên phòng Tăng Tốc

### Bảng gốc không bị ảnh hưởng:
- `questions` (chỉ chứa câu hỏi khởi động)
- `question_reports` (chỉ chứa báo lỗi khởi động)
- Tất cả bảng khác của hệ thống khởi động

## 🔧 Cấu hình file

### File migration: `db/init/03-tangtoc-complete-system.sql`
- Tạo tất cả bảng Tăng Tốc
- Tạo index tối ưu
- Không động chạm đến bảng gốc

### File docker-compose.yml
- Tự động chạy migration khi khởi động
- Không cần can thiệp thủ công

## ✅ Kiểm tra thành công

Sau khi chạy `node test-tangtoc-config.js`, bạn sẽ thấy:
- ✅ Tất cả bảng Tăng Tốc được tạo
- ✅ Bảng gốc không bị ảnh hưởng
- ✅ Hệ thống hoàn toàn độc lập

## 🚀 Sử dụng

1. **Quản lý câu hỏi**: `/admin/tangtoc-questions`
2. **Báo lỗi câu hỏi**: `/admin/tangtoc-reports`
3. **Chơi solo**: `/tangtoc-solo`
4. **Chơi phòng**: `/tangtoc-room`

## 📝 Lưu ý

- Tất cả code Tăng Tốc đã được tách riêng
- Không có file nào chung với hệ thống khởi động
- Database hoàn toàn độc lập
- Có thể phát triển và test riêng biệt
