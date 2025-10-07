# Hướng dẫn Test - Admin Panel Navbar

## 🎯 Mục tiêu Test

Đảm bảo navbar hoạt động đồng bộ và chính xác trên tất cả các trang admin.

## 📋 Checklist Test

### 1. Visual Test - Kiểm tra giao diện

#### Desktop (> 768px)
- [ ] Sidebar hiển thị đầy đủ (280px width)
- [ ] Tất cả 12 menu items hiển thị
- [ ] Icons và text đều hiển thị
- [ ] Logo "Admin Panel" hiển thị với icon brain
- [ ] Glass morphism effect hoạt động (background blur)
- [ ] Animated background (floating blur circles)

#### Tablet (≤ 768px)
- [ ] Sidebar thu nhỏ (70px width)
- [ ] Chỉ hiển thị icons, text bị ẩn
- [ ] Content area mở rộng
- [ ] Icons vẫn căn giữa

#### Mobile (≤ 480px)
- [ ] Sidebar vẫn 70px
- [ ] Spacing được tối ưu
- [ ] Font sizes nhỏ hơn
- [ ] Header responsive

### 2. Navigation Test - Kiểm tra điều hướng

Truy cập từng trang và verify:

#### ✅ Dashboard (`/admin/dashboard`)
- [ ] URL đúng
- [ ] Menu item "Dashboard" có class="active"
- [ ] Red accent bar hiển thị bên trái
- [ ] Background color của item là rgba(239, 68, 68, 0.1)
- [ ] Text color là #ef4444

#### ✅ Quản lý câu hỏi (`/admin/questions`)
- [ ] URL đúng
- [ ] Menu item "Quản lý câu hỏi" active
- [ ] Header title: "Quản lý câu hỏi"
- [ ] Header icon: fa-question-circle
- [ ] Font Awesome icons load

#### ✅ Quản lý câu hỏi Tăng Tốc (`/admin/tangtoc-questions`)
- [ ] URL đúng
- [ ] Menu item "Quản lý câu hỏi Tăng Tốc" active
- [ ] Navbar có đầy đủ 12 items
- [ ] Icon bolt hiển thị

#### ✅ Quản lý người dùng (`/admin/users`)
- [ ] URL đúng
- [ ] Menu item "Quản lý người dùng" active
- [ ] Icon users hiển thị

#### ✅ Login Logs (`/admin/login-logs`)
- [ ] URL đúng
- [ ] Menu item "Login Logs" active
- [ ] Icon sign-in-alt hiển thị

#### ✅ Lịch sử trận đấu (`/admin/game-history`)
- [ ] URL đúng
- [ ] Menu item "Lịch sử trận đấu" active
- [ ] Icon history hiển thị

#### ✅ Báo lỗi câu hỏi (`/admin/reports`)
- [ ] URL đúng
- [ ] Menu item "Báo lỗi câu hỏi" active
- [ ] Icon flag hiển thị

#### ✅ Báo lỗi câu hỏi Tăng Tốc (`/admin/tangtoc-reports`)
- [ ] URL đúng
- [ ] Menu item "Báo lỗi câu hỏi Tăng Tốc" active
- [ ] Icon bolt hiển thị

#### ✅ Logs xóa câu hỏi (`/admin/question-logs`)
- [ ] URL đúng
- [ ] Menu item "Logs xóa câu hỏi" active
- [ ] Icon trash-alt hiển thị

#### ✅ Logs xóa câu hỏi Tăng Tốc (`/admin/tangtoc-question-logs`)
- [ ] URL đúng
- [ ] Menu item "Logs xóa câu hỏi Tăng Tốc" active
- [ ] Icon trash-alt hiển thị

### 3. Interaction Test - Kiểm tra tương tác

#### Hover Effects
- [ ] Hover vào menu item → background chuyển sang rgba(239, 68, 68, 0.1)
- [ ] Hover vào menu item → text color chuyển sang #ef4444
- [ ] Transition mượt mà (0.3s)
- [ ] Cursor pointer khi hover

#### Click Navigation
- [ ] Click vào mỗi menu item → chuyển trang đúng
- [ ] Active state cập nhật đúng sau khi chuyển trang
- [ ] Không có lỗi console
- [ ] Page load nhanh

#### Scrollbar (nếu sidebar dài)
- [ ] Custom scrollbar hiển thị (width: 6px)
- [ ] Scrollbar màu đỏ matching theme
- [ ] Hover vào scrollbar → màu đậm hơn

### 4. Consistency Test - Kiểm tra tính nhất quán

