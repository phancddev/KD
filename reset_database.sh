#!/bin/bash

echo "🔄 Đang reset database..."

# Dừng các container
echo "⏹️  Dừng các container..."
docker-compose down

# Xóa volume database để reset hoàn toàn
echo "🗑️  Xóa volume database..."
docker volume rm nqd_kd_mariadb_data 2>/dev/null || echo "Volume không tồn tại, bỏ qua"

# Khởi động lại
echo "🚀 Khởi động lại database..."
docker-compose up -d mariadb

# Đợi database khởi động
echo "⏳ Đợi database khởi động..."
sleep 10

# Chạy script khởi tạo
echo "📝 Khởi tạo database..."
docker exec -i nqd_kd-mariadb-1 mysql -u nqd_user -pnqd_password < db/init/01-init.sql
docker exec -i nqd_kd-mariadb-1 mysql -u nqd_user -pnqd_password < db/init/02-create-admin.sql

# Khởi động app
echo "🚀 Khởi động ứng dụng..."
docker-compose up -d

echo "✅ Reset database hoàn tất!"
echo "🔑 Tài khoản admin: admin / admin123"
echo "🌐 Truy cập: http://localhost:2701" 