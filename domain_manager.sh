#!/bin/bash

# domain_manager.sh - Script để quản lý domains cho nginx
# Sử dụng: ./domain_manager.sh <command> [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[DOMAIN MANAGER]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_DIR="${SCRIPT_DIR}/nginx/conf.d"
NGINX_SSL_DIR="${SCRIPT_DIR}/nginx/ssl"

# Help function
show_help() {
    echo "Domain Manager for NQD App"
    echo
    echo "Sử dụng: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  add <domain>       - Thêm domain mới với HTTPS"
    echo "  remove <domain>    - Xóa domain"
    echo "  list              - Liệt kê tất cả domains"
    echo "  status            - Hiển thị trạng thái domains và services"
    echo "  restart           - Restart nginx và app services"
    echo "  logs [service]    - Xem logs (nginx/app/all)"
    echo "  help              - Hiển thị help này"
    echo
    echo "Ví dụ:"
    echo "  $0 add mydomain.com"
    echo "  $0 list"
    echo "  $0 status"
    echo "  $0 logs nginx"
}

# Add new domain
add_domain() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        print_error "Vui lòng nhập domain name!"
        echo "Sử dụng: $0 add <domain>"
        exit 1
    fi
    
    print_header "Thêm domain: ${domain}"
    
    # Check if domain config already exists
    if [ -f "${NGINX_CONF_DIR}/${domain}.conf" ]; then
        print_warning "Domain ${domain} đã tồn tại!"
        read -p "Bạn có muốn ghi đè config hiện tại không? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Hủy bỏ thao tác"
            exit 0
        fi
    fi
    
    # Run the main domain setup script
    print_status "Đang chạy touch_domain.sh..."
    if "${SCRIPT_DIR}/touch_domain.sh" "$domain"; then
        print_status "✅ Domain ${domain} đã được thêm thành công!"
    else
        print_error "❌ Có lỗi xảy ra khi thêm domain ${domain}"
        exit 1
    fi
}

# Remove domain
remove_domain() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        print_error "Vui lòng nhập domain name!"
        echo "Sử dụng: $0 remove <domain>"
        exit 1
    fi
    
    print_header "Xóa domain: ${domain}"
    
    # Check if domain exists
    if [ ! -f "${NGINX_CONF_DIR}/${domain}.conf" ]; then
        print_error "Domain ${domain} không tồn tại!"
        exit 1
    fi
    
    # Confirm deletion
    print_warning "Thao tác này sẽ xóa:"
    echo "  - Nginx config: ${NGINX_CONF_DIR}/${domain}.conf"
    echo "  - SSL certificates (nếu có)"
    echo
    read -p "Bạn có chắc muốn xóa domain ${domain}? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove nginx config
        rm -f "${NGINX_CONF_DIR}/${domain}.conf"
        print_status "Đã xóa nginx config"
        
        # Remove SSL files
        rm -f "${NGINX_SSL_DIR}/${domain}.crt"
        rm -f "${NGINX_SSL_DIR}/${domain}.key"
        print_status "Đã xóa SSL files"
        
        # Restart nginx
        print_status "Đang restart nginx..."
        docker-compose -f "${SCRIPT_DIR}/docker-compose.yml" restart nginx
        
        print_status "✅ Đã xóa domain ${domain} thành công!"
    else
        print_status "Hủy bỏ thao tác xóa"
    fi
}