#### Navbar Structure
- [ ] Tất cả trang có cùng 12 menu items
- [ ] Thứ tự menu items giống nhau
- [ ] Icons giống nhau cho cùng menu item
- [ ] Text giống nhau

#### Styling
- [ ] Cùng màu sắc (red theme #ef4444)
- [ ] Cùng font family
- [ ] Cùng spacing và padding
- [ ] Cùng border radius

#### Layout
- [ ] Sidebar width: 280px (desktop)
- [ ] Content margin-left: 280px (desktop)
- [ ] Header structure giống nhau
- [ ] Avatar hiển thị

### 5. Browser Compatibility Test

#### Chrome
- [ ] Navbar hiển thị đúng
- [ ] Backdrop-filter hoạt động
- [ ] Animations mượt

#### Firefox
- [ ] Navbar hiển thị đúng
- [ ] Backdrop-filter hoạt động
- [ ] Animations mượt

#### Safari
- [ ] Navbar hiển thị đúng
- [ ] Backdrop-filter hoạt động (cần -webkit- prefix)
- [ ] Animations mượt

#### Edge
- [ ] Navbar hiển thị đúng
- [ ] Backdrop-filter hoạt động
- [ ] Animations mượt

### 6. Performance Test

#### Load Time
- [ ] Font Awesome CDN load < 1s
- [ ] Page render < 2s
- [ ] No layout shift (CLS)

#### Animations
- [ ] Background float animation không lag
- [ ] Hover transitions mượt (60fps)
- [ ] Scroll smooth

### 7. Accessibility Test

#### Keyboard Navigation
- [ ] Tab qua các menu items
- [ ] Enter để click
- [ ] Focus visible

#### Screen Reader
- [ ] Menu items có text rõ ràng
- [ ] Icons có aria-label (nếu cần)
- [ ] Semantic HTML

## 🐛 Common Issues & Solutions

### Issue 1: Icons không hiển thị
**Nguyên nhân**: Font Awesome CDN chưa load  
**Giải pháp**: Kiểm tra `<link>` tag trong `<head>`
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

### Issue 2: Sidebar không responsive
**Nguyên nhân**: CSS media queries bị override  
**Giải pháp**: Kiểm tra thứ tự CSS, media queries phải ở cuối

### Issue 3: Active state không đúng
**Nguyên nhân**: Class "active" không được thêm vào đúng menu item  
**Giải pháp**: Verify HTML, chỉ 1 `<li>` có class="active"

### Issue 4: Glass morphism không hoạt động
**Nguyên nhân**: Browser không hỗ trợ backdrop-filter  
**Giải pháp**: Thêm fallback background
```css
background: rgba(255, 255, 255, 0.9); /* fallback */
backdrop-filter: blur(20px);
```

### Issue 5: Layout bị vỡ trên mobile
**Nguyên nhân**: Content width không responsive  
**Giải pháp**: Kiểm tra `max-width: calc(100vw - 70px)` trong media query

## 📊 Test Report Template

```markdown
# Test Report - Admin Panel Navbar
**Date**: YYYY-MM-DD
**Tester**: [Your Name]
**Browser**: [Chrome/Firefox/Safari/Edge] [Version]
**Device**: [Desktop/Tablet/Mobile]

## Results
- Visual Test: ✅/❌
- Navigation Test: ✅/❌
- Interaction Test: ✅/❌
- Consistency Test: ✅/❌
- Browser Compatibility: ✅/❌
- Performance: ✅/❌
- Accessibility: ✅/❌

## Issues Found
1. [Description]
   - Severity: High/Medium/Low
   - Steps to reproduce:
   - Expected:
   - Actual:

## Screenshots
[Attach screenshots if needed]

## Conclusion
[Overall assessment]
```

## 🚀 Quick Test Script

### Manual Test (5 phút)
1. Mở `/admin/dashboard`
2. Kiểm tra navbar có 12 items
3. Click qua 3-4 trang khác nhau
4. Verify active state đúng
5. Resize browser → test responsive
6. Hover vào menu items → test effects

### Automated Test (nếu có)
```javascript
// Test navbar items count
const navItems = document.querySelectorAll('.sidebar-nav li');
console.assert(navItems.length === 12, 'Should have 12 menu items');

// Test active state
const activeItems = document.querySelectorAll('.sidebar-nav li.active');
console.assert(activeItems.length === 1, 'Should have exactly 1 active item');

// Test icons
const icons = document.querySelectorAll('.sidebar-nav i');
console.assert(icons.length === 12, 'Should have 12 icons');
```

## ✅ Sign-off

- [ ] All tests passed
- [ ] No critical issues
- [ ] Ready for production

**Tested by**: _______________  
**Date**: _______________  
**Signature**: _______________

