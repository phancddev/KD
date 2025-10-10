# CHANGELOG - Fix Lịch sử đấu và Chi tiết phiên chơi

**Date:** 2025-10-10  
**Version:** 1.2.5  
**Type:** Bug Fix

## 📋 Tóm tắt

Sửa 2 lỗi nghiêm trọng liên quan đến lịch sử đấu và chi tiết phiên chơi:

1. **Lịch sử đấu tăng tốc không hiển thị** - Thiếu cột `game_mode`
2. **Chi tiết phiên chơi bị lỗi** - JOIN với bảng `tangtoc_questions` không tồn tại

## 🐛 Vấn đề 1: Lịch sử đấu tăng tốc không hiển thị

### Triệu chứng
- Lịch sử đấu admin: Không hiển thị trận tăng tốc
- Lịch sử đấu cá nhân: Không hiển thị trận tăng tốc
- Xảy ra trên server có sẵn dữ liệu

### Nguyên nhân
Cột `game_mode` trong bảng `game_sessions` không được tạo:
- File `03-add-game-mode.sql` tồn tại nhưng không được load
- Hàm `runMigrations()` không có migration cho `game_mode`

### Giải pháp
✅ Thêm migration idempotent cho `game_mode` vào `runMigrations()`  
✅ Cập nhật file `01-init.sql` để có cột `game_mode`  
✅ Cập nhật fallback `createBasicTables()` để có cột `game_mode`  
✅ Bonus: Thêm migration cho `storage_folder`

## 🐛 Vấn đề 2: Chi tiết phiên chơi bị lỗi

### Triệu chứng
```
Error: Table 'nqd_database.tangtoc_questions' doesn't exist
```

### Nguyên nhân
Code JOIN với bảng `tangtoc_questions` không tồn tại:
- Thực tế: Tất cả câu hỏi lưu trong bảng `questions` với `category='tangtoc'`
- Code sai: Cố JOIN với bảng `tangtoc_questions` riêng

### Giải pháp
✅ Sửa query trong `getGameSessionDetails()` để chỉ JOIN với `questions`  
✅ Cập nhật danh sách bảng trong `check-database.js`

## 📝 Files Changed

### Modified

1. **db/index.js**
   - Line 189-206: Thêm `game_mode` vào `createBasicTables()`
   - Line 354-368: Thêm migration cho `game_mode`
   - Line 855-869: Thêm migration cho `storage_folder`

2. **db/init/01-init.sql**
   - Line 68-83: Thêm cột `game_mode` vào CREATE TABLE game_sessions

3. **db/game-sessions.js**
   - Line 108-118: Sửa query `getGameSessionDetails()` bỏ JOIN với `tangtoc_questions`

4. **check-database.js**
   - Line 8-43: Cập nhật danh sách bảng cần thiết

### Created

5. **FIX-GAME-MODE-MIGRATION.md**
   - Tài liệu chi tiết về vấn đề game_mode

6. **FIX-TANGTOC-QUESTIONS-TABLE.md**
   - Tài liệu chi tiết về vấn đề tangtoc_questions

7. **CHANGELOG-GAME-MODE-FIX.md**
   - Changelog ngắn gọn cho game_mode

8. **CHANGELOG-FIX-HISTORY-2025-10-10.md** (file này)
   - Changelog tổng hợp

## 🎯 Nguyên tắc

### ✅ Idempotent Migration
- Kiểm tra trước khi thêm: `ensureColumnExists()`
- Có thể chạy nhiều lần không lỗi
- An toàn với database có sẵn dữ liệu

### ✅ Đúng thiết kế
- Không tạo bảng riêng cho từng loại câu hỏi
- Dùng cột `category` để phân biệt
- Không tạo bảng riêng cho từng loại game
- Dùng cột `game_mode` để phân biệt

## 📊 Cấu trúc Database

### Bảng chính

1. **questions** - Lưu TẤT CẢ câu hỏi
   ```sql
   category ENUM('khoidong', 'vuotchuongngaivat', 'tangtoc', 'vedich')
   ```

2. **game_sessions** - Lưu TẤT CẢ lịch sử game
   ```sql
   game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong'
   ```

3. **user_answers** - Lưu câu trả lời
   ```sql
   question_id → JOIN với questions.id
   ```

### Bảng phụ cho Tăng Tốc

Chỉ có các bảng **reports và logs** riêng:
- `tangtoc_answers`
- `tangtoc_question_reports`
- `tangtoc_answer_suggestions`
- `tangtoc_answer_suggestion_logs`
- `tangtoc_question_deletion_logs`
- `deleted_tangtoc_question_answers`

## 🧪 Kiểm tra

### 1. Kiểm tra cột game_mode

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'game_sessions'
  AND COLUMN_NAME = 'game_mode';
```

### 2. Kiểm tra lịch sử đấu

```sql
SELECT game_mode, COUNT(*) as count
FROM game_sessions
GROUP BY game_mode;
```

### 3. Test chi tiết phiên chơi

```sql
SELECT ua.*, q.text as question_text, q.answer, q.category
FROM user_answers ua
JOIN questions q ON ua.question_id = q.id
WHERE ua.session_id = ?
ORDER BY ua.answered_at;
```

## 🎉 Kết quả

### Vấn đề 1: game_mode
- ✅ Cột `game_mode` được tạo tự động trên mọi server
- ✅ Migration an toàn, idempotent
- ✅ Lịch sử đấu tăng tốc hiển thị đúng

### Vấn đề 2: tangtoc_questions
- ✅ Query không còn lỗi
- ✅ Chi tiết phiên chơi hiển thị đúng
- ✅ Không cần tạo bảng mới

## 📦 Deployment

### Server Mới
1. Pull code mới
2. Restart server
3. Migration tự động chạy

### Server Có Sẵn Dữ liệu
1. Pull code mới
2. Restart server
3. Migration tự động chạy
4. Cột `game_mode` được thêm vào
5. Dữ liệu cũ không bị mất

### Docker
```bash
# Pull code mới
git pull

# Rebuild và restart
docker-compose down
docker-compose up -d --build

# Kiểm tra logs
docker-compose logs -f kd
```

## 🔗 Related Issues

- Issue #1: Lịch sử đấu tăng tốc không hiển thị
- Issue #2: Table 'tangtoc_questions' doesn't exist
- Root Cause #1: Thiếu cột `game_mode`
- Root Cause #2: JOIN với bảng không tồn tại
- Solution: Migration idempotent + Sửa query
- Impact: Tất cả server (mới và cũ)

## 📚 Documentation

- `FIX-GAME-MODE-MIGRATION.md` - Chi tiết về game_mode
- `FIX-TANGTOC-QUESTIONS-TABLE.md` - Chi tiết về tangtoc_questions
- `CHANGELOG-GAME-MODE-FIX.md` - Changelog ngắn gọn
- `CHANGELOG-FIX-HISTORY-2025-10-10.md` - Changelog tổng hợp (file này)

