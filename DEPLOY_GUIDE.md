# 🚀 Hướng dẫn Deploy NQD App trên Ubuntu Server

## 📋 TL;DR - Setup siêu nhanh

```bash
# 1. Clone code
git clone <your-repo> && cd nqd_kd

# 2. Setup toàn bộ hệ thống (một lệnh)
sudo ./auto_setup.sh kd.tiepluatrithuc.com

# 3. Xong! Vào https://kd.tiepluatrithuc.com
```

## 🛠️ Scripts có sẵn

### 1. **auto_setup.sh** - Setup toàn bộ từ đầu ⭐
```bash
sudo ./auto_setup.sh kd.tiepluatrithuc.com
```
**Làm gì:**
- Cài Docker, Docker Compose
- Setup Docker services (app, nginx, database)
- Tạo SSL certificates với Let's Encrypt  
- Setup nginx proxy system
- Config auto-restart, log rotation
- **Kết quả:** Website sẵn sàng tại https://kd.tiepluatrithuc.com

### 2. **quick_deploy.sh** - Deploy nhanh khi update code
```bash
./quick_deploy.sh kd.tiepluatrithuc.com
```
**Làm gì:**
- Rebuild Docker containers
- Restart services
- Test connectivity
- **Kết quả:** App đã update với code mới

### 3. **touch_domain.sh** - Setup domain mới (tự động proxy)
```bash
sudo ./touch_domain.sh newdomain.com
```
**Làm gì:**
- Setup SSL cho domain mới
- Tạo nginx config cho domain
- **Tự động setup nginx proxy**
- **Kết quả:** Domain mới sẵn sàng

### 4. **domain_manager.sh** - Quản lý domains
```bash
./domain_manager.sh list          # Liệt kê domains
./domain_manager.sh status        # Xem trạng thái hệ thống  
./domain_manager.sh logs nginx    # Xem logs
./domain_manager.sh restart       # Restart services
```

### 5. **debug_nginx.sh** - Debug khi có lỗi
```bash
./debug_nginx.sh
```
**Làm gì:**
- Kiểm tra Docker containers
- Check nginx config
- Test connectivity
- Đưa ra khuyến nghị fix

## 🎯 Scenarios thường gặp

### Scenario 1: Setup lần đầu trên server Ubuntu mới
```bash
# Bước 1: Clone code
git clone <your-repo>
cd nqd_kd

# Bước 2: Setup toàn bộ (20-30 phút)
sudo ./auto_setup.sh kd.tiepluatrithuc.com

# Xong! Website sẵn sàng
```

### Scenario 2: Update code và deploy
```bash
# Bước 1: Pull code mới
git pull origin main

# Bước 2: Deploy nhanh (2-3 phút)  
./quick_deploy.sh kd.tiepluatrithuc.com

# Xong! App đã update
```

### Scenario 3: Thêm domain mới
```bash
sudo ./touch_domain.sh newdomain.com
# Nginx proxy tự động được setup
```

### Scenario 4: App bị lỗi, cần debug
```bash
# Debug
./debug_nginx.sh

# Nếu cần restart
./domain_manager.sh restart

# Hoặc deploy lại từ đầu
./quick_deploy.sh kd.tiepluatrithuc.com
```

## 🏗️ Kiến trúc hệ thống

```
Internet → System Nginx (Port 80/443) → Docker Nginx (Port 1027/1443) → App (Port 2701)
                ↓
            SSL Termination & Proxy
```

**System Nginx:**
- Chạy trên server Ubuntu (port 80/443)
- Handle SSL certificates từ Let's Encrypt
- Proxy requests đến Docker Nginx

**Docker Nginx:**  
- Chạy trong container (port 1027/1443)
- Load balancing và security headers
- Forward đến App container

**App:**
- Node.js app chạy port 2701 (internal)
- MariaDB database
- File uploads

## 📂 Structure sau khi setup

