#!/bin/bash

# Script dừng môi trường ảo Python với Docker

echo "Đang dừng môi trường Python..."
docker-compose -f test_system/docker-compose.python.yml down

echo ""
echo "=============================================="
echo "Môi trường Python đã dừng thành công!"
echo "=============================================="