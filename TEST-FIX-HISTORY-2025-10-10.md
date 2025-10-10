# Test Plan - Fix Lịch sử đấu và Chi tiết phiên chơi

**Date:** 2025-10-10  
**Version:** 1.2.5

## 📋 Checklist Trước khi Test

- [ ] Pull code mới nhất
- [ ] Backup database (nếu test trên production)
- [ ] Đọc `CHANGELOG-FIX-HISTORY-2025-10-10.md`

## 🧪 Test Case 1: Migration game_mode

### Mục tiêu
Kiểm tra cột `game_mode` được tạo tự động khi restart server.

### Bước 1: Kiểm tra trước khi restart

```bash
# Vào Docker container
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database

# Kiểm tra cột game_mode
DESCRIBE game_sessions;
```

**Kết quả mong đợi:**
- Nếu chưa có cột `game_mode`: Sẽ được tạo sau khi restart
- Nếu đã có cột `game_mode`: Migration sẽ bỏ qua (idempotent)

### Bước 2: Restart server

```bash
# Restart KD server
docker-compose restart kd

# Xem logs
docker-compose logs -f kd
```

**Logs mong đợi:**
```
⚙️  Đang chạy migration...
⚙️  Thêm cột game_mode vào bảng game_sessions...
✅ Đã tạo index idx_game_sessions_game_mode
✅ Tất cả migrations đã hoàn tất!
```

### Bước 3: Kiểm tra sau khi restart

```sql
-- Kiểm tra cột game_mode
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'nqd_database'
  AND TABLE_NAME = 'game_sessions'
  AND COLUMN_NAME = 'game_mode';
```

**Kết quả mong đợi:**
```
COLUMN_NAME: game_mode
COLUMN_TYPE: enum('khoidong','tangtoc')
COLUMN_DEFAULT: khoidong
COLUMN_COMMENT: Chế độ chơi: khoidong hoặc tangtoc
```

### Bước 4: Kiểm tra index

```sql
-- Kiểm tra index
SELECT INDEX_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'nqd_database'
  AND TABLE_NAME = 'game_sessions'
  AND INDEX_NAME = 'idx_game_sessions_game_mode';
```

**Kết quả mong đợi:**
```
INDEX_NAME: idx_game_sessions_game_mode
COLUMN_NAME: game_mode
```

### Bước 5: Kiểm tra dữ liệu

```sql
-- Đếm game theo mode
SELECT 
  game_mode,
  COUNT(*) as count
FROM game_sessions
GROUP BY game_mode;
```

**Kết quả mong đợi:**
```
game_mode | count
----------|------
khoidong  | xxx
tangtoc   | yyy
NULL      | 0    (không có NULL)
```

### ✅ Pass Criteria
- [x] Cột `game_mode` tồn tại
- [x] Type: `enum('khoidong','tangtoc')`
- [x] Default: `khoidong`
- [x] Index `idx_game_sessions_game_mode` tồn tại
- [x] Không có giá trị NULL

---

## 🧪 Test Case 2: Lịch sử đấu Admin

### Mục tiêu
Kiểm tra lịch sử đấu admin hiển thị cả trận Khởi Động và Tăng Tốc.

### Bước 1: Truy cập trang admin

```
URL: http://localhost:3000/admin/game-history
```

### Bước 2: Kiểm tra hiển thị

**Kiểm tra:**
- [ ] Có cột "Chế độ" (Game Mode)
- [ ] Hiển thị badge "Khởi Động" (màu xanh)
- [ ] Hiển thị badge "Tăng Tốc" (màu vàng)
- [ ] Có thể filter theo chế độ
- [ ] Phân trang hoạt động đúng

### Bước 3: Test filter

```javascript
// Filter chỉ Khởi Động
GET /api/admin/game-history?type=solo

// Filter chỉ Tăng Tốc
GET /api/admin/game-history?type=room

// Filter theo user
GET /api/admin/game-history?userId=123

// Filter theo thời gian
GET /api/admin/game-history?from=2025-10-01&to=2025-10-10
```

### ✅ Pass Criteria
- [x] Hiển thị cả trận Khởi Động và Tăng Tốc
- [x] Badge hiển thị đúng màu sắc
- [x] Filter hoạt động đúng
- [x] Phân trang hoạt động đúng

---

## 🧪 Test Case 3: Lịch sử đấu Cá nhân

### Mục tiêu
Kiểm tra lịch sử đấu cá nhân hiển thị cả trận Khởi Động và Tăng Tốc.

### Bước 1: Đăng nhập user

```
URL: http://localhost:3000/login
```

### Bước 2: Truy cập lịch sử

```
URL: http://localhost:3000/history
```

### Bước 3: Kiểm tra hiển thị

**Kiểm tra:**
- [ ] Có cột "Chế độ"
- [ ] Hiển thị "🎯 Khởi Động"
- [ ] Hiển thị "🚀 Tăng Tốc"
- [ ] Hiển thị điểm số đúng
- [ ] Hiển thị số câu đúng/tổng số câu

### Bước 4: Test filter theo tháng

```javascript
// Chọn tháng 10/2025
GET /api/user/game-history?month=10&year=2025
```

### ✅ Pass Criteria
- [x] Hiển thị cả trận Khởi Động và Tăng Tốc
- [x] Icon hiển thị đúng
- [x] Điểm số hiển thị đúng
- [x] Filter theo tháng hoạt động đúng

---

## 🧪 Test Case 4: Chi tiết phiên chơi

