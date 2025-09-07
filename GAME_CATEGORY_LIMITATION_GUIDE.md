# 🎮 Hướng Dẫn Giới Hạn Category cho Game

## 📋 **Tóm Tắt Thay Đổi**

Hệ thống game hiện tại (Solo Battle và Room Battle) đã được giới hạn **chỉ sử dụng câu hỏi category "Khởi Động"**. Điều này chuẩn bị cho việc phát triển các chế độ chơi khác tương ứng với các category khác trong tương lai.

## 🔧 **Các Thay Đổi Đã Thực Hiện**

### 1. **Database Function: `getRandomQuestions`**
```javascript
// Trước: 
async function getRandomQuestions(count = 12, category = null)

// Sau:
async function getRandomQuestions(count = 12, category = 'Khởi Động')
```
- **Mặc định**: Tự động filter câu hỏi "Khởi Động"
- **Linh hoạt**: Vẫn có thể truyền category khác nếu cần

### 2. **API Endpoint: `/admin/api/questions/random`**
```
GET /admin/api/questions/random?count=20&category=Khởi%20Động
```

**Tham số:**
- `count`: Số lượng câu hỏi (mặc định: 12)
- `category`: Danh mục câu hỏi (mặc định: "Khởi Động")

**Ví dụ:**
```bash
# Lấy 20 câu hỏi "Khởi Động" (mặc định)
curl "/admin/api/questions/random?count=20"

# Lấy 15 câu hỏi "Tăng Tốc" (cho tương lai)
curl "/admin/api/questions/random?count=15&category=Tăng%20Tốc"
```

### 3. **Solo Battle**
```javascript
// Frontend tự động thêm category filter
fetch('/admin/api/questions/random?count=20&category=Khởi%20Động')
```

### 4. **Room Battle (Socket)**
```javascript
// Server tự động lấy câu hỏi "Khởi Động"
const questions = await fetchQuestionsFromAPI(20, 'Khởi Động');
```

## 🎯 **Kết Quả**

### **Hiện Tại:**
- ✅ Solo Battle: Chỉ câu hỏi "Khởi Động"
- ✅ Room Battle: Chỉ câu hỏi "Khởi Động"
- ✅ Admin quản lý: Tất cả category (không giới hạn)

### **Tương Lai:**
- 🚀 **Chế độ "Vượt Chướng Ngại Vật"**: `category=Vượt%20Chướng%20Ngại%20Vật`
- 🚀 **Chế độ "Tăng Tốc"**: `category=Tăng%20Tốc`
- 🚀 **Chế độ "Về Đích"**: `category=Về%20Đích`

## 📊 **Test & Verification**

### **Kiểm tra API:**
```bash
# Test API trả về đúng category
curl -s "/admin/api/questions/random?count=5&category=Khởi%20Động" | jq '.[].category'
# Expected: tất cả đều return "Khởi Động"
```

### **Kiểm tra Game:**
1. Vào Solo Battle → Kiểm tra câu hỏi chỉ là "Khởi Động"
2. Tạo Room Battle → Kiểm tra câu hỏi chỉ là "Khởi Động"
3. Vào Admin → Vẫn thấy tất cả category

### **Debug Console:**
```javascript
// Console sẽ hiển thị log
"🔍 Fetching questions from database, count: 20, category: Khởi Động"
"✅ Returned X questions for category: Khởi Động"
```

## 🔮 **Roadmap Tương Lai**

### **Phase 1: Các Chế độ Riêng Biệt**
```javascript
// Ví dụ implementation tương lai
const gameMode = {
  'khoi-dong': { category: 'Khởi Động', timeLimit: 60 },
  'vuot-chuong-ngai-vat': { category: 'Vượt Chướng Ngại Vật', timeLimit: 90 },
  'tang-toc': { category: 'Tăng Tốc', timeLimit: 45 },
  've-dich': { category: 'Về Đích', timeLimit: 120 }
};
```

### **Phase 2: Mixed Mode**
```javascript
// Kết hợp nhiều category trong 1 game
GET /admin/api/questions/random?count=20&categories=Khởi%20Động,Tăng%20Tốc
```

### **Phase 3: Progressive Difficulty**
```javascript
// Tăng dần độ khó theo category
const questionFlow = [
  { category: 'Khởi Động', count: 5 },
  { category: 'Vượt Chướng Ngại Vật', count: 5 },
  { category: 'Tăng Tốc', count: 5 },
  { category: 'Về Đích', count: 5 }
];
```

## 🛠️ **Cho Developer**

### **Thêm chế độ mới:**
1. Tạo route/endpoint mới cho chế độ đó
2. Gọi API với category tương ứng:
   ```javascript
   fetch(`/admin/api/questions/random?count=20&category=${encodeURIComponent(categoryName)}`)
   ```
3. Frontend xử lý như solo-battle hiện tại

### **Backward Compatibility:**
- API vẫn hoạt động với `category=null` (lấy tất cả)
- Admin functions không bị ảnh hưởng
- Import CSV vẫn hỗ trợ tất cả category

## 📝 **Summary**

✅ **Completed**: Game restriction to "Khởi Động" only  
✅ **Ready**: API hỗ trợ category filtering cho tương lai  
✅ **Maintained**: Admin functionality không thay đổi  
🚀 **Prepared**: Sẵn sàng cho multiple game modes
