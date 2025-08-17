# 🚀 Hướng dẫn setup Nginx với HTTPS cho NQD App

Hướng dẫn này sẽ giúp bạn setup nginx với HTTPS cho ứng dụng NQD chạy trên VPS Ubuntu.

## 📋 Yêu cầu hệ thống

- VPS Ubuntu 18.04+
- Docker và Docker Compose đã cài đặt
- Domain đã trỏ về IP của VPS
- Port 80 và 443 mở

## 🛠️ Cài đặt ban đầu

### 1. Cài đặt Docker (nếu chưa có)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout và login lại để áp dụng group changes
```

### 2. Clone và setup project

```bash
# Clone project (nếu chưa có)
git clone <your-repo-url>
cd nqd_kd

# Tạo thư mục cần thiết
mkdir -p nginx/ssl nginx/conf.d uploads
```

## 🔧 Sử dụng Scripts

### 1. Script chính: `touch_domain.sh`

Script này tự động setup domain với HTTPS:

```bash
# Thêm domain mới với HTTPS
sudo ./touch_domain.sh mydomain.com
```

**Script sẽ tự động:**
- Tạo SSL certificate từ Let's Encrypt
- Tạo nginx config cho domain
- Khởi động lại services
- Setup auto-renewal cho SSL

### 2. Domain Manager: `domain_manager.sh`

Quản lý các domains:

```bash
# Thêm domain mới
./domain_manager.sh add mydomain.com

# Liệt kê tất cả domains
./domain_manager.sh list

# Xóa domain
./domain_manager.sh remove mydomain.com

# Xem trạng thái hệ thống
./domain_manager.sh status

# Restart services
./domain_manager.sh restart

# Xem logs
./domain_manager.sh logs nginx
./domain_manager.sh logs app
./domain_manager.sh logs all
```

### 3. SSL Manager: `ssl_setup.sh`

Quản lý SSL certificates:

```bash
# Cài đặt SSL cho domain
sudo ./ssl_setup.sh install mydomain.com

# Gia hạn tất cả certificates
sudo ./ssl_setup.sh renew

# Gia hạn certificate cụ thể
sudo ./ssl_setup.sh renew mydomain.com

# Liệt kê certificates
./ssl_setup.sh list

# Xem trạng thái certificates
./ssl_setup.sh status

# Xóa certificate
sudo ./ssl_setup.sh remove mydomain.com

# Setup auto-renewal
sudo ./ssl_setup.sh setup-cron
```

## 📁 Cấu trúc thư mục

```
nqd_kd/
├── nginx/
│   ├── Dockerfile              # Docker config cho nginx
│   ├── nginx.conf             # Main nginx config
│   ├── conf.d/
│   │   ├── domain.conf.template # Template cho domain config
│   │   └── *.conf             # Domain-specific configs
│   └── ssl/
│       ├── *.crt              # SSL certificates
│       └── *.key              # SSL private keys
├── touch_domain.sh            # Script setup domain chính
├── domain_manager.sh          # Script quản lý domains
├── ssl_setup.sh              # Script quản lý SSL
└── docker-compose.yml         # Updated với nginx service
```

## 🔐 Bảo mật

### SSL/TLS Configuration

- Chỉ hỗ trợ TLS 1.2 và 1.3
- Strong cipher suites
- HSTS enabled
- OCSP stapling
- Security headers tự động

### Rate Limiting

- 10 requests/second per IP
- Burst limit: 20 requests

### Security Headers

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Content-Security-Policy

## 🔄 Auto-renewal SSL

Auto-renewal được setup tự động với cron job:

```bash
# Kiểm tra cron job
sudo crontab -l | grep certbot

# Cron job mặc định chạy hàng ngày lúc 12:00
0 12 * * * /usr/bin/certbot renew --quiet --hook 'docker-compose -f /path/to/docker-compose.yml restart nginx'
```

## 📊 Monitoring

### Kiểm tra logs

```bash
# Nginx logs
./domain_manager.sh logs nginx

# App logs
./domain_manager.sh logs app

# All logs
./domain_manager.sh logs all

# Docker compose logs
docker-compose logs -f
```

### Kiểm tra trạng thái

```bash
# Trạng thái services
./domain_manager.sh status

# Trạng thái SSL certificates
./ssl_setup.sh status

# Docker services
docker-compose ps
```

## 🐛 Troubleshooting

### 1. SSL Certificate không tạo được

```bash
# Kiểm tra domain có trỏ đúng IP không
nslookup mydomain.com

# Kiểm tra port 80 có mở không
sudo netstat -tlnp | grep :80

# Tạo self-signed certificate tạm thời
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/mydomain.com.key \
  -out nginx/ssl/mydomain.com.crt \
  -subj "/C=VN/ST=Vietnam/L=HCM/O=NQD/OU=IT/CN=mydomain.com"
```

### 2. Nginx không khởi động được

```bash
# Kiểm tra config syntax
docker-compose exec nginx nginx -t

# Xem nginx logs
docker-compose logs nginx

# Restart nginx
docker-compose restart nginx
```

### 3. App không truy cập được

```bash
# Kiểm tra app có chạy không
docker-compose ps app

# Kiểm tra network connectivity
docker-compose exec nginx ping app

# Xem app logs
docker-compose logs app
```

### 4. Port conflicts

```bash
# Kiểm tra port đang được sử dụng
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Dừng services khác dùng port 80/443
sudo systemctl stop apache2  # Nếu có Apache
sudo systemctl stop nginx    # Nếu có nginx system
```

## 📝 Commands tóm tắt

```bash
# Setup domain mới (one-command)
sudo ./touch_domain.sh mydomain.com

# Quản lý domains
./domain_manager.sh add mydomain.com
./domain_manager.sh list
./domain_manager.sh status

# Quản lý SSL
sudo ./ssl_setup.sh install mydomain.com
sudo ./ssl_setup.sh renew
./ssl_setup.sh status

# Docker operations
docker-compose up -d --build
docker-compose restart
docker-compose logs -f

# Kiểm tra services
curl -I https://mydomain.com
openssl s_client -connect mydomain.com:443 -servername mydomain.com
```

## 🎯 Production Notes

1. **Backup**: Thường xuyên backup `/etc/letsencrypt/` và nginx configs
2. **Monitoring**: Setup monitoring cho SSL expiry và service health
3. **Updates**: Thường xuyên update Docker images
4. **Security**: Thường xuyên update và patch hệ thống

## 📞 Support

Nếu gặp vấn đề, kiểm tra:

1. Logs: `./domain_manager.sh logs all`
2. Status: `./domain_manager.sh status`
3. SSL: `./ssl_setup.sh status`
4. Docker: `docker-compose ps`

---

**Happy coding! 🚀**