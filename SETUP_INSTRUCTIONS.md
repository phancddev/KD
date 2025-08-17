# 🚀 Hướng dẫn setup nhanh cho kd.tiepluatrithuc.com

## 📋 Vấn đề và giải pháp

**Vấn đề:** Port 80 đã bị chiếm dụng bởi service khác
**Giải pháp:** App chạy trên port 1027/1443, dùng nginx proxy để truy cập bằng domain

## 🔧 Setup trên server Ubuntu

### Bước 1: Build và start app với port mới

```bash
# Stop container cũ (nếu có)
docker-compose down

# Build và start với port mới
docker-compose up -d --build

# Kiểm tra services
docker-compose ps
```

App sẽ chạy trên:
- **HTTP:** `http://kd.tiepluatrithuc.com:1027`  
- **HTTPS:** `https://kd.tiepluatrithuc.com:1443`

### Bước 2: Setup nginx proxy (để vào bằng domain mà không cần port)

```bash
# Chạy script tự động setup nginx proxy
sudo ./setup_nginx_proxy.sh kd.tiepluatrithuc.com
```

Script sẽ tự động:
- ✅ Cài đặt nginx (nếu chưa có)
- ✅ Tạo SSL certificate từ Let's Encrypt
- ✅ Tạo nginx config proxy từ domain → port 1443
- ✅ Enable site và reload nginx
- ✅ Setup auto-renewal SSL

### Bước 3: Kiểm tra

```bash
# Kiểm tra nginx config
sudo nginx -t

# Kiểm tra services đang chạy
docker-compose ps

# Test truy cập
curl -I https://kd.tiepluatrithuc.com
```

## 🌐 URLs sau khi setup

- **Chính thức:** `https://kd.tiepluatrithuc.com` (qua nginx proxy)
- **Trực tiếp:** `https://kd.tiepluatrithuc.com:1443` (app trực tiếp)

## 🛠️ Commands hữu ích

```bash
# App management
docker-compose logs -f app          # Xem logs app
docker-compose restart app          # Restart app
docker-compose down && docker-compose up -d  # Restart all

# Nginx management
sudo systemctl status nginx         # Trạng thái nginx
sudo systemctl reload nginx         # Reload nginx config
sudo tail -f /var/log/nginx/kd.tiepluatrithuc.com_access.log  # Xem logs

# Domain management
./domain_manager.sh status           # Xem trạng thái tổng thể
./ssl_setup.sh status               # Xem trạng thái SSL
```

## 🔧 Troubleshooting

### App không start được

```bash
# Kiểm tra logs
docker-compose logs app

# Kiểm tra port conflicts
sudo netstat -tlnp | grep :1027
sudo netstat -tlnp | grep :1443
```

### Domain không truy cập được

```bash
# Kiểm tra nginx config
sudo nginx -t

# Kiểm tra nginx đang chạy
sudo systemctl status nginx

# Kiểm tra app đang chạy
curl -k https://127.0.0.1:1443
```

### SSL issues

```bash
# Gia hạn SSL
sudo certbot renew

# Kiểm tra SSL certificate
openssl s_client -connect kd.tiepluatrithuc.com:443 -servername kd.tiepluatrithuc.com
```

## 📞 Quick Setup Commands

```bash
# 1. Start app với port mới
docker-compose down && docker-compose up -d --build

# 2. Setup nginx proxy 
sudo ./setup_nginx_proxy.sh kd.tiepluatrithuc.com

# 3. Kiểm tra
curl -I https://kd.tiepluatrithuc.com
```

**Xong! 🎉**

Domain `kd.tiepluatrithuc.com` sẽ hoạt động bình thường mà không cần port.