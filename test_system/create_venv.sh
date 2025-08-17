#!/bin/bash

# Script tạo môi trường ảo Python trong thư mục test_system

# Kiểm tra Python đã được cài đặt chưa
if ! command -v python3 &> /dev/null; then
    echo "Python3 chưa được cài đặt. Vui lòng cài đặt Python3 trước khi tiếp tục."
    exit 1
fi

# Đường dẫn đến thư mục môi trường ảo
VENV_DIR="test_system/venv"

# Tạo môi trường ảo
echo "Đang tạo môi trường ảo Python..."
python3 -m venv $VENV_DIR

# Kích hoạt môi trường ảo và cài đặt các gói
echo "Đang cài đặt các gói cần thiết..."
source $VENV_DIR/bin/activate
pip install --upgrade pip
pip install -r test_system/requirements.txt

echo ""
echo "=============================================="
echo "Môi trường ảo Python đã được tạo thành công!"
echo "=============================================="
echo "Để kích hoạt môi trường ảo, chạy:"
echo "source test_system/venv/bin/activate"
echo ""
echo "Để thoát môi trường ảo, chạy:"
echo "deactivate"
echo "=============================================="