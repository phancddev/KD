#!/bin/bash

# touch_domain.sh - Script để tự động config domain cho nginx với HTTPS
# Sử dụng: ./touch_domain.sh <domain_name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if domain parameter is provided
if [ $# -eq 0 ]; then
    print_error "Vui lòng nhập domain name!"
    echo "Sử dụng: $0 <domain_name>"
    echo "Ví dụ: $0 mydomain.com"
    exit 1
fi

DOMAIN=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_DIR="${SCRIPT_DIR}/nginx/conf.d"
NGINX_SSL_DIR="${SCRIPT_DIR}/nginx/ssl"
DOMAIN_CONF="${NGINX_CONF_DIR}/${DOMAIN}.conf"

print_status "Đang setup domain: ${DOMAIN}"

# Check if script is running as root (needed for certbot)
if [ "$EUID" -ne 0 ]; then
    print_warning "Script này cần chạy với quyền root để cài đặt SSL certificate"
    print_warning "Sẽ sử dụng sudo cho các lệnh cần thiết..."
fi

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    print_error "Docker chưa được cài đặt!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker-compose chưa được cài đặt!"
    exit 1
fi

# Create nginx directories if they don't exist
mkdir -p "${NGINX_CONF_DIR}"
mkdir -p "${NGINX_SSL_DIR}"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_status "Đang cài đặt certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Stop nginx container if it's running to avoid port conflicts
print_status "Dừng nginx container (nếu đang chạy)..."
docker-compose -f "${SCRIPT_DIR}/docker-compose.yml" stop nginx 2>/dev/null || true

print_warning "⚠️  App sẽ chạy trên port 1027 (HTTP) và 1443 (HTTPS)"
print_warning "⚠️  Để truy cập bằng domain mà không cần port, hãy config nginx chính proxy đến port 1443"

# Generate SSL certificate with certbot
print_status "Đang tạo SSL certificate cho domain ${DOMAIN}..."
print_warning "Đảm bảo domain ${DOMAIN} đã trỏ về IP của server này!"

# Try to get certificate
if sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --domains "${DOMAIN}" \
    --keep-until-expiring; then
    
    print_status "SSL certificate được tạo thành công!"
    
    # Create symbolic links to Let's Encrypt certificates
    sudo ln -sf "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${NGINX_SSL_DIR}/${DOMAIN}.crt"
    sudo ln -sf "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${NGINX_SSL_DIR}/${DOMAIN}.key"
    
else
    print_warning "Không thể tạo SSL certificate từ Let's Encrypt"
    print_status "Đang tạo self-signed certificate..."
    
    # Create self-signed certificate as fallback
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${NGINX_SSL_DIR}/${DOMAIN}.key" \
        -out "${NGINX_SSL_DIR}/${DOMAIN}.crt" \
        -subj "/C=VN/ST=Vietnam/L=HCM/O=NQD/OU=IT/CN=${DOMAIN}"
    
    print_warning "Đã tạo self-signed certificate. Trình duyệt sẽ hiển thị cảnh báo bảo mật."
fi

# Create nginx config from template
print_status "Đang tạo nginx config cho domain ${DOMAIN}..."
sed "s/{{DOMAIN}}/${DOMAIN}/g" "${NGINX_CONF_DIR}/domain.conf.template" > "${DOMAIN_CONF}"

print_status "Nginx config đã được tạo: ${DOMAIN_CONF}"

# Set proper permissions
sudo chown -R "$USER:$USER" "${NGINX_SSL_DIR}"
chmod 644 "${NGINX_SSL_DIR}/${DOMAIN}.crt"
chmod 600 "${NGINX_SSL_DIR}/${DOMAIN}.key"

# Start/restart docker-compose services
print_status "Đang khởi động lại các services..."
cd "${SCRIPT_DIR}"
docker-compose down
docker-compose up -d --build

# Wait for services to start
print_status "Đang chờ services khởi động..."
sleep 10

# Check if nginx is running
if docker-compose ps nginx | grep -q "Up"; then
    print_status "✅ Nginx đang chạy thành công!"
else
    print_error "❌ Nginx không thể khởi động. Kiểm tra logs:"
    docker-compose logs nginx
    exit 1
fi

# Check if app is accessible
print_status "Kiểm tra kết nối đến app..."
if docker-compose ps app | grep -q "Up"; then
    print_status "✅ App đang chạy thành công!"
else
    print_error "❌ App không thể khởi động. Kiểm tra logs:"
    docker-compose logs app
    exit 1
fi

print_status "🎉 Setup hoàn tất!"
echo
echo "=================================="
echo "📋 Thông tin setup:"
echo "=================================="
echo "🌐 Domain: ${DOMAIN}"
echo "🔗 Direct HTTPS URL: https://${DOMAIN}:1443"
echo "🔗 Direct HTTP URL: http://${DOMAIN}:1027"
echo "📁 Nginx config: ${DOMAIN_CONF}"
echo "🔐 SSL certificates: ${NGINX_SSL_DIR}/${DOMAIN}.{crt,key}"
echo "📄 Nginx proxy config: ${SCRIPT_DIR}/nginx-proxy-config.conf"
echo
echo "📋 Để truy cập bằng domain (không cần port):"
echo "  1. Copy file nginx-proxy-config.conf vào nginx chính"
echo "  2. sudo cp nginx-proxy-config.conf /etc/nginx/sites-available/${DOMAIN}"
echo "  3. sudo ln -s /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/"
echo "  4. sudo nginx -t && sudo systemctl reload nginx"
echo
echo "📋 Các lệnh hữu ích:"
echo "  - Xem logs nginx: docker-compose logs nginx"
echo "  - Xem logs app: docker-compose logs app"
echo "  - Restart services: docker-compose restart"
echo "  - Stop services: docker-compose down"
echo
print_status "Truy cập https://${DOMAIN}:1443 để kiểm tra trực tiếp!"
print_status "Hoặc setup nginx proxy để dùng https://${DOMAIN}"

# Add renewal cron job for Let's Encrypt
if [ -L "${NGINX_SSL_DIR}/${DOMAIN}.crt" ]; then
    print_status "Đang setup auto-renewal cho SSL certificate..."
    
    # Add cron job if it doesn't exist
    CRON_JOB="0 12 * * * /usr/bin/certbot renew --quiet --hook 'docker-compose -f ${SCRIPT_DIR}/docker-compose.yml restart nginx'"
    
    if ! sudo crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (sudo crontab -l 2>/dev/null; echo "${CRON_JOB}") | sudo crontab -
        print_status "✅ Auto-renewal đã được thiết lập!"
    else
        print_status "Auto-renewal đã tồn tại"
    fi
fi

print_status "🚀 Domain ${DOMAIN} đã sẵn sàng sử dụng!"