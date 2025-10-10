# Fix: Lịch sử đấu Tăng Tốc không hiển thị

## 🐛 Vấn đề

Trên server có sẵn dữ liệu, lịch sử đấu của admin và lịch sử đấu cá nhân **KHÔNG hiển thị** các trận tăng tốc.

## 🔍 Nguyên nhân

### 1. Thiếu cột `game_mode` trong bảng `game_sessions`

File `03-add-game-mode.sql` tồn tại nhưng **KHÔNG được load** trong hàm `initDatabase()` ở `db/index.js`:

```javascript
// db/index.js - Line 36-40
const initSqlPath = path.join(process.cwd(), 'db', 'init', '01-init.sql');
const tangtocSqlPath = path.join(process.cwd(), 'db', 'init', '01-tangtoc-migration.sql');
const adminSqlPath = path.join(process.cwd(), 'db', 'init', '02-create-admin.sql');
const tangtocReportsSqlPath = path.join(process.cwd(), 'db', 'init', '02-tangtoc-reports-migration.sql');
const dataNodesSqlPath = path.join(process.cwd(), 'db', 'init', '04-host-dan-data-node-migration.sql');
// ❌ THIẾU: 03-add-game-mode.sql
```

### 2. Hàm `runMigrations()` không có migration cho `game_mode`

Hàm `runMigrations()` được gọi sau khi init database, nhưng **KHÔNG có** migration để thêm cột `game_mode`:

```javascript
// db/index.js - Line 333-352
async function runMigrations() {
  try {
    // Migration cho hệ thống Tăng Tốc
    await ensureColumnExists('questions', 'question_number', ...);
    await ensureColumnExists('questions', 'image_url', ...);
    await ensureColumnExists('questions', 'time_limit', ...);
    
    // ❌ THIẾU: Migration cho game_mode
    
    // Đảm bảo cột accepted_answers tồn tại trong question_reports
    await ensureColumnExists('question_reports', 'accepted_answers', ...);
    ...
  }
}
```

### 3. Kết quả

- Server mới: Cột `game_mode` **KHÔNG được tạo**
- Server có sẵn dữ liệu: Cột `game_mode` **KHÔNG tồn tại**
- Query lịch sử đấu: **LỖI** vì thiếu cột `game_mode`
- Lịch sử đấu tăng tốc: **KHÔNG hiển thị**

## ✅ Giải pháp

### 1. Thêm migration cho `game_mode` vào `runMigrations()`

**File:** `db/index.js`

```javascript
// Line 354-368 (MỚI)
// ===== MIGRATION CHO GAME_MODE =====
// Đảm bảo cột game_mode tồn tại trong game_sessions
await ensureColumnExists(
  'game_sessions',
  'game_mode',
  "ADD COLUMN game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong' COMMENT 'Chế độ chơi: khoidong hoặc tangtoc' AFTER is_solo"
);

// Tạo index cho game_mode (nếu chưa có)
try {
  await pool.query('CREATE INDEX idx_game_sessions_game_mode ON game_sessions(game_mode)');
  console.log('✅ Đã tạo index idx_game_sessions_game_mode');
} catch (e) {
  // Index đã tồn tại, bỏ qua
}
```

### 2. Cập nhật file `01-init.sql`

**File:** `db/init/01-init.sql`

```sql
-- Line 68-83 (CẬP NHẬT)
CREATE TABLE IF NOT EXISTS game_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NULL,
  is_solo BOOLEAN DEFAULT FALSE,
  game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong' COMMENT 'Chế độ chơi: khoidong hoặc tangtoc',  -- ✅ THÊM
  score INT DEFAULT 0,
  total_questions INT NOT NULL,
  correct_answers INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);
```

### 3. Cập nhật fallback `createBasicTables()`

**File:** `db/index.js`

```javascript
// Line 189-206 (CẬP NHẬT)
// Tạo bảng game_sessions
await pool.query(`
  CREATE TABLE IF NOT EXISTS game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NULL,
    is_solo BOOLEAN DEFAULT FALSE,
    game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong' COMMENT 'Chế độ chơi: khoidong hoặc tangtoc',  -- ✅ THÊM
    score INT DEFAULT 0,
    total_questions INT NOT NULL,
    correct_answers INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
  )
`);
```

### 4. Bonus: Thêm migration cho `storage_folder`

**File:** `db/index.js`

```javascript
// Line 855-869 (MỚI)
// ===== MIGRATION CHO STORAGE_FOLDER =====
// Đảm bảo cột storage_folder tồn tại trong matches
await ensureColumnExists(
  'matches',
  'storage_folder',
  "ADD COLUMN storage_folder VARCHAR(255) NULL COMMENT 'Tên folder lưu trữ trên Data Node (format: YYYYMMDD_CODE_TenTran)' AFTER data_node_id"
);

// Tạo index cho storage_folder (nếu chưa có)
try {
  await pool.query('CREATE INDEX idx_storage_folder ON matches(storage_folder)');
  console.log('✅ Đã tạo index idx_storage_folder');
} catch (e) {
  // Index đã tồn tại, bỏ qua
}
```

## 🎯 Nguyên tắc Migration

### ✅ Đúng: Idempotent Migration

```javascript
// Kiểm tra trước khi thêm
await ensureColumnExists('table_name', 'column_name', 'ALTER TABLE ...');

// Hoặc
try {
  await pool.query('CREATE INDEX ...');
} catch (e) {
  // Index đã tồn tại, bỏ qua
}
```

**Ưu điểm:**
- ✅ Chạy nhiều lần không lỗi
- ✅ An toàn với database có sẵn dữ liệu
- ✅ Không cần rollback
- ✅ Tự động phát hiện và bỏ qua nếu đã có

### ❌ Sai: Non-idempotent Migration

```javascript
// Không kiểm tra, thêm trực tiếp
await pool.query('ALTER TABLE game_sessions ADD COLUMN game_mode ...');
// ❌ Lỗi nếu cột đã tồn tại
```

**Nhược điểm:**
- ❌ Chạy lần 2 sẽ lỗi
- ❌ Không an toàn với database có sẵn
- ❌ Cần rollback nếu lỗi
- ❌ Phải xóa thủ công nếu chạy lại

## 📋 Checklist Triển khai

### Trên Server Mới (chưa có dữ liệu)

- [x] Cập nhật code `db/index.js`
- [x] Cập nhật file `db/init/01-init.sql`
- [x] Restart server
- [x] Cột `game_mode` được tạo tự động
- [x] Lịch sử đấu hiển thị đúng

### Trên Server Có Sẵn Dữ liệu

- [x] Cập nhật code `db/index.js`
- [x] Restart server
- [x] Migration tự động chạy
- [x] Cột `game_mode` được thêm vào
- [x] Dữ liệu cũ không bị mất
- [x] Lịch sử đấu hiển thị đúng

## 🧪 Kiểm tra

### 1. Kiểm tra cột `game_mode`

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
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

### 2. Kiểm tra index

```sql
SELECT INDEX_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'game_sessions'
  AND INDEX_NAME = 'idx_game_sessions_game_mode';
```

**Kết quả mong đợi:**
```
INDEX_NAME: idx_game_sessions_game_mode
COLUMN_NAME: game_mode
```

### 3. Kiểm tra dữ liệu

```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN game_mode = 'khoidong' THEN 1 ELSE 0 END) as khoidong_count,
  SUM(CASE WHEN game_mode = 'tangtoc' THEN 1 ELSE 0 END) as tangtoc_count,
  SUM(CASE WHEN game_mode IS NULL THEN 1 ELSE 0 END) as null_count
FROM game_sessions;
```

### 4. Test lịch sử đấu

```bash
# Chạy script test
node test-game-mode-migration.js
```

## 📝 Files Changed

### Modified

1. **db/index.js**
   - Line 189-206: Thêm `game_mode` vào `createBasicTables()`
   - Line 354-368: Thêm migration cho `game_mode`
   - Line 855-869: Thêm migration cho `storage_folder`

2. **db/init/01-init.sql**
   - Line 68-83: Thêm `game_mode` vào CREATE TABLE

### Created

3. **FIX-GAME-MODE-MIGRATION.md** (file này)
   - Tài liệu chi tiết về vấn đề và giải pháp

## 🎉 Kết quả

- ✅ Cột `game_mode` được tạo tự động trên mọi server
- ✅ Migration an toàn, idempotent
- ✅ Không cần chạy SQL thủ công
- ✅ Lịch sử đấu tăng tốc hiển thị đúng
- ✅ Dữ liệu cũ không bị mất
- ✅ Có thể chạy nhiều lần không lỗi

## 🔗 Related Files

- `db/index.js` - File chính chứa logic migration
- `db/init/01-init.sql` - File SQL khởi tạo database
- `db/init/03-add-game-mode.sql` - File migration riêng (không được dùng)
- `test-game-mode-migration.js` - Script test migration

