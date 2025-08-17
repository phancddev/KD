#!/bin/bash

# quick_deploy.sh - Script deploy nhanh khi đã có sẵn nginx proxy
# Sử dụng: ./quick_deploy.sh [domain]

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
    echo -e "${BLUE}[QUICK DEPLOY]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN=${1:-""}

print_header "🚀 QUICK DEPLOY NQD APP"
echo "==============================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Không tìm thấy docker-compose.yml. Chạy script trong thư mục project!"
    exit 1
fi

# 1. Stop existing containers
print_header "1. Dừng containers cũ"
print_status "Stopping all containers..."
docker-compose down --remove-orphans

# 2. Clean up
print_status "Cleaning up old images..."
docker system prune -f

# 3. Create required directories
print_header "2. Chuẩn bị directories"
mkdir -p nginx/conf.d nginx/ssl uploads
print_status "✅ Directories ready"

# 4. Create default SSL if not exists
if [ ! -f "nginx/ssl/default.crt" ]; then
    print_status "Creating default SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/default.key \
        -out nginx/ssl/default.crt \
        -subj "/C=VN/ST=Vietnam/L=HCM/O=NQD/OU=IT/CN=localhost" \
        2>/dev/null
    chmod 644 nginx/ssl/default.crt
    chmod 600 nginx/ssl/default.key
    print_status "✅ Default SSL certificates created"
fi

# 5. Build and start services
print_header "3. Build và start services"

print_status "Building images..."
docker-compose build --no-cache

print_status "Starting services..."
docker-compose up -d

# 6. Wait and check
print_status "Waiting for services to start..."
sleep 15

# Health check
print_header "4. Health check"
echo "Docker services status:"
docker-compose ps

# Check if all services are up
if docker-compose ps | grep -E "(nginx|app|mariadb)" | grep -q "Up"; then
    print_status "✅ Services are running"
else
    print_error "❌ Some services failed to start"
    echo "Logs:"
    docker-compose logs --tail=20
    exit 1
fi

# 7. Test nginx config in container
if docker-compose exec nginx nginx -t >/dev/null 2>&1; then
    print_status "✅ Docker nginx config OK"
else
    print_warning "⚠️ Docker nginx config has issues"
    docker-compose logs nginx
fi

# 8. Check connectivity
print_header "5. Connectivity check"

# Test internal connectivity
if docker-compose exec nginx ping -c 1 app >/dev/null 2>&1; then
    print_status "✅ Nginx → App connectivity OK"
else
    print_warning "⚠️ Nginx cannot reach app"
fi

# Check ports
print_status "Port status:"
if netstat -tlnp 2>/dev/null | grep -q :1027; then
    print_status "✅ Port 1027 (HTTP) active"
else
    print_warning "⚠️ Port 1027 not bound"
fi

if netstat -tlnp 2>/dev/null | grep -q :1443; then
    print_status "✅ Port 1443 (HTTPS) active"
else
    print_warning "⚠️ Port 1443 not bound"
fi

# 9. Update nginx proxy if domain provided
if [ -n "$DOMAIN" ]; then
    print_header "6. Update nginx proxy for ${DOMAIN}"
    
    if [ -f "/etc/nginx/sites-available/${DOMAIN}" ]; then
        print_status "Reloading system nginx..."
        if command -v nginx >/dev/null 2>&1; then
            if nginx -t; then
                systemctl reload nginx
                print_status "✅ System nginx reloaded"
            else
                print_warning "⚠️ System nginx config has errors"
            fi
        else
            print_warning "⚠️ System nginx not found"
        fi
    else
        print_warning "⚠️ Nginx proxy config for ${DOMAIN} not found"
        echo "Run: sudo ./setup_nginx_proxy.sh ${DOMAIN}"
    fi
fi

# 10. Final status
print_header "7. 🎉 DEPLOY HOÀN TẤT!"

echo
echo "=================================="
echo "📋 Service Status:"
echo "=================================="
docker-compose ps

echo
echo "🔗 Access URLs:"
if [ -n "$DOMAIN" ]; then
    echo "  Main: https://${DOMAIN}"
    echo "  Direct HTTPS: https://${DOMAIN}:1443"
    echo "  Direct HTTP: http://${DOMAIN}:1027"
else
    echo "  Direct HTTPS: https://YOUR_IP:1443"
    echo "  Direct HTTP: http://YOUR_IP:1027"
fi

echo
echo "📋 Useful commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose restart          # Restart all"
echo "  docker-compose ps               # Check status"
echo "  ./domain_manager.sh status      # System status"

if [ -n "$DOMAIN" ]; then
    echo "  sudo systemctl status nginx     # Check proxy"
    echo "  sudo tail -f /var/log/nginx/${DOMAIN}_access.log  # Access logs"
fi

print_status "🚀 Deploy thành công!"

# Optional: Test endpoint if domain provided
if [ -n "$DOMAIN" ]; then
    print_status "Testing ${DOMAIN}..."
    if curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" | grep -q "200\|301\|302\|404"; then
        print_status "✅ ${DOMAIN} is responding"
    else
        print_warning "⚠️ ${DOMAIN} might not be accessible yet"
    fi
fi