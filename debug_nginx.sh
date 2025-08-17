#!/bin/bash

# debug_nginx.sh - Script để debug lỗi nginx
# Sử dụng: ./debug_nginx.sh

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
    echo -e "${BLUE}[DEBUG NGINX]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header "Nginx Debug Tool"
echo "==============================="

# 1. Check Docker containers
print_header "1. Kiểm tra Docker containers"
echo "Docker containers đang chạy:"
docker ps | grep -E "(nginx|app|mariadb)" || echo "Không có containers nào đang chạy"

echo
echo "Docker compose status:"
cd "$SCRIPT_DIR"
docker-compose ps

# 2. Check nginx container logs
print_header "2. Kiểm tra nginx container logs"
if docker-compose ps nginx | grep -q "Up"; then
    print_status "Nginx container đang chạy - xem logs gần nhất:"
    docker-compose logs --tail=20 nginx
else
    print_error "Nginx container không chạy!"
    echo "Logs từ lần khởi động cuối:"
    docker-compose logs --tail=20 nginx || echo "Không có logs"
fi

# 3. Check nginx config syntax
print_header "3. Kiểm tra nginx config syntax"
if docker-compose ps nginx | grep -q "Up"; then
    print_status "Testing nginx config inside container..."
    if docker-compose exec nginx nginx -t; then
        print_status "✅ Nginx config syntax OK"
    else
        print_error "❌ Nginx config có lỗi syntax"
    fi
else
    print_warning "Container không chạy - không thể test config"
fi

# 4. Check ports
print_header "4. Kiểm tra port conflicts"
echo "Ports đang được sử dụng:"
echo "Port 1027 (HTTP):"
netstat -tlnp 2>/dev/null | grep :1027 || echo "  Port 1027 free"
echo "Port 1443 (HTTPS):"
netstat -tlnp 2>/dev/null | grep :1443 || echo "  Port 1443 free"
echo "Port 80 (HTTP - should be used by other service):"
netstat -tlnp 2>/dev/null | grep :80 || echo "  Port 80 free"

# 5. Check nginx config files
print_header "5. Kiểm tra nginx config files"
echo "Config files trong nginx/conf.d/:"
ls -la "${SCRIPT_DIR}/nginx/conf.d/" 2>/dev/null || echo "Thư mục không tồn tại"

echo
echo "SSL certificates trong nginx/ssl/:"
ls -la "${SCRIPT_DIR}/nginx/ssl/" 2>/dev/null || echo "Thư mục không tồn tại"

# 6. Check main nginx config
print_header "6. Kiểm tra main nginx config"
if [ -f "${SCRIPT_DIR}/nginx/nginx.conf" ]; then
    print_status "File nginx.conf tồn tại"
    echo "Kiểm tra syntax cơ bản..."
    if grep -q "server_name" "${SCRIPT_DIR}/nginx/nginx.conf"; then
        print_status "✅ Config có vẻ OK"
    else
        print_warning "Config có thể thiếu một số directives"
    fi
else
    print_error "❌ File nginx/nginx.conf không tồn tại!"
fi

# 7. Check app connectivity
print_header "7. Kiểm tra app connectivity"
if docker-compose ps app | grep -q "Up"; then
    print_status "App container đang chạy"
    echo "Testing connection từ nginx đến app..."
    if docker-compose exec nginx ping -c 1 app >/dev/null 2>&1; then
        print_status "✅ Nginx có thể kết nối đến app"
    else
        print_error "❌ Nginx không thể kết nối đến app"
    fi
else
    print_error "❌ App container không chạy!"
fi

# 8. Recommendations
print_header "8. Khuyến nghị"
echo
if ! docker-compose ps nginx | grep -q "Up"; then
    print_error "🔧 NGINX CONTAINER KHÔNG CHẠY!"
    echo "Thử các lệnh sau:"
    echo "  1. docker-compose logs nginx      # Xem lỗi chi tiết"
    echo "  2. docker-compose up nginx       # Start lại nginx"
    echo "  3. docker-compose down && docker-compose up -d --build  # Rebuild all"
    echo
fi

if ! docker-compose ps app | grep -q "Up"; then
    print_error "🔧 APP CONTAINER KHÔNG CHẠY!"
    echo "Thử các lệnh sau:"
    echo "  1. docker-compose logs app        # Xem lỗi chi tiết"
    echo "  2. docker-compose up app         # Start lại app"
    echo
fi

echo "📋 Debug commands:"
echo "  - Xem logs chi tiết: docker-compose logs -f nginx"
echo "  - Rebuild containers: docker-compose down && docker-compose up -d --build"
echo "  - Test nginx config: docker-compose exec nginx nginx -t"
echo "  - Restart nginx: docker-compose restart nginx"
echo "  - Check network: docker network ls"
echo

print_header "Debug hoàn tất!"
echo "Nếu vẫn có lỗi, copy output này và logs chi tiết để được hỗ trợ thêm."