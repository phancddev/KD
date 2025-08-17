#!/bin/bash

# Script khởi động môi trường ảo Python với Docker

# Dừng và xóa container cũ nếu có
echo "Dừng và xóa container cũ nếu có..."
docker-compose -f test_system/docker-compose.python.yml down

# Khởi động container mới
echo "Khởi động môi trường Python..."
docker-compose -f test_system/docker-compose.python.yml up -d

# Kết nối đến container Python
echo ""
echo "=============================================="
echo "Môi trường Python đã sẵn sàng!"
echo "=============================================="
echo "Đang kết nối đến môi trường Python..."
echo "Để thoát, gõ 'exit'"
echo "=============================================="
echo ""

# Kết nối đến container
docker exec -it nqd_python_env bash