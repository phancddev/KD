# 🚀 START HERE - Fix game_mode Error

## ❓ Vấn đề
```
Error: Unknown column 'gs.game_mode' in 'SELECT'
```

## ✅ Giải pháp
Đã thêm automatic migration vào Docker. Khi restart container → tự động fix.

## 🎯 Cần làm gì?

### Trên server production:

```bash
# 1. Pull code
git pull

# 2. Restart Docker
docker-compose down
docker-compose build app
docker-compose up -d

# 3. Xem logs (optional)
docker-compose logs app | grep "database schema"
```

**Xong!** Lỗi sẽ biến mất.

## 📋 Kết quả mong đợi

```
📝 Step 1: Check game_mode column in game_sessions
   ⚠️  Column NOT exists - ADDING...
   ✅ Column added successfully

📝 Step 2: Check game_mode index
   ✅ Index added successfully

📝 Step 3: Update NULL game_mode values
   ✅ Updated XXX record(s)

✅ Migration completed!
🚀 Starting application...
```

## ✅ Verify

```bash
# Test app
# - Login admin panel
# - Xem lịch sử trận đấu
# - Không còn lỗi!
```

## 📚 Đọc thêm

- `README_DEPLOY.md` - Hướng dẫn deploy chi tiết
- `FIX_GAME_MODE_ERROR.md` - Giải thích lỗi
- `MIGRATION_README.md` - Chi tiết migration system
- `DEPLOY_CHECKLIST.md` - Checklist đầy đủ

## ❓ FAQ

**Q: An toàn không?**  
A: Có! Chỉ ADD column, không xóa dữ liệu.

**Q: Nếu đã chạy rồi?**  
A: Không sao! Migration sẽ SKIP.

**Q: Cần backup không?**  
A: Recommended nhưng không bắt buộc.

---

**🎉 Chỉ cần 3 lệnh là xong!**

```bash
git pull
docker-compose down && docker-compose build app && docker-compose up -d
docker-compose logs app
```

