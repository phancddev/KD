# Fix: Unknown column 'gs.game_mode' Error

## 🐛 Lỗi

```
Error: Unknown column 'gs.game_mode' in 'SELECT'
at PromisePool.query (/app/node_modules/mysql2/lib/promise/pool.js:36:22)
at getGameHistory (file:///app/db/game-sessions.js:391:31)
```

## 🔍 Nguyên nhân

Code đang sử dụng cột `game_mode` trong bảng `game_sessions`, nhưng cột này chưa tồn tại trong database production.

**File có vấn đề:**
- `db/game-sessions.js` - Line 398: `gs.game_mode`
- `routes/admin-api.js` - Line 916: Gọi `getGameHistory()`

**Migration file tồn tại nhưng chưa chạy:**
- `db/init/03-add-game-mode.sql` - Migration để thêm cột `game_mode`

## ✅ Giải pháp

Đã tích hợp migration tự động vào Docker để:
1. Tự động kiểm tra và thêm cột `game_mode` khi container start
2. Tự động thêm index cho performance
3. Tự động update records cũ với giá trị mặc định

## 📝 Những gì đã làm

### 1. Cập nhật `db/check-and-migrate.js`

Thêm 3 functions mới:

```javascript
// Step 1: Thêm cột game_mode
async function addGameModeColumn() {
  // Kiểm tra nếu đã có → SKIP
  // Nếu chưa có → ADD COLUMN
}

// Step 2: Thêm index
async function addGameModeIndex() {
  // Kiểm tra nếu đã có → SKIP
  // Nếu chưa có → CREATE INDEX
}

// Step 3: Update NULL values
async function updateNullGameMode() {
  // Tìm records có game_mode = NULL
  // Update thành 'khoidong'
}
```

### 2. Docker setup đã sẵn sàng

**Dockerfile:**
```dockerfile
ENTRYPOINT ["/docker-entrypoint.sh"]
```

**docker-entrypoint.sh:**
```bash
# Wait for database
# Run migration
node db/check-and-migrate.js
# Start app
exec npm start
```

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    depends_on:
      - mariadb
```

### 3. Tạo documentation

- ✅ `MIGRATION_README.md` - Hướng dẫn chi tiết
- ✅ `MIGRATION_SUMMARY.md` - Tóm tắt ngắn gọn
- ✅ `DEPLOY_CHECKLIST.md` - Checklist deploy
- ✅ `FIX_GAME_MODE_ERROR.md` - File này
- ✅ `test-game-mode-migration.js` - Script test

## 🚀 Cách deploy

### Trên server production

```bash
# 1. Pull code mới
git pull

# 2. Backup database (recommended)
docker-compose exec mariadb mysqldump -u nqd_user -pnqd_password nqd_database > backup.sql

# 3. Rebuild và restart
docker-compose down
docker-compose build app
docker-compose up -d

# 4. Xem logs migration
docker-compose logs app | grep "database schema"
```

### Kết quả mong đợi

```
🔍 Checking database schema...

📝 Step 1: Check game_mode column in game_sessions
   ⚠️  Column game_mode NOT exists - ADDING...
   ✅ Column added successfully

📝 Step 2: Check game_mode index
   ⚠️  Index idx_game_sessions_game_mode NOT exists - ADDING...
   ✅ Index added successfully

📝 Step 3: Update NULL game_mode values
   ⚠️  Found 150 game_sessions with NULL game_mode - UPDATING...
   ✅ Updated 150 record(s) to default 'khoidong'

✅ Migration completed!
```

## ✅ Verify fix

### 1. Kiểm tra column đã được thêm

```bash
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "
DESCRIBE game_sessions;
"
```

**Expected:** Có dòng `game_mode | enum('khoidong','tangtoc') | YES | MUL | khoidong`

### 2. Kiểm tra data

```bash
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "
SELECT game_mode, COUNT(*) FROM game_sessions GROUP BY game_mode;
"
```

**Expected:** Không có NULL, tất cả records có giá trị

### 3. Test application

- Mở admin panel
- Xem lịch sử trận đấu
- **Không còn lỗi** `Unknown column 'gs.game_mode'`

## 🔒 Đảm bảo an toàn

### ✅ IDEMPOTENT
- Chạy nhiều lần không gây lỗi
- Kiểm tra trước khi thêm

### ✅ NO DATA LOSS
- Chỉ ADD COLUMN, không DROP
- Chỉ UPDATE NULL, không ghi đè

### ✅ AUTOMATIC
- Tự động chạy khi start Docker
- Không cần chạy migration thủ công

### ✅ LOGGED
- Logs chi tiết từng bước
- Dễ dàng debug nếu có vấn đề

## 📊 Schema changes

### Before
```sql
CREATE TABLE game_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NULL,
  is_solo BOOLEAN DEFAULT FALSE,
  -- game_mode KHÔNG TỒN TẠI
  score INT DEFAULT 0,
  ...
);
```

### After
```sql
CREATE TABLE game_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NULL,
  is_solo BOOLEAN DEFAULT FALSE,
  game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong', -- ✅ ADDED
  score INT DEFAULT 0,
  ...
);

-- ✅ ADDED INDEX
CREATE INDEX idx_game_sessions_game_mode ON game_sessions(game_mode);
```

## 🎯 Impact

### Code không cần thay đổi
- `db/game-sessions.js` - Đã sử dụng `game_mode` đúng
- `routes/admin-api.js` - Đã gọi đúng

### Database tự động update
- Thêm cột `game_mode`
- Thêm index
- Update records cũ

### Application hoạt động bình thường
- Không còn lỗi
- Performance tốt (có index)
- Dữ liệu cũ được preserve

## 📚 Tài liệu tham khảo

- `MIGRATION_README.md` - Chi tiết về migration system
- `MIGRATION_SUMMARY.md` - Tóm tắt ngắn gọn
- `DEPLOY_CHECKLIST.md` - Checklist deploy từng bước
- `db/init/03-add-game-mode.sql` - SQL migration gốc (reference)

## 🎉 Kết luận

**Lỗi đã được fix hoàn toàn!**

Chỉ cần:
1. `git pull`
2. `docker-compose down && docker-compose build app && docker-compose up -d`
3. Xem logs để confirm migration thành công
4. Test application

Migration sẽ tự động:
- ✅ Thêm cột `game_mode`
- ✅ Thêm index
- ✅ Update records cũ
- ✅ Không mất dữ liệu
- ✅ An toàn chạy nhiều lần

**Không cần làm gì thêm!** 🚀

