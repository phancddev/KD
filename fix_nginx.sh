#!/bin/bash

# fix_nginx.sh - Script để fix các lỗi nginx thường gặp
# Sử dụng: ./fix_nginx.sh

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
    echo -e "${BLUE}[FIX NGINX]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header "Nginx Auto Fix Tool"
echo "==============================="

# Function to wait for user confirmation
confirm() {
    read -p "Bạn có muốn tiếp tục? (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# 1. Stop all containers and clean up
print_header "1. Dọn dẹp containers cũ"
print_status "Dừng và xóa containers cũ..."
cd "$SCRIPT_DIR"
docker-compose down --remove-orphans
docker system prune -f

# 2. Check and create required directories
print_header "2. Tạo thư mục cần thiết"
mkdir -p nginx/conf.d nginx/ssl uploads
print_status "✅ Đã tạo thư mục nginx/conf.d, nginx/ssl, uploads"

# 3. Check nginx config files exist
print_header "3. Kiểm tra nginx config files"
if [ ! -f "nginx/nginx.conf" ]; then
    print_error "❌ File nginx/nginx.conf không tồn tại!"
    exit 1
fi

if [ ! -f "nginx/Dockerfile" ]; then
    print_error "❌ File nginx/Dockerfile không tồn tại!"
    exit 1
fi

if [ ! -f "nginx/conf.d/domain.conf.template" ]; then
    print_error "❌ File nginx/conf.d/domain.conf.template không tồn tại!"
    exit 1
fi

print_status "✅ Các file config nginx đã tồn tại"

# 4. Create default SSL certificates if not exist
print_header "4. Tạo default SSL certificates"
if [ ! -f "nginx/ssl/default.crt" ] || [ ! -f "nginx/ssl/default.key" ]; then
    print_status "Tạo default SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/default.key \
        -out nginx/ssl/default.crt \
        -subj "/C=VN/ST=Vietnam/L=HCM/O=NQD/OU=IT/CN=localhost" \
        2>/dev/null
    print_status "✅ Đã tạo default SSL certificates"
else
    print_status "✅ Default SSL certificates đã tồn tại"
fi

# 5. Fix permissions
print_header "5. Fix permissions"
chmod 644 nginx/ssl/*.crt 2>/dev/null || true
chmod 600 nginx/ssl/*.key 2>/dev/null || true
print_status "✅ Đã fix permissions cho SSL files"

# 6. Build nginx image
print_header "6. Build nginx Docker image"
print_status "Building nginx image..."
if docker-compose build nginx; then
    print_status "✅ Nginx image build thành công"
else
    print_error "❌ Nginx image build thất bại"
    echo "Kiểm tra Dockerfile và thử lại"
    exit 1
fi

# 7. Start services step by step
print_header "7. Start services"

# Start database first
print_status "Starting MariaDB..."
docker-compose up -d mariadb
sleep 5

# Start app
print_status "Starting App..."
docker-compose up -d app
sleep 5

# Start nginx last
print_status "Starting Nginx..."
if docker-compose up -d nginx; then
    print_status "✅ Nginx started successfully"
else
    print_error "❌ Nginx failed to start"
    echo "Checking logs..."
    docker-compose logs nginx
    exit 1
fi

# 8. Health check
print_header "8. Health check"
sleep 3

echo "Docker services status:"
docker-compose ps

echo
print_status "Kiểm tra nginx config..."
if docker-compose exec nginx nginx -t; then
    print_status "✅ Nginx config OK"
else
    print_error "❌ Nginx config có lỗi"
    docker-compose logs nginx
    exit 1
fi

# 9. Test connectivity
print_header "9. Test connectivity"

# Test app
if docker-compose exec nginx ping -c 1 app >/dev/null 2>&1; then
    print_status "✅ Nginx → App connectivity OK"
else
    print_warning "⚠️ Nginx không thể ping đến app"
fi

# Test ports
print_status "Kiểm tra ports..."
if netstat -tlnp 2>/dev/null | grep -q :1027; then
    print_status "✅ Port 1027 (HTTP) đang được sử dụng"
else
    print_warning "⚠️ Port 1027 không được bind"
fi

if netstat -tlnp 2>/dev/null | grep -q :1443; then
    print_status "✅ Port 1443 (HTTPS) đang được sử dụng"
else
    print_warning "⚠️ Port 1443 không được bind"
fi

# 10. Final status
print_header "10. Kết quả cuối cùng"

if docker-compose ps | grep -q "Up"; then
    print_status "🎉 FIX THÀNH CÔNG!"
    echo
    echo "=================================="
    echo "📋 Services đang chạy:"
    docker-compose ps
    echo
    echo "🔗 URLs để test:"
    echo "  - HTTP:  http://localhost:1027"
    echo "  - HTTPS: https://localhost:1443"
    echo
    echo "📋 Commands để monitor:"
    echo "  - Logs: docker-compose logs -f"
    echo "  - Status: docker-compose ps"
    echo "  - Restart: docker-compose restart nginx"
    echo
    print_status "Nginx đã được fix và đang chạy bình thường!"
else
    print_error "❌ Vẫn còn lỗi!"
    echo "Chạy ./debug_nginx.sh để kiểm tra chi tiết"
    exit 1
fi

print_header "Fix hoàn tất! 🚀"