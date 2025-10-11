# Avatar Upload Feature - Bug Fixes & Implementation

**Date**: 2025-10-10  
**Version**: 1.0.0  
**Status**: ✅ Fixed and Ready for Testing

## 📋 Summary

Fixed critical bugs in avatar upload functionality and ensured proper database migration in Docker environment.

## 🐛 Bugs Fixed

### Bug #1: Missing Avatar Column in Database (CRITICAL)
**Problem**: 
- Migration file `07-add-avatar-column.sql` existed but was never executed
- `check-and-migrate.js` didn't include logic to add avatar column
- API upload would fail when trying to update database

**Solution**:
- Added `addAvatarColumn()` function to `check-and-migrate.js`
- Function checks if column exists before adding (idempotent)
- Added as Step 4 in migration sequence

**Files Changed**:
- `db/check-and-migrate.js`: Added avatar column migration logic

### Bug #2: Missing Avatar Directory
**Problem**:
- Dockerfile only created `uploads` directory
- `uploads/avatars` subdirectory not created automatically
- Could cause permission issues when first upload

**Solution**:
- Updated Dockerfile to create both `uploads/avatars` and `uploads/temp`
- Ensures directories exist before app starts

**Files Changed**:
- `Dockerfile`: Line 23 - Create avatars and temp directories

### Bug #3: Avatar Not Selected in User Queries
**Problem**:
- `getAllUsers()` and `getUsersForDeletion()` didn't SELECT avatar column
- Frontend couldn't display user avatars in admin panel

**Solution**:
- Added `avatar` to SELECT statements in all user query functions
- Added `avatar` to returned objects mapping

**Files Changed**:
- `db/users.js`: Lines 74, 474, 498 - Added avatar to SELECT queries
- `db/users.js`: Lines 490, 515 - Added avatar to return mapping

### Bug #4: Static Files Not Served for Uploads (CRITICAL)
**Problem**:
- Server didn't serve static files for `/uploads` directory
- Avatar images couldn't be accessed via HTTP
- Browser returned 404 for avatar URLs

**Solution**:
- Added `express.static` middleware for `/uploads` path
- Now avatars are accessible at `/uploads/avatars/{user_id}/{filename}`

**Files Changed**:
- `server.js`: Line 149 - Added `app.use('/uploads', express.static(join(__dirname, 'uploads')))`

### Bug #5: Toast Notification Function Mismatch
**Problem**:
- Code used `showToast()` function which doesn't exist
- System uses `Toast.success()` / `Toast.error()` from toast.js
- No notifications displayed on success/error

**Solution**:
- Replaced all `showToast()` calls with `Toast.success()` / `Toast.error()`
- Added proper error handling with toast notifications
- Modal closes automatically after successful upload

**Files Changed**:
- `views/profile.html`: Updated all toast calls to use Toast class
- `views/profile.html`: Added console.log for debugging avatar display

## ✅ Existing Features (Already Working)

