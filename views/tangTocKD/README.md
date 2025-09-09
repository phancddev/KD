# Chế độ Tăng Tốc - KD APP

## Tổng quan
Chế độ Tăng Tốc là một chế độ chơi mới trong KD APP với 4 câu hỏi có thời gian tăng dần: 10s, 20s, 30s, 40s. Chế độ này hỗ trợ cả solo-battle và room-battle.

## Tính năng chính

### 1. Solo Battle Tăng Tốc
- **URL**: `/tangtoc-solo`
- **Mô tả**: Chơi một mình với 4 câu hỏi Tăng Tốc
- **Thời gian**: 10s, 20s, 30s, 40s cho từng câu
- **Hỗ trợ**: Câu hỏi có ảnh và câu hỏi text thường

### 2. Room Battle Tăng Tốc
- **URL**: `/tangtoc-room`
- **Mô tả**: Thi đấu với nhiều người chơi trong phòng
- **Tính năng**: Tạo phòng, tham gia phòng, bảng xếp hạng real-time

### 3. Quản lý câu hỏi Tăng Tốc
- **URL**: `/admin/tangtoc-questions`
- **Tính năng**: Upload, xem, xóa câu hỏi Tăng Tốc
- **Hỗ trợ**: Upload file CSV với format đặc biệt

## Cấu trúc dữ liệu

### Database Schema
```sql
-- Các cột mới được thêm vào bảng questions
ALTER TABLE questions ADD COLUMN question_number INT NULL AFTER category;
ALTER TABLE questions ADD COLUMN image_url TEXT NULL AFTER answer;
ALTER TABLE questions ADD COLUMN time_limit INT NULL AFTER difficulty;
```

### Format file CSV
```
Số câu | Câu hỏi | Đáp án | Category
1 | Câu hỏi 1 | Đáp án 1 | Tăng Tốc
2 | Câu hỏi 2 | Đáp án 2 | Tăng Tốc
3 | Câu hỏi 3 | Đáp án 3 | Tăng Tốc
4 | Câu hỏi 4 | Đáp án 4 | Tăng Tốc
```

### Hỗ trợ câu hỏi có ảnh
Format câu hỏi có ảnh:
```
@https://example.com/image.png data:image/gif;base64,R0lGODlhAQABAIABAAAAAP///yH5BAEAAAEALAAAAAABAAEAQAICTAEAOw%3D%3D
```

## Cấu trúc thư mục

```
tangTocKD/
├── README.md                           # Hướng dẫn sử dụng
├── 01-tangtoc-migration.sql            # Migration database
├── questions-parser.js                 # Parser xử lý câu hỏi Tăng Tốc
├── server-routes.js                    # API routes cho Tăng Tốc
├── solo-battle-tangtoc.html           # Giao diện solo battle
├── solo-battle-tangtoc.js             # Logic solo battle
├── room-battle-tangtoc.html           # Giao diện room battle
├── room-battle-tangtoc.js             # Logic room battle
├── admin-tangtoc-questions.html       # Giao diện admin
└── admin-tangtoc-questions.js         # Logic admin
```

## API Endpoints

### Public APIs
- `GET /api/tangtoc/questions` - Lấy câu hỏi Tăng Tốc ngẫu nhiên
- `POST /api/solo-game/tangtoc/finish` - Lưu kết quả solo Tăng Tốc
- `POST /api/room-game/tangtoc/finish` - Lưu kết quả room Tăng Tốc

### Admin APIs
- `GET /api/admin/tangtoc/questions` - Lấy danh sách câu hỏi Tăng Tốc
- `GET /api/admin/tangtoc/statistics` - Lấy thống kê câu hỏi Tăng Tốc
- `POST /api/admin/tangtoc/upload` - Upload câu hỏi Tăng Tốc
- `DELETE /api/admin/tangtoc/questions/:id` - Xóa câu hỏi Tăng Tốc

## Cách sử dụng

### 1. Chạy migration database
```bash
mysql -u root -p nqd_database < tangTocKD/01-tangtoc-migration.sql
```

### 2. Upload câu hỏi Tăng Tốc
1. Truy cập `/admin/tangtoc-questions`
2. Chọn file CSV theo format đã định
3. Chọn chế độ upload (thay thế hoặc thêm mới)
4. Click "Upload câu hỏi"

### 3. Chơi solo Tăng Tốc
1. Truy cập `/tangtoc-solo`
2. Click "Bắt đầu Tăng Tốc"
3. Trả lời 4 câu hỏi với thời gian tăng dần

### 4. Chơi room Tăng Tốc
1. Truy cập trang chủ
2. Click "Tạo phòng Tăng Tốc" hoặc "Tham gia phòng Tăng Tốc"
3. Chia sẻ mã phòng với bạn bè
4. Bắt đầu thi đấu

## Tính năng đặc biệt

### 1. Hỗ trợ câu hỏi có ảnh
- Tự động phát hiện link ảnh trong câu hỏi
- Hiển thị ảnh trong giao diện chơi
- Hỗ trợ cả ảnh tĩnh và video

### 2. Logic chọn câu hỏi thông minh
- Mỗi lần chơi sẽ có đủ 4 câu (1, 2, 3, 4)
- Random câu hỏi trong từng nhóm số câu
- Đảm bảo tính đa dạng và công bằng

### 3. Giao diện responsive
- Hỗ trợ đầy đủ trên mobile và desktop
- Animation đẹp mắt với hiệu ứng countdown
- Âm thanh phản hồi khi trả lời đúng/sai

## Lưu ý kỹ thuật

### 1. Database
- Cần chạy migration trước khi sử dụng
- Các cột mới: `question_number`, `image_url`, `time_limit`
- Index được tạo để tối ưu truy vấn

### 2. File upload
- Hỗ trợ CSV và TXT (Tab-separated)
- Giới hạn kích thước file: 10MB
- Tự động xóa file tạm sau khi xử lý

### 3. Security
- Tất cả admin APIs đều yêu cầu authentication
- Kiểm tra quyền admin trước khi thực hiện
- Validate input để tránh SQL injection

## Troubleshooting

### 1. Lỗi không tải được câu hỏi
- Kiểm tra database có câu hỏi Tăng Tốc không
- Kiểm tra category = 'tangtoc'
- Kiểm tra question_number từ 1-4

### 2. Lỗi upload file
- Kiểm tra format file CSV
- Kiểm tra quyền ghi file trong thư mục uploads
- Kiểm tra kích thước file < 10MB

### 3. Lỗi hiển thị ảnh
- Kiểm tra link ảnh có hợp lệ không
- Kiểm tra CORS policy của server ảnh
- Kiểm tra kết nối internet

## Tương lai

### Các tính năng có thể phát triển thêm
1. **Thống kê chi tiết**: Thời gian trả lời, độ khó câu hỏi
2. **Leaderboard**: Bảng xếp hạng Tăng Tốc riêng
3. **Custom time**: Cho phép admin tùy chỉnh thời gian
4. **Multiplayer real-time**: Cải thiện trải nghiệm room battle
5. **Mobile app**: Ứng dụng di động riêng

---

**Phát triển bởi**: KD APP Team  
**Phiên bản**: 1.0.0  
**Ngày cập nhật**: 2024
