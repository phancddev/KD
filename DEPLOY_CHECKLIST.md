# Deploy Checklist - Migration game_mode

## ✅ Pre-Deploy Verification

### 1. Kiểm tra files đã được cập nhật

```bash
# Trong thư mục KD/
ls -la docker-entrypoint.sh
ls -la Dockerfile
ls -la docker-compose.yml
ls -la db/check-and-migrate.js
```

**Expected:**
- ✅ `docker-entrypoint.sh` - Có dòng `node db/check-and-migrate.js`
- ✅ `Dockerfile` - Có dòng `ENTRYPOINT ["/docker-entrypoint.sh"]`
- ✅ `docker-compose.yml` - Service app có `build: .`
- ✅ `db/check-and-migrate.js` - Có functions `addGameModeColumn()`, `addGameModeIndex()`, `updateNullGameMode()`

### 2. Kiểm tra git status

```bash
git status
```

**Expected:**
```
modified:   db/check-and-migrate.js
new file:   MIGRATION_README.md
new file:   MIGRATION_SUMMARY.md
new file:   DEPLOY_CHECKLIST.md
new file:   test-game-mode-migration.js
```

### 3. Review changes

```bash
git diff db/check-and-migrate.js
```

**Verify:**
- ✅ Có function `addGameModeColumn()` (line ~123)
- ✅ Có function `addGameModeIndex()` (line ~147)
- ✅ Có function `updateNullGameMode()` (line ~168)
- ✅ Trong `checkAndMigrate()` có Step 1-3 cho game_mode

## 📦 Deploy Steps

### Step 1: Commit và push

```bash
cd KD/

git add .
git commit -m "Add automatic migration for game_mode column

- Add game_mode ENUM('khoidong', 'tangtoc') to game_sessions
- Add index idx_game_sessions_game_mode
- Update existing records with default 'khoidong'
- Migration runs automatically on Docker start
- Idempotent and safe for production data"

git push origin main
```

### Step 2: Deploy trên server

```bash
# SSH vào server
ssh user@your-server

# Vào thư mục project
cd /path/to/KD-app/KD

# Pull code mới
git pull

# Backup database (OPTIONAL nhưng RECOMMENDED)
docker-compose exec mariadb mysqldump -u nqd_user -pnqd_password nqd_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Stop containers
docker-compose down

# Rebuild app container
docker-compose build app

# Start containers
docker-compose up -d
```

### Step 3: Monitor logs

```bash
# Xem logs real-time
docker-compose logs -f app

# Hoặc xem logs migration
docker-compose logs app | grep -A 50 "Checking database schema"
```

**Expected output:**
```
🔍 Checking database schema...

📝 Step 1: Check game_mode column in game_sessions
   ⚠️  Column game_mode NOT exists - ADDING...
   ✅ Column added successfully

📝 Step 2: Check game_mode index
   ⚠️  Index idx_game_sessions_game_mode NOT exists - ADDING...
   ✅ Index added successfully

📝 Step 3: Update NULL game_mode values
   ⚠️  Found XXX game_sessions with NULL game_mode - UPDATING...
   ✅ Updated XXX record(s) to default 'khoidong'

✅ Migration completed!

========================================
✅ Database migration completed!
========================================

🚀 Starting application...
```

### Step 4: Verify migration

```bash
# Option 1: Chạy test script
docker-compose exec app node test-game-mode-migration.js

# Option 2: Kiểm tra database trực tiếp
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "
DESCRIBE game_sessions;
"

# Option 3: Kiểm tra data
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "
SELECT game_mode, COUNT(*) as count 
FROM game_sessions 
GROUP BY game_mode;
"
```

