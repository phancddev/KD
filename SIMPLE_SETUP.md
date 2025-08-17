# 🚀 NQD App - Simple Setup (No Nginx/Domain)

App chạy đơn giản port 2701, truy cập bằng IP VPS.

## 📋 Quick Commands

```bash
# Cleanup nginx và domain configs (chạy 1 lần)
sudo ./cleanup_nginx.sh

# Start app
./simple_start.sh start

# Check status  
./simple_start.sh status

# View logs
./simple_start.sh logs
```

## 🔧 Scripts Available

### 1. **cleanup_nginx.sh** - Xóa hết nginx/domain setup ⚠️
```bash
sudo ./cleanup_nginx.sh
```
**Làm gì:**
- Xóa nginx containers & configs
- Xóa SSL certificates & domain configs  
- Update docker-compose về dạng đơn giản
- App chạy port 2701 trực tiếp

### 2. **simple_start.sh** - Quản lý app đơn giản ⭐
```bash
./simple_start.sh start      # Start app
./simple_start.sh stop       # Stop app  
./simple_start.sh restart    # Restart app
./simple_start.sh status     # Check status
./simple_start.sh logs       # View logs
./simple_start.sh build      # Rebuild app
./simple_start.sh clean      # Clean & rebuild
./simple_start.sh info       # Connection info
```

## 🌐 Access URLs

Sau khi start app:

- **App:** `http://YOUR_VPS_IP:2701`
- **Database Admin:** `http://YOUR_VPS_IP:8080`

## 📊 Port Mapping

| Service | Port | Description |
|---------|------|-------------|
| App | 2701 | Main web app |
| Database | 3307 | MariaDB |
| Adminer | 8080 | Database admin |

## 🚀 Typical Workflow

### Lần đầu setup:
```bash
# 1. Clean up nginx (nếu có)
sudo ./cleanup_nginx.sh

# 2. Start app
./simple_start.sh start

# 3. Check
./simple_start.sh info
```

### Deploy code mới:
```bash
# 1. Pull code
git pull

# 2. Rebuild
./simple_start.sh clean

# 3. Check
./simple_start.sh status
```

### Monitor & debug:
```bash
# Check status
./simple_start.sh status

# View logs
./simple_start.sh logs

# Restart if needed
./simple_start.sh restart
```

## 📝 Docker Compose Config

```yaml
# App expose port 2701 trực tiếp
services:
  app:
    ports:
      - "2701:2701"  # Direct access
  
  mariadb:
    ports:
      - "3307:3306"  # Database
      
  adminer:
    ports:
      - "8080:8080"  # DB admin
```

## 🔧 Database Connection

**External connection:**
- Host: `YOUR_VPS_IP`
- Port: `3307`
- Database: `nqd_database`
- Username: `nqd_user`
- Password: `nqd_password`

**Internal connection (from app):**
- Host: `mariadb`
- Port: `3306`

## 🛡️ Firewall Setup

Mở các ports cần thiết:

```bash
# Ubuntu/UFW
sudo ufw allow 2701/tcp  # App
sudo ufw allow 3307/tcp  # Database (nếu cần external access)
sudo ufw allow 8080/tcp  # Adminer (nếu cần)

# Or specific IP only
sudo ufw allow from YOUR_ADMIN_IP to any port 3307
sudo ufw allow from YOUR_ADMIN_IP to any port 8080
```

## 📊 Monitoring

### Check if app is running:
```bash
curl -I http://YOUR_VPS_IP:2701
```

### Check Docker status:
```bash
docker ps
./simple_start.sh status
```

### View logs:
```bash
./simple_start.sh logs
docker-compose logs app
```

### Check ports:
```bash
netstat -tlnp | grep -E "(2701|3307|8080)"
```

## 🚨 Troubleshooting

### App không truy cập được:
```bash
# Check if running
./simple_start.sh status

# Check ports
netstat -tlnp | grep 2701

# Check firewall
sudo ufw status

# View logs
./simple_start.sh logs
```

### Database connection issues:
```bash
# Check MariaDB
docker-compose logs mariadb

# Test connection
mysql -h YOUR_VPS_IP -P 3307 -u nqd_user -p
```

### Port conflicts:
```bash
# Find what's using port
sudo netstat -tlnp | grep :2701

# Kill process if needed
sudo kill -9 PID
```

### Clean restart:
```bash
./simple_start.sh clean
```

## 📂 File Structure

```
project/
├── docker-compose.yml          # Simple config (no nginx)
├── simple_start.sh            # App manager
├── cleanup_nginx.sh           # Cleanup script
├── uploads/                   # File uploads
├── db/                       # Database init
└── (other app files)
```

## 💡 Tips

1. **Backup database** trước khi cleanup:
   ```bash
   docker-compose exec mariadb mysqldump -u root -p nqd_database > backup.sql
   ```

2. **Monitor resources:**
   ```bash
   htop
   df -h
   docker stats
   ```

3. **Auto-start on boot:**
   ```bash
   # Add to crontab
   @reboot cd /path/to/project && ./simple_start.sh start
   ```

4. **Update app:**
   ```bash
   git pull && ./simple_start.sh clean
   ```

## 🎯 Summary

- ✅ **Simple:** Chỉ 1 port (2701), không cần domain/SSL
- ✅ **Direct:** Truy cập bằng IP VPS
- ✅ **Easy:** Manage bằng `./simple_start.sh`
- ✅ **Clean:** Không có nginx/proxy phức tạp

**Main URL:** `http://YOUR_VPS_IP:2701` 🚀