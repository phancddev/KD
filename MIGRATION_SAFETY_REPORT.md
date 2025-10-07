# 🔒 BÁO CÁO AN TOÀN MIGRATION - HỆ THỐNG TĂNG TỐC

## 📋 TÓM TẮT CÁC THAY ĐỔI

### ✅ **CÁC THAY ĐỔI ĐÃ THỰC HIỆN:**

#### 1. **Thêm file migration vào quá trình khởi tạo database**
- **File:** `db/index.js`
- **Thay đổi:** Thêm `02-tangtoc-reports-migration.sql` vào danh sách file được chạy khi khởi tạo
- **An toàn:** ✅ Sử dụng `CREATE TABLE IF NOT EXISTS` - không ảnh hưởng hệ thống cũ

#### 2. **Thêm các bảng Tăng Tốc vào hàm runMigrations()**
- **File:** `db/index.js`
- **Các bảng được thêm:**
  - `tangtoc_question_reports` - Báo lỗi câu hỏi Tăng Tốc
  - `tangtoc_answer_suggestions` - Đề xuất đáp án
  - `tangtoc_answer_suggestion_logs` - Log xử lý đề xuất
  - `tangtoc_question_deletion_logs` - Log xóa câu hỏi
  - `deleted_tangtoc_question_answers` - Đáp án đã xóa
- **An toàn:** ✅ Tất cả dùng `CREATE TABLE IF NOT EXISTS`

#### 3. **Thống nhất tên cột `image_url`**
- **Vấn đề:** Code cũ dùng `question_image_url`, code mới dùng `image_url`
- **Giải pháp:**
  - Đổi tất cả code sang dùng `image_url`
  - Thêm migration tự động đổi tên cột nếu hệ thống cũ có `question_image_url`
- **An toàn:** ✅ Migration kiểm tra cột tồn tại trước khi đổi tên

#### 4. **Sửa lỗi middleware checkAdmin**
- **File:** `routes/tangtoc-admin-api.js`
- **Vấn đề:** Middleware được áp dụng SAU khi route được định nghĩa
- **Giải pháp:** Thêm `checkAdmin` trực tiếp vào từng route
- **An toàn:** ✅ Không ảnh hưởng dữ liệu, chỉ sửa logic routing

---

## 🔍 KIỂM TRA AN TOÀN CHO HỆ THỐNG ĐANG CHẠY

### **Kịch bản 1: Hệ thống mới (chưa có database)**
```bash
# Khi chạy lần đầu:
docker-compose up -d

# Kết quả:
✅ Tạo tất cả bảng mới
✅ Tạo bảng tangtoc_question_reports với cột image_url
✅ Không có lỗi
```

### **Kịch bản 2: Hệ thống cũ (đã có database, CHƯA có bảng tangtoc_question_reports)**
```bash
# Khi deploy code mới:
git pull
docker-compose restart app

# Kết quả:
✅ Tạo bảng tangtoc_question_reports với cột image_url
✅ Tạo các bảng liên quan
✅ Dữ liệu cũ không bị ảnh hưởng
✅ Không có lỗi
```

### **Kịch bản 3: Hệ thống cũ (đã có bảng tangtoc_question_reports với cột question_image_url)**
```bash
# Khi deploy code mới:
git pull
docker-compose restart app

# Kết quả:
✅ Phát hiện cột question_image_url
✅ Tự động đổi tên thành image_url
✅ Dữ liệu trong cột được giữ nguyên
✅ Code mới hoạt động bình thường
✅ Không mất dữ liệu
```

---

## 🛡️ CÁC CƠ CHẾ BẢO VỆ DỮ LIỆU

### 1. **CREATE TABLE IF NOT EXISTS**
```sql
CREATE TABLE IF NOT EXISTS tangtoc_question_reports (
  ...
);
```
- Chỉ tạo bảng nếu chưa tồn tại
- Không ảnh hưởng bảng đã có

### 2. **Kiểm tra cột trước khi đổi tên**
```javascript
const [checkColumn] = await pool.query(
  `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tangtoc_question_reports' 
   AND COLUMN_NAME = 'question_image_url'`,
  [config.db.database]
);
if (checkColumn && checkColumn[0] && Number(checkColumn[0].cnt) > 0) {
  // Chỉ đổi tên nếu cột tồn tại
  await pool.query('ALTER TABLE tangtoc_question_reports CHANGE COLUMN question_image_url image_url TEXT NULL');
}
```

### 3. **Try-catch bảo vệ**
```javascript
try {
  await pool.query('CREATE INDEX idx_tangtoc_question_reports_status ON tangtoc_question_reports(status)');
} catch (e) {
  // Bỏ qua nếu index đã tồn tại
}
```

