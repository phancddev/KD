#!/bin/bash

# Dừng và xóa container cũ nếu có
echo "Dừng và xóa container cũ nếu có..."
docker-compose -f docker-compose.local.yml down

# Khởi động container mới
echo "Khởi động môi trường test..."
docker-compose -f docker-compose.local.yml up -d

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
echo "Để xem logs, chạy: docker-compose -f docker-compose.local.yml logs -f app"
echo "Để dừng môi trường test, chạy: docker-compose -f docker-compose.local.yml down"