### Mục tiêu
Kiểm tra chi tiết phiên chơi không còn lỗi `tangtoc_questions doesn't exist`.

### Bước 1: Truy cập chi tiết phiên chơi

```
URL: http://localhost:3000/admin/game-history
Click vào nút "Xem" của một trận đấu
```

### Bước 2: Kiểm tra modal

**Kiểm tra:**
- [ ] Modal mở không lỗi
- [ ] Hiển thị thông tin user
- [ ] Hiển thị điểm số
- [ ] Hiển thị số câu đúng/sai
- [ ] Hiển thị thời gian bắt đầu/kết thúc
- [ ] Hiển thị danh sách câu hỏi

### Bước 3: Kiểm tra danh sách câu hỏi

**Kiểm tra:**
- [ ] Hiển thị đầy đủ câu hỏi
- [ ] Hiển thị câu trả lời của user
- [ ] Hiển thị đáp án đúng
- [ ] Hiển thị trạng thái đúng/sai
- [ ] Không có lỗi trong console

### Bước 4: Test với trận Tăng Tốc

```
Chọn một trận có game_mode = 'tangtoc'
Click "Xem"
```

**Kiểm tra:**
- [ ] Modal mở không lỗi
- [ ] Hiển thị đúng câu hỏi Tăng Tốc
- [ ] Không có lỗi `tangtoc_questions doesn't exist`

### ✅ Pass Criteria
- [x] Modal mở không lỗi
- [x] Hiển thị đầy đủ thông tin
- [x] Không có lỗi trong console
- [x] Cả trận Khởi Động và Tăng Tốc đều hoạt động

---

## 🧪 Test Case 5: Query Performance

### Mục tiêu
Kiểm tra query không bị chậm sau khi thêm cột và index.

### Bước 1: Test query lịch sử đấu

```sql
-- Query lịch sử đấu
EXPLAIN SELECT
  gs.id,
  gs.user_id,
  u.username,
  u.full_name,
  gs.is_solo,
  gs.game_mode,
  gs.score,
  gs.correct_answers,
  gs.total_questions,
  gs.started_at,
  gs.finished_at
FROM game_sessions gs
JOIN users u ON u.id = gs.user_id
WHERE gs.game_mode = 'tangtoc'
ORDER BY gs.started_at DESC
LIMIT 10;
```

**Kiểm tra:**
- [ ] Sử dụng index `idx_game_sessions_game_mode`
- [ ] Thời gian query < 100ms

### Bước 2: Test query chi tiết phiên chơi

```sql
-- Query chi tiết phiên chơi
EXPLAIN SELECT ua.*, q.text as question_text, q.answer, q.category
FROM user_answers ua
JOIN questions q ON ua.question_id = q.id
WHERE ua.session_id = 5656
ORDER BY ua.answered_at;
```

**Kiểm tra:**
- [ ] Sử dụng index trên `session_id`
- [ ] Thời gian query < 50ms

### ✅ Pass Criteria
- [x] Query sử dụng index đúng
- [x] Thời gian query nhanh
- [x] Không có full table scan

---

## 🧪 Test Case 6: Idempotent Migration

### Mục tiêu
Kiểm tra migration có thể chạy nhiều lần không lỗi.

### Bước 1: Restart lần 1

```bash
docker-compose restart kd
docker-compose logs -f kd | grep migration
```

**Kết quả mong đợi:**
```
⚙️  Đang chạy migration...
✅ Tất cả migrations đã hoàn tất!
```

### Bước 2: Restart lần 2

```bash
docker-compose restart kd
docker-compose logs -f kd | grep migration
```

**Kết quả mong đợi:**
```
⚙️  Đang chạy migration...
✅ Tất cả migrations đã hoàn tất!
(Không có lỗi "Column already exists")
```

### Bước 3: Restart lần 3

```bash
docker-compose restart kd
docker-compose logs -f kd | grep migration
```

**Kết quả mong đợi:**
```
⚙️  Đang chạy migration...
✅ Tất cả migrations đã hoàn tất!
(Vẫn không có lỗi)
```

### ✅ Pass Criteria
- [x] Restart nhiều lần không lỗi
- [x] Migration idempotent
- [x] Dữ liệu không bị mất

---

## 📊 Summary

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Migration game_mode | ⏳ Pending | |
| Lịch sử đấu Admin | ⏳ Pending | |
| Lịch sử đấu Cá nhân | ⏳ Pending | |
| Chi tiết phiên chơi | ⏳ Pending | |
| Query Performance | ⏳ Pending | |
| Idempotent Migration | ⏳ Pending | |

### Overall Status
- [ ] All tests passed
- [ ] Ready for production

---

## 🔧 Troubleshooting

### Lỗi: Column already exists

**Nguyên nhân:** Migration không idempotent

**Giải pháp:**
```sql
-- Xóa cột và chạy lại
ALTER TABLE game_sessions DROP COLUMN game_mode;
-- Restart server
```

### Lỗi: tangtoc_questions doesn't exist

**Nguyên nhân:** Code chưa được update

**Giải pháp:**
```bash
# Pull code mới
git pull
docker-compose restart kd
```

### Lỗi: Lịch sử đấu vẫn không hiển thị

**Nguyên nhân:** Dữ liệu cũ có `game_mode = NULL`

**Giải pháp:**
```sql
-- Update dữ liệu cũ
UPDATE game_sessions
SET game_mode = 'khoidong'
WHERE game_mode IS NULL;
```

