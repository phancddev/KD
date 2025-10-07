# 🚀 HƯỚNG DẪN DEPLOY NHANH - BẢN VÁ LỖI TĂNG TỐC

## ✅ CÁC VẤN ĐỀ ĐÃ ĐƯỢC SỬA

1. ✅ **Bảng `tangtoc_question_reports` không được tạo khi khởi tạo database**
2. ✅ **Lỗi "Table doesn't exist" khi báo lỗi câu hỏi Tăng Tốc**
3. ✅ **Lỗi "Internal server error" ở `/api/admin/tangtoc-reports`**
4. ✅ **Xung đột tên cột `image_url` vs `question_image_url`**

---

## 📋 DEPLOY CHO HỆ THỐNG ĐANG CHẠY

### **Bước 1: Backup (BẮT BUỘC)**
```bash
docker-compose exec mariadb mysqldump -u nqd_user -pnqd_password nqd_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Bước 2: Pull code mới**
```bash
git pull
```

### **Bước 3: Restart app**
```bash
docker-compose restart app
```

### **Bước 4: Verify migration**
```bash
./verify_tangtoc_migration.sh
```

**Kết quả mong đợi:**
```
✅ MIGRATION HOÀN TẤT THÀNH CÔNG!
```

---

## 🆕 DEPLOY CHO HỆ THỐNG MỚI

```bash
# 1. Clone code
git clone <repo_url>
cd KD

# 2. Start services
docker-compose up -d

# 3. Đợi 10 giây để database khởi động
sleep 10

# 4. Verify
./verify_tangtoc_migration.sh
```

---

## 🔍 KIỂM TRA NHANH

### **Test API endpoint:**
```bash
# Thay YOUR_SESSION_COOKIE bằng cookie thật từ browser
curl -X GET "http://localhost:2701/api/admin/tangtoc-reports?page=1&limit=20" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Kết quả mong đợi:**
```json
{
  "reports": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "pages": 0
  }
}
```

### **Test báo lỗi câu hỏi:**
1. Đăng nhập vào hệ thống
2. Chơi chế độ Tăng Tốc
3. Click "Báo lỗi" ở một câu hỏi
4. Điền thông tin và gửi
5. Kiểm tra admin panel: `http://localhost:2701/admin/tangtoc-reports`

---

## ⚠️ NẾU CÓ VẤN ĐỀ

### **Lỗi: "Table doesn't exist"**
```bash
# Restart app để chạy lại migration
docker-compose restart app

# Kiểm tra logs
docker-compose logs app | grep -i "tangtoc\|migration"
```

### **Lỗi: "Unknown column 'image_url'"**
```bash
# Migration tự động sẽ đổi tên cột
# Chỉ cần restart app
docker-compose restart app
```

### **Rollback nếu cần:**
```bash
# 1. Stop app
docker-compose stop app

# 2. Restore database
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database < backup_YYYYMMDD_HHMMSS.sql

# 3. Checkout code cũ
git checkout <previous_commit>

# 4. Restart
docker-compose up -d
```

---

## 📊 CHECKLIST SAU KHI DEPLOY

- [ ] Backup database đã tạo
- [ ] Code mới đã pull
- [ ] App đã restart
- [ ] Script verify chạy thành công
- [ ] API endpoint `/api/admin/tangtoc-reports` hoạt động
- [ ] Chức năng báo lỗi hoạt động
- [ ] Không có lỗi trong logs

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. **Logs:** `docker-compose logs -f app`
2. **Database:** `docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database`
3. **File chi tiết:** `MIGRATION_SAFETY_REPORT.md`

---

**Thời gian deploy:** ~2 phút  
**Downtime:** ~10 giây (restart app)  
**Rủi ro:** Rất thấp (có backup + migration an toàn)

