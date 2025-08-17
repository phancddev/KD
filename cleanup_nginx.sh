#!/bin/bash

# cleanup_nginx.sh - Script xóa hết nginx và domain configs
# Để app chỉ chạy port 2701 truy cập bằng IP VPS
# Sử dụng: sudo ./cleanup_nginx.sh

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
    echo -e "${BLUE}[CLEANUP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Script này cần chạy với quyền root!"
    echo "Sử dụng: sudo $0"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header "🧹 CLEANUP NGINX VÀ DOMAIN CONFIGS"
echo "Sẽ xóa hết nginx và để app chạy port 2701 trực tiếp"
echo "======================================================="

# Confirm action
read -p "Bạn có chắc muốn xóa hết nginx và domain configs? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Hủy bỏ cleanup"
    exit 0
fi

# 1. Stop và xóa Docker containers
print_header "1. Dọn dẹp Docker containers"
cd "$SCRIPT_DIR"

print_status "Dừng tất cả containers..."
docker-compose down --remove-orphans || true

print_status "Xóa Docker images nginx..."
docker rmi $(docker images | grep nginx | awk '{print $3}') 2>/dev/null || true
docker rmi nqd_kd-nginx 2>/dev/null || true

print_status "Dọn dẹp Docker system..."
docker system prune -f

print_status "✅ Docker containers đã được dọn dẹp"

# 2. Xóa nginx configs trong project
print_header "2. Xóa nginx configs trong project"

if [ -d "nginx" ]; then
    print_status "Xóa thư mục nginx/..."
    rm -rf nginx/
    print_status "✅ Thư mục nginx đã xóa"
fi

# Xóa các files nginx configs
nginx_files=(
    "nginx-proxy-config.conf"
    "NGINX_HTTPS_GUIDE.md"
)

for file in "${nginx_files[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        print_status "✅ Đã xóa $file"
    fi
done

# 3. Xóa system nginx configs và domains
print_header "3. Xóa system nginx configs"

# Tìm và xóa domain configs
if [ -d "/etc/nginx/sites-available" ]; then
    print_status "Đang tìm domain configs..."
    
    # Xóa các domain configs (trừ default)
    for config in /etc/nginx/sites-available/*; do
        if [ -f "$config" ]; then
            filename=$(basename "$config")
            if [ "$filename" != "default" ]; then
                print_status "Xóa domain config: $filename"
                rm -f "$config"
                rm -f "/etc/nginx/sites-enabled/$filename" 2>/dev/null || true
            fi
        fi
    done
fi

# 4. Xóa SSL certificates
print_header "4. Xóa SSL certificates"

if [ -d "/etc/letsencrypt/live" ]; then
    print_status "Đang xóa Let's Encrypt certificates..."
    
    for cert_dir in /etc/letsencrypt/live/*/; do
        if [ -d "$cert_dir" ]; then
            domain=$(basename "$cert_dir")
            if [ "$domain" != "README" ]; then
                print_status "Xóa SSL certificate cho: $domain"
                certbot delete --cert-name "$domain" --non-interactive 2>/dev/null || true
            fi
        fi
    done
fi

# 5. Stop và disable nginx system service
print_header "5. Dọn dẹp nginx system service"

if systemctl is-active --quiet nginx; then
    print_status "Dừng nginx service..."
    systemctl stop nginx
fi

if systemctl is-enabled --quiet nginx; then
    print_status "Disable nginx service..."
    systemctl disable nginx
fi

# Không uninstall nginx hoàn toàn vì có thể có services khác dùng
print_warning "Nginx service đã dừng và disable (không uninstall)"

# 6. Xóa custom systemd services
print_header "6. Xóa custom systemd services"

if [ -f "/etc/systemd/system/nqd-app.service" ]; then
    print_status "Xóa nqd-app systemd service..."
    systemctl stop nqd-app 2>/dev/null || true
    systemctl disable nqd-app 2>/dev/null || true
    rm -f /etc/systemd/system/nqd-app.service
    systemctl daemon-reload
    print_status "✅ nqd-app service đã xóa"
