#!/bin/bash

# Script để test tạo trận đấu và xem logs đồng bộ

echo "========================================="
echo "TEST TẠO TRẬN ĐẤU VÀ KIỂM TRA LOGS"
echo "========================================="
echo ""

# Màu sắc
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Lấy session cookie (giả sử đã đăng nhập)
echo -e "${YELLOW}📝 Đăng nhập để lấy session...${NC}"
LOGIN_RESPONSE=$(curl -s -c /tmp/kd_cookies.txt -X POST http://localhost:2701/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Tạo trận đấu
echo -e "${YELLOW}🎮 Tạo trận đấu mới...${NC}"
CREATE_RESPONSE=$(curl -s -b /tmp/kd_cookies.txt -X POST http://localhost:2701/api/matches \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Match Auto","dataNodeId":1}')

echo -e "${GREEN}Response từ API:${NC}"
echo "$CREATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RESPONSE"
echo ""

# Lấy match_code và match_id từ response
MATCH_CODE=$(echo "$CREATE_RESPONSE" | jq -r '.data.match_code' 2>/dev/null)
MATCH_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.match_id' 2>/dev/null)

echo -e "${GREEN}✅ Match Code: ${MATCH_CODE}${NC}"
echo -e "${GREEN}✅ Match ID: ${MATCH_ID}${NC}"
echo ""

# Kiểm tra logs KD server
echo -e "${YELLOW}📋 LOGS KD SERVER (20 dòng cuối):${NC}"
echo "========================================="
docker logs kd-app-1 --tail 20 2>&1 | grep -E "Tạo trận đấu|Đã tạo|create_match|match" || docker logs kd-app-1 --tail 20
echo ""

# Kiểm tra logs Data Node
echo -e "${YELLOW}📋 LOGS DATA NODE (20 dòng cuối):${NC}"
echo "========================================="
docker logs dan_data_node --tail 20 2>&1 | grep -E "Nhận yêu cầu|Đã tạo|create_match|match" || docker logs dan_data_node --tail 20
echo ""

# Kiểm tra database
echo -e "${YELLOW}🗄️  KIỂM TRA DATABASE:${NC}"
echo "========================================="
docker exec kd-mariadb-1 mysql -u root -proot_password -e "USE nqd_database; SELECT match_id, match_code, match_name, data_node_id, status, created_by FROM matches ORDER BY created_at DESC LIMIT 3;" 2>/dev/null
echo ""

# Kiểm tra folder trên Data Node
echo -e "${YELLOW}📁 KIỂM TRA FOLDER TRÊN DATA NODE:${NC}"
echo "========================================="
if [ ! -z "$MATCH_ID" ] && [ "$MATCH_ID" != "null" ]; then
  docker exec dan_data_node ls -la /app/storage/ 2>/dev/null | grep "$MATCH_ID" || echo "Folder chưa được tạo hoặc không tìm thấy"
  
  # Kiểm tra match.json
  echo ""
  echo -e "${YELLOW}📄 NỘI DUNG match.json:${NC}"
  docker exec dan_data_node cat "/app/storage/$MATCH_ID/match.json" 2>/dev/null | jq '.' || echo "File match.json chưa tồn tại"
else
  echo -e "${RED}❌ Không lấy được Match ID từ response${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ HOÀN TẤT KIỂM TRA${NC}"
echo "========================================="

