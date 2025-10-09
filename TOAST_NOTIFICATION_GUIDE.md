# Hướng dẫn Toast Notification System

## Tổng quan
Đã thêm hệ thống toast notification chuyên nghiệp hiển thị ở góc phải màn hình cho các thông báo quan trọng.

## Tính năng đã thêm

### 1. **Toast khi đăng nhập thành công**
- ✅ Hiển thị ở góc phải màn hình
- ✅ Nền xanh nhạt (gradient từ #f0fdf4 đến #dcfce7)
- ✅ Nội dung: "Chào mừng [Tên đầy đủ] đã quay trở lại!"
- ✅ Icon check circle màu xanh
- ✅ Tự động ẩn sau 5 giây
- ✅ Có nút đóng (X) để đóng thủ công
- ✅ Animation mượt mà khi hiển thị/ẩn

### 2. **Toast khi đăng xuất**
- ✅ Hiển thị ở góc phải màn hình
- ✅ Nền xanh nhạt
- ✅ Nội dung: "Đã đăng xuất thành công. Hẹn gặp lại bạn!"
- ✅ Icon check circle màu xanh
- ✅ Tự động ẩn sau 4 giây
- ✅ Thay thế success message cũ trên form

## Files đã tạo mới

### 1. `/public/js/toast.js`
**Mô tả**: Class ToastNotification quản lý hiển thị toast

**Tính năng**:
- Class-based design với singleton pattern
- Hỗ trợ 4 loại toast: success, error, warning, info
- Auto-dismiss với thời gian tùy chỉnh
- Nút đóng thủ công
- Animation mượt mà
- Stacking multiple toasts

**API**:
```javascript
// Hiển thị toast thành công
Toast.success(message, duration);

// Hiển thị toast lỗi
Toast.error(message, duration);

// Hiển thị toast cảnh báo
Toast.warning(message, duration);

// Hiển thị toast thông tin
Toast.info(message, duration);

// Xóa tất cả toast
Toast.clearAll();
```

**Ví dụ sử dụng**:
```javascript
// Toast thành công với thời gian mặc định (4s)
Toast.success('Đăng nhập thành công!');

// Toast lỗi với thời gian tùy chỉnh (6s)
Toast.error('Có lỗi xảy ra!', 6000);

// Toast không tự động ẩn (duration = 0)
Toast.warning('Cảnh báo quan trọng!', 0);
```

### 2. `/public/css/toast.css`
**Mô tả**: Styling cho toast notification

**Tính năng**:
- Modern design với glass morphism effect
- Gradient backgrounds cho từng loại toast
- Smooth animations (slide in/out)
- Responsive design (mobile-friendly)
- Hover effects
- Dark mode support (optional)

**Toast types và màu sắc**:
- **Success**: Xanh lá nhạt (#f0fdf4 → #dcfce7), border #10b981
- **Error**: Đỏ nhạt (#fef2f2 → #fee2e2), border #ef4444
- **Warning**: Vàng nhạt (#fffbeb → #fef3c7), border #f59e0b
- **Info**: Xanh dương nhạt (#eff6ff → #dbeafe), border #3b82f6

## Files đã cập nhật

### 1. `/views/home.html`
**Thay đổi**:
- Thêm `<link rel="stylesheet" href="/css/toast.css">` vào `<head>`
- Thêm `<script src="/js/toast.js"></script>` trước các script khác
- Thêm script kiểm tra flag `justLoggedIn` từ API
- Hiển thị toast với tên đầy đủ của user khi đăng nhập thành công

**Logic**:
```javascript
// Gọi API để kiểm tra xem có phải vừa đăng nhập không
fetch('/api/user/info')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.justLoggedIn) {
            const fullName = data.user.fullName || data.user.username;
            setTimeout(() => {
                Toast.success(`Chào mừng ${fullName} đã quay trở lại!`, 5000);
            }, 500);
        }
    });
```

### 2. `/views/login.html`
**Thay đổi**:
- Thêm `<link rel="stylesheet" href="/css/toast.css">` vào `<head>`
- Thêm `<script src="/js/toast.js"></script>` trước script chính
- Thay thế success message bằng toast khi logout

**Logic**:
```javascript
if (urlParams.has('logout')) {
    setTimeout(() => {
        Toast.success('Đã đăng xuất thành công. Hẹn gặp lại bạn!', 4000);
    }, 300);
}
```

### 3. `/server.js`
**Thay đổi**:

#### a. Thêm flag `justLoggedIn` khi đăng nhập thành công:
```javascript
// Trong POST /login
req.session.justLoggedIn = true;
return res.redirect('/');
```

#### b. Thêm API endpoint `/api/user/info`:
```javascript
app.get('/api/user/info', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const justLoggedIn = req.session.justLoggedIn || false;
  
  // Xóa flag sau khi đã lấy
  if (req.session.justLoggedIn) {
    delete req.session.justLoggedIn;
  }

  res.json({
    success: true,
    user: {
      id: req.session.user.id,
      username: req.session.user.username,
      email: req.session.user.email,
      fullName: req.session.user.fullName,
      isAdmin: req.session.user.isAdmin
    },
    justLoggedIn: justLoggedIn
  });
});
```

## Cách hoạt động

### Flow đăng nhập thành công:
1. User submit form đăng nhập
2. Server xác thực thành công
3. Server set `req.session.justLoggedIn = true`
4. Server redirect về trang home (`/`)
5. Trang home load xong
6. JavaScript gọi API `/api/user/info`
7. API trả về `justLoggedIn: true` và thông tin user
8. API xóa flag `justLoggedIn` khỏi session
9. JavaScript hiển thị toast với tên đầy đủ của user
10. Toast tự động ẩn sau 5 giây

### Flow đăng xuất:
1. User click nút đăng xuất
2. Server xóa session
3. Server redirect về `/login?logout=1`
4. Trang login load xong
5. JavaScript kiểm tra URL parameter `logout=1`
6. JavaScript hiển thị toast "Đã đăng xuất thành công"
7. Toast tự động ẩn sau 4 giây

## Responsive Design

### Desktop (> 768px):
- Toast hiển thị ở góc phải trên
- Width: 320-400px
- Position: `top: 20px, right: 20px`

### Tablet/Mobile (≤ 768px):
- Toast full width với margin 10px
- Position: `top: 10px, left: 10px, right: 10px`

### Mobile nhỏ (≤ 480px):
- Padding giảm xuống
- Font size nhỏ hơn
- Icon size nhỏ hơn

## Animation Details

### Slide In (hiển thị):
- Duration: 0.3s
- Easing: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (bounce effect)
- Transform: `translateX(400px)` → `translateX(0)`
- Opacity: `0` → `1`

### Slide Out (ẩn):
- Duration: 0.3s
- Easing: `ease-in`
- Transform: `translateX(0)` → `translateX(400px)`
- Opacity: `1` → `0`

### Hover Effect:
- Transform: `translateY(-2px)`
- Box shadow tăng lên
- Transition: 0.2s

## Customization

### Thay đổi thời gian hiển thị:
```javascript
// Mặc định 4 giây
Toast.success('Message');

// Tùy chỉnh 10 giây
Toast.success('Message', 10000);

// Không tự động ẩn
Toast.success('Message', 0);
```

### Thay đổi màu sắc:
Chỉnh sửa trong `/public/css/toast.css`:
```css
.toast-success {
    background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
    border-left-color: #your-border-color;
}
```

### Thay đổi vị trí:
Chỉnh sửa `.toast-container` trong CSS:
```css
.toast-container {
    top: 20px;    /* Thay đổi vị trí dọc */
    right: 20px;  /* Thay đổi vị trí ngang */
    /* hoặc left: 20px; cho góc trái */
}
```

## Browser Support
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Testing Checklist
- [ ] Đăng nhập thành công → Toast hiển thị với tên đầy đủ
- [ ] Đăng xuất → Toast hiển thị "Hẹn gặp lại bạn"
- [ ] Toast tự động ẩn sau thời gian quy định
- [ ] Click nút X → Toast đóng ngay lập tức
- [ ] Refresh trang home → Toast không hiển thị lại
- [ ] Multiple toasts stack correctly
- [ ] Responsive trên mobile
- [ ] Animation mượt mà

## Lưu ý
- Toast chỉ hiển thị 1 lần sau khi đăng nhập (không hiển thị lại khi refresh)
- Flag `justLoggedIn` tự động xóa sau khi API được gọi
- Toast có thể stack (nhiều toast cùng lúc)
- Có thể tùy chỉnh màu sắc, vị trí, thời gian dễ dàng

