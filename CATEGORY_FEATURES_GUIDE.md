# 🎯 Hướng Dẫn Tính Năng Category Mới

## ✨ **Tính Năng Đã Thêm**

### 1. **Lọc Câu Hỏi Theo Category**
- **Vị trí**: Dropdown "Lọc" bên phải ô tìm kiếm
- **Chức năng**: Lọc và hiển thị câu hỏi theo danh mục
- **Tùy chọn**:
  - Tất cả danh mục (mặc định)
  - Khởi Động 
  - Vượt Chướng Ngại Vật
  - Tăng Tốc
  - Về Đích

### 2. **Đổi Category Hàng Loạt**
- **Kích hoạt**: Nút "Đổi danh mục" hiện ra khi chọn câu hỏi
- **Cách sử dụng**:
  1. Chọn 1 hoặc nhiều câu hỏi (checkbox)
  2. Hoặc bấm "Chọn toàn bộ" để chọn tất cả
  3. Bấm nút "Đổi danh mục (X)" 
  4. Chọn danh mục mới trong modal
  5. Bấm "Áp dụng thay đổi"

## 🎨 **Hiển Thị Category**
- Mỗi category có màu badge riêng:
  - **Khởi Động**: Xanh lá (#22c55e)
  - **Vượt Chướng Ngại Vật**: Cam (#f59e0b)  
  - **Tăng Tốc**: Đỏ (#ef4444)
  - **Về Đích**: Tím (#8b5cf6)

## 📊 **Import CSV với Category**
Hỗ trợ 3 cột: Câu hỏi | Đáp án | Category

### Với Header:
```csv
Question,Answer,Category
Thủ đô của Pháp?,Paris,Khởi Động
Java là gì?,Ngôn ngữ lập trình,Vượt Chướng Ngại Vật
```

### Không Header:
```csv
Python là gì?,Ngôn ngữ lập trình,Khởi Động
Docker là gì?,Container,Tăng Tốc
```

## 🔧 **Cách Test**

### Test Lọc Category:
1. Vào `/admin/questions`
2. Chọn category trong dropdown "Lọc"
3. Xem kết quả được lọc

### Test Bulk Category Change:
1. Chọn một vài câu hỏi
2. Bấm "Đổi danh mục" 
3. Chọn category mới
4. Bấm "Áp dụng thay đổi"
5. Kiểm tra kết quả

### Test Import CSV:
1. Upload file `test_questions_3_columns.csv`
2. Kiểm tra category được import đúng
3. Xem hiển thị badge màu

## 🚀 **Tính Năng Nâng Cao**
- **Smart Filter**: Kết hợp search text + filter category
- **Bulk Operations**: Hỗ trợ "Chọn toàn bộ" trên tất cả trang
- **Validation**: Auto-validate category hợp lệ khi import
- **Progress Tracking**: Hiển thị tiến độ khi cập nhật hàng loạt

## 🐛 **Debug Commands**
Mở Console (F12) và chạy:
```javascript
// Xem tất cả câu hỏi
console.log(window.questions);

// Xem câu hỏi đã lọc
console.log(window.getFilteredQuestions());

// Test bulk category change
window.openBulkCategoryModal();
```
