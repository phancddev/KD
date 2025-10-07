# Tài liệu triển khai Thống kê người dùng

## 📊 Tổng quan

Đã triển khai đầy đủ hệ thống thống kê người dùng cho cả **home.html** và **history.html**.

---

## ✅ 1. HOME.HTML - Thống kê trên trang chủ

### HTML Structure (views/home.html)
```html
<div class="card mt-4">
    <div class="card-header">
        <h3>Thống kê của bạn</h3>
    </div>
    <div class="card-body">
        <div class="user-stats">
            <div class="stat-card">
                <div class="stat-title">Tổng số trận</div>
                <div class="stat-value" id="total-games">--</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Tổng điểm</div>
                <div class="stat-value" id="total-score">--</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Câu đúng</div>
                <div class="stat-value" id="correct-answers">--/--</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Điểm cao nhất</div>
                <div class="stat-value" id="highest-score">--</div>
            </div>
        </div>
    </div>
</div>
```

### JavaScript (public/js/home.js)
**ĐÃ THÊM MỚI:**
```javascript
// Load user statistics
async function loadUserStats() {
    try {
        const response = await fetch('/api/user/stats', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load stats');
        }
        
        const stats = await response.json();
        console.log('📊 User stats loaded:', stats);
        
        // Update UI
        document.getElementById('total-games').textContent = stats.totalGames || 0;
        document.getElementById('total-score').textContent = stats.totalScore || 0;
        document.getElementById('correct-answers').textContent = `${stats.totalCorrectAnswers || 0}/${stats.totalQuestions || 0}`;
        document.getElementById('highest-score').textContent = stats.highestScore || 0;
    } catch (error) {
        console.error('❌ Error loading user stats:', error);
        // Set default values
        document.getElementById('total-games').textContent = '0';
        document.getElementById('total-score').textContent = '0';
        document.getElementById('correct-answers').textContent = '0/0';
        document.getElementById('highest-score').textContent = '0';
    }
}

// Load stats on page load
loadUserStats();
```

### API Endpoint (server.js)
**ĐÃ THÊM MỚI:**
```javascript
// API thống kê người dùng (cho trang home)
app.get('/api/user/stats', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats = await getUserGameStats(req.session.user.id);
    console.log(`📊 User ${req.session.user.id} stats:`, stats);
    res.json(stats);
  } catch (error) {
    console.error('Lỗi khi lấy thống kê người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

---

## ✅ 2. HISTORY.HTML - Thống kê trên trang lịch sử

### HTML Structure (views/history.html)
```html
<div class="user-stats">
    <div class="stat-card">
        <div class="stat-title">Tổng số trận</div>
        <div class="stat-value" id="total-games">0</div>
    </div>
    <div class="stat-card">
        <div class="stat-title">Tổng điểm</div>
        <div class="stat-value" id="total-score">0</div>
    </div>
    <div class="stat-card">
        <div class="stat-title">Câu đúng</div>
        <div class="stat-value" id="correct-answers">0/0</div>
    </div>
    <div class="stat-card">
        <div class="stat-title">Điểm cao nhất</div>
        <div class="stat-value" id="highest-score">0</div>
    </div>