**Expected:**
```
# DESCRIBE game_sessions
+------------------+--------------------------------+------+-----+-------------------+
| Field            | Type                           | Null | Key | Default           |
+------------------+--------------------------------+------+-----+-------------------+
| id               | int(11)                        | NO   | PRI | NULL              |
| user_id          | int(11)                        | NO   | MUL | NULL              |
| room_id          | int(11)                        | YES  | MUL | NULL              |
| is_solo          | tinyint(1)                     | YES  |     | 0                 |
| game_mode        | enum('khoidong','tangtoc')     | YES  | MUL | khoidong          |
| score            | int(11)                        | YES  |     | 0                 |
...

# SELECT game_mode, COUNT(*)
+-----------+-------+
| game_mode | count |
+-----------+-------+
| khoidong  | XXX   |
| tangtoc   | YYY   |
+-----------+-------+
```

### Step 5: Test application

```bash
# Kiểm tra app đang chạy
curl http://localhost:2701

# Hoặc mở browser
# http://your-server:2701
```

**Test:**
- ✅ Login thành công
- ✅ Xem lịch sử trận đấu (không còn lỗi `Unknown column 'gs.game_mode'`)
- ✅ Chơi game mới
- ✅ Admin panel hoạt động

## 🔍 Troubleshooting

### Migration failed

```bash
# Xem logs chi tiết
docker-compose logs app | tail -100

# Chạy migration thủ công
docker-compose exec app node db/check-and-migrate.js

# Nếu vẫn lỗi, kiểm tra database
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database
```

### Container không start

```bash
# Kiểm tra status
docker-compose ps

# Xem logs
docker-compose logs app

# Restart
docker-compose restart app
```

### Database connection timeout

```bash
# Kiểm tra database
docker-compose ps mariadb

# Restart database
docker-compose restart mariadb

# Đợi 10s
sleep 10

# Restart app
docker-compose restart app
```

## ✅ Post-Deploy Verification

### 1. Kiểm tra logs không có lỗi

```bash
docker-compose logs app | grep -i error
docker-compose logs app | grep -i "Unknown column"
```

**Expected:** Không có lỗi `Unknown column 'gs.game_mode'`

### 2. Kiểm tra application hoạt động

- [ ] Login thành công
- [ ] Xem lịch sử trận đấu
- [ ] Tạo phòng mới
- [ ] Chơi game solo
- [ ] Admin panel

### 3. Kiểm tra database

```bash
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN game_mode IS NULL THEN 1 ELSE 0 END) as null_count,
  SUM(CASE WHEN game_mode = 'khoidong' THEN 1 ELSE 0 END) as khoidong_count,
  SUM(CASE WHEN game_mode = 'tangtoc' THEN 1 ELSE 0 END) as tangtoc_count
FROM game_sessions;
"
```

**Expected:**
- `null_count` = 0 (không có NULL)
- `khoidong_count` + `tangtoc_count` = `total`

## 📊 Rollback Plan (Nếu cần)

### Option 1: Rollback code

```bash
# Quay lại commit trước
git log --oneline -5
git reset --hard <previous-commit-hash>
git push -f origin main

# Trên server
git pull
docker-compose down
docker-compose build app
docker-compose up -d
```

### Option 2: Xóa column thủ công

```bash
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "
ALTER TABLE game_sessions DROP COLUMN game_mode;
DROP INDEX idx_game_sessions_game_mode ON game_sessions;
"
```

**⚠️ LƯU Ý:** Migration này an toàn, không cần rollback trong hầu hết trường hợp!

## 🎉 Success Criteria

- ✅ Container start thành công
- ✅ Migration logs hiển thị "Migration completed"
- ✅ Column `game_mode` tồn tại trong `game_sessions`
- ✅ Không có records với `game_mode = NULL`
- ✅ Application hoạt động bình thường
- ✅ Không có lỗi `Unknown column 'gs.game_mode'`

## 📞 Support

Nếu gặp vấn đề:
1. Xem logs: `docker-compose logs app`
2. Kiểm tra database: `docker-compose exec mariadb mysql ...`
3. Đọc `MIGRATION_README.md` để biết chi tiết
4. Chạy test: `docker-compose exec app node test-game-mode-migration.js`

