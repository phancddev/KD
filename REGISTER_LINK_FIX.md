# Sửa lỗi: Luôn hiển thị link đăng ký ở trang đăng nhập

## Vấn đề

**Trước đây**:
- Khi chức năng đăng ký bị khóa (`enableRegistration = false`)
- Link "Chưa có tài khoản? Đăng ký ngay" ở trang đăng nhập bị ẩn
- Thay vào đó hiển thị: "Chức năng đăng ký hiện đang tạm khóa."
- **Vấn đề**: Admin không thể truy cập trang register để đăng nhập

## Lý do cần sửa

Khi chức năng đăng ký bị khóa:
- ✅ User thường không thể đăng ký (đúng)
- ✅ Nhưng Admin vẫn cần truy cập trang `/register` để đăng nhập
- ✅ Trang register có thể hiển thị thông tin đặc biệt cho admin
- ✅ Link "Đăng nhập ngay" ở trang register vẫn hoạt động

## Giải pháp

**Bây giờ**:
- ✅ **Luôn hiển thị** link "Chưa có tài khoản? Đăng ký ngay" ở trang đăng nhập
- ✅ Kể cả khi chức năng đăng ký bị khóa
- ✅ Admin có thể click vào để đến trang register
- ✅ Tại trang register, admin có thể click "Đăng nhập ngay" để quay lại
- ✅ Hoặc trang register có thể hiển thị thông tin đặc biệt cho admin

## Thay đổi code

### File: `/views/login.html`

**Trước** (dòng 455-472):
```javascript
// Kiểm tra xem chức năng register có được bật không
async function checkRegistrationStatus() {
    try {
        const response = await fetch('/api/features/registration-status');
        const data = await response.json();

        const registerLink = document.getElementById('register-link');
        if (!data.enabled) {
            registerLink.style.display = 'none';
            registerLink.parentElement.innerHTML = '<p style="color: #6b7280; font-size: 14px;">Chức năng đăng ký hiện đang tạm khóa.</p>';
        }
    } catch (error) {
        console.log('Không thể kiểm tra trạng thái register');
    }
}

// Kiểm tra khi trang load
checkRegistrationStatus();
```

**Sau** (dòng 455-456):
```javascript
// Luôn hiển thị link đăng ký, kể cả khi bị khóa
// Điều này cho phép admin vẫn có thể truy cập trang register để đăng nhập
```

## Flow hoạt động

### Khi chức năng đăng ký BẬT (`enableRegistration = true`):

1. User vào `/login`
2. Thấy link "Chưa có tài khoản? Đăng ký ngay"
3. Click vào → Đến `/register`
4. Điền form đăng ký → Submit
5. Tạo tài khoản thành công → Tự động đăng nhập → Vào home

### Khi chức năng đăng ký KHÓA (`enableRegistration = false`):

#### User thường:
1. User vào `/login`
2. Thấy link "Chưa có tài khoản? Đăng ký ngay" (vẫn hiển thị)
3. Click vào → Đến `/register`
4. Điền form đăng ký → Submit
5. Server trả về lỗi 403: "Chức năng đăng ký đã bị tắt"
6. User thấy thông báo lỗi
7. User có thể click "Đã có tài khoản? Đăng nhập ngay" để quay lại

#### Admin:
1. Admin vào `/login`
2. Thấy link "Chưa có tài khoản? Đăng ký ngay"
3. Click vào → Đến `/register`
4. Trang register có thể hiển thị thông tin đặc biệt cho admin
5. Admin click "Đã có tài khoản? Đăng nhập ngay" → Quay lại `/login`
6. Admin đăng nhập bình thường

## Lợi ích

### 1. **Linh hoạt hơn**:
- ✅ Admin luôn có thể di chuyển giữa 2 trang
- ✅ Không bị "mắc kẹt" ở trang login
- ✅ Có thể truy cập trang register để xem thông tin

### 2. **UX tốt hơn**:
- ✅ Link luôn hiển thị, nhất quán
- ✅ User không bị bối rối khi link biến mất
- ✅ Thông báo lỗi rõ ràng khi submit form (nếu bị khóa)

### 3. **Bảo mật vẫn đảm bảo**:
- ✅ Chức năng đăng ký vẫn bị khóa ở backend
- ✅ User không thể tạo tài khoản mới
- ✅ Chỉ hiển thị link, không cho phép đăng ký

## Bảo vệ backend

Backend vẫn kiểm tra khi submit form:

```javascript
// File: server.js
app.post('/register', async (req, res) => {
  // Kiểm tra xem chức năng register có được bật không
  if (!config.features.enableRegistration) {
    return res.status(403).json({
      error: 'Chức năng đăng ký đã bị tắt',
      message: 'Hiện tại không thể tạo tài khoản mới'
    });
  }
  
  // ... tiếp tục xử lý đăng ký
});
```

**Kết quả**:
- ✅ User có thể click link và đến trang register
- ✅ Nhưng không thể submit form thành công
- ✅ Sẽ nhận được thông báo lỗi rõ ràng

## So sánh

| Tính năng | Trước | Sau |
|-----------|-------|-----|
| **Link hiển thị khi đăng ký BẬT** | ✅ Có | ✅ Có |
| **Link hiển thị khi đăng ký KHÓA** | ❌ Không | ✅ Có |
| **Admin truy cập trang register** | ❌ Khó | ✅ Dễ |
| **User tạo tài khoản khi KHÓA** | ❌ Không | ❌ Không |
| **Bảo mật backend** | ✅ Có | ✅ Có |
| **Thông báo lỗi khi submit** | ✅ Có | ✅ Có |

## Tương lai

Nếu muốn hiển thị thông tin đặc biệt cho admin ở trang register, có thể thêm:

```javascript
// File: views/register.html
<script>
    // Kiểm tra nếu đăng ký bị khóa
    fetch('/api/features/registration-status')
        .then(response => response.json())
        .then(data => {
            if (!data.enabled) {
                // Hiển thị thông báo cho admin
                const adminNote = document.createElement('div');
                adminNote.className = 'admin-note';
                adminNote.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <p>Chức năng đăng ký đang tạm khóa.</p>
                    <p>Nếu bạn là Admin, vui lòng <a href="/login">đăng nhập tại đây</a>.</p>
                `;
                document.querySelector('.auth-card').prepend(adminNote);
            }
        });
</script>
```

## Kết luận

Đã sửa lỗi:
- ✅ Xóa code kiểm tra và ẩn link đăng ký
- ✅ Link "Chưa có tài khoản? Đăng ký ngay" luôn hiển thị
- ✅ Admin có thể truy cập trang register dễ dàng
- ✅ Bảo mật vẫn được đảm bảo ở backend
- ✅ UX tốt hơn, nhất quán hơn

File thay đổi: `KD/views/login.html` (xóa 18 dòng code)

