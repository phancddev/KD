# Hướng dẫn điều khiển chức năng ứng dụng

## Tổng quan

Hệ thống này cho phép bạn dễ dàng bật/tắt các chức năng chính của ứng dụng mà không cần sửa code trực tiếp.

## Các chức năng có thể điều khiển

### 1. **Chức năng đăng ký (Registration)**
- **Mô tả**: Cho phép người dùng mới tạo tài khoản
- **Trạng thái mặc định**: Bật (true)
- **Ảnh hưởng**: 
  - Trang `/register` sẽ hiển thị hoặc bị chặn
  - Link "Đăng ký" trên trang login sẽ ẩn/hiện
  - API POST `/register` sẽ hoạt động hoặc bị vô hiệu hóa

### 2. **Chức năng đăng nhập (Login)**
- **Mô tả**: Cho phép người dùng đăng nhập vào hệ thống
- **Trạng thái mặc định**: Bật (true)
- **Ảnh hưởng**: Trang đăng nhập và xác thực người dùng

### 3. **Chế độ khách (Guest Mode)**
- **Mô tả**: Cho phép người dùng sử dụng ứng dụng mà không cần đăng nhập
- **Trạng thái mặc định**: Tắt (false)
- **Ảnh hưởng**: Truy cập các trang mà không cần xác thực

## Cách sử dụng

### Phương pháp 1: Sử dụng script tự động (Khuyến nghị)

#### Xem trạng thái hiện tại:
```bash
./toggle_features.sh status
```

#### Tắt chức năng đăng ký:
```bash
./toggle_features.sh registration off
```

#### Bật chức năng đăng ký:
```bash
./toggle_features.sh registration on
```

#### Tắt chức năng đăng nhập:
```bash
./toggle_features.sh login off
```

#### Bật chức năng đăng nhập:
```bash
./toggle_features.sh login on
```

### Phương pháp 2: Sửa file cấu hình trực tiếp

Chỉnh sửa file `features.config.js`:

```javascript
export const featuresConfig = {
  // Để tắt chức năng đăng ký
  enableRegistration: false, // Thay đổi từ true thành false
  
  // Để tắt chức năng đăng nhập
  enableLogin: false, // Thay đổi từ true thành false
  
  // Để bật chế độ khách
  enableGuestMode: true, // Thay đổi từ false thành true
};
```

## Lưu ý quan trọng

### 1. **Khởi động lại server**
Sau khi thay đổi cấu hình, bạn **PHẢI** khởi động lại server để thay đổi có hiệu lực:

```bash
# Nếu sử dụng Docker
docker-compose restart

# Nếu chạy trực tiếp
# Dừng server (Ctrl+C) và chạy lại
node server.js
```

### 2. **Kiểm tra thay đổi**
Sau khi khởi động lại server, kiểm tra:

- **Khi tắt register**: Truy cập `/register` sẽ hiển thị thông báo "Chức năng đăng ký đã bị tắt"
- **Link đăng ký**: Sẽ ẩn trên trang login
- **API**: POST `/register` sẽ trả về lỗi 403

### 3. **Bảo mật**
- Khi tắt chức năng đăng ký, người dùng mới không thể tạo tài khoản
- Chỉ người dùng đã có tài khoản mới có thể đăng nhập
- Phù hợp cho giai đoạn bảo trì hoặc khi muốn kiểm soát số lượng người dùng

## Ví dụ sử dụng thực tế

### Tình huống 1: Bảo trì hệ thống
```bash
# Tắt đăng ký để ngăn người dùng mới
./toggle_features.sh registration off

# Khởi động lại server
docker-compose restart

# Sau khi bảo trì xong, bật lại
./toggle_features.sh registration on
docker-compose restart
```

### Tình huống 2: Chế độ demo
```bash
# Tắt cả đăng ký và đăng nhập, chỉ cho phép chế độ khách
./toggle_features.sh registration off
./toggle_features.sh login off
./toggle_features.sh guest on

# Khởi động lại server
docker-compose restart
```

### Tình huống 3: Kiểm soát người dùng
```bash
# Chỉ cho phép đăng nhập, không cho đăng ký mới
./toggle_features.sh registration off
./toggle_features.sh login on

# Khởi động lại server
docker-compose restart
```

## Xử lý sự cố

### Lỗi thường gặp

1. **Script không thực thi được**
   ```bash
   chmod +x toggle_features.sh
   ```

2. **Thay đổi không có hiệu lực**
   - Kiểm tra đã khởi động lại server chưa
   - Kiểm tra file `features.config.js` đã được cập nhật chưa

3. **Server không khởi động được**
   - Kiểm tra cú pháp trong `features.config.js`
   - Kiểm tra console log để tìm lỗi

### Kiểm tra log
```bash
# Xem log server
docker-compose logs -f

# Hoặc nếu chạy trực tiếp
node server.js
```

## Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. File `features.config.js` có đúng cú pháp không
2. Server đã được khởi động lại chưa
3. Console log có hiển thị lỗi gì không

## Cấu trúc file

```
KD/
├── features.config.js          # File cấu hình chính
├── toggle_features.sh          # Script điều khiển
├── config.js                   # Cấu hình server
├── server.js                   # Server chính
└── FEATURE_CONTROL_README.md   # File hướng dẫn này
```
