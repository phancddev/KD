#!/bin/bash

# auto_setup.sh - Script tự động setup toàn bộ hệ thống NQD với nginx proxy
# Sử dụng: sudo ./auto_setup.sh <domain>

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
    echo -e "${BLUE}[AUTO SETUP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Script này cần chạy với quyền root!"
    echo "Sử dụng: sudo $0 <domain>"
    exit 1
fi

# Check if domain parameter is provided
if [ $# -eq 0 ]; then
    print_error "Vui lòng nhập domain name!"
    echo "Sử dụng: sudo $0 <domain>"
    echo "Ví dụ: sudo $0 kd.tiepluatrithuc.com"
    exit 1
fi

DOMAIN=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header "🚀 AUTO SETUP TOÀN BỘ HỆ THỐNG NQD"
echo "Domain: ${DOMAIN}"
echo "========================================"

# 1. Check prerequisites
print_header "1. Kiểm tra yêu cầu hệ thống"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_status "Cài đặt Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_status "✅ Docker đã được cài đặt"
else
    print_status "✅ Docker đã có sẵn"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Cài đặt Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_status "✅ Docker Compose đã được cài đặt"
else
    print_status "✅ Docker Compose đã có sẵn"
fi

# Check UFW and open ports if needed
if command -v ufw &> /dev/null; then
    print_status "Mở ports cần thiết..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 1027/tcp
    ufw allow 1443/tcp
    print_status "✅ Ports đã được mở"
fi

# 2. Stop existing services that might conflict
print_header "2. Dọn dẹp services conflicts"

# Stop Apache if running
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

# Don't stop nginx system as we need it for proxy
if systemctl is-active --quiet nginx; then
    print_status "System nginx đang chạy - giữ nguyên cho proxy"
else
    print_status "System nginx chưa chạy - sẽ cài đặt"
fi

# Stop any existing docker containers
print_status "Dọn dẹp Docker containers cũ..."
cd "$SCRIPT_DIR"
docker-compose down --remove-orphans 2>/dev/null || true
docker system prune -f

# 3. Prepare app structure
print_header "3. Chuẩn bị cấu trúc app"

# Create directories
mkdir -p nginx/conf.d nginx/ssl uploads
print_status "✅ Đã tạo thư mục cần thiết"

# Create default SSL certificates for Docker nginx
if [ ! -f "nginx/ssl/default.crt" ]; then
    print_status "Tạo default SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/default.key \
        -out nginx/ssl/default.crt \
        -subj "/C=VN/ST=Vietnam/L=HCM/O=NQD/OU=IT/CN=localhost" \
        2>/dev/null
    chmod 644 nginx/ssl/default.crt
    chmod 600 nginx/ssl/default.key
    print_status "✅ Default SSL certificates đã tạo"
fi

# 4. Build and start Docker services
print_header "4. Build và start Docker services"

print_status "Building Docker images..."
docker-compose build

print_status "Starting services step by step..."

# Start MariaDB first
print_status "Starting MariaDB..."
docker-compose up -d mariadb
sleep 5

# Start App
print_status "Starting App..."
docker-compose up -d app
sleep 5

# Start Nginx
print_status "Starting Docker Nginx..."
docker-compose up -d nginx

# Wait for all services
print_status "Chờ services khởi động..."
sleep 10

# Check services status
if docker-compose ps | grep -q "Up"; then
    print_status "✅ Docker services đã start thành công"
else
    print_error "❌ Một số Docker services không start được"
    docker-compose ps
    echo "Logs:"
    docker-compose logs
    exit 1
fi

# 5. Setup domain SSL và nginx proxy
print_header "5. Setup domain SSL và nginx proxy"

print_status "Chạy touch_domain.sh cho ${DOMAIN}..."
if sudo -u $SUDO_USER "${SCRIPT_DIR}/touch_domain.sh" "$DOMAIN"; then
    print_status "✅ Domain setup thành công"
else
    print_warning "⚠️ Domain setup có lỗi, thử setup manual"
    # Manual fallback
    if "${SCRIPT_DIR}/setup_nginx_proxy.sh" "$DOMAIN"; then
        print_status "✅ Manual nginx proxy setup thành công"
    else
        print_error "❌ Nginx proxy setup thất bại"
        exit 1
    fi
fi

# 6. Final checks
print_header "6. Kiểm tra cuối cùng"

print_status "Kiểm tra Docker services..."
docker-compose ps

print_status "Kiểm tra system nginx..."
if systemctl is-active --quiet nginx; then
    print_status "✅ System nginx đang chạy"
else
    print_error "❌ System nginx không chạy"
    exit 1
fi

print_status "Test nginx config..."
if nginx -t; then
    print_status "✅ Nginx config OK"
else
    print_error "❌ Nginx config có lỗi"
    nginx -t
    exit 1
fi

# 7. Setup monitoring and auto-restart
print_header "7. Setup monitoring và auto-restart"

# Create systemd service for docker-compose
cat > /etc/systemd/system/nqd-app.service << EOF
[Unit]
Description=NQD Knowledge App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${SCRIPT_DIR}
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nqd-app.service
print_status "✅ Auto-restart service đã được setup"

# 8. Setup log rotation
print_header "8. Setup log rotation"

cat > /etc/logrotate.d/nqd-app << EOF
/var/log/nginx/${DOMAIN}_*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF

print_status "✅ Log rotation đã được setup"

# 9. Final status report
print_header "9. 🎉 SETUP HOÀN TẤT!"

echo
echo "========================================"
echo "📋 THÔNG TIN HỆ THỐNG:"
echo "========================================"
echo "🌐 Domain: ${DOMAIN}"
echo "🔗 Main URL: https://${DOMAIN}"
echo "🔗 Direct URL: https://${DOMAIN}:1443"
echo "📊 Adminer: http://$(hostname -I | awk '{print $1}'):8080"
echo
echo "📁 Đường dẫn quan trọng:"
echo "  - App directory: ${SCRIPT_DIR}"
echo "  - Docker nginx config: ${SCRIPT_DIR}/nginx/conf.d/"
echo "  - System nginx config: /etc/nginx/sites-available/${DOMAIN}"
echo "  - SSL certificates: /etc/letsencrypt/live/${DOMAIN}/"
echo "  - Logs: /var/log/nginx/${DOMAIN}_*.log"
echo
echo "🔧 Lệnh quản lý hữu ích:"
echo "  - Xem status: docker-compose ps"
echo "  - Xem logs app: docker-compose logs -f app"
echo "  - Xem logs docker nginx: docker-compose logs -f nginx"
echo "  - Xem logs system nginx: sudo journalctl -u nginx -f"
echo "  - Restart app: sudo systemctl restart nqd-app"
echo "  - Restart nginx: sudo systemctl restart nginx"
echo "  - Domain manager: ./domain_manager.sh status"
echo
echo "🔒 SSL Auto-renewal:"
echo "  - Certificates sẽ tự động gia hạn"
echo "  - Check renewal: sudo certbot renew --dry-run"
echo
echo "📊 Monitoring:"
echo "  - Service status: sudo systemctl status nqd-app nginx"
echo "  - Disk usage: df -h"
echo "  - Memory usage: free -h"
echo
print_status "🚀 Hệ thống đã sẵn sàng! Truy cập https://${DOMAIN}"

# 10. Post-setup instructions
print_header "10. Hướng dẫn sau khi setup"

echo
echo "📝 CHECKLIST SAU KHI SETUP:"
echo "=========================="
echo "□ Test truy cập https://${DOMAIN}"
echo "□ Kiểm tra SSL certificate valid"
echo "□ Test chức năng đăng nhập/đăng ký"
echo "□ Kiểm tra database connection"
echo "□ Setup backup cho database"
echo "□ Setup monitoring alerts"
echo
echo "❗ LƯU Ý QUAN TRỌNG:"
echo "=================="
echo "• Domain ${DOMAIN} phải trỏ về IP server này"
echo "• Firewall phải mở port 80 và 443"
echo "• SSL certificates sẽ expire sau 90 ngày (auto-renew enabled)"
echo "• Database backup nên được setup định kỳ"
echo "• Monitor logs thường xuyên để phát hiện issues"
echo
print_status "🎊 CHÚC MỪNG! Setup hoàn tất thành công!"

# Test final connectivity
print_status "Testing final connectivity..."
sleep 5
if curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" | grep -q "200\|301\|302"; then
    print_status "✅ Website accessible!"
else
    print_warning "⚠️ Website might not be accessible yet. Check DNS and firewall."
fi