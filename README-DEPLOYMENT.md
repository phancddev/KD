# 🚀 KD APP - DOCKER DEPLOYMENT

## 📋 QUICK START

### Lần đầu deploy (Fresh database):

```bash
cd KD
./rebuild-docker-fresh.sh
```

### Update code (Giữ data):

```bash
cd KD
./rebuild-docker.sh
```

### Test migration:

```bash
cd KD
./test-migration.sh
```

---

## 📚 DOCUMENTATION

| File | Description |
|------|-------------|
| [DOCKER-DEPLOYMENT-GUIDE.md](../DOCKER-DEPLOYMENT-GUIDE.md) | Full deployment guide |
| [MIGRATION-SUMMARY.md](../MIGRATION-SUMMARY.md) | Migration logic explained |
| [FIX-FOLDER-STRUCTURE.md](../FIX-FOLDER-STRUCTURE.md) | Folder structure fix |

---

## 🔧 AVAILABLE SCRIPTS

### `./rebuild-docker.sh`
**Rebuild Docker giữ nguyên data**

- ✅ Keep database data
- ✅ Keep uploaded files
- ✅ Auto-run migrations
- ✅ Safe for production

**Use case:**
- Update code
- Fix bugs
- Add features

### `./rebuild-docker-fresh.sh`
**Rebuild Docker từ đầu (xóa data)**

- ❌ Delete database
- ❌ Delete uploads
- ✅ Fresh install
- ✅ All migrations run

**Use case:**
- First deployment
- Testing from scratch
- Database corrupted

### `./test-migration.sh`
**Test migration idempotency**

- ✅ Run migration twice
- ✅ Verify SKIP on 2nd run
- ✅ No errors
- ✅ No data changes

**Use case:**
- Verify migration works
- Test before deploy
- Debug migration issues

---

## 🏗️ ARCHITECTURE

### Docker Services

```
┌─────────────────────────────────────┐
│         Docker Compose              │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │   App    │  │ MariaDB  │       │
│  │ (Node.js)│◄─┤ Database │       │
│  │  :2701   │  │  :3307   │       │
│  └──────────┘  └──────────┘       │
│       │                             │
│       ▼                             │
│  ┌──────────┐                      │
│  │ Adminer  │                      │
│  │  :8080   │                      │
│  └──────────┘                      │
│                                     │
└─────────────────────────────────────┘
```

### Migration Flow

```
Container Start
    │
    ▼
docker-entrypoint.sh
    │
    ├─► Wait for database
    │
    ├─► Run check-and-migrate.js
    │   │
    │   ├─► Check column exists?
    │   │   ├─► Yes → SKIP
    │   │   └─► No → ADD column
    │   │
    │   ├─► Check NULL values?
    │   │   ├─► Yes → UPDATE
    │   │   └─► No → SKIP
    │   │
    │   └─► ✅ Done
    │
    └─► Start application (npm start)
```

---

## 🔍 MIGRATION LOGIC

### Idempotent = Safe to run multiple times

```javascript
// Pseudo code
if (column_exists('storage_folder')) {
  console.log('✅ SKIP - already exists');
} else {
  console.log('⚠️  ADD column');
  ALTER TABLE matches ADD COLUMN storage_folder;
}

if (has_null_values()) {
  console.log('🔄 UPDATE NULL values');
  UPDATE matches SET storage_folder = generate_name();
} else {
  console.log('✅ SKIP - all values set');
}
```

### Result

| Run | Column Exists | NULL Values | Action |
|-----|---------------|-------------|--------|
| 1st | ❌ No | N/A | ADD column + UPDATE all |
| 2nd | ✅ Yes | ❌ No | SKIP + SKIP |
| 3rd | ✅ Yes | ❌ No | SKIP + SKIP |

---

## 📊 FOLDER STRUCTURE

### Storage Folder Format