```
/
├── /etc/nginx/
│   ├── sites-available/kd.tiepluatrithuc.com    # System nginx config
│   └── sites-enabled/kd.tiepluatrithuc.com      # Symlink
├── /etc/letsencrypt/
│   └── live/kd.tiepluatrithuc.com/              # SSL certificates
└── /your/project/
    ├── nginx/                                   # Docker nginx configs
    ├── docker-compose.yml                       # Services definition
    └── *.sh                                     # Management scripts
```

## 🔧 Commands quản lý

### Docker Services
```bash
docker-compose ps                 # Status
docker-compose logs -f app        # App logs  
docker-compose logs -f nginx      # Docker nginx logs
docker-compose restart            # Restart all
docker-compose down               # Stop all
```

### System Services  
```bash
sudo systemctl status nginx      # System nginx status
sudo systemctl restart nginx     # Restart system nginx
sudo systemctl status nqd-app    # App auto-restart service
sudo journalctl -u nginx -f      # System nginx logs
```

### SSL Management
```bash
sudo certbot renew               # Renew certificates
sudo certbot certificates        # List certificates
./ssl_setup.sh status           # SSL status
```

### Monitoring
```bash
./domain_manager.sh status       # Overall status
./debug_nginx.sh                # Debug issues
tail -f /var/log/nginx/kd.tiepluatrithuc.com_access.log  # Access logs
htop                            # System resources
df -h                           # Disk usage
```

## 🔒 Security Features

### Auto-configured:
- ✅ HTTPS only (HTTP auto-redirect)
- ✅ Strong SSL/TLS (TLS 1.2+)
- ✅ Security headers (HSTS, XSS protection, etc.)
- ✅ Rate limiting (10 req/s per IP)
- ✅ Auto SSL renewal
- ✅ Firewall rules

### Manual setup recommended:
- 📝 Backup strategy cho database
- 📝 Monitoring alerts
- 📝 Log analysis
- 📝 Regular updates

## 🚨 Troubleshooting

### Website không truy cập được
```bash
# 1. Check DNS
nslookup kd.tiepluatrithuc.com

# 2. Check services
./domain_manager.sh status

# 3. Check firewall
sudo ufw status

# 4. Debug
./debug_nginx.sh
```

### SSL certificate lỗi
```bash
# Renew manually
sudo certbot renew --force-renewal

# Check expiry
./ssl_setup.sh status

# Re-setup if needed
sudo ./setup_nginx_proxy.sh kd.tiepluatrithuc.com
```

### Docker services không start
```bash
# Check ports
sudo netstat -tlnp | grep :1027
sudo netstat -tlnp | grep :1443

# Clean and rebuild
docker-compose down --remove-orphans
docker system prune -f
./quick_deploy.sh kd.tiepluatrithuc.com
```

### Database connection issues
```bash
# Check MariaDB
docker-compose logs mariadb

# Check database files
docker-compose exec mariadb mysql -u root -p

# Reset if needed
docker-compose down
docker volume rm nqd_kd_mariadb_data
docker-compose up -d
```

## 📞 Quick Reference

| Task | Command |
|------|---------|
| **Setup mới** | `sudo ./auto_setup.sh domain.com` |
| **Deploy code** | `./quick_deploy.sh domain.com` |
| **Check status** | `./domain_manager.sh status` |
| **View logs** | `docker-compose logs -f app` |
| **Debug issues** | `./debug_nginx.sh` |
| **Restart all** | `./quick_deploy.sh domain.com` |
| **Add domain** | `sudo ./touch_domain.sh newdomain.com` |
| **SSL renew** | `sudo certbot renew` |

## 🎊 Notes

- **Domain phải trỏ về IP server** trước khi chạy scripts
- **Port 80/443 phải mở** trong firewall
- **Scripts tự động backup** configs quan trọng  
- **Auto-restart** được setup cho production
- **Logs** được rotate tự động
- **SSL** auto-renew mỗi 90 ngày

---

**Happy Deploying! 🚀**