# Admin Panel Base Template

## Mô tả
File `admin-panel-base.html` là template cơ sở cho tất cả các trang admin panel. Template này đảm bảo:
- Navbar đồng bộ trên tất cả các trang
- Giao diện nhất quán với glass morphism effect
- Responsive design cho mobile
- Dễ dàng bảo trì và cập nhật

## Cách sử dụng

### Các placeholder cần thay thế:

1. **{{PAGE_TITLE}}** - Tiêu đề trang (hiển thị trên tab browser)
   - Ví dụ: `Dashboard`, `Quản lý câu hỏi`, `Báo lỗi câu hỏi`

2. **{{HEADER_ICON}}** - Icon cho header chính
   - Ví dụ: `fas fa-tachometer-alt`, `fas fa-question-circle`, `fas fa-flag`

3. **{{HEADER_TITLE}}** - Tiêu đề header chính
   - Ví dụ: `Dashboard`, `Quản lý câu hỏi`, `Báo lỗi câu hỏi`

4. **{{ACTIVE_*}}** - Đánh dấu menu item đang active
   - Thay thế bằng `class="active"` cho trang tương ứng
   - Các options:
     - `{{ACTIVE_DASHBOARD}}`
     - `{{ACTIVE_QUESTIONS}}`
     - `{{ACTIVE_TANGTOC_QUESTIONS}}`
     - `{{ACTIVE_USERS}}`
     - `{{ACTIVE_LOGIN_LOGS}}`
     - `{{ACTIVE_GAME_HISTORY}}`
     - `{{ACTIVE_REPORTS}}`
     - `{{ACTIVE_TANGTOC_REPORTS}}`
     - `{{ACTIVE_QUESTION_LOGS}}`
     - `{{ACTIVE_TANGTOC_QUESTION_LOGS}}`

5. **{{CUSTOM_STYLES}}** - CSS tùy chỉnh cho từng trang
   - Thêm các styles đặc biệt cho trang đó

6. **{{PAGE_CONTENT}}** - Nội dung chính của trang
   - HTML content của trang

7. **{{PAGE_SCRIPTS}}** - JavaScript cho trang
   - Các script đặc biệt cho trang đó

## Ví dụ sử dụng

### Ví dụ 1: Dashboard Page
```html
<!-- Thay thế các placeholder -->
{{PAGE_TITLE}} → Dashboard
{{HEADER_ICON}} → fas fa-tachometer-alt
{{HEADER_TITLE}} → Dashboard
{{ACTIVE_DASHBOARD}} → class="active"
{{ACTIVE_QUESTIONS}} → (để trống)
{{ACTIVE_TANGTOC_QUESTIONS}} → (để trống)
... (các ACTIVE khác để trống)

{{CUSTOM_STYLES}} → 
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
...

{{PAGE_CONTENT}} →
<div class="stats-grid">
    <div class="stat-card">...</div>
    ...
</div>

{{PAGE_SCRIPTS}} →
<script>
    // Dashboard specific scripts
    loadDashboardData();
</script>
```

### Ví dụ 2: Reports Page
```html
{{PAGE_TITLE}} → Báo lỗi câu hỏi
{{HEADER_ICON}} → fas fa-flag
{{HEADER_TITLE}} → Báo lỗi câu hỏi
{{ACTIVE_REPORTS}} → class="active"
(các ACTIVE khác để trống)

{{CUSTOM_STYLES}} →
.table-responsive { overflow-x: auto; }
.badge-open { background: rgba(239,68,68,.15); color: #dc2626; }
...

{{PAGE_CONTENT}} →
<div class="admin-card">
    <div class="card-header">...</div>
    <div class="card-body">...</div>
</div>

{{PAGE_SCRIPTS}} →
<script>
    // Reports specific scripts
    loadReports();
</script>
```

## Cấu trúc Navbar đầy đủ

Navbar bao gồm các mục sau (theo thứ tự):
1. Dashboard
2. Quản lý câu hỏi
3. Quản lý câu hỏi Tăng Tốc
4. Quản lý người dùng
5. Login Logs
6. Lịch sử trận đấu
7. Báo lỗi câu hỏi
8. Báo lỗi câu hỏi Tăng Tốc
9. Logs xóa câu hỏi
10. Logs xóa câu hỏi Tăng Tốc
11. Trang chủ
12. Đăng xuất

## Lưu ý khi sử dụng

1. **Không chỉnh sửa trực tiếp file base template** trừ khi cần thay đổi toàn bộ admin panel
2. **Luôn đảm bảo có đúng 1 menu item được đánh dấu active** cho mỗi trang
3. **Custom styles nên được đặt trong {{CUSTOM_STYLES}}** để tránh conflict
4. **Page scripts nên được đặt cuối cùng** trong {{PAGE_SCRIPTS}}
5. **Sử dụng các class có sẵn** từ base template trước khi tạo class mới

## Các class CSS có sẵn

### Layout
- `.admin-layout` - Container chính
- `.admin-sidebar` - Sidebar navigation
- `.admin-content` - Nội dung chính
- `.admin-header` - Header của trang

### Components
- `.admin-user` - Thông tin user
- `.avatar` - Avatar user
- `.logo` - Logo admin panel

### Navigation
- `.sidebar-nav` - Navigation menu
- `.sidebar-nav li.active` - Menu item đang active

## Responsive Breakpoints

- Desktop: > 768px (full sidebar)
- Tablet: ≤ 768px (collapsed sidebar, chỉ hiện icon)
- Mobile: ≤ 480px (optimized spacing)

## Màu sắc chủ đạo

- Primary Red: `#ef4444`
- Secondary Red: `#dc2626`
- Text Gray: `#64748b`
- Background: White với glass morphism effect

