# Cải Tiến Chức Năng Báo Lỗi Trong History.html

## 📋 Tổng Quan

Cải thiện chức năng báo lỗi câu hỏi trong trang lịch sử trận đấu (`history.html`) để:
1. Sử dụng modal đẹp thay vì `prompt()` đơn giản
2. Hỗ trợ đề xuất đáp án như trong các chế độ chơi
3. Tự động điều hướng đúng endpoint dựa trên game mode (Khởi Động hoặc Tăng Tốc)

## 🎯 Yêu Cầu

### 1. Giao Diện Báo Lỗi
- ✅ Modal đẹp với animation
- ✅ Hiển thị câu hỏi đang báo lỗi
- ✅ Cho phép thêm nhiều đáp án đề xuất
- ✅ Textarea để mô tả chi tiết lỗi
- ✅ Nút Hủy và Gửi báo lỗi

### 2. Logic Xử Lý
- ✅ Phát hiện game mode từ dữ liệu trận đấu
- ✅ Gửi đến đúng endpoint:
  - Khởi Động → `/api/report-question`
  - Tăng Tốc → `/api/tangtoc-report-question`
- ✅ Bao gồm suggestions (đáp án đề xuất)
- ✅ Validation: yêu cầu ít nhất mô tả hoặc 1 đáp án đề xuất

## 📝 Các Thay Đổi

### 1. File: `views/history.html`

**Thêm Report Modal** (sau Game Details Modal):

```html
<!-- Report modal with answer suggestions -->
<div id="report-modal" class="report-modal">
    <div class="content">
        <h3>Báo lỗi câu hỏi/đáp án</h3>
        <p id="report-question-text" style="margin: 8px 0; color:#374151"></p>
        <div style="margin:8px 0;">
          <label style="font-weight:600; color:#374151; display:block; margin-bottom:6px;">Đáp án đề xuất:</label>
          <div id="suggestions-wrap"></div>
          <button id="add-suggestion" class="btn btn-outline" style="margin-top:6px;">+ Thêm đáp án đề xuất</button>
        </div>
        <textarea id="report-text" placeholder="Mô tả thêm (ví dụ: vì sao đáp án này đúng...)"></textarea>
        <div class="actions">
            <button id="report-cancel" class="btn btn-secondary">Hủy</button>
            <button id="report-submit" class="btn btn-primary">Gửi báo lỗi</button>
        </div>
    </div>
</div>
```

### 2. File: `public/css/history.css`

**Thêm CSS cho Report Modal**:

```css
/* Report Modal Styles */
.report-modal {
    display: none;
    position: fixed;
    z-index: 2000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    align-items: center;
    justify-content: center;
}

.report-modal .content {
    background: white;
    margin: auto;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(220, 38, 127, 0.3);
    width: 90%;
    max-width: 500px;
    position: relative;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ... và các styles khác cho buttons, textarea, responsive */
```

### 3. File: `public/js/history.js`

**Thay thế hàm `reportQuestion` cũ** bằng logic modal mới:

```javascript
// Report Modal Logic
(function() {
    const modal = document.getElementById('report-modal');
    const questionEl = document.getElementById('report-question-text');
    const textEl = document.getElementById('report-text');
    const suggestionsWrap = document.getElementById('suggestions-wrap');
    const btnAdd = document.getElementById('add-suggestion');
    const btnCancel = document.getElementById('report-cancel');
    const btnSubmit = document.getElementById('report-submit');
    let currentReportPayload = null;

    function addSuggestionRow(value = '') {
        // Tạo input field cho đáp án đề xuất
        // ...
    }

    // Open modal function
    window.reportQuestion = function(questionId, questionText, correctAnswer, userAnswer, gameMode) {
        currentReportPayload = {
            questionId: questionId,
            questionText: questionText,
            correctAnswer: correctAnswer,
            userAnswer: userAnswer || '',
            gameMode: gameMode,
            mode: 'solo'
        };
        
        questionEl.textContent = `Câu hỏi: ${questionText}`;
        textEl.value = '';
        suggestionsWrap.innerHTML = '';
        addSuggestionRow('');
        modal.style.display = 'flex';
    };

    // Submit button
    btnSubmit.addEventListener('click', async () => {
        const reportText = textEl.value.trim();
        const suggestions = Array.from(suggestionsWrap.querySelectorAll('input'))
            .map(i => i.value.trim())
            .filter(Boolean);

        if (!reportText && suggestions.length === 0) {
            alert('Vui lòng nhập mô tả hoặc thêm ít nhất 1 đáp án đề xuất');
            return;
        }

        try {
            // Xác định endpoint dựa trên game mode
            const endpoint = currentReportPayload.gameMode === 'tangtoc' 
                ? '/api/tangtoc-report-question' 
                : '/api/report-question';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    questionId: currentReportPayload.questionId,
                    questionText: currentReportPayload.questionText,
                    correctAnswer: currentReportPayload.correctAnswer,
                    userAnswer: currentReportPayload.userAnswer,
                    reportText: reportText,
                    suggestions: suggestions,
                    mode: currentReportPayload.mode
                })
            });

            if (!response.ok) {
                throw new Error('Submit failed');
            }

            alert('Đã gửi báo lỗi. Cảm ơn bạn!');
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Không thể gửi báo lỗi, thử lại sau: ' + error.message);
        }
    });
})();
```

## 🔄 Luồng Hoạt Động

### Khi Người Dùng Báo Lỗi:

1. **Xem lịch sử** → Click "Chi tiết" trận đấu
2. **Trong modal chi tiết** → Click "Báo lỗi" ở câu hỏi cụ thể
3. **Modal báo lỗi hiện ra** với:
   - Câu hỏi đang báo lỗi
   - Ô nhập đáp án đề xuất (có thể thêm nhiều)
   - Textarea mô tả lỗi
4. **Nhập thông tin** → Click "Gửi báo lỗi"
5. **Hệ thống tự động**:
   - Phát hiện game mode từ `details.gameMode`
   - Gửi đến endpoint phù hợp:
     - `gameMode === 'tangtoc'` → `/api/tangtoc-report-question`
     - `gameMode === 'khoidong'` → `/api/report-question`
   - Bao gồm tất cả thông tin: questionId, questionText, correctAnswer, userAnswer, reportText, suggestions

## 🎨 Tính Năng Nổi Bật

### 1. Giao Diện Đẹp
- Modal với animation slide-in
- Backdrop blur effect
- Gradient buttons với hover effects
- Responsive design cho mobile

### 2. Đề Xuất Đáp Án
- Thêm/xóa nhiều đáp án đề xuất
- Validation: yêu cầu ít nhất mô tả hoặc 1 đề xuất
- Tự động filter các input rỗng

### 3. Tự Động Routing
- Phát hiện game mode từ dữ liệu
- Gửi đến đúng endpoint
- Không cần người dùng chọn chế độ

## 🧪 Testing

### Test Case 1: Báo Lỗi Khởi Động
1. Chơi trận Khởi Động (solo hoặc room)
2. Vào History → Chi tiết trận đấu
3. Click "Báo lỗi" ở một câu hỏi
4. Nhập mô tả và đề xuất
5. Gửi báo lỗi
6. **Kỳ vọng**: Gửi đến `/api/report-question`

### Test Case 2: Báo Lỗi Tăng Tốc
1. Chơi trận Tăng Tốc (solo hoặc room)
2. Vào History → Chi tiết trận đấu
3. Click "Báo lỗi" ở một câu hỏi
4. Nhập mô tả và đề xuất
5. Gửi báo lỗi
6. **Kỳ vọng**: Gửi đến `/api/tangtoc-report-question`

### Test Case 3: Validation
1. Mở modal báo lỗi
2. Không nhập gì
3. Click "Gửi báo lỗi"
4. **Kỳ vọng**: Alert "Vui lòng nhập mô tả hoặc thêm ít nhất 1 đáp án đề xuất"

### Test Case 4: Đề Xuất Nhiều Đáp Án
1. Mở modal báo lỗi
2. Click "+ Thêm đáp án đề xuất" nhiều lần
3. Nhập các đáp án khác nhau
4. Gửi báo lỗi
5. **Kỳ vọng**: Tất cả đáp án được gửi trong array `suggestions`

## 📊 So Sánh Trước/Sau

### Trước:
- ❌ Dùng `prompt()` đơn giản
- ❌ Không có đề xuất đáp án
- ❌ Giao diện xấu, không thân thiện
- ❌ Chỉ có mô tả text

### Sau:
- ✅ Modal đẹp với animation
- ✅ Hỗ trợ đề xuất nhiều đáp án
- ✅ Giao diện hiện đại, responsive
- ✅ Tự động routing theo game mode
- ✅ Validation đầy đủ

## 🔗 Tham Khảo

Cơ chế báo lỗi tham khảo từ:
- `views/solo-battle.html` (Khởi Động)
- `views/tangTocKD/solo-battle-tangtoc.html` (Tăng Tốc)

Endpoints:
- `/api/report-question` - Báo lỗi Khởi Động
- `/api/tangtoc-report-question` - Báo lỗi Tăng Tốc

## ✅ Checklist

- [x] Thêm modal HTML vào history.html
- [x] Thêm CSS cho modal
- [x] Cập nhật logic JavaScript
- [x] Hỗ trợ đề xuất đáp án
- [x] Tự động routing theo game mode
- [x] Validation input
- [x] Responsive design
- [x] Error handling
- [x] Console logging cho debug

## 🎉 Kết Quả

Người dùng giờ có thể báo lỗi câu hỏi từ lịch sử trận đấu với:
- Giao diện đẹp, chuyên nghiệp
- Khả năng đề xuất nhiều đáp án
- Tự động gửi đến đúng chế độ (Khởi Động/Tăng Tốc)
- Trải nghiệm nhất quán với các chế độ chơi

