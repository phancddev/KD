# Cải thiện History.html - Implementation

## 📋 Tổng quan

Đã cải thiện trang lịch sử trận đấu (history.html) với 2 tính năng chính:
1. **Hiển thị toàn bộ câu hỏi** dạng bảng giống admin panel
2. **Sắp xếp trận đấu** theo thứ tự mới nhất lên đầu

---

## ✅ 1. Hiển thị toàn bộ câu hỏi dạng bảng

### Vấn đề trước đây:
- ❌ Câu hỏi hiển thị dạng card/div
- ❌ Khó đọc khi có nhiều câu hỏi
- ❌ Không giống admin panel

### Giải pháp:

#### A. Cập nhật HTML (views/history.html)

**Thay đổi từ div sang table:**
```html
<!-- TRƯỚC -->
<div class="question-review">
    <h3>Xem lại câu hỏi</h3>
    <div id="question-review-list">
        <!-- Question review will be dynamically generated -->
    </div>
</div>

<!-- SAU -->
<div class="question-review">
    <h3>Xem lại câu hỏi</h3>
    <div style="overflow-x: auto;">
        <table class="answer-details-table">
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Câu hỏi</th>
                    <th>Đáp án đúng</th>
                    <th>Câu trả lời</th>
                    <th>Kết quả</th>
                    <th>Thao tác</th>
                </tr>
            </thead>
            <tbody id="question-review-list">
                <!-- Question review will be dynamically generated -->
            </tbody>
        </table>
    </div>
</div>
```

#### B. Thêm CSS (public/css/history.css)

**Style cho bảng:**
```css
.answer-details-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    background: white;
    border-radius: 8px;
    overflow: hidden;
}

.answer-details-table thead {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: white;
}

.answer-details-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.answer-details-table td {
    padding: 1rem;
    border-bottom: 1px solid rgba(220, 38, 127, 0.1);
    vertical-align: top;
}

.answer-details-table tbody tr:hover {
    background: rgba(220, 38, 127, 0.02);
}

.answer-details-table .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.answer-details-table .badge-success {
    background: #10b981;
    color: white;
}

.answer-details-table .badge-danger {
    background: #dc2626;
    color: white;
}

.answer-details-table .btn-report-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.answer-details-table .btn-report-small:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}
```

#### C. Cập nhật JavaScript (public/js/history.js)

**Render dạng table rows:**
```javascript
// Hiển thị danh sách câu hỏi dạng bảng
const questionList = document.getElementById('question-review-list');
questionList.innerHTML = '';

if (details.answers && details.answers.length > 0) {
    const rows = details.answers.map((answer, index) => {
        const resultBadge = answer.isCorrect 
            ? '<span class="badge badge-success">✅ Đúng</span>' 
            : '<span class="badge badge-danger">❌ Sai</span>';
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${answer.questionText || ''}</td>
                <td>${answer.correctAnswer || ''}</td>
                <td>${answer.userAnswer || '<em style="color: #9ca3af;">Không trả lời</em>'}</td>
                <td>${resultBadge}</td>
                <td>
                    <button class="btn-report-small" onclick="reportQuestion(${answer.questionId}, '${answer.questionText}', '${answer.correctAnswer}', '${answer.userAnswer}', '${details.gameMode}')">
                        <i class="fas fa-flag"></i> Báo lỗi
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    questionList.innerHTML = rows;
} else {
    questionList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #9ca3af; padding: 2rem;">Không có dữ liệu câu hỏi.</td></tr>';
}
```

**Global function cho onclick:**
```javascript
// Báo lỗi câu hỏi (global function)
window.reportQuestion = async function(questionId, questionText, correctAnswer, userAnswer, gameMode) {
    const reportText = prompt('Vui lòng mô tả lỗi bạn tìm thấy:');
    
    if (!reportText || reportText.trim() === '') {
        return;
    }
    
    try {
        const endpoint = gameMode === 'tangtoc' ? '/api/tangtoc-report-question' : '/api/report-question';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                questionId: questionId,
                questionText: questionText,
                correctAnswer: correctAnswer,
                userAnswer: userAnswer || '',
                reportText: reportText.trim(),
                mode: 'solo'
            })
        });
        
        if (!response.ok) {
            throw new Error('Không thể gửi báo cáo');
        }
        
        alert('Cảm ơn bạn đã báo cáo! Chúng tôi sẽ xem xét và xử lý sớm nhất.');
    } catch (error) {
        console.error('Lỗi khi báo cáo câu hỏi:', error);
        alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại sau.');
    }
}
```

---

## ✅ 2. Sắp xếp trận đấu theo thứ tự mới nhất

### Vấn đề trước đây:
- ⚠️ Có thể sắp xếp ngược (cũ lên đầu)

### Giải pháp:

#### Database Query (db/game-sessions.js)

