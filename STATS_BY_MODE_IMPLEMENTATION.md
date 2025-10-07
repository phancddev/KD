# Thống kê theo chế độ chơi - Implementation

## 📊 Tổng quan

Đã cập nhật hệ thống thống kê để hiển thị theo **chế độ chơi** và **loại trận**:
- **Chế độ**: Khởi Động (khoidong) vs Tăng Tốc (tangtoc)
- **Loại trận**: Tự đấu (solo) vs Đấu phòng (room)

---

## ✅ 1. Database Function (db/game-sessions.js)

### Cập nhật `getUserGameStats(userId)`

**Thêm query thống kê theo chế độ:**
```javascript
// Thống kê theo chế độ
const [byModeRows] = await pool.query(
  `SELECT 
     game_mode,
     is_solo,
     COUNT(id) as games_count,
     SUM(score) as total_score,
     SUM(correct_answers) as total_correct,
     SUM(total_questions) as total_questions
   FROM game_sessions
   WHERE user_id = ? AND finished_at IS NOT NULL
   GROUP BY game_mode, is_solo`,
  [userId]
);
```

**Tổ chức dữ liệu:**
```javascript
const byMode = {
  khoidongSolo: 0,
  khoidongRoom: 0,
  tangtocSolo: 0,
  tangtocRoom: 0
};

byModeRows.forEach(row => {
  const mode = row.game_mode || 'khoidong';
  const isSolo = row.is_solo === 1;
  
  if (mode === 'khoidong' && isSolo) {
    byMode.khoidongSolo = row.games_count || 0;
  } else if (mode === 'khoidong' && !isSolo) {
    byMode.khoidongRoom = row.games_count || 0;
  } else if (mode === 'tangtoc' && isSolo) {
    byMode.tangtocSolo = row.games_count || 0;
  } else if (mode === 'tangtoc' && !isSolo) {
    byMode.tangtocRoom = row.games_count || 0;
  }
});
```

**Return format:**
```javascript
return {
  totalGames: 10,
  totalScore: 850,
  totalCorrectAnswers: 95,
  totalQuestions: 120,
  avgScore: 85,
  highestScore: 100,
  byMode: {
    khoidongSolo: 3,
    khoidongRoom: 2,
    tangtocSolo: 4,
    tangtocRoom: 1
  }
};
```

---

## ✅ 2. API Endpoints (server.js)

### `/api/user/stats` - Không thay đổi
Trả về stats tổng với `byMode` từ database function.

### `/api/history` - Cập nhật tính stats theo tháng

**Khi có filter month/year:**
```javascript
if (month && year) {
  history = await getUserGameHistoryByMonth(req.session.user.id, parseInt(year), parseInt(month));
  
  // Calculate stats for the month
  const byMode = {
    khoidongSolo: 0,
    khoidongRoom: 0,
    tangtocSolo: 0,
    tangtocRoom: 0
  };
  
  history.forEach(game => {
    const mode = game.gameMode || 'khoidong';
    const isSolo = game.isSolo;
    
    if (mode === 'khoidong' && isSolo) {
      byMode.khoidongSolo++;
    } else if (mode === 'khoidong' && !isSolo) {
      byMode.khoidongRoom++;
    } else if (mode === 'tangtoc' && isSolo) {
      byMode.tangtocSolo++;
    } else if (mode === 'tangtoc' && !isSolo) {
      byMode.tangtocRoom++;
    }
  });
  
  stats = {
    totalGames: history.length,
    totalScore: history.reduce((sum, game) => sum + (game.score || 0), 0),
    totalCorrectAnswers: history.reduce((sum, game) => sum + (game.correctAnswers || 0), 0),
    totalQuestions: history.reduce((sum, game) => sum + (game.totalQuestions || 0), 0),
    highestScore: history.length > 0 ? Math.max(...history.map(g => g.score || 0)) : 0,
    byMode
  };
}
```

---

## ✅ 3. Frontend - HOME.HTML

### HTML Structure
```html
<!-- Thống kê tổng -->
<h4 style="margin-bottom: 1rem; color: #dc2626;">📊 Tổng quan</h4>
<div class="user-stats">
    <div class="stat-card">
        <div class="stat-title">Tổng số trận</div>
        <div class="stat-value" id="total-games">--</div>
    </div>
    <!-- ... other total stats ... -->
</div>

<!-- Thống kê theo chế độ -->
<h4 style="margin: 2rem 0 1rem; color: #dc2626;">🎯 Theo chế độ chơi</h4>
<div class="user-stats">
    <div class="stat-card">
        <div class="stat-title">🎯 Khởi Động - Tự đấu</div>
        <div class="stat-value" id="khoidong-solo-games" style="font-size: 1.2rem;">--</div>
        <small style="color: #6b7280;">trận</small>
    </div>
    <div class="stat-card">
        <div class="stat-title">🎯 Khởi Động - Phòng</div>
        <div class="stat-value" id="khoidong-room-games" style="font-size: 1.2rem;">--</div>
        <small style="color: #6b7280;">trận</small>
    </div>
    <div class="stat-card">
        <div class="stat-title">🚀 Tăng Tốc - Tự đấu</div>
        <div class="stat-value" id="tangtoc-solo-games" style="font-size: 1.2rem;">--</div>
        <small style="color: #6b7280;">trận</small>
    </div>
    <div class="stat-card">
        <div class="stat-title">🚀 Tăng Tốc - Phòng</div>
        <div class="stat-value" id="tangtoc-room-games" style="font-size: 1.2rem;">--</div>
        <small style="color: #6b7280;">trận</small>
    </div>
</div>
```

