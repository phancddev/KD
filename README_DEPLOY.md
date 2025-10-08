# 🚀 Deploy Guide - Fix game_mode Error

## ⚡ Quick Start (TL;DR)

```bash
# Trên server production
git pull
docker-compose down
docker-compose build app
docker-compose up -d

# Xem logs
docker-compose logs app | grep "database schema"
```

**Xong!** Migration tự động chạy, lỗi sẽ biến mất.

---

## 📋 Chi tiết

### 1️⃣ Lỗi gì?

```
Error: Unknown column 'gs.game_mode' in 'SELECT'
```

- Code dùng cột `game_mode` nhưng database chưa có
- Xảy ra khi xem lịch sử trận đấu trong admin panel

### 2️⃣ Fix như thế nào?

- ✅ Đã thêm migration tự động vào Docker
- ✅ Khi restart container → tự động thêm cột `game_mode`
- ✅ Tự động update dữ liệu cũ
- ✅ An toàn, không mất dữ liệu

### 3️⃣ Cần làm gì?

**Trên server:**

```bash
# Bước 1: Pull code mới
cd /path/to/KD-app/KD
git pull

# Bước 2: Rebuild Docker
docker-compose down
docker-compose build app
docker-compose up -d

# Bước 3: Xem logs (optional)
docker-compose logs app | grep "Checking database schema"
```

### 4️⃣ Kết quả mong đợi

```
🔍 Checking database schema...

📝 Step 1: Check game_mode column in game_sessions
   ⚠️  Column game_mode NOT exists - ADDING...
   ✅ Column added successfully

📝 Step 2: Check game_mode index
   ⚠️  Index NOT exists - ADDING...
   ✅ Index added successfully

📝 Step 3: Update NULL game_mode values
   ⚠️  Found XXX game_sessions - UPDATING...
   ✅ Updated XXX record(s)

✅ Migration completed!
🚀 Starting application...
```

### 5️⃣ Verify

```bash
# Test 1: Kiểm tra column
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "DESCRIBE game_sessions;"

# Test 2: Kiểm tra data
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "SELECT game_mode, COUNT(*) FROM game_sessions GROUP BY game_mode;"

# Test 3: Test app
# - Mở admin panel
# - Xem lịch sử trận đấu
# - Không còn lỗi!
```

---

## 📚 Documentation

| File | Nội dung |
|------|----------|
| `README_DEPLOY.md` | **File này** - Hướng dẫn deploy nhanh |
| `FIX_GAME_MODE_ERROR.md` | Giải thích lỗi và cách fix |
| `MIGRATION_SUMMARY.md` | Tóm tắt migration system |
| `MIGRATION_README.md` | Hướng dẫn chi tiết |
| `DEPLOY_CHECKLIST.md` | Checklist đầy đủ |
| `CHANGES_SUMMARY.md` | Tóm tắt thay đổi |

---

## ❓ FAQ

### Q: Migration có an toàn không?
**A:** Có! Migration:
- ✅ Chỉ ADD column, không DROP
- ✅ Chỉ UPDATE NULL, không ghi đè dữ liệu
- ✅ Có thể chạy nhiều lần (idempotent)
- ✅ Có logs chi tiết

### Q: Nếu đã chạy migration rồi thì sao?
**A:** Không sao! Migration sẽ:
```
✅ Column game_mode already exists - SKIP
✅ Index already exists - SKIP
✅ All game_sessions already have game_mode - SKIP
```

### Q: Cần backup database không?
**A:** Recommended nhưng không bắt buộc (migration rất an toàn)
```bash
docker-compose exec mariadb mysqldump -u nqd_user -pnqd_password nqd_database > backup.sql
```

### Q: Nếu migration fail thì sao?
**A:** Container sẽ dừng và hiển thị lỗi. Xem logs:
```bash
docker-compose logs app
```

### Q: Cần chạy migration thủ công không?
**A:** KHÔNG! Docker tự động chạy khi start.

---

## 🎯 Summary

**Những gì đã làm:**
- ✅ Cập nhật `db/check-and-migrate.js`
- ✅ Thêm migration cho `game_mode` column
- ✅ Tạo documentation đầy đủ

**Những gì bạn cần làm:**
1. `git pull`
2. `docker-compose down && docker-compose build app && docker-compose up -d`
3. Xem logs để confirm
4. Test application

**Kết quả:**
- ✅ Lỗi `Unknown column 'gs.game_mode'` biến mất
- ✅ Admin panel hoạt động bình thường
- ✅ Dữ liệu cũ được preserve
- ✅ Performance tốt (có index)

---

## 🆘 Support

Nếu gặp vấn đề:

1. **Xem logs:**
   ```bash
   docker-compose logs app
   ```

2. **Kiểm tra database:**
   ```bash
   docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database
   ```

3. **Chạy test:**
   ```bash
   docker-compose exec app node test-game-mode-migration.js
   ```

4. **Đọc docs:**
   - `FIX_GAME_MODE_ERROR.md` - Giải thích lỗi
   - `MIGRATION_README.md` - Chi tiết migration
   - `DEPLOY_CHECKLIST.md` - Checklist đầy đủ

---

## ✅ Checklist

- [ ] Pull code mới: `git pull`
- [ ] Stop containers: `docker-compose down`
- [ ] Rebuild app: `docker-compose build app`
- [ ] Start containers: `docker-compose up -d`
- [ ] Xem logs migration: `docker-compose logs app | grep "database schema"`
- [ ] Verify column: `DESCRIBE game_sessions`
- [ ] Test application: Xem lịch sử trận đấu
- [ ] Confirm: Không còn lỗi `Unknown column`

---

**🎉 Xong! Chúc deploy thành công!**

