#!/bin/bash

# Script để chạy ứng dụng trong Docker

# Kiểm tra xem Docker đã chạy chưa
if ! docker info > /dev/null 2>&1; then
  echo "Docker không chạy. Vui lòng khởi động Docker và thử lại."
  exit 1
fi

# Dừng và xóa container cũ nếu có
echo "Dừng và xóa container cũ nếu có..."
docker-compose -f test_system/docker-compose.python.yml down

# Khởi động container mới
echo "Khởi động môi trường test..."
docker-compose -f test_system/docker-compose.python.yml up -d

# Hiển thị thông tin truy cập
echo ""
echo "=============================================="
echo "Môi trường test đã sẵn sàng!"
echo "=============================================="
echo "- Ứng dụng web: http://localhost:2701"
echo "- Adminer (quản lý DB): http://localhost:8081"
echo "  - Hệ thống: MariaDB"
echo "  - Server: mariadb"
echo "  - Người dùng: nqd_user"
echo "  - Mật khẩu: nqd_password"
echo "  - Cơ sở dữ liệu: nqd_database"
echo ""
echo "Tài khoản admin mặc định:"
echo "- Tên đăng nhập: admin"
echo "- Mật khẩu: admin123"
echo "=============================================="
echo ""
echo "Để xem logs của ứng dụng, chạy: docker-compose -f test_system/docker-compose.python.yml logs -f app"
echo "Để kết nối vào môi trường Python, chạy: docker exec -it nqd_python_env bash"
echo "Để dừng môi trường test, chạy: docker-compose -f test_system/docker-compose.python.yml down"