#!/bin/bash

# Script để bật/tắt các chức năng của ứng dụng
# Sử dụng: ./toggle_features.sh [feature] [on/off]

FEATURES_FILE="features.config.js"
CONTAINER_NAME="kd-app-1"

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hàm hiển thị help
show_help() {
    echo -e "${YELLOW}Script điều khiển chức năng ứng dụng (Tự động Docker)${NC}"
    echo ""
    echo "Cách sử dụng:"
    echo "  $0 [feature] [on/off]"
    echo ""
    echo "Features có sẵn:"
    echo "  registration - Chức năng đăng ký"
    echo "  login       - Chức năng đăng nhập"
    echo "  guest       - Chế độ khách"
    echo ""
    echo "Ví dụ:"
    echo "  $0 registration off    # Tắt chức năng đăng ký"
    echo "  $0 registration on     # Bật chức năng đăng ký"
    echo "  $0 login off           # Tắt chức năng đăng nhập"
    echo ""
    echo "Để xem trạng thái hiện tại:"
    echo "  $0 status"
    echo ""
    echo "Để kiểm tra trạng thái Docker:"
    echo "  $0 docker-status"
}

# Hàm kiểm tra file cấu hình
check_config_file() {
    if [ ! -f "$FEATURES_FILE" ]; then
        echo -e "${RED}Lỗi: Không tìm thấy file $FEATURES_FILE${NC}"
        exit 1
    fi
}

# Hàm kiểm tra Docker container
check_docker_container() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${RED}Lỗi: Container $CONTAINER_NAME không chạy${NC}"
        echo -e "${YELLOW}Hãy khởi động Docker container trước:${NC}"
        echo "  docker-compose up -d"
        exit 1
    fi
}

# Hàm hiển thị trạng thái
show_status() {
    echo -e "${YELLOW}Trạng thái các chức năng:${NC}"
    echo ""
    
    # Đọc trạng thái từ file
    REG_STATUS=$(grep "enableRegistration:" "$FEATURES_FILE" | grep -o "true\|false")
    LOGIN_STATUS=$(grep "enableLogin:" "$FEATURES_FILE" | grep -o "true\|false")
    GUEST_STATUS=$(grep "enableGuestMode:" "$FEATURES_FILE" | grep -o "true\|false")
    
    echo -e "Đăng ký:     ${GREEN}$REG_STATUS${NC}"
    echo -e "Đăng nhập:   ${GREEN}$LOGIN_STATUS${NC}"
    echo -e "Chế độ khách: ${GREEN}$GUEST_STATUS${NC}"
    echo ""
}

