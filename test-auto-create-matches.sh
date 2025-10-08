#!/bin/bash

echo "🧪 TEST: Auto-create matches table"
echo "=================================="
echo ""

# Backup bảng matches hiện tại
echo "📦 Step 1: Backup bảng matches hiện tại..."
docker exec -i kd-mariadb-1 mysqldump -uroot -proot_password nqd_database matches > /tmp/matches_backup.sql 2>/dev/null
if [ $? -eq 0 ]; then
  echo "   ✅ Backup thành công: /tmp/matches_backup.sql"
else
  echo "   ℹ️  Không có bảng matches để backup (hoặc bảng rỗng)"
fi
echo ""

# Drop bảng matches
echo "🗑️  Step 2: Drop bảng matches để test..."
docker exec -i kd-mariadb-1 mysql -uroot -proot_password nqd_database -e "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS matches; SET FOREIGN_KEY_CHECKS = 1;" 2>/dev/null
echo "   ✅ Đã drop bảng matches"
echo ""

# Verify bảng đã bị xóa
echo "🔍 Step 3: Verify bảng đã bị xóa..."
RESULT=$(docker exec -i kd-mariadb-1 mysql -uroot -proot_password nqd_database -e "SHOW TABLES LIKE 'matches';" 2>/dev/null | grep -c "matches")
if [ "$RESULT" -eq "0" ]; then
  echo "   ✅ Bảng matches đã bị xóa"
else
  echo "   ❌ Bảng matches vẫn còn!"
  exit 1
fi
echo ""

# Restart app để trigger auto-create
echo "🔄 Step 4: Restart app để trigger auto-create..."
docker-compose restart app > /dev/null 2>&1
echo "   ✅ App đang restart..."
echo ""

# Đợi app khởi động
echo "⏳ Step 5: Đợi app khởi động (10 giây)..."
sleep 10
echo "   ✅ Done"
echo ""

# Kiểm tra logs
echo "📋 Step 6: Kiểm tra logs..."
docker-compose logs --tail=50 app 2>/dev/null | grep -A 3 "Step 0"
echo ""

# Verify bảng đã được tạo
echo "🔍 Step 7: Verify bảng matches đã được tạo..."
RESULT=$(docker exec -i kd-mariadb-1 mysql -uroot -proot_password nqd_database -e "SHOW TABLES LIKE 'matches';" 2>/dev/null | grep -c "matches")
if [ "$RESULT" -gt "0" ]; then
  echo "   ✅ Bảng matches đã được tạo tự động!"
  echo ""
  echo "📊 Cấu trúc bảng:"
  docker exec -i kd-mariadb-1 mysql -uroot -proot_password nqd_database -e "DESCRIBE matches;" 2>/dev/null
else
  echo "   ❌ Bảng matches KHÔNG được tạo!"
  exit 1
fi
echo ""

# Restore backup nếu có
echo "♻️  Step 8: Restore backup (nếu có)..."
if [ -f /tmp/matches_backup.sql ]; then
  docker exec -i kd-mariadb-1 mysql -uroot -proot_password nqd_database < /tmp/matches_backup.sql 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "   ✅ Đã restore backup"
  else
    echo "   ℹ️  Không restore được (có thể backup rỗng)"
  fi
  rm /tmp/matches_backup.sql
else
  echo "   ℹ️  Không có backup để restore"
fi
echo ""

echo "=================================="
echo "✅ TEST HOÀN TẤT!"
echo "=================================="

