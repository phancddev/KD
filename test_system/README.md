# Hướng dẫn sử dụng môi trường test

## 1. Chạy ứng dụng

### Cách 1: Chạy trực tiếp trên máy local

```bash
# Chạy ứng dụng với MariaDB trong Docker
./test_system/run_local.sh
```

Script này sẽ:
- Khởi động một container MariaDB
- Cài đặt các dependencies nếu cần
- Khởi động ứng dụng Node.js với nodemon

### Cách 2: Chạy hoàn toàn trong Docker

```bash
# Khởi động tất cả các dịch vụ trong Docker
./test_system/run_docker.sh
```

Script này sẽ khởi động các container:
- MariaDB: Cơ sở dữ liệu
- Node.js: Ứng dụng web
- Python: Môi trường test

## 2. Tạo tài khoản test

### Cách 1: Sử dụng script Python

```bash
# Tạo tài khoản admin
python test_system/create_accounts.py --admin

# Tạo tài khoản người dùng thường
python test_system/create_accounts.py --user

# Tạo nhiều tài khoản cùng lúc (admin và user)
python test_system/create_accounts.py --batch
```

Khi sử dụng tùy chọn `--batch`, script sẽ tạo các tài khoản sau:
- Admin: username=testadmin, password=admin123
- User: username=testuser, password=user123
- Và 3 người dùng khác: user1, user2, user3 với mật khẩu tương ứng pass1, pass2, pass3

### Cách 2: Sử dụng công cụ quản lý

```bash
# Khởi động công cụ quản lý
python test_system/manage.py
```

Công cụ này cung cấp giao diện dòng lệnh để:
- Tạo người dùng mới (thường hoặc admin)
- Cấp/thu hồi quyền admin
- Liệt kê tất cả người dùng
- Đặt lại mật khẩu
- Xóa người dùng

## 3. Môi trường ảo Python

### Cách 1: Sử dụng Docker

```bash
# Kết nối vào container Python
docker exec -it nqd_python_env bash

# Sau khi kết nối, bạn có thể chạy các script test:
python test_db_connection.py
python test_api.py
python test_upload.py
python create_accounts.py --batch
```

### Cách 2: Sử dụng venv trên máy local

```bash
# Tạo môi trường ảo Python
./test_system/create_venv.sh

# Kích hoạt môi trường ảo
source test_system/venv/bin/activate

# Chạy các script test
python test_system/test_db_connection.py
python test_system/test_api.py
python test_system/test_upload.py
python test_system/create_accounts.py --batch

# Thoát môi trường ảo
deactivate
```

## 4. Tính năng upload câu hỏi

1. Đăng nhập với tài khoản admin mặc định:
   - Tên đăng nhập: admin
   - Mật khẩu: admin123
2. Truy cập vào trang quản lý câu hỏi: http://localhost:2701/admin/questions
3. Sử dụng chức năng "Nhập từ file CSV" và chọn file `test_system/sample_questions.csv`

Hoặc bạn có thể chạy script test tự động:
```bash
python test_system/test_upload.py
```

## 5. Cấu trúc file CSV câu hỏi

File CSV câu hỏi phải có định dạng:
- Dòng đầu tiên là tiêu đề: `Câu hỏi,Đáp án`
- Mỗi dòng tiếp theo là một câu hỏi và đáp án, phân cách bởi dấu phẩy
- Ví dụ: `Thủ đô của Việt Nam là gì?,Hà Nội`

## 6. Truy cập Adminer (quản lý DB)

- URL: http://localhost:8081
- Hệ thống: MariaDB
- Server: mariadb
- Người dùng: nqd_user
- Mật khẩu: nqd_password
- Cơ sở dữ liệu: nqd_database

## 7. Dừng môi trường

### Nếu bạn sử dụng run_local.sh
Nhấn Ctrl+C để dừng ứng dụng Node.js. Script sẽ tự động dừng và xóa container MariaDB.

### Nếu bạn sử dụng run_docker.sh
```bash
docker-compose -f test_system/docker-compose.python.yml down
```