### API Endpoint
- **POST** `/api/user/avatar` - Upload avatar with authentication
- Multer configuration with validation:
  - Max file size: 5MB
  - Allowed types: image/* (jpg, png, gif, etc.)
  - Storage: `uploads/avatars/{user_id}/{filename}`

### Database Function
- `updateUserAvatar(userId, avatarPath)` - Update avatar path in database
- Located in `db/users.js`

### Frontend
- Profile page (`views/profile.html`) with:
  - Avatar preview
  - Upload button
  - Cropper.js integration for image cropping
  - Real-time preview update

### File Management
- Automatic old avatar deletion when uploading new one
- Error handling with file cleanup on failure
- Unique filename generation with timestamp

## 🔧 Migration Details

### Avatar Column Schema
```sql
ALTER TABLE users
ADD COLUMN avatar VARCHAR(255) DEFAULT NULL
COMMENT 'Đường dẫn ảnh đại diện của user'
AFTER last_ip
```

### Migration Logic (Idempotent)
```javascript
async function addAvatarColumn() {
  const hasColumn = await columnExists('users', 'avatar');
  
  if (hasColumn) {
    console.log('   ✅ Column avatar already exists - SKIP');
    return false;
  }
  
  console.log('   ⚠️  Column avatar NOT exists - ADDING...');
  
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN avatar VARCHAR(255) DEFAULT NULL
    COMMENT 'Đường dẫn ảnh đại diện của user'
    AFTER last_ip
  `);
  
  console.log('   ✅ Column added successfully');
  return true;
}
```

## 📁 File Structure

```
KD/
├── uploads/
│   ├── avatars/          # User avatar storage
│   │   └── {user_id}/    # Per-user directories
│   │       └── avatar-{timestamp}-{random}.{ext}
│   └── temp/             # Temporary upload files
├── db/
│   ├── check-and-migrate.js  # ✅ Updated - Added avatar migration
│   ├── users.js              # ✅ Updated - Added avatar to queries
│   ├── init/
│   │   └── 07-add-avatar-column.sql  # Migration SQL (for reference)
│   └── migrations/
│       └── add_avatar_to_users.sql   # Migration SQL (for reference)
├── Dockerfile            # ✅ Updated - Create avatar directories
├── server.js             # Avatar upload API endpoint
└── views/
    └── profile.html      # Avatar upload UI
```

## 🚀 Deployment Steps

### 1. Rebuild Docker Containers
```bash
cd /Users/phancd/Documents/pcd-prj/KD-app/KD
docker-compose down
docker-compose up -d --build
```

### 2. Verify Migration
Check logs to ensure avatar column was added:
```bash
docker-compose logs app | grep "avatar"
```

Expected output:
```
📝 Step 4: Check avatar column in users
   ⚠️  Column avatar NOT exists - ADDING...
   ✅ Column added successfully
```

Or if already exists:
```
📝 Step 4: Check avatar column in users
   ✅ Column avatar already exists - SKIP
```

### 3. Verify Database Schema
```bash
docker-compose exec mariadb mysql -unqd_user -pnqd_password nqd_database -e "DESCRIBE users;"
```

Should show `avatar` column:
```
| avatar     | varchar(255) | YES  |     | NULL    |       |
```

### 4. Test Upload Functionality
1. Login to application: http://localhost:2701
2. Go to Profile page
3. Click "Tải ảnh lên" button
4. Select an image file
5. Crop if needed
6. Click "Upload Avatar"
7. Verify avatar displays correctly

## 🧪 Testing Checklist

- [ ] Docker containers build successfully
- [ ] Migration runs without errors
- [ ] Avatar column exists in database
- [ ] Upload directories exist in container
- [ ] Can upload avatar via UI
- [ ] Avatar displays in profile page
- [ ] Avatar displays in header
- [ ] Old avatar is deleted when uploading new one
- [ ] File size validation works (max 5MB)
- [ ] File type validation works (images only)
- [ ] Avatar persists after container restart
- [ ] Avatar URL is correct in database

## 📊 Database Schema

### users table (updated)
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  last_ip VARCHAR(45) NULL,
  avatar VARCHAR(255) DEFAULT NULL COMMENT 'Đường dẫn ảnh đại diện của user'
);
```

## 🔒 Security Considerations

### File Upload Security
- ✅ File type validation (images only)
- ✅ File size limit (5MB)
- ✅ Unique filename generation
- ✅ User-specific directories
- ✅ Authentication required
- ✅ Path sanitization

### Recommendations for Production
- [ ] Add image dimension validation
- [ ] Add virus scanning
- [ ] Add rate limiting for uploads
- [ ] Add CDN integration for serving avatars
- [ ] Add image optimization/compression
- [ ] Add backup strategy for avatar files

## 📝 API Documentation

### Upload Avatar
**Endpoint**: `POST /api/user/avatar`

**Authentication**: Required (session-based)

**Request**:
- Content-Type: `multipart/form-data`
- Body: `avatar` (file)

**Response Success** (200):
```json
{
  "success": true,
  "message": "Upload avatar thành công",
  "avatarUrl": "/uploads/avatars/1/avatar-1696934400000-123456789.jpg"
}
```

**Response Error** (400/401/500):
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🔄 Rollback Plan

If issues occur, rollback by:

1. Stop containers:
```bash
docker-compose down
```

2. Checkout previous version:
```bash
git checkout HEAD~1 -- db/check-and-migrate.js db/users.js Dockerfile
```

3. Rebuild:
```bash
docker-compose up -d --build
```

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs app`
- Check database: `docker-compose exec mariadb mysql -unqd_user -pnqd_password nqd_database`
- Verify files: `docker-compose exec app ls -la /app/uploads/avatars/`

## ✅ Completion Status

- [x] Bug analysis completed
- [x] Migration logic added
- [x] Dockerfile updated
- [x] Database queries updated
- [x] Documentation created
- [ ] Docker rebuild and testing
- [ ] Production deployment

