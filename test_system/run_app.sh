#!/bin/bash

# Chạy ứng dụng mà không cần Docker
echo "Khởi động ứng dụng trong môi trường local..."

# Kiểm tra MariaDB đã chạy chưa
echo "Kiểm tra kết nối đến MariaDB..."
mysql -h localhost -P 3306 -u nqd_user -pnqd_password -e "SELECT 1" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Không thể kết nối đến MariaDB. Vui lòng đảm bảo MariaDB đang chạy."
  echo "Bạn có thể khởi động MariaDB bằng Docker với lệnh:"
  echo "docker run -d --name mariadb_test -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root_password -e MYSQL_DATABASE=nqd_database -e MYSQL_USER=nqd_user -e MYSQL_PASSWORD=nqd_password mariadb:10.6"
  exit 1
fi

# Khởi động ứng dụng
echo "Khởi động ứng dụng Node.js..."
npm run dev