# Hàm hiển thị trạng thái Docker
show_docker_status() {
    echo -e "${BLUE}Trạng thái Docker container:${NC}"
    echo ""
    
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "Container:   ${GREEN}$CONTAINER_NAME đang chạy${NC}"
        
        # Kiểm tra API
        echo -e "API Status:  ${YELLOW}Đang kiểm tra...${NC}"
        if command -v curl &> /dev/null; then
            API_RESPONSE=$(curl -s http://localhost:2701/api/features/registration-status 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo -e "API Response: ${GREEN}$API_RESPONSE${NC}"
            else
                echo -e "API Response: ${RED}Không thể kết nối${NC}"
            fi
        else
            echo -e "API Response: ${YELLOW}curl không có sẵn để test${NC}"
        fi
    else
        echo -e "Container:   ${RED}$CONTAINER_NAME không chạy${NC}"
    fi
    echo ""
}

# Hàm copy file và restart container
apply_changes() {
    local feature=$1
    local action=$2
    
    echo -e "${BLUE}🔄 Đang áp dụng thay đổi...${NC}"
    
    # Copy file vào container
    echo -e "${YELLOW}📁 Copy file cấu hình vào container...${NC}"
    if docker cp "$FEATURES_FILE" "$CONTAINER_NAME:/app/$FEATURES_FILE"; then
        echo -e "${GREEN}✅ Copy file thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi copy file${NC}"
        return 1
    fi
    
    # Restart container
    echo -e "${YELLOW}🔄 Restart container...${NC}"
    if docker restart "$CONTAINER_NAME"; then
        echo -e "${GREEN}✅ Restart container thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi restart container${NC}"
        return 1
    fi
    
    # Đợi container khởi động
    echo -e "${YELLOW}⏳ Đợi container khởi động...${NC}"
    sleep 8
    
    # Kiểm tra trạng thái
    echo -e "${YELLOW}🔍 Kiểm tra trạng thái...${NC}"
    if command -v curl &> /dev/null; then
        local max_attempts=5
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            echo -e "${YELLOW}   Lần thử $attempt/$max_attempts...${NC}"
            
            if API_RESPONSE=$(curl -s http://localhost:2701/api/features/registration-status 2>/dev/null); then
                echo -e "${GREEN}✅ API hoạt động: $API_RESPONSE${NC}"
                break
            else
                echo -e "${YELLOW}   Chưa sẵn sàng, đợi thêm...${NC}"
                sleep 3
                attempt=$((attempt + 1))
            fi
        done
        
        if [ $attempt -gt $max_attempts ]; then
            echo -e "${RED}⚠️  Container có thể chưa sẵn sàng hoàn toàn${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Không thể test API (curl không có sẵn)${NC}"
    fi
    
    echo -e "${GREEN}🎉 Hoàn tất! Chức năng $feature đã được $action${NC}"
}

# Hàm thay đổi trạng thái
toggle_feature() {
    local feature=$1
    local action=$2
    
    case $feature in
        "registration")
            if [ "$action" = "on" ]; then
                sed -i '' 's/enableRegistration: false/enableRegistration: true/' "$FEATURES_FILE"
                echo -e "${GREEN}✅ Đã bật chức năng đăng ký${NC}"
            elif [ "$action" = "off" ]; then
                sed -i '' 's/enableRegistration: true/enableRegistration: false/' "$FEATURES_FILE"
                echo -e "${RED}✅ Đã tắt chức năng đăng ký${NC}"
            fi
            ;;
        "login")
            if [ "$action" = "on" ]; then
                sed -i '' 's/enableLogin: false/enableLogin: true/' "$FEATURES_FILE"
                echo -e "${GREEN}✅ Đã bật chức năng đăng nhập${NC}"
            elif [ "$action" = "off" ]; then
                sed -i '' 's/enableLogin: true/enableLogin: false/' "$FEATURES_FILE"
                echo -e "${RED}✅ Đã tắt chức năng đăng nhập${NC}"
            fi
            ;;
        "guest")
            if [ "$action" = "on" ]; then
                sed -i '' 's/enableGuestMode: false/enableGuestMode: true/' "$FEATURES_FILE"
                echo -e "${GREEN}✅ Đã bật chế độ khách${NC}"
            elif [ "$action" = "off" ]; then
                sed -i '' 's/enableGuestMode: true/enableGuestMode: false/' "$FEATURES_FILE"
                echo -e "${RED}✅ Đã tắt chế độ khách${NC}"
            fi
            ;;
        *)
            echo -e "${RED}❌ Lỗi: Feature '$feature' không hợp lệ${NC}"
            show_help
            exit 1
            ;;
    esac
    
    # Tự động áp dụng thay đổi
    apply_changes "$feature" "$action"
}

# Main script
check_config_file

if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

if [ "$1" = "status" ]; then
    show_status
    exit 0
fi

if [ "$1" = "docker-status" ]; then
    show_docker_status
    exit 0
fi

if [ $# -ne 2 ]; then
    echo -e "${RED}❌ Lỗi: Cần đúng 2 tham số${NC}"
    show_help
    exit 1
fi

if [ "$2" != "on" ] && [ "$2" != "off" ]; then
    echo -e "${RED}❌ Lỗi: Action phải là 'on' hoặc 'off'${NC}"
    show_help
    exit 1
fi

# Kiểm tra Docker container trước khi thực hiện
check_docker_container

echo -e "${BLUE}🚀 Bắt đầu thay đổi chức năng: $1 -> $2${NC}"
echo ""

toggle_feature "$1" "$2"
