#!/bin/bash

# Script để reset database trong môi trường phát triển
echo "Đang reset database..."

# Kiểm tra MariaDB đã chạy chưa
mysql -h localhost -P 3306 -u nqd_user -pnqd_password -e "SELECT 1" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Không thể kết nối đến MariaDB. Vui lòng đảm bảo MariaDB đang chạy."
  exit 1
fi

# Reset database
mysql -h localhost -P 3306 -u nqd_user -pnqd_password -e "DROP DATABASE IF EXISTS nqd_database; CREATE DATABASE nqd_database;"

# Chạy script khởi tạo
echo "Đang khởi tạo lại cấu trúc database..."
mysql -h localhost -P 3306 -u nqd_user -pnqd_password nqd_database < db/init/01-init.sql
mysql -h localhost -P 3306 -u nqd_user -pnqd_password nqd_database < db/init/02-create-admin.sql

echo "Reset database hoàn tất!"