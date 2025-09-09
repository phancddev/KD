#!/bin/bash

# Script để reset database hoàn toàn với đầy đủ cấu trúc cho hệ thống Tăng Tốc
# Sử dụng: ./reset_database_complete.sh

echo "🔄 Đang reset database hoàn toàn..."

# Lấy thông tin database từ config
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-nqd_database}

echo "📊 Thông tin database:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"

# Xóa database cũ (nếu tồn tại)
echo "🗑️  Đang xóa database cũ..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null

# Tạo database mới
echo "🆕 Đang tạo database mới..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Chạy file init chính
echo "📋 Đang chạy file init chính..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/init/01-init.sql

# Chạy file migration tăng tốc
echo "🚀 Đang chạy migration tăng tốc..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/init/01-tangtoc-migration.sql

# Chạy file tạo admin
echo "👤 Đang tạo admin mặc định..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/init/02-create-admin.sql

echo "✅ Hoàn tất! Database đã được reset với đầy đủ cấu trúc cho hệ thống Tăng Tốc."
echo ""
echo "📝 Thông tin đăng nhập admin:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🔧 Các cột đã được thêm vào bảng questions:"
echo "   - question_number (INT): Số câu hỏi (1,2,3,4)"
echo "   - image_url (TEXT): Link hình ảnh"
echo "   - time_limit (INT): Thời gian cho mỗi câu hỏi"
echo ""
echo "🎯 Bây giờ bạn có thể upload câu hỏi Tăng Tốc mà không gặp lỗi!"