```
Format: YYYYMMDD_CODE_TenTran

Examples:
  20251008_ABC12345_TestMatch
  20251008_XYZ67890_TranDauMoi
  20251009_QWE11111_ChungKet
```

### Directory Layout

```
dan_data-node/storage/
├── 20251008_ABC12345_TestMatch/
│   ├── image_1728369900123.jpg
│   ├── image_1728369950456.jpg
│   └── video_1728370000789.mp4
├── 20251008_XYZ67890_TranDauMoi/
│   └── image_1728370100123.jpg
└── 20251009_QWE11111_ChungKet/
    ├── image_1728370200456.jpg
    └── video_1728370300789.mp4
```

---

## 🚀 DEPLOYMENT STEPS

### 1. Prepare

```bash
# Clone repository
git clone <repo-url>
cd KD-app/KD

# Configure environment
cp .env.example .env
nano .env
```

### 2. Deploy

**Option A: Fresh Install**
```bash
./rebuild-docker-fresh.sh
```

**Option B: Update Existing**
```bash
./rebuild-docker.sh
```

### 3. Verify

```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs -f app

# Check migration
docker-compose logs app | grep -A 30 "Checking database"
```

### 4. Test

```bash
# Login
open http://localhost:2701/login

# Create match
open http://localhost:2701/admin/matches

# Check database
open http://localhost:8080
```

---

## 🔧 TROUBLESHOOTING

### Issue: "Unknown column 'storage_folder'"

**Solution:**
```bash
# Run migration manually
docker exec kd-app-1 node db/check-and-migrate.js

# Or rebuild
./rebuild-docker.sh
```

### Issue: Container keeps restarting

**Check:**
```bash
docker-compose logs app
```

**Common causes:**
- Database not ready → Wait longer
- Migration failed → Check logs
- Port conflict → Change ports

### Issue: Migration failed

**Debug:**
```bash
# Check migration logs
docker-compose logs app | grep -A 50 "Checking database"

# Run migration manually
docker exec -it kd-app-1 sh
node db/check-and-migrate.js
```

---

## 📝 ENVIRONMENT VARIABLES

```env
# Database
DB_HOST=mariadb
DB_PORT=3306
DB_USER=nqd_user
DB_PASSWORD=nqd_password
DB_NAME=nqd_database

# Application
NODE_ENV=production
PORT=2701

# Session
SESSION_SECRET=your-secret-key
```

---

## 🎯 BEST PRACTICES

### 1. Always use scripts

❌ **Don't:**
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

✅ **Do:**
```bash
./rebuild-docker.sh
```

### 2. Check logs after deploy

```bash
docker-compose logs -f app
```

### 3. Backup before major changes

```bash
# Backup database
docker exec kd-mariadb-1 mysqldump -u root -proot_password nqd_database > backup.sql

# Backup uploads
tar -czf uploads_backup.tar.gz uploads/
```

### 4. Test migration locally first

```bash
./test-migration.sh
```

---

## 📞 SUPPORT

### Check Documentation

1. [DOCKER-DEPLOYMENT-GUIDE.md](../DOCKER-DEPLOYMENT-GUIDE.md) - Full guide
2. [MIGRATION-SUMMARY.md](../MIGRATION-SUMMARY.md) - Migration details
3. [FIX-FOLDER-STRUCTURE.md](../FIX-FOLDER-STRUCTURE.md) - Folder structure

### Debug Commands

```bash
# Container status
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f mariadb

# Enter container
docker exec -it kd-app-1 sh

# Check database
docker exec -it kd-mariadb-1 mysql -u root -proot_password nqd_database
```

---

## ✅ CHECKLIST

### Before Deploy

- [ ] Code updated
- [ ] `.env` configured
- [ ] Ports available (2701, 3307, 8080)
- [ ] Docker installed and running

### After Deploy

- [ ] Containers running
- [ ] Migration successful
- [ ] Login works
- [ ] Create match works
- [ ] Upload works
- [ ] No errors in logs

---

**Ready to deploy!** 🚀

