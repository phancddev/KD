#!/bin/bash

# Script kiểm tra migration Tăng Tốc đã chạy thành công chưa
# Sử dụng: ./verify_tangtoc_migration.sh

set -e

echo "🔍 KIỂM TRA MIGRATION TĂNG TỐC"
echo "================================"
echo ""

# Lấy thông tin database từ docker-compose hoặc env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3307}
DB_USER=${DB_USER:-nqd_user}
DB_PASSWORD=${DB_PASSWORD:-nqd_password}
DB_NAME=${DB_NAME:-nqd_database}

# Kiểm tra kết nối database
echo "📊 Kiểm tra kết nối database..."
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Không thể kết nối đến database!"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   User: $DB_USER"
    echo "   Database: $DB_NAME"
    exit 1
fi
echo "✅ Kết nối database thành công!"
echo ""

# Kiểm tra các bảng Tăng Tốc
echo "📋 Kiểm tra các bảng Tăng Tốc..."
TABLES=(
    "tangtoc_answers"
    "tangtoc_question_reports"
    "tangtoc_answer_suggestions"
    "tangtoc_answer_suggestion_logs"
    "tangtoc_question_deletion_logs"
    "deleted_tangtoc_question_answers"
)

MISSING_TABLES=()
for table in "${TABLES[@]}"; do
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE $table" > /dev/null 2>&1; then
        echo "  ✅ Bảng $table tồn tại"
    else
        echo "  ❌ Bảng $table KHÔNG tồn tại"
        MISSING_TABLES+=("$table")
    fi
done
echo ""

# Kiểm tra cột image_url trong tangtoc_question_reports
echo "🔍 Kiểm tra cột image_url..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE tangtoc_question_reports" 2>/dev/null | grep -q "image_url"; then
    echo "  ✅ Cột image_url tồn tại trong tangtoc_question_reports"
    IMAGE_URL_OK=true
else
    echo "  ❌ Cột image_url KHÔNG tồn tại trong tangtoc_question_reports"
    IMAGE_URL_OK=false
fi

# Kiểm tra cột cũ question_image_url
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE tangtoc_question_reports" 2>/dev/null | grep -q "question_image_url"; then
    echo "  ⚠️  Cột question_image_url vẫn tồn tại (cần migration)"
    OLD_COLUMN_EXISTS=true
else
    echo "  ✅ Cột question_image_url đã được đổi tên hoặc không tồn tại"
    OLD_COLUMN_EXISTS=false
fi
echo ""

# Kiểm tra indexes
echo "🔍 Kiểm tra indexes..."
INDEXES=(
    "idx_tangtoc_answers_question_id:tangtoc_answers"
    "idx_tangtoc_question_reports_status:tangtoc_question_reports"
    "idx_tangtoc_question_reports_created_at:tangtoc_question_reports"
    "idx_tangtoc_question_deletion_logs_deleted_at:tangtoc_question_deletion_logs"
)

MISSING_INDEXES=()
for index_info in "${INDEXES[@]}"; do
    IFS=':' read -r index_name table_name <<< "$index_info"
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW INDEX FROM $table_name WHERE Key_name='$index_name'" 2>/dev/null | grep -q "$index_name"; then
        echo "  ✅ Index $index_name tồn tại"
    else
        echo "  ⚠️  Index $index_name không tồn tại"
        MISSING_INDEXES+=("$index_name")
    fi
done
echo ""

# Tổng kết
echo "================================"
echo "📊 KẾT QUẢ KIỂM TRA"
echo "================================"

if [ ${#MISSING_TABLES[@]} -eq 0 ] && [ "$IMAGE_URL_OK" = true ] && [ "$OLD_COLUMN_EXISTS" = false ]; then
    echo "✅ MIGRATION HOÀN TẤT THÀNH CÔNG!"
    echo ""
    echo "Tất cả bảng đã được tạo:"
    for table in "${TABLES[@]}"; do
        echo "  ✓ $table"
    done
    echo ""
    echo "Cột image_url đã được cấu hình đúng."
    echo ""
    
    if [ ${#MISSING_INDEXES[@]} -gt 0 ]; then
        echo "⚠️  Một số indexes chưa được tạo (không ảnh hưởng chức năng):"
        for index in "${MISSING_INDEXES[@]}"; do
            echo "  - $index"
        done
    else
        echo "✅ Tất cả indexes đã được tạo."
    fi
    
    exit 0
else
    echo "❌ MIGRATION CHƯA HOÀN TẤT!"
    echo ""
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        echo "Các bảng còn thiếu:"
        for table in "${MISSING_TABLES[@]}"; do
            echo "  ✗ $table"
        done
        echo ""
    fi
    
    if [ "$IMAGE_URL_OK" = false ]; then
        echo "⚠️  Cột image_url chưa được tạo trong tangtoc_question_reports"
        echo ""
    fi
    
    if [ "$OLD_COLUMN_EXISTS" = true ]; then
        echo "⚠️  Cột question_image_url vẫn tồn tại, cần chạy migration đổi tên"
        echo ""
        echo "Chạy lệnh sau để sửa:"
        echo "  docker-compose restart app"
        echo ""
    fi
    
    echo "KHUYẾN NGHỊ:"
    echo "  1. Kiểm tra logs: docker-compose logs app | grep -i migration"
    echo "  2. Restart app: docker-compose restart app"
    echo "  3. Chạy lại script này để verify"
    echo ""
    
    exit 1
fi

