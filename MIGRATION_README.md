# Database Migration System

## Tổng quan

Hệ thống migration tự động được tích hợp vào Docker để đảm bảo database schema luôn được cập nhật khi deploy.

## Cách hoạt động

### 1. Khi khởi động Docker

```
Docker Start
    ↓
Wait for Database (max 60s)
    ↓
Run db/check-and-migrate.js
    ↓
Check & Apply Migrations (IDEMPOTENT)
    ↓
Start Application
```

### 2. Migration được chạy tự động

File `docker-entrypoint.sh` sẽ:
1. Đợi database sẵn sàng
2. Chạy `node db/check-and-migrate.js`
3. Nếu thành công → Start app
4. Nếu thất bại → Dừng container và hiển thị lỗi

### 3. Migrations hiện tại

File `db/check-and-migrate.js` kiểm tra và thêm:

#### Step 1-3: game_mode column
- **Bảng**: `game_sessions`
- **Cột**: `game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong'`
- **Index**: `idx_game_sessions_game_mode`
- **Update**: Set `game_mode = 'khoidong'` cho records NULL

#### Step 4-5: storage_folder column
- **Bảng**: `matches`
- **Cột**: `storage_folder VARCHAR(255) NULL`
- **Index**: `idx_storage_folder`

#### Step 6: match_questions schema
- **Cột**: `answer_text`, `answer_options`, `points`, `time_limit`

#### Step 7-8: Data migration
- Kiểm tra và cập nhật NULL values

## Đặc điểm quan trọng

### ✅ IDEMPOTENT (An toàn chạy nhiều lần)

```javascript
// Luôn kiểm tra trước khi thêm
if (columnExists) {
  console.log('✅ Already exists - SKIP');
  return false;
}

// Chỉ thêm khi chưa có
await pool.query('ALTER TABLE ...');
```

### ✅ Không mất dữ liệu

- Chỉ **ADD COLUMN**, không DROP
- Chỉ **UPDATE NULL**, không ghi đè dữ liệu có sẵn
- Có error handling cho từng bước

### ✅ Tự động với Docker

- Không cần chạy migration thủ công
- Mỗi lần restart container = tự động check migration
- Logs chi tiết để debug

## Sử dụng

### Deploy lên server có sẵn dữ liệu

```bash
# 1. Pull code mới
git pull

# 2. Rebuild và restart Docker
docker-compose down
docker-compose build app
docker-compose up -d

# 3. Xem logs migration
docker-compose logs app | grep "Checking database schema"
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

📝 Step 4: Check storage_folder column
   ✅ Column storage_folder already exists - SKIP

📝 Step 5: Check storage_folder index
   ✅ Index idx_storage_folder already exists - SKIP

📝 Step 6: Fix match_questions schema
   ✅ match_questions schema already complete - SKIP

✅ Migration completed!

📊 Step 7: Check existing matches
   Found 10 match(es)
   ✅ With storage_folder: 10
   ⚠️  Without storage_folder: 0

📝 Step 8: Update NULL values
   ✅ All matches already have storage_folder - SKIP

========================================
✅ Database migration completed!
========================================

🚀 Starting application...
```

### Nếu migration đã chạy rồi

```
🔍 Checking database schema...

📝 Step 1: Check game_mode column in game_sessions
   ✅ Column game_mode already exists - SKIP

📝 Step 2: Check game_mode index
   ✅ Index idx_game_sessions_game_mode already exists - SKIP

📝 Step 3: Update NULL game_mode values
   ✅ All game_sessions already have game_mode - SKIP

...

✅ Schema already up to date - no migration needed

========================================
✅ Database migration completed!
========================================
```

## Thêm migration mới

### 1. Thêm function kiểm tra

```javascript
async function addNewColumn() {
  const hasColumn = await columnExists('table_name', 'column_name');
  
  if (hasColumn) {
    console.log('   ✅ Column already exists - SKIP');
    return false;
  }
  
  console.log('   ⚠️  Column NOT exists - ADDING...');
  
  await pool.query(`
    ALTER TABLE table_name
    ADD COLUMN column_name TYPE DEFAULT value
    COMMENT 'Description'
  `);
  
  console.log('   ✅ Column added successfully');
  return true;
}
```

### 2. Thêm vào checkAndMigrate()

```javascript
console.log('\n📝 Step X: Check new column');
const newColumnAdded = await addNewColumn();
anyChanges = anyChanges || newColumnAdded;
```

### 3. Test local

```bash
node db/check-and-migrate.js
```

### 4. Deploy

```bash
git add .
git commit -m "Add new migration"
git push
```

## Troubleshooting

### Migration failed

```bash
# Xem logs chi tiết
docker-compose logs app

# Chạy migration thủ công trong container
docker-compose exec app node db/check-and-migrate.js
```

### Database connection timeout

```bash
# Kiểm tra database
docker-compose ps mariadb

# Restart database
docker-compose restart mariadb

# Đợi 10s rồi restart app
docker-compose restart app
```

### Rollback migration

Migration này **KHÔNG HỖ TRỢ ROLLBACK** vì:
- Chỉ ADD, không DROP
- Chỉ UPDATE NULL, không ghi đè
- An toàn với dữ liệu có sẵn

Nếu cần rollback:
```sql
-- Thủ công trong database
ALTER TABLE table_name DROP COLUMN column_name;
```

## Files liên quan

```
KD/
├── Dockerfile                    # Build image với entrypoint
├── docker-compose.yml            # Service configuration
├── docker-entrypoint.sh          # Chạy migration trước khi start app
├── db/
│   ├── check-and-migrate.js      # Migration logic (IDEMPOTENT)
│   └── init/
│       ├── 01-init.sql           # Initial schema (chỉ cho DB mới)
│       ├── 02-create-admin.sql   # Create admin user
│       ├── 03-add-game-mode.sql  # Migration SQL (reference only)
│       └── ...
└── test-game-mode-migration.js   # Test script (optional)
```

## Lưu ý quan trọng

1. **Migration tự động chạy mỗi khi restart container**
2. **An toàn chạy nhiều lần** (idempotent)
3. **Không mất dữ liệu** (chỉ ADD và UPDATE NULL)
4. **Logs chi tiết** để theo dõi
5. **Fail-safe**: Nếu migration lỗi, container sẽ dừng

## Kết luận

Hệ thống migration này đảm bảo:
- ✅ Database schema luôn đúng version
- ✅ Không cần chạy migration thủ công
- ✅ An toàn với dữ liệu production
- ✅ Dễ dàng thêm migration mới
- ✅ Logs rõ ràng để debug