---

## 📊 BẢNG SO SÁNH TRƯỚC/SAU

| Thành phần | Trước | Sau | An toàn? |
|------------|-------|-----|----------|
| File migration được chạy | 3 files | 4 files | ✅ Thêm file mới |
| Bảng tangtoc_question_reports | Không tồn tại | Tồn tại | ✅ CREATE IF NOT EXISTS |
| Cột image_url | Không có hoặc tên khác | image_url | ✅ Migration tự động |
| Middleware checkAdmin | Không hoạt động | Hoạt động đúng | ✅ Không ảnh hưởng data |
| Dữ liệu cũ | - | Giữ nguyên 100% | ✅ Không mất dữ liệu |

---

## ⚠️ LƯU Ý QUAN TRỌNG

### **1. Backup trước khi deploy (KHUYẾN NGHỊ)**
```bash
# Backup database
docker-compose exec mariadb mysqldump -u nqd_user -pnqd_password nqd_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Hoặc backup volume
docker run --rm -v nqd_kd_mariadb_data:/data -v $(pwd):/backup alpine tar czf /backup/mariadb_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### **2. Kiểm tra logs sau khi deploy**
```bash
# Xem logs app
docker-compose logs -f app

# Tìm các dòng quan trọng:
# ✅ "Đổi tên cột question_image_url thành image_url..."
# ✅ "Tất cả migrations đã hoàn tất!"
# ✅ "Khởi tạo cơ sở dữ liệu thành công!"
```

### **3. Test chức năng báo lỗi Tăng Tốc**
```bash
# 1. Đăng nhập vào hệ thống
# 2. Chơi chế độ Tăng Tốc
# 3. Thử báo lỗi một câu hỏi
# 4. Kiểm tra admin panel: /admin/tangtoc-reports
```

---

## 🚀 HƯỚNG DẪN DEPLOY AN TOÀN

### **Bước 1: Backup (BẮT BUỘC)**
```bash
cd /path/to/project
docker-compose exec mariadb mysqldump -u nqd_user -pnqd_password nqd_database > backup_before_migration.sql
```

### **Bước 2: Pull code mới**
```bash
git pull origin main
```

### **Bước 3: Restart app**
```bash
docker-compose restart app
```

### **Bước 4: Kiểm tra logs**
```bash
docker-compose logs -f app | grep -E "(migration|Khởi tạo|Đổi tên)"
```

### **Bước 5: Verify database**
```bash
# Kiểm tra bảng đã được tạo
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "SHOW TABLES LIKE 'tangtoc%';"

# Kiểm tra cột image_url
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database -e "DESCRIBE tangtoc_question_reports;"
```

### **Bước 6: Test chức năng**
```bash
# Test API endpoint
curl -X GET "http://localhost:2701/api/admin/tangtoc-reports?page=1&limit=20" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"

# Kết quả mong đợi: {"reports":[],"pagination":{...}}
```

---

## 🔧 ROLLBACK (NẾU CẦN)

### **Nếu có vấn đề, rollback như sau:**

```bash
# 1. Stop app
docker-compose stop app

# 2. Restore database
docker-compose exec mariadb mysql -u nqd_user -pnqd_password nqd_database < backup_before_migration.sql

# 3. Checkout code cũ
git checkout <previous_commit_hash>

# 4. Restart
docker-compose up -d
```

---

## ✅ KẾT LUẬN

### **Các thay đổi này AN TOÀN cho hệ thống đang chạy vì:**

1. ✅ Sử dụng `CREATE TABLE IF NOT EXISTS` - không ghi đè bảng cũ
2. ✅ Kiểm tra cột tồn tại trước khi đổi tên - không gây lỗi
3. ✅ Migration tự động - không cần can thiệp thủ công
4. ✅ Dữ liệu cũ được giữ nguyên 100%
5. ✅ Có cơ chế rollback đơn giản

### **Rủi ro:**
- ⚠️ **Thấp:** Nếu có lỗi trong quá trình migration, app sẽ log lỗi nhưng không crash
- ⚠️ **Rất thấp:** Mất dữ liệu (do có backup và migration an toàn)

### **Khuyến nghị:**
- ✅ **Luôn backup trước khi deploy**
- ✅ **Test trên môi trường staging trước**
- ✅ **Deploy vào giờ thấp điểm**
- ✅ **Giám sát logs sau khi deploy**

---

**Ngày tạo:** 2025-01-XX  
**Người tạo:** AI Assistant  
**Trạng thái:** ✅ Đã kiểm tra và xác nhận an toàn