### JavaScript (public/js/home.js)
```javascript
async function loadUserStats() {
    const response = await fetch('/api/user/stats', { credentials: 'include' });
    const stats = await response.json();
    
    // Update tổng quan
    document.getElementById('total-games').textContent = stats.totalGames || 0;
    document.getElementById('total-score').textContent = stats.totalScore || 0;
    document.getElementById('correct-answers').textContent = `${stats.totalCorrectAnswers || 0}/${stats.totalQuestions || 0}`;
    document.getElementById('highest-score').textContent = stats.highestScore || 0;
    
    // Update theo chế độ
    if (stats.byMode) {
        document.getElementById('khoidong-solo-games').textContent = stats.byMode.khoidongSolo || 0;
        document.getElementById('khoidong-room-games').textContent = stats.byMode.khoidongRoom || 0;
        document.getElementById('tangtoc-solo-games').textContent = stats.byMode.tangtocSolo || 0;
        document.getElementById('tangtoc-room-games').textContent = stats.byMode.tangtocRoom || 0;
    }
}
```

---

## ✅ 4. Frontend - HISTORY.HTML

### HTML Structure
Tương tự home.html với các element IDs giống nhau.

### JavaScript (public/js/history.js)
```javascript
function displayUserStats(stats) {
    if (!stats) {
        stats = {
            totalGames: 0,
            totalScore: 0,
            totalCorrectAnswers: 0,
            totalQuestions: 0,
            highestScore: 0,
            byMode: {
                khoidongSolo: 0,
                khoidongRoom: 0,
                tangtocSolo: 0,
                tangtocRoom: 0
            }
        };
    }

    // Update tổng quan
    document.getElementById('total-games').textContent = stats.totalGames || 0;
    document.getElementById('total-score').textContent = stats.totalScore || 0;
    document.getElementById('correct-answers').textContent = `${stats.totalCorrectAnswers || 0}/${stats.totalQuestions || 0}`;
    document.getElementById('highest-score').textContent = stats.highestScore || 0;
    
    // Update theo chế độ
    if (stats.byMode) {
        document.getElementById('khoidong-solo-games').textContent = stats.byMode.khoidongSolo || 0;
        document.getElementById('khoidong-room-games').textContent = stats.byMode.khoidongRoom || 0;
        document.getElementById('tangtoc-solo-games').textContent = stats.byMode.tangtocSolo || 0;
        document.getElementById('tangtoc-room-games').textContent = stats.byMode.tangtocRoom || 0;
    }
}
```

---

## 🧪 Testing

### Test Home Page
1. Đăng nhập
2. Vào http://localhost:2701/
3. Kiểm tra 2 phần thống kê:
   - **Tổng quan**: Tổng số trận, điểm, câu đúng, điểm cao nhất
   - **Theo chế độ**: 4 loại (Khởi Động Solo/Room, Tăng Tốc Solo/Room)

### Test History Page
1. Đăng nhập
2. Vào http://localhost:2701/history
3. Chọn tháng/năm khác nhau
4. Kiểm tra stats cập nhật theo tháng đã chọn
5. Kiểm tra cả 2 phần thống kê

### Expected Console Logs
```
📊 User stats loaded: {
  totalGames: 10,
  totalScore: 850,
  byMode: {
    khoidongSolo: 3,
    khoidongRoom: 2,
    tangtocSolo: 4,
    tangtocRoom: 1
  }
}
```

---

## 📁 Files Modified

1. ✅ **db/game-sessions.js** - Thêm query GROUP BY game_mode, is_solo
2. ✅ **server.js** - Cập nhật `/api/history` tính byMode cho monthly stats
3. ✅ **views/home.html** - Thêm 4 stat cards cho byMode
4. ✅ **views/history.html** - Thêm 4 stat cards cho byMode
5. ✅ **public/js/home.js** - Update UI với byMode data
6. ✅ **public/js/history.js** - Update UI với byMode data

---

## 🎯 Data Flow

```
Database (game_sessions table)
  ↓
  game_mode: 'khoidong' | 'tangtoc'
  is_solo: 0 | 1
  ↓
getUserGameStats(userId)
  ↓
  GROUP BY game_mode, is_solo
  ↓
  {
    byMode: {
      khoidongSolo: count,
      khoidongRoom: count,
      tangtocSolo: count,
      tangtocRoom: count
    }
  }
  ↓
API Response
  ↓
Frontend Display
```

---

## ✅ Checklist

- [x] Database query GROUP BY game_mode, is_solo
- [x] Return byMode object from getUserGameStats
- [x] Calculate byMode for monthly stats in /api/history
- [x] HTML structure với 4 stat cards mới
- [x] JavaScript update UI với byMode data
- [x] Error handling với default values
- [x] Áp dụng cho cả home.html và history.html
- [x] Console logs để debug

---

## 🎉 Kết quả

Người dùng giờ có thể xem:
- 📊 **Tổng quan**: Tổng số trận, điểm, câu đúng, điểm cao nhất
- 🎯 **Khởi Động - Tự đấu**: Số trận chơi solo mode khởi động
- 🎯 **Khởi Động - Phòng**: Số trận chơi room mode khởi động
- 🚀 **Tăng Tốc - Tự đấu**: Số trận chơi solo mode tăng tốc
- 🚀 **Tăng Tốc - Phòng**: Số trận chơi room mode tăng tốc

Tất cả đều cập nhật real-time và có thể filter theo tháng!