# List all domains
list_domains() {
    print_header "Danh sách domains đã config"
    
    if [ ! -d "$NGINX_CONF_DIR" ]; then
        print_warning "Thư mục nginx config không tồn tại"
        return
    fi
    
    local count=0
    echo
    printf "%-30s %-15s %-20s %s\n" "DOMAIN" "SSL STATUS" "CONFIG FILE" "SSL EXPIRY"
    echo "$(printf '%.80s' "$(printf '%*s' 80 | tr ' ' '-')")"
    
    for conf_file in "${NGINX_CONF_DIR}"/*.conf; do
        if [ -f "$conf_file" ] && [ "$(basename "$conf_file")" != "domain.conf.template" ]; then
            local domain=$(basename "$conf_file" .conf)
            local ssl_status="❌ None"
            local ssl_expiry="-"
            
            # Check SSL certificate
            if [ -f "${NGINX_SSL_DIR}/${domain}.crt" ]; then
                if [ -L "${NGINX_SSL_DIR}/${domain}.crt" ]; then
                    ssl_status="🔒 Let's Encrypt"
                    # Get expiry date
                    if command -v openssl &> /dev/null; then
                        ssl_expiry=$(openssl x509 -enddate -noout -in "${NGINX_SSL_DIR}/${domain}.crt" 2>/dev/null | cut -d= -f2 | cut -d' ' -f1-3 || echo "Unknown")
                    fi
                else
                    ssl_status="🔓 Self-signed"
                fi
            fi
            
            printf "%-30s %-15s %-20s %s\n" "$domain" "$ssl_status" "$(basename "$conf_file")" "$ssl_expiry"
            ((count++))
        fi
    done
    
    echo
    print_status "Tổng cộng: ${count} domain(s)"
}

# Show system status
show_status() {
    print_header "Trạng thái hệ thống"
    
    echo
    echo "🐳 Docker Services:"
    echo "==================="
    cd "$SCRIPT_DIR"
    docker-compose ps
    
    echo
    echo "🌐 Nginx Status:"
    echo "=================="
    if docker-compose ps nginx | grep -q "Up"; then
        print_status "✅ Nginx đang chạy"
    else
        print_error "❌ Nginx không chạy"
    fi
    
    echo
    echo "📱 App Status:"
    echo "==============="
    if docker-compose ps app | grep -q "Up"; then
        print_status "✅ App đang chạy"
    else
        print_error "❌ App không chạy"
    fi
    
    echo
    echo "🗄️ Database Status:"
    echo "==================="
    if docker-compose ps mariadb | grep -q "Up"; then
        print_status "✅ MariaDB đang chạy"
    else
        print_error "❌ MariaDB không chạy"
    fi
    
    echo
    echo "🔒 SSL Certificates:"
    echo "===================="
    if command -v openssl &> /dev/null && [ -d "${NGINX_SSL_DIR}" ]; then
        for cert_file in "${NGINX_SSL_DIR}"/*.crt; do
            if [ -f "$cert_file" ]; then
                local domain=$(basename "$cert_file" .crt)
                local expiry=$(openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null | cut -d= -f2 || echo "Unknown")
                echo "  ${domain}: ${expiry}"
            fi
        done
    else
        print_warning "Không tìm thấy SSL certificates"
    fi
}

# Restart services
restart_services() {
    print_header "Restart services"
    
    cd "$SCRIPT_DIR"
    
    print_status "Đang restart tất cả services..."
    docker-compose restart
    
    print_status "Đang chờ services khởi động..."
    sleep 5
    
    # Check status
    if docker-compose ps | grep -q "Up"; then
        print_status "✅ Services đã được restart thành công!"
    else
        print_error "❌ Có services không thể khởi động. Kiểm tra logs:"
        docker-compose ps
    fi
}

# Show logs
show_logs() {
    local service=${1:-all}
    
    cd "$SCRIPT_DIR"
    
    case "$service" in
        "nginx")
            print_header "Nginx Logs"
            docker-compose logs --tail=50 -f nginx
            ;;
        "app")
            print_header "App Logs"
            docker-compose logs --tail=50 -f app
            ;;
        "mariadb"|"db")
            print_header "Database Logs"
            docker-compose logs --tail=50 -f mariadb
            ;;
        "all"|*)
            print_header "All Service Logs"
            docker-compose logs --tail=20 -f
            ;;
    esac
}

# Main logic
case "${1:-help}" in
    "add")
        add_domain "$2"
        ;;
    "remove")
        remove_domain "$2"
        ;;
    "list")
        list_domains
        ;;
    "status")
        show_status
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        show_logs "$2"
        ;;
    "help"|*)
        show_help
        ;;
esac