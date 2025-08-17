#!/bin/bash

# Script để chạy ứng dụng trên môi trường local

# Kiểm tra xem đã cài đặt các dependencies chưa
if [ ! -d "node_modules" ]; then
  echo "Cài đặt các dependencies..."
  npm install
fi

# Kiểm tra xem MariaDB đã chạy chưa
echo "Khởi động MariaDB trong Docker..."
docker run -d --name nqd_mariadb_local \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=nqd_database \
  -e MYSQL_USER=nqd_user \
  -e MYSQL_PASSWORD=nqd_password \
  -v "$(pwd)/db/init:/docker-entrypoint-initdb.d" \
  mariadb:10.6

# Đợi MariaDB khởi động
echo "Đợi MariaDB khởi động..."
sleep 10

# Kiểm tra kết nối đến MariaDB
echo "Kiểm tra kết nối đến MariaDB..."
docker exec nqd_mariadb_local mysql -unqd_user -pnqd_password -e "SELECT 1" nqd_database
if [ $? -ne 0 ]; then
  echo "Không thể kết nối đến MariaDB. Vui lòng kiểm tra lại."
  echo "Dừng container MariaDB..."
  docker stop nqd_mariadb_local
  docker rm nqd_mariadb_local
  exit 1
fi

# Tạo thư mục uploads nếu chưa có
mkdir -p uploads

# Khởi động ứng dụng
echo ""
echo "=============================================="
echo "Khởi động ứng dụng Node.js..."
echo "=============================================="
echo "Ứng dụng web sẽ chạy tại: http://localhost:2701"
echo "Tài khoản admin mặc định:"
echo "- Tên đăng nhập: admin"
echo "- Mật khẩu: admin123"
echo "=============================================="
echo ""

npm run dev

# Khi ứng dụng dừng lại, dừng container MariaDB
echo "Dừng container MariaDB..."
docker stop nqd_mariadb_local
docker rm nqd_mariadb_local