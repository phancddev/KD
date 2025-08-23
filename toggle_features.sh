#!/bin/bash

# Script để bật/tắt các chức năng của ứng dụng
# Sử dụng: ./toggle_features.sh [feature] [on/off]

FEATURES_FILE="features.config.js"

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hàm hiển thị help
show_help() {
    echo -e "${YELLOW}Script điều khiển chức năng ứng dụng${NC}"
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
}

# Hàm kiểm tra file cấu hình
check_config_file() {
    if [ ! -f "$FEATURES_FILE" ]; then
        echo -e "${RED}Lỗi: Không tìm thấy file $FEATURES_FILE${NC}"
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

# Hàm thay đổi trạng thái
toggle_feature() {
    local feature=$1
    local action=$2
    
    case $feature in
        "registration")
            if [ "$action" = "on" ]; then
                sed -i '' 's/enableRegistration: false/enableRegistration: true/' "$FEATURES_FILE"
                echo -e "${GREEN}Đã bật chức năng đăng ký${NC}"
            elif [ "$action" = "off" ]; then
                sed -i '' 's/enableRegistration: true/enableRegistration: false/' "$FEATURES_FILE"
                echo -e "${RED}Đã tắt chức năng đăng ký${NC}"
            fi
            ;;
        "login")
            if [ "$action" = "on" ]; then
                sed -i '' 's/enableLogin: false/enableLogin: true/' "$FEATURES_FILE"
                echo -e "${GREEN}Đã bật chức năng đăng nhập${NC}"
            elif [ "$action" = "off" ]; then
                sed -i '' 's/enableLogin: true/enableLogin: false/' "$FEATURES_FILE"
                echo -e "${RED}Đã tắt chức năng đăng nhập${NC}"
            fi
            ;;
        "guest")
            if [ "$action" = "on" ]; then
                sed -i '' 's/enableGuestMode: false/enableGuestMode: true/' "$FEATURES_FILE"
                echo -e "${GREEN}Đã bật chế độ khách${NC}"
            elif [ "$action" = "off" ]; then
                sed -i '' 's/enableGuestMode: true/enableGuestMode: false/' "$FEATURES_FILE"
                echo -e "${RED}Đã tắt chế độ khách${NC}"
            fi
            ;;
        *)
            echo -e "${RED}Lỗi: Feature '$feature' không hợp lệ${NC}"
            show_help
            exit 1
            ;;
    esac
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

if [ $# -ne 2 ]; then
    echo -e "${RED}Lỗi: Cần đúng 2 tham số${NC}"
    show_help
    exit 1
fi

if [ "$2" != "on" ] && [ "$2" != "off" ]; then
    echo -e "${RED}Lỗi: Action phải là 'on' hoặc 'off'${NC}"
    show_help
    exit 1
fi

toggle_feature "$1" "$2"
echo -e "${YELLOW}Lưu ý: Bạn cần khởi động lại server để thay đổi có hiệu lực${NC}"