</div>
```

### JavaScript (public/js/history.js)
**ĐÃ CÓ SẴN:**
```javascript
// Lấy dữ liệu lịch sử trận đấu
async function fetchHistory() {
    try {
        const monthSelect = document.getElementById('month-select');
        const yearSelect = document.getElementById('year-select');
        
        const month = monthSelect.value;
        const year = yearSelect.value;
        
        const response = await fetch(`/api/history?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error('Không thể lấy dữ liệu lịch sử');
        }
        
        const data = await response.json();
        
        // Lưu toàn bộ dữ liệu để phân trang
        allHistoryData = data.history || [];
        totalItems = allHistoryData.length;
        totalPages = Math.ceil(totalItems / pageSize);
        
        // Hiển thị thống kê người dùng
        displayUserStats(data.stats);
        
        // Hiển thị lịch sử trận đấu với phân trang
        displayHistory(allHistoryData);
        
        // Cập nhật điều khiển phân trang
        updatePaginationControls();
        
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử trận đấu:', error);
    }
}

// Hiển thị thống kê người dùng
function displayUserStats(stats) {
    if (!stats) {
        console.warn('No stats data received');
        stats = {
            totalGames: 0,
            totalScore: 0,
            totalCorrectAnswers: 0,
            totalQuestions: 0,
            highestScore: 0
        };
    }

    document.getElementById('total-games').textContent = stats.totalGames || 0;
    document.getElementById('total-score').textContent = stats.totalScore || 0;
    document.getElementById('correct-answers').textContent = `${stats.totalCorrectAnswers || 0}/${stats.totalQuestions || 0}`;
    document.getElementById('highest-score').textContent = stats.highestScore || 0;
}
```

### API Endpoint (server.js)
**ĐÃ CÓ SẴN:**
```javascript
// API lịch sử trận đấu với thống kê (cho trang history.html)
app.get('/api/history', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { month, year } = req.query;
    console.log(`📊 User ${req.session.user.id} requesting history - month: ${month}, year: ${year}`);

    let history;
    let stats;

    if (month && year) {
      history = await getUserGameHistoryByMonth(req.session.user.id, parseInt(year), parseInt(month));
      console.log(`📊 Found ${history.length} games for month ${month}/${year}`);
      // Calculate stats for the month
      stats = {
        totalGames: history.length,
        totalScore: history.reduce((sum, game) => sum + (game.score || 0), 0),
        totalCorrectAnswers: history.reduce((sum, game) => sum + (game.correctAnswers || 0), 0),
        totalQuestions: history.reduce((sum, game) => sum + (game.totalQuestions || 0), 0),
        highestScore: history.length > 0 ? Math.max(...history.map(g => g.score || 0)) : 0
      };
    } else {
      history = await getUserGameHistory(req.session.user.id);
      stats = await getUserGameStats(req.session.user.id);
      console.log(`📊 Found ${history.length} total games`);
    }

    console.log(`📊 Stats:`, stats);
    res.json({ history, stats });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử trận đấu:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

---

## 📦 Database Function (db/game-sessions.js)

**ĐÃ CÓ SẴN:**
```javascript
async function getUserGameStats(userId) {
  try {
    const [rows] = await pool.query(
      `SELECT 
         COUNT(id) as total_games,
         SUM(score) as total_score,
         SUM(correct_answers) as total_correct_answers,
         SUM(total_questions) as total_questions,
         AVG(score) as avg_score,
         MAX(score) as highest_score
       FROM game_sessions
       WHERE user_id = ? AND finished_at IS NOT NULL`,
      [userId]
    );
    
    if (rows.length === 0) {
      return {
        totalGames: 0,
        totalScore: 0,
        totalCorrectAnswers: 0,
        totalQuestions: 0,
        avgScore: 0,
        highestScore: 0
      };
    }
    
    return {
      totalGames: rows[0].total_games || 0,
      totalScore: rows[0].total_score || 0,
      totalCorrectAnswers: rows[0].total_correct_answers || 0,
      totalQuestions: rows[0].total_questions || 0,
      avgScore: rows[0].avg_score || 0,
      highestScore: rows[0].highest_score || 0
    };
  } catch (error) {
    console.error('Lỗi khi lấy thống kê trận đấu của người dùng:', error);
    throw error;
  }
}
```

---

## 🧪 Testing

### Test Home Page Stats
1. Đăng nhập với user
2. Truy cập: http://localhost:2701/
3. Kiểm tra phần "Thống kê của bạn"
4. Mở DevTools Console, xem log: `📊 User stats loaded: {...}`
5. Kiểm tra Network tab: `/api/user/stats` trả về đúng dữ liệu

### Test History Page Stats
1. Đăng nhập với user
2. Truy cập: http://localhost:2701/history
3. Chọn tháng/năm
4. Kiểm tra phần thống kê cập nhật theo tháng
5. Mở DevTools Console, xem log: `📊 User X requesting history - month: Y, year: Z`

---

## 📊 Stats Format

```json
{
  "totalGames": 10,
  "totalScore": 850,
  "totalCorrectAnswers": 95,
  "totalQuestions": 120,
  "avgScore": 85,
  "highestScore": 100
}
```

---

## ✅ Checklist

- [x] Home.html có HTML structure cho stats
- [x] Home.js load stats từ API `/api/user/stats`
- [x] API `/api/user/stats` trả về stats
- [x] History.html có HTML structure cho stats
- [x] History.js load stats từ API `/api/history`
- [x] API `/api/history` trả về cả history và stats
- [x] Stats tính toán theo tháng khi có filter
- [x] Stats tính toán tổng khi không có filter
- [x] Error handling cho cả 2 trang
- [x] Console logs để debug
- [x] Default values khi không có dữ liệu

---

## 🎯 Kết luận

**Tất cả đã hoàn chỉnh!** Cả home.html và history.html đều có thống kê hoạt động đầy đủ với:
- ✅ UI hiển thị đẹp
- ✅ API endpoints hoạt động
- ✅ Error handling
- ✅ Console logs để debug
- ✅ Default values