fi

# 7. Xóa log rotation configs
print_header "7. Xóa log rotation configs"

if [ -f "/etc/logrotate.d/nqd-app" ]; then
    rm -f /etc/logrotate.d/nqd-app
    print_status "✅ Log rotation config đã xóa"
fi

# 8. Xóa cron jobs
print_header "8. Xóa SSL renewal cron jobs"

# Xóa certbot cron jobs
crontab -l 2>/dev/null | grep -v "certbot renew" | crontab - 2>/dev/null || true
print_status "✅ SSL renewal cron jobs đã xóa"

# 9. Update docker-compose.yml để app expose port 2701
print_header "9. Update docker-compose cho simple setup"

# Backup docker-compose.yml hiện tại
cp docker-compose.yml docker-compose.yml.backup

# Copy simple docker-compose
if [ -f "docker-compose.simple.yml" ]; then
    cp docker-compose.simple.yml docker-compose.yml
    print_status "✅ docker-compose.yml đã được update với simple config"
    print_status "✅ Backup: docker-compose.yml.backup"
else
    print_error "❌ docker-compose.simple.yml không tồn tại!"
    exit 1
fi

# 10. Xóa nginx-related scripts (optional)
print_header "10. Dọn dẹp nginx scripts"

nginx_scripts=(
    "setup_nginx_proxy.sh"
    "ssl_setup.sh"
    "auto_setup.sh"
    "DEPLOY_GUIDE.md"
    "SETUP_INSTRUCTIONS.md"
)

print_warning "Có muốn xóa các nginx scripts không? (touch_domain.sh, domain_manager.sh, etc.)"
read -p "Xóa nginx scripts? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    for script in "${nginx_scripts[@]}"; do
        if [ -f "$script" ]; then
            rm -f "$script"
            print_status "✅ Đã xóa $script"
        fi
    done
    print_status "✅ Nginx scripts đã xóa"
else
    print_status "Giữ nguyên nginx scripts (có thể dùng sau)"
fi

# 11. Start simple app
print_header "11. Start app đơn giản"

print_status "Build và start app..."
cd "$SCRIPT_DIR"
docker-compose up -d --build

print_status "Chờ services khởi động..."
sleep 10

# 12. Final status
print_header "12. 🎉 CLEANUP HOÀN TẤT!"

echo
echo "=================================="
echo "📋 SETUP HIỆN TẠI:"
echo "=================================="

# Check services
echo "Docker services:"
docker-compose ps

echo
echo "🔗 Access URLs:"
echo "  App: http://$(curl -s ifconfig.me || hostname -I | awk '{print $1}'):2701"
echo "  Adminer: http://$(curl -s ifconfig.me || hostname -I | awk '{print $1}'):8080"

echo
echo "📋 Port mapping:"
echo "  - App: 2701 (HTTP only)"
echo "  - Database: 3307"  
echo "  - Adminer: 8080"

echo
echo "📋 Các thay đổi đã thực hiện:"
echo "  ✅ Xóa nginx containers và configs"
echo "  ✅ Xóa domain SSL certificates"
echo "  ✅ Xóa system nginx configs"
echo "  ✅ App chạy port 2701 trực tiếp"
echo "  ✅ Truy cập bằng IP VPS"
echo "  ✅ Không cần domain"

echo
echo "📋 Commands hữu ích:"
echo "  docker-compose ps           # Status"
echo "  docker-compose logs -f app  # Logs"
echo "  docker-compose restart      # Restart"
echo "  docker-compose down         # Stop"

echo
echo "🚀 App đã đơn giản hóa!"
print_status "Truy cập http://YOUR_VPS_IP:2701 để sử dụng app"

# Show IP if possible
if command -v curl >/dev/null 2>&1; then
    VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_VPS_IP")
    if [ "$VPS_IP" != "YOUR_VPS_IP" ]; then
        echo
        print_header "🌐 Direct URL: http://${VPS_IP}:2701"
    fi
fi

print_status "✅ Cleanup hoàn tất!"