**getUserGameHistory - Đã có ORDER BY DESC:**
```javascript
async function getUserGameHistory(userId, limit = 10) {
  try {
    const [rows] = await pool.query(
      `SELECT gs.*, r.name as room_name, r.code as room_code
       FROM game_sessions gs
       LEFT JOIN rooms r ON gs.room_id = r.id
       WHERE gs.user_id = ?
       ORDER BY gs.started_at DESC  -- Mới nhất lên đầu
       LIMIT ?`,
      [userId, limit]
    );
    
    return rows.map(row => ({
      id: row.id,
      isSolo: row.is_solo === 1,
      gameMode: row.game_mode || 'khoidong',
      score: row.score,
      correctAnswers: row.correct_answers,  -- ĐÃ THÊM
      totalQuestions: row.total_questions,
      roomName: row.room_name,
      roomCode: row.room_code,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    }));
  }
}
```

**getUserGameHistoryByMonth - Đã có ORDER BY DESC:**
```javascript
async function getUserGameHistoryByMonth(userId, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const [rows] = await pool.query(
      `SELECT gs.*, r.name as room_name, r.code as room_code
       FROM game_sessions gs
       LEFT JOIN rooms r ON gs.room_id = r.id
       WHERE gs.user_id = ? 
       AND gs.started_at >= ? 
       AND gs.started_at <= ?
       ORDER BY gs.started_at DESC`,  -- Mới nhất lên đầu
      [userId, startDate, endDate]
    );
    
    return rows.map(row => ({ ... }));
  }
}
```

---

## 📊 Kết quả

### Trước:
```
┌─────────────────────────────────┐
│ Chi tiết trận đấu               │
├─────────────────────────────────┤
│ Câu 1: ...                      │
│ Đáp án đúng: A                  │
│ Đáp án của bạn: B               │
│ Kết quả: ❌ Sai                 │
│ [Báo lỗi câu hỏi]               │
├─────────────────────────────────┤
│ Câu 2: ...                      │
│ ...                             │
└─────────────────────────────────┘
```

### Sau:
```
┌────────────────────────────────────────────────────────────────────┐
│ Chi tiết trận đấu                                                  │
├────┬──────────┬────────────┬─────────────┬─────────┬─────────────┤
│STT │ Câu hỏi  │ Đáp án đúng│ Câu trả lời │ Kết quả │ Thao tác    │
├────┼──────────┼────────────┼─────────────┼─────────┼─────────────┤
│ 1  │ ...      │ A          │ B           │ ❌ Sai  │ [Báo lỗi]   │
│ 2  │ ...      │ C          │ C           │ ✅ Đúng │ [Báo lỗi]   │
│ 3  │ ...      │ B          │ -           │ ❌ Sai  │ [Báo lỗi]   │
└────┴──────────┴────────────┴─────────────┴─────────┴─────────────┘
```

---

## 📁 Files Modified

1. ✅ **views/history.html** - Thay div thành table structure
2. ✅ **public/css/history.css** - Thêm styles cho table
3. ✅ **public/js/history.js** - Render table rows + global reportQuestion
4. ✅ **db/game-sessions.js** - Thêm correctAnswers field

---

## 🧪 Testing

### Test hiển thị câu hỏi:
1. Đăng nhập
2. Vào http://localhost:2701/history
3. Click "Chi tiết" một trận đấu
4. Kiểm tra:
   - ✅ Hiển thị dạng bảng
   - ✅ Có đầy đủ 6 cột
   - ✅ Badge màu xanh (đúng) / đỏ (sai)
   - ✅ Nút "Báo lỗi" hoạt động
   - ✅ Scroll được khi nhiều câu hỏi

### Test sắp xếp:
1. Vào http://localhost:2701/history
2. Kiểm tra danh sách trận đấu
3. Xác nhận:
   - ✅ Trận mới nhất ở trên cùng
   - ✅ Trận cũ hơn ở dưới
   - ✅ Thời gian giảm dần từ trên xuống

---

## ✅ Checklist

- [x] HTML structure dạng table
- [x] CSS styles cho table
- [x] JavaScript render table rows
- [x] Global reportQuestion function
- [x] Badge cho kết quả đúng/sai
- [x] Nút báo lỗi cho từng câu
- [x] ORDER BY started_at DESC
- [x] Thêm correctAnswers field
- [x] Responsive table (overflow-x: auto)
- [x] Hover effects
- [x] Empty state message

---

## 🎉 Hoàn thành!

Giờ đây trang lịch sử có:
- 📊 **Bảng câu hỏi** đẹp, dễ đọc, giống admin panel
- 🔝 **Sắp xếp** trận đấu mới nhất lên đầu
- 🚩 **Báo lỗi** từng câu hỏi ngay trong bảng
- ✅ **Badge** màu sắc rõ ràng cho kết quả
- 📱 **Responsive** với scroll ngang khi cần

