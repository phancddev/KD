#!/bin/bash

# ssl_setup.sh - Script để setup và quản lý SSL certificates
# Sử dụng: ./ssl_setup.sh <command> [domain]

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
    echo -e "${BLUE}[SSL MANAGER]${NC} $1"
}

# Help function
show_help() {
    echo "SSL Certificate Manager for NQD App"
    echo
    echo "Sử dụng: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  install <domain>    - Cài đặt SSL certificate cho domain"
    echo "  renew [domain]      - Gia hạn SSL certificate (domain tùy chọn)"
    echo "  list               - Liệt kê tất cả certificates"
    echo "  remove <domain>    - Xóa SSL certificate"
    echo "  status             - Hiển thị trạng thái certificates"
    echo "  setup-cron         - Thiết lập auto-renewal"
    echo "  help               - Hiển thị help này"
    echo
    echo "Ví dụ:"
    echo "  $0 install mydomain.com"
    echo "  $0 renew"
    echo "  $0 list"
    echo "  $0 status"
}

# Check if running as root for certain operations
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Command này cần quyền root. Vui lòng chạy với sudo."
        exit 1
    fi
}

# Install SSL certificate
install_ssl() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        print_error "Vui lòng nhập domain name!"
        echo "Sử dụng: $0 install <domain>"
        exit 1
    fi
    
    print_header "Cài đặt SSL certificate cho ${domain}"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_status "Đang cài đặt certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Get certificate
    print_status "Đang tạo SSL certificate..."
    if certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --register-unsafely-without-email \
        --domains "${domain}" \
        --keep-until-expiring; then
        
        print_status "✅ SSL certificate được tạo thành công cho ${domain}!"
        return 0
    else
        print_error "❌ Không thể tạo SSL certificate cho ${domain}"
        return 1
    fi
}

# Renew certificates
renew_ssl() {
    local domain=$1
    
    print_header "Gia hạn SSL certificates"
    
    if [ -n "$domain" ]; then
        print_status "Gia hạn certificate cho ${domain}..."
        certbot renew --cert-name "$domain"
    else
        print_status "Gia hạn tất cả certificates..."
        certbot renew
    fi
    
    # Restart nginx to use new certificates
    print_status "Đang restart nginx..."
    docker-compose restart nginx
    
    print_status "✅ SSL certificates đã được gia hạn!"
}

# List certificates
list_ssl() {
    print_header "Danh sách SSL certificates"
    
    if command -v certbot &> /dev/null; then
        certbot certificates
    else
        print_warning "Certbot chưa được cài đặt"
    fi
}

# Remove certificate
remove_ssl() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        print_error "Vui lòng nhập domain name!"
        echo "Sử dụng: $0 remove <domain>"
        exit 1
    fi
    
    print_header "Xóa SSL certificate cho ${domain}"
    
    # Confirm deletion
    read -p "Bạn có chắc muốn xóa SSL certificate cho ${domain}? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot delete --cert-name "$domain"
        
        # Remove nginx config
        local nginx_conf="./nginx/conf.d/${domain}.conf"
        if [ -f "$nginx_conf" ]; then
            rm "$nginx_conf"
            print_status "Đã xóa nginx config: ${nginx_conf}"
        fi
        
        # Remove SSL files
        rm -f "./nginx/ssl/${domain}.crt"
        rm -f "./nginx/ssl/${domain}.key"
        
        print_status "✅ Đã xóa SSL certificate cho ${domain}"
        
        # Restart nginx
        docker-compose restart nginx
    else
        print_status "Hủy bỏ thao tác xóa"
    fi
}

# Check certificate status
check_status() {
    print_header "Trạng thái SSL certificates"
    
    if [ -d "/etc/letsencrypt/live" ]; then
        for cert_dir in /etc/letsencrypt/live/*/; do
            if [ -d "$cert_dir" ]; then
                domain=$(basename "$cert_dir")
                cert_file="${cert_dir}cert.pem"
                
                if [ -f "$cert_file" ]; then
                    expiry=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
                    expiry_epoch=$(date -d "$expiry" +%s)
                    current_epoch=$(date +%s)
                    days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
                    
                    if [ $days_left -lt 30 ]; then
                        status_color=$RED
                        status="⚠️  SẮP HẾT HẠN"
                    elif [ $days_left -lt 60 ]; then
                        status_color=$YELLOW
                        status="⚠️  CẦN GIA HẠN SỚMS"
                    else
                        status_color=$GREEN
                        status="✅ OK"
                    fi
                    
                    echo -e "${status_color}${domain}${NC} - ${days_left} ngày - ${status}"
                fi
            fi
        done
    else
        print_warning "Không tìm thấy certificates nào"
    fi
}

# Setup auto-renewal cron job
setup_cron() {
    print_header "Thiết lập auto-renewal"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local cron_job="0 12 * * * /usr/bin/certbot renew --quiet --hook 'docker-compose -f ${script_dir}/docker-compose.yml restart nginx'"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "certbot renew"; then
        print_warning "Auto-renewal đã được thiết lập"
        print_status "Cron job hiện tại:"
        crontab -l | grep "certbot renew"
    else
        # Add cron job
        (crontab -l 2>/dev/null; echo "${cron_job}") | crontab -
        print_status "✅ Auto-renewal đã được thiết lập!"
        print_status "Certificates sẽ được kiểm tra và gia hạn tự động hàng ngày lúc 12:00"
    fi
}

# Main logic
case "${1:-help}" in
    "install")
        check_root
        install_ssl "$2"
        ;;
    "renew")
        check_root
        renew_ssl "$2"
        ;;
    "list")
        list_ssl
        ;;
    "remove")
        check_root
        remove_ssl "$2"
        ;;
    "status")
        check_status
        ;;
    "setup-cron")
        check_root
        setup_cron
        ;;
    "help"|*)
        show_help
        ;;
esac