# Admin Panel - KD APP

## 📚 Tài liệu

Thư mục này chứa tất cả các trang admin panel và tài liệu liên quan.

### 📄 Files chính

#### HTML Pages
- `dashboard.html` - Trang tổng quan
- `questions.html` - Quản lý câu hỏi
- `users.html` - Quản lý người dùng
- `login-logs.html` - Lịch sử đăng nhập
- `game-history.html` - Lịch sử trận đấu
- `reports.html` - Báo lỗi câu hỏi
- `tangtoc-reports.html` - Báo lỗi câu hỏi Tăng Tốc
- `question-logs.html` - Logs xóa câu hỏi
- `tangtoc-question-logs.html` - Logs xóa câu hỏi Tăng Tốc

#### Template & Documentation
- `admin-panel-base.html` - ⭐ Base template cho tất cả trang admin
- `README.md` - File này
- `README-TEMPLATE.md` - Hướng dẫn sử dụng base template
- `NAVBAR-SYNC-SUMMARY.md` - Tóm tắt đồng bộ navbar
- `CHANGELOG-NAVBAR.md` - Chi tiết thay đổi navbar
- `TESTING-GUIDE.md` - Hướng dẫn test

## 🎯 Navbar đã được đồng bộ

### Tất cả trang admin hiện có navbar đầy đủ với 12 items:

1. 📊 **Dashboard** - Tổng quan hệ thống
2. ❓ **Quản lý câu hỏi** - CRUD câu hỏi thường
3. ⚡ **Quản lý câu hỏi Tăng Tốc** - CRUD câu hỏi tăng tốc
4. 👥 **Quản lý người dùng** - Quản lý users
5. 🔐 **Login Logs** - Lịch sử đăng nhập
6. 🎮 **Lịch sử trận đấu** - Game history
7. 🚩 **Báo lỗi câu hỏi** - Reports cho câu hỏi thường
8. ⚡ **Báo lỗi câu hỏi Tăng Tốc** - Reports cho câu hỏi tăng tốc
9. 🗑️ **Logs xóa câu hỏi** - Deletion logs
10. 🗑️ **Logs xóa câu hỏi Tăng Tốc** - Deletion logs tăng tốc
11. 🏠 **Trang chủ** - Về trang chủ
12. 🚪 **Đăng xuất** - Logout

## 🎨 Design System

### Colors
- **Primary Red**: `#ef4444` (red-500)
- **Secondary Red**: `#dc2626` (red-600)
- **Text Gray**: `#64748b` (slate-500)
- **Background**: White với glass morphism

### Typography
- **Font Family**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Header**: 1.75rem (28px)
- **Body**: 1rem (16px)

### Spacing
- **Sidebar Width**: 280px (desktop), 70px (mobile)
- **Content Padding**: 2rem (desktop), 1rem (mobile)
- **Gap**: 0.75rem - 2rem

### Effects
- **Glass Morphism**: `backdrop-filter: blur(20px)`
- **Shadows**: `0 8px 32px rgba(0, 0, 0, 0.1)`
- **Transitions**: `0.3s ease`
- **Border Radius**: 8px - 16px

## 📱 Responsive Breakpoints

```css
/* Desktop */
@media (min-width: 769px) {
  .admin-sidebar { width: 280px; }
  /* Full text + icons */
}

/* Tablet */
@media (max-width: 768px) {
  .admin-sidebar { width: 70px; }
  /* Icons only */
}

/* Mobile */
@media (max-width: 480px) {
  /* Optimized spacing */
}
```

## 🚀 Quick Start

### Tạo trang admin mới

1. **Copy base template**
```bash
cp admin-panel-base.html new-page.html
```

2. **Thay thế placeholders**
```html
{{PAGE_TITLE}} → "Tên trang của bạn"
{{HEADER_ICON}} → "fas fa-icon-name"
{{HEADER_TITLE}} → "Tiêu đề header"
{{ACTIVE_*}} → class="active" (cho menu tương ứng)
{{CUSTOM_STYLES}} → CSS tùy chỉnh
{{PAGE_CONTENT}} → Nội dung HTML
{{PAGE_SCRIPTS}} → JavaScript
```

3. **Test**
- Kiểm tra navbar hiển thị đầy đủ
- Verify active state
- Test responsive
- Check browser compatibility

### Cập nhật navbar cho trang hiện có

1. **Kiểm tra navbar hiện tại**
```bash
# Đếm số menu items
grep -c "<li>" your-page.html
# Kết quả phải là 12
```

2. **So sánh với base template**
- Mở `admin-panel-base.html`
- Copy phần navbar (lines 254-302)
- Paste vào trang của bạn
- Cập nhật active state

3. **Verify**
- Tất cả 12 items hiển thị
- Icons đúng
- Links hoạt động

## 📖 Documentation

### Đọc thêm:
- **`README-TEMPLATE.md`** - Chi tiết về cách sử dụng base template
- **`NAVBAR-SYNC-SUMMARY.md`** - Tóm tắt quá trình đồng bộ
- **`CHANGELOG-NAVBAR.md`** - Lịch sử thay đổi đầy đủ
- **`TESTING-GUIDE.md`** - Hướng dẫn test chi tiết

## 🔧 Troubleshooting

### Icons không hiển thị?
```html
<!-- Thêm vào <head> -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

### Sidebar không responsive?
```css
/* Kiểm tra media queries */
@media (max-width: 768px) {
  .admin-sidebar { width: 70px; }
  .admin-sidebar .logo span,
  .sidebar-nav a span { display: none; }
}
```

### Active state không đúng?
```html
<!-- Chỉ 1 <li> có class="active" -->
<li class="active">
  <a href="/admin/dashboard">...</a>
</li>
```

### Glass morphism không hoạt động?
```css
/* Thêm fallback */
background: rgba(255, 255, 255, 0.9); /* fallback */
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px); /* Safari */
```

## 🎯 Best Practices

### 1. Consistency
- Luôn sử dụng base template cho trang mới
- Giữ nguyên cấu trúc navbar
- Không thay đổi thứ tự menu items

### 2. Maintainability
- Comment code rõ ràng
- Tách CSS riêng nếu quá dài
- Sử dụng semantic HTML

### 3. Performance
- Minify CSS/JS cho production
- Optimize images
- Lazy load nếu cần

### 4. Accessibility
- Sử dụng semantic tags
- Thêm aria-labels
- Keyboard navigation

## 📊 Structure

```
views/admin/
├── admin-panel-base.html      # ⭐ Base template
├── dashboard.html             # Dashboard page
├── questions.html             # Questions management
├── users.html                 # Users management
├── login-logs.html            # Login logs
├── game-history.html          # Game history
├── reports.html               # Question reports
├── tangtoc-reports.html       # Tangtoc reports
├── question-logs.html         # Question deletion logs
├── tangtoc-question-logs.html # Tangtoc deletion logs
├── README.md                  # This file
├── README-TEMPLATE.md         # Template guide
├── NAVBAR-SYNC-SUMMARY.md     # Sync summary
├── CHANGELOG-NAVBAR.md        # Detailed changelog
└── TESTING-GUIDE.md           # Testing guide
```

## 🔄 Update History

### v1.0 (2025-10-07)
- ✅ Đồng bộ navbar trên tất cả trang
- ✅ Tạo base template
- ✅ Cập nhật `questions.html` với cấu trúc mới
- ✅ Cập nhật `admin-tangtoc-questions.html`
- ✅ Thêm responsive design
- ✅ Thêm glass morphism effects
- ✅ Tạo documentation đầy đủ

## 🤝 Contributing

### Khi thêm trang mới:
1. Sử dụng `admin-panel-base.html`
2. Cập nhật file này (README.md)
3. Test đầy đủ
4. Document changes

### Khi sửa navbar:
1. Cập nhật `admin-panel-base.html` trước
2. Cập nhật tất cả trang khác
3. Update documentation
4. Test trên tất cả trang

## 📞 Support

Nếu gặp vấn đề:
1. Đọc `TROUBLESHOOTING` section ở trên
2. Kiểm tra `TESTING-GUIDE.md`
3. Xem `CHANGELOG-NAVBAR.md` để biết thay đổi gần đây
4. Check browser console cho errors

## ✅ Checklist cho Developer

- [ ] Đã đọc `README-TEMPLATE.md`
- [ ] Hiểu cấu trúc base template
- [ ] Biết cách thay thế placeholders
- [ ] Đã test responsive design
- [ ] Verify navbar trên tất cả trang
- [ ] Check browser compatibility
- [ ] Document changes nếu có

---

**Last Updated**: 2025-10-07  
**Version**: 1.0  
**Maintainer**: Admin Team

