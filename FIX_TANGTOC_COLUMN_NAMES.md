# Fix: Lỗi "Unknown column 'tq.question_text'" Khi Xem Lịch Sử Tăng Tốc

## 🐛 Vấn Đề

Khi click vào "Chi tiết" trận đấu Tăng Tốc trong lịch sử, API trả về lỗi:
```json
{"error":"Internal Server Error"}
```

### Lỗi Trong Logs:
```
Error: Unknown column 'tq.question_text' in 'SELECT'
sqlMessage: "Unknown column 'tq.question_text' in 'SELECT'"
```

### Nguyên Nhân:

Query trong `getGameSessionDetails()` sử dụng sai tên cột:
- ❌ Sử dụng: `tq.question_text` và `tq.correct_answer`
- ✅ Thực tế: `tq.text` và `tq.answer`

## 📊 Cấu Trúc Bảng

### Bảng `tangtoc_questions`:
```sql
+-----------------+-----------+------+-----+---------------------+
| Field           | Type      | Null | Key | Default             |
+-----------------+-----------+------+-----+---------------------+
| id              | int(11)   | NO   | PRI | NULL                |
| question_number | int(11)   | NO   |     | NULL                |
| text            | text      | NO   |     | NULL                | ← Đây là tên cột đúng
| answer          | text      | NO   |     | NULL                | ← Đây là tên cột đúng
| image_url       | text      | YES  |     | NULL                |
| time_limit      | int(11)   | NO   |     | NULL                |
| created_by      | int(11)   | YES  | MUL | NULL                |
| created_at      | timestamp | NO   | MUL | current_timestamp() |
| updated_at      | timestamp | NO   |     | current_timestamp() |
+-----------------+-----------+------+-----+---------------------+
```

### Bảng `questions` (Khởi Động):
```sql
+----------------+-----------+------+-----+---------------------+
| Field          | Type      | Null | Key | Default             |
+----------------+-----------+------+-----+---------------------+
| id             | int(11)   | NO   | PRI | NULL                |
| question_number| int(11)   | YES  |     | NULL                |
| text           | text      | NO   |     | NULL                | ← Cùng tên với tangtoc
| answer         | text      | NO   |     | NULL                | ← Cùng tên với tangtoc
| image_url      | text      | YES  |     | NULL                |
| category       | varchar   | YES  |     | NULL                |
| difficulty     | varchar   | YES  |     | NULL                |
| time_limit     | int(11)   | YES  |     | NULL                |
| created_by     | int(11)   | YES  | MUL | NULL                |
| created_at     | timestamp | NO   |     | current_timestamp() |
+----------------+-----------+------+-----+---------------------+
```

**Kết luận**: Cả 2 bảng đều dùng `text` và `answer`, KHÔNG có `question_text` hay `correct_answer`.

## ✅ Giải Pháp

### File: `db/game-sessions.js`

**Trước (SAI):**
```javascript
if (gameMode === 'tangtoc') {
  [answerRows] = await pool.query(
    `SELECT ua.*, 
            COALESCE(tq.question_text, q.text) as question_text,  ← SAI
            COALESCE(tq.correct_answer, q.answer) as answer       ← SAI
     FROM user_answers ua
     LEFT JOIN tangtoc_questions tq ON ua.question_id = tq.id
     LEFT JOIN questions q ON ua.question_id = q.id
     WHERE ua.session_id = ?
     ORDER BY ua.answered_at`,
    [sessionId]
  );
}
```

**Sau (ĐÚNG):**
```javascript
if (gameMode === 'tangtoc') {
  [answerRows] = await pool.query(
    `SELECT ua.*, 
            COALESCE(tq.text, q.text) as question_text,  ← ĐÚNG
            COALESCE(tq.answer, q.answer) as answer      ← ĐÚNG
     FROM user_answers ua
     LEFT JOIN tangtoc_questions tq ON ua.question_id = tq.id
     LEFT JOIN questions q ON ua.question_id = q.id
     WHERE ua.session_id = ?
     ORDER BY ua.answered_at`,
    [sessionId]
  );
}
```

**Thay đổi:**
- ✅ `tq.question_text` → `tq.text`
- ✅ `tq.correct_answer` → `tq.answer`

## 🔄 Luồng Hoạt Động

### Trước (Lỗi):
```
User → Click "Chi tiết" trận Tăng Tốc
Frontend → GET /api/game/176
Backend → getGameSessionDetails(176)
Query → SELECT ... tq.question_text ... ← COLUMN NOT FOUND
Database → Error: Unknown column 'tq.question_text'
Backend → 500 Internal Server Error
Frontend → Alert "Không thể tải chi tiết trận đấu"
```

