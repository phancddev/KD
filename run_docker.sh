#!/bin/bash

echo "===== KHỞI CHẠY ỨNG DỤNG NQD KNOWLEDGE DUEL ====="

# Dừng và xóa containers cũ nếu có
echo "Đang dừng containers cũ..."
docker-compose down -v

# Xóa images cũ nếu có
echo "Đang xóa images cũ..."
docker rmi $(docker images -q nqd_kd-app) 2>/dev/null || true

# Build và khởi động ứng dụng
echo "Đang build và khởi động ứng dụng..."
docker-compose up --build -d

# Đợi database khởi động
echo "Đang đợi database khởi động..."
sleep 10

# Kiểm tra trạng thái
echo "Kiểm tra trạng thái containers..."
docker-compose ps

echo ""
echo "===== ỨNG DỤNG ĐÃ KHỞI CHẠY THÀNH CÔNG! ====="
echo "- Ứng dụng web: http://localhost:2701"
echo "- Adminer (quản lý DB): http://localhost:8080"
echo "- Tài khoản admin: admin / admin123"
echo ""
echo "Để dừng ứng dụng, chạy: docker-compose down"
echo "Để xem logs, chạy: docker-compose logs -f" 