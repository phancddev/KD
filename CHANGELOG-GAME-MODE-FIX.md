# CHANGELOG - Fix Lịch sử đấu Tăng Tốc

**Date:** 2025-10-10  
**Version:** 1.2.4  
**Type:** Bug Fix

## 🐛 Vấn đề

Lịch sử đấu của admin và lịch sử đấu cá nhân **KHÔNG hiển thị** các trận tăng tốc trên server có sẵn dữ liệu.

## 🔍 Nguyên nhân

Cột `game_mode` trong bảng `game_sessions` không được tạo khi khởi tạo database:

1. File `03-add-game-mode.sql` tồn tại nhưng **KHÔNG được load** trong `initDatabase()`
2. Hàm `runMigrations()` **KHÔNG có** migration để thêm cột `game_mode`
3. Kết quả: Server có sẵn dữ liệu thiếu cột `game_mode` → lịch sử đấu tăng tốc không hiển thị

## ✅ Giải pháp

### 1. Thêm migration idempotent cho `game_mode`

**File:** `db/index.js` (Line 354-368)

```javascript
// ===== MIGRATION CHO GAME_MODE =====
await ensureColumnExists(
  'game_sessions',
  'game_mode',
  "ADD COLUMN game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong' COMMENT 'Chế độ chơi: khoidong hoặc tangtoc' AFTER is_solo"
);

// Tạo index
try {
  await pool.query('CREATE INDEX idx_game_sessions_game_mode ON game_sessions(game_mode)');
  console.log('✅ Đã tạo index idx_game_sessions_game_mode');
} catch (e) {
  // Index đã tồn tại, bỏ qua
}
```

### 2. Cập nhật file SQL khởi tạo

**File:** `db/init/01-init.sql` (Line 68-83)

```sql
CREATE TABLE IF NOT EXISTS game_sessions (
  ...
  is_solo BOOLEAN DEFAULT FALSE,
  game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong' COMMENT 'Chế độ chơi: khoidong hoặc tangtoc',
  score INT DEFAULT 0,
  ...
);
```

### 3. Cập nhật fallback function

**File:** `db/index.js` (Line 189-206)

```javascript
// Tạo bảng game_sessions (trong createBasicTables)
await pool.query(`
  CREATE TABLE IF NOT EXISTS game_sessions (
    ...
    is_solo BOOLEAN DEFAULT FALSE,
    game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong' COMMENT 'Chế độ chơi: khoidong hoặc tangtoc',
    score INT DEFAULT 0,
    ...
  )
`);
```

### 4. Bonus: Migration cho `storage_folder`

**File:** `db/index.js` (Line 855-869)

```javascript
// ===== MIGRATION CHO STORAGE_FOLDER =====
await ensureColumnExists(
  'matches',
  'storage_folder',
  "ADD COLUMN storage_folder VARCHAR(255) NULL COMMENT 'Tên folder lưu trữ trên Data Node' AFTER data_node_id"
);
```

## 📋 Files Changed

### Modified

1. **db/index.js**
   - Thêm migration cho `game_mode` trong `runMigrations()`
   - Thêm `game_mode` vào `createBasicTables()`
   - Thêm migration cho `storage_folder`

2. **db/init/01-init.sql**
   - Thêm cột `game_mode` vào CREATE TABLE game_sessions

### Created

3. **FIX-GAME-MODE-MIGRATION.md**
   - Tài liệu chi tiết về vấn đề và giải pháp

4. **CHANGELOG-GAME-MODE-FIX.md** (file này)
   - Changelog ngắn gọn

## 🎯 Nguyên tắc

### ✅ Idempotent Migration

- Kiểm tra trước khi thêm: `ensureColumnExists()`
- Có thể chạy nhiều lần không lỗi
- An toàn với database có sẵn dữ liệu
- Không cần rollback

### ❌ Tránh Non-idempotent

- Không kiểm tra, thêm trực tiếp
- Chạy lần 2 sẽ lỗi
- Không an toàn với database có sẵn

## 🧪 Kiểm tra

### 1. Kiểm tra cột

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'game_sessions'
  AND COLUMN_NAME = 'game_mode';
```

### 2. Test migration

```bash
node test-game-mode-migration.js
```

## 🎉 Kết quả

- ✅ Cột `game_mode` được tạo tự động trên mọi server
- ✅ Migration an toàn, idempotent
- ✅ Không cần chạy SQL thủ công
- ✅ Lịch sử đấu tăng tốc hiển thị đúng
- ✅ Dữ liệu cũ không bị mất

## 📝 Deployment

### Server Mới

1. Pull code mới
2. Restart server
3. Cột `game_mode` được tạo tự động

### Server Có Sẵn Dữ liệu

1. Pull code mới
2. Restart server
3. Migration tự động chạy
4. Cột `game_mode` được thêm vào
5. Dữ liệu cũ không bị mất

## 🔗 Related

- Issue: Lịch sử đấu tăng tốc không hiển thị
- Root Cause: Thiếu cột `game_mode`
- Solution: Thêm idempotent migration
- Impact: Tất cả server (mới và cũ)