### Sau (Hoạt động):
```
User → Click "Chi tiết" trận Tăng Tốc
Frontend → GET /api/game/176
Backend → getGameSessionDetails(176)
Query → SELECT ... tq.text ... ← COLUMN FOUND
Database → Return rows with question data
Backend → 200 OK with game details
Frontend → Hiển thị modal với câu hỏi
```

## 🧪 Testing

### Test Case 1: Xem Chi Tiết Trận Tăng Tốc Solo
1. Chơi trận Tăng Tốc - Tự đấu
2. Vào History
3. Click "Chi tiết" trận Tăng Tốc
4. **Kỳ vọng**: Modal hiện ra với đầy đủ câu hỏi

### Test Case 2: Xem Chi Tiết Trận Tăng Tốc Room
1. Chơi trận Tăng Tốc - Phòng
2. Vào History
3. Click "Chi tiết" trận Tăng Tốc
4. **Kỳ vọng**: Modal hiện ra với đầy đủ câu hỏi

### Test Case 3: Xem Chi Tiết Trận Khởi Động (Không Ảnh Hưởng)
1. Chơi trận Khởi Động
2. Vào History
3. Click "Chi tiết" trận Khởi Động
4. **Kỳ vọng**: Vẫn hoạt động bình thường

## 📝 Chi Tiết Kỹ Thuật

### COALESCE Function

```sql
COALESCE(tq.text, q.text) as question_text
```

**Giải thích:**
- Nếu `tq.text` (Tăng Tốc) có giá trị → dùng `tq.text`
- Nếu `tq.text` là NULL → dùng `q.text` (Khởi Động)
- Kết quả được alias thành `question_text`

**Tại sao cần COALESCE?**
- LEFT JOIN có thể trả về NULL nếu không tìm thấy match
- COALESCE đảm bảo luôn có giá trị (fallback)

### LEFT JOIN vs JOIN

```sql
LEFT JOIN tangtoc_questions tq ON ua.question_id = tq.id
LEFT JOIN questions q ON ua.question_id = q.id
```

**Tại sao dùng LEFT JOIN?**
- Câu hỏi có thể từ `tangtoc_questions` HOẶC `questions`
- LEFT JOIN đảm bảo không mất dữ liệu nếu một bảng không có match
- COALESCE sẽ chọn giá trị từ bảng nào có data

## 🔍 Debug Commands

### Kiểm tra cấu trúc bảng:
```bash
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "DESCRIBE tangtoc_questions;"
```

### Kiểm tra dữ liệu:
```bash
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "SELECT id, text, answer FROM tangtoc_questions LIMIT 5;"
```

### Xem logs lỗi:
```bash
docker-compose logs app | grep -A 10 "Unknown column"
```

### Restart server:
```bash
docker-compose restart app
```

## ✅ Checklist

- [x] Kiểm tra cấu trúc bảng `tangtoc_questions`
- [x] Sửa tên cột trong query: `question_text` → `text`
- [x] Sửa tên cột trong query: `correct_answer` → `answer`
- [x] Restart server
- [x] Test xem chi tiết trận Tăng Tốc solo
- [x] Test xem chi tiết trận Tăng Tốc room
- [x] Test xem chi tiết trận Khởi Động (không ảnh hưởng)

## 📊 So Sánh

### Trước:
- ❌ Lỗi "Unknown column 'tq.question_text'"
- ❌ Không thể xem chi tiết trận Tăng Tốc
- ❌ API trả về 500 Internal Server Error

### Sau:
- ✅ Query thành công
- ✅ Hiển thị đầy đủ câu hỏi
- ✅ API trả về 200 OK với dữ liệu đầy đủ

## 🎉 Kết Quả

Bây giờ khi xem lịch sử trận Tăng Tốc:
- ✅ Click "Chi tiết" hoạt động bình thường
- ✅ Hiển thị đầy đủ câu hỏi và đáp án
- ✅ Có thể báo lỗi từ lịch sử
- ✅ Nhất quán với chế độ Khởi Động

## 📚 Bài Học

1. **Luôn kiểm tra cấu trúc bảng** trước khi viết query
2. **Đọc error logs kỹ** để tìm nguyên nhân chính xác
3. **Test cả 2 chế độ** (Khởi Động và Tăng Tốc) khi thay đổi
4. **Sử dụng COALESCE** khi JOIN nhiều bảng có cấu trúc tương tự

