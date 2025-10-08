#!/bin/bash

# Script để cập nhật tất cả sidebar trong admin panels
# Thêm menu Data Nodes và Matches vào tất cả trang

echo "🔧 Cập nhật sidebar cho tất cả trang admin..."

# Danh sách các file cần cập nhật
FILES=(
  "dashboard.html"
  "users.html"
  "questions.html"
  "game-history.html"
  "reports.html"
  "tangtoc-reports.html"
  "question-logs.html"
  "tangtoc-question-logs.html"
  "login-logs.html"
)

# Menu items cần thêm (sau "Quản lý câu hỏi Tăng Tốc")
NEW_MENU='                    <li>\n                        <a href="/admin/data-nodes"><i class="fas fa-server"></i> <span>Quản lý Data Nodes</span></a>\n                    </li>\n                    <li>\n                        <a href="/admin/matches"><i class="fas fa-trophy"></i> <span>Quản lý Trận Đấu</span></a>\n                    </li>'

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  📝 Đang cập nhật $file..."
    
    # Kiểm tra xem đã có menu Data Nodes chưa
    if grep -q "data-nodes" "$file"; then
      echo "    ⏭️  $file đã có menu Data Nodes, bỏ qua"
    else
      # Tìm dòng có "Quản lý câu hỏi Tăng Tốc" và thêm menu mới sau đó
      # Sử dụng sed để thêm
      sed -i.bak '/tangtoc-questions.*Quản lý câu hỏi Tăng Tốc/a\
                    <li>\
                        <a href="/admin/data-nodes"><i class="fas fa-server"></i> <span>Quản lý Data Nodes</span></a>\
                    </li>\
                    <li>\
                        <a href="/admin/matches"><i class="fas fa-trophy"></i> <span>Quản lý Trận Đấu</span></a>\
                    </li>
' "$file"
      
      echo "    ✅ Đã cập nhật $file"
    fi
  else
    echo "    ❌ Không tìm thấy $file"
  fi
done

echo ""
echo "✅ Hoàn thành! Đã cập nhật tất cả sidebar."
echo "📝 Các file backup được lưu với extension .bak"

