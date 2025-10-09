# TÍNH NĂNG: HỖ TRỢ NHIỀU ĐÁP ÁN CHO CÂU HỎI

**Ngày:** 2025-10-09  
**Phiên bản:** 2.2.0  
**Trạng thái:** ✅ HOÀN THÀNH

---

## 📋 MÔ TẢ

Nâng cấp hệ thống để cho phép nhập nhiều đáp án cho mỗi câu hỏi. Khi thí sinh nhập một trong những đáp án đó thì hệ thống sẽ chấp nhận là đúng.

### Ví dụ:
- **Câu hỏi:** "Thủ đô của Việt Nam?"
- **Đáp án chính:** "Hà Nội"
- **Đáp án bổ sung:** 
  - "Ha Noi"
  - "Hanoi"
  - "HN"

Khi thí sinh nhập bất kỳ đáp án nào trong số trên, hệ thống sẽ chấm là đúng.

---

## 🔧 CÁC THAY ĐỔI

### 1. **Giao diện Admin (Frontend)**

#### File: `KD/views/admin/match-questions.html`
- ✅ Thêm phần UI để nhập nhiều đáp án bổ sung
- ✅ Thêm CSS cho danh sách đáp án bổ sung
- ✅ Hiển thị danh sách đáp án với nút xóa từng đáp án

**Các trường mới:**
```html
<!-- Đáp án chính -->
<input type="text" id="answerText" placeholder="Nhập đáp án chính..." required>

<!-- Đáp án bổ sung -->
<div id="acceptedAnswersList"></div>
<input type="text" id="newAcceptedAnswer" placeholder="Nhập đáp án bổ sung...">
<button onclick="addAcceptedAnswer()">Thêm</button>
```

#### File: `KD/public/js/match-questions.js`
- ✅ Thêm biến `acceptedAnswers = []` để lưu danh sách đáp án bổ sung
- ✅ Thêm hàm `addAcceptedAnswer()` - Thêm đáp án vào danh sách
- ✅ Thêm hàm `removeAcceptedAnswer(index)` - Xóa đáp án khỏi danh sách
- ✅ Thêm hàm `renderAcceptedAnswers()` - Hiển thị danh sách đáp án
- ✅ Cập nhật `saveQuestion()` để gửi `accepted_answers` lên server
- ✅ Cập nhật `editQuestion()` để load `accepted_answers` từ server
- ✅ Cập nhật `openModal()` để reset `acceptedAnswers` khi mở form mới
- ✅ Cập nhật `renderQuestionCard()` để hiển thị đáp án bổ sung trong danh sách câu hỏi

### 2. **Backend API (Host Server)**

#### File: `KD/host_dan_data-node/routes/match-question-api.js`
- ✅ Cập nhật API `POST /api/matches/questions` để nhận `accepted_answers`
- ✅ Cập nhật API `PUT /api/matches/:matchId/questions/update` để nhận `accepted_answers`
- ✅ Truyền `acceptedAnswers` xuống Data Node khi thêm/sửa câu hỏi

**Thay đổi:**
```javascript
const question = await addQuestionToDataNode(dataNodeId, matchId, {
  // ... các field khác
  answer: questionData.answer_text,
  acceptedAnswers: questionData.accepted_answers || null, // ← MỚI
  points: questionData.points || 10,
  timeLimit: questionData.time_limit || null
});
```

### 3. **Data Node (Match Manager)**

#### File: `dan_data-node/match-manager.js`

**Hàm `addQuestion()`:**
- ✅ Nhận `acceptedAnswers` từ `questionData`
- ✅ Thêm `accepted_answers` vào question object nếu có

```javascript
const question = {
  order: parseInt(order),
  type: type,
  question_text: questionText || null,
  answer: answer,
  points: points || 10,
  time_limit: timeLimit || null
};

// Thêm accepted_answers nếu có
if (acceptedAnswers && Array.isArray(acceptedAnswers) && acceptedAnswers.length > 0) {
  question.accepted_answers = acceptedAnswers;
}
```

**Hàm `updateQuestion()`:**
- ✅ Cập nhật `accepted_answers` khi sửa câu hỏi
- ✅ Xóa `accepted_answers` nếu không còn đáp án bổ sung

```javascript
// Cập nhật accepted_answers
if (questionData.accepted_answers !== undefined) {
  if (questionData.accepted_answers && Array.isArray(questionData.accepted_answers) && questionData.accepted_answers.length > 0) {
    updatedQuestion.accepted_answers = questionData.accepted_answers;
  } else {
    delete updatedQuestion.accepted_answers;
  }
}
```

### 4. **Cấu trúc dữ liệu match.json**

**Trước:**
```json
{
  "order": 0,
  "type": "text",
  "question_text": "Thủ đô của Việt Nam?",
  "answer": "Hà Nội",
  "points": 10,
  "time_limit": null
}
```

**Sau:**
```json
{
  "order": 0,
  "type": "text",
  "question_text": "Thủ đô của Việt Nam?",
  "answer": "Hà Nội",
  "accepted_answers": ["Ha Noi", "Hanoi", "HN"],
  "points": 10,
  "time_limit": null
}
```

---

## ✅ LOGIC CHẤM ĐIỂM (ĐÃ CÓ SẴN)

Logic chấm điểm đã được implement sẵn trong các file sau và **KHÔNG CẦN THAY ĐỔI**:

### 1. Solo Battle
**File:** `KD/public/js/solo-battle.js`
```javascript
function checkAnswer(userAnswer, correctAnswer, acceptedAnswers = []) {
  const ua = normalize(userAnswer);
  const ca = normalize(correctAnswer);
  
  // Kiểm tra với đáp án chính
  if (ua === ca) return true;
  
  // Kiểm tra với các đáp án bổ sung
  if (Array.isArray(acceptedAnswers)) {
    for (const a of acceptedAnswers) {
      const answerText = typeof a === 'string' ? a : (a && a.answer ? a.answer : '');
      if (normalize(answerText) === ua) return true;
    }
  }
  
  return false;
}
```

### 2. Room Battle
**File:** `KD/public/js/room-battle.js`
```javascript
function checkAnswer(userAnswer, correctAnswer, acceptedAnswers = []) {
  // Tương tự như solo-battle.js
}
```

### 3. Tăng Tốc KD (Solo)
**File:** `KD/views/tangTocKD/solo-battle-tangtoc.js`
```javascript
checkAnswer(userAnswer, correctAnswer, acceptedAnswers = []) {
  // Tương tự
}
```

### 4. Tăng Tốc KD (Room)
**File:** `KD/socket/kdtangtoc.js`
```javascript
function isAnswerCorrect(userAnswer, question){
  const u = normalizeText(userAnswer);
  if (u === normalizeText(question.answer)) return true;
  const acc = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
  for (const a of acc){
    const txt = typeof a === 'string' ? a : (a && a.answer ? a.answer : '');
    if (u === normalizeText(txt)) return true;
  }
  return false;
}
```

---

## 🧪 HƯỚNG DẪN TEST

### Bước 1: Khởi động hệ thống
```bash
# Terminal 1: Data Node
cd dan_data-node
npm start

# Terminal 2: Host Server
cd KD/host_dan_data-node
npm start
```

### Bước 2: Thêm câu hỏi với nhiều đáp án

1. Truy cập: `http://localhost:3000/admin/match-questions?matchId=YOUR_MATCH_ID`
2. Click "Thêm câu hỏi" cho một section
3. Nhập:
   - **Câu hỏi:** "Thủ đô của Việt Nam?"
   - **Đáp án chính:** "Hà Nội"
   - **Đáp án bổ sung:**
     - Nhập "Ha Noi" → Click "Thêm"
     - Nhập "Hanoi" → Click "Thêm"
     - Nhập "HN" → Click "Thêm"
4. Click "Lưu"

### Bước 3: Kiểm tra hiển thị

Sau khi lưu, câu hỏi sẽ hiển thị:
```
Câu 1
Câu hỏi: Thủ đô của Việt Nam?
Đáp án: Hà Nội
Đáp án bổ sung: [Ha Noi] [Hanoi] [HN]
```

### Bước 4: Test chấm điểm

1. Vào chế độ chơi (Solo hoặc Room Battle)
2. Khi gặp câu hỏi "Thủ đô của Việt Nam?", thử nhập:
   - ✅ "Hà Nội" → Đúng
   - ✅ "Ha Noi" → Đúng
   - ✅ "Hanoi" → Đúng
   - ✅ "HN" → Đúng
   - ✅ "hà nội" (chữ thường) → Đúng
   - ✅ "  Hà Nội  " (có khoảng trắng) → Đúng
   - ❌ "Ha Noi City" → Sai

### Bước 5: Test sửa câu hỏi

1. Click "Sửa" trên câu hỏi vừa tạo
2. Kiểm tra danh sách đáp án bổ sung hiển thị đúng
3. Thử xóa một đáp án bổ sung
4. Thử thêm đáp án bổ sung mới
5. Click "Lưu" và kiểm tra

---

## 📊 KẾT QUẢ MONG ĐỢI

✅ Có thể thêm nhiều đáp án cho mỗi câu hỏi  
✅ Đáp án bổ sung hiển thị trong danh sách câu hỏi  
✅ Có thể sửa/xóa đáp án bổ sung  
✅ Logic chấm điểm chấp nhận tất cả đáp án (chính + bổ sung)  
✅ So sánh không phân biệt hoa thường  
✅ Tự động trim khoảng trắng thừa  
✅ Dữ liệu lưu đúng vào match.json  

---

## 🔍 TROUBLESHOOTING

### Lỗi: Không thấy phần nhập đáp án bổ sung
- **Nguyên nhân:** Cache trình duyệt
- **Giải pháp:** Hard refresh (Ctrl+Shift+R hoặc Cmd+Shift+R)

### Lỗi: Đáp án bổ sung không được lưu
- **Kiểm tra:** Console log trong `saveQuestion()`
- **Kiểm tra:** File match.json trên Data Node
- **Giải pháp:** Xem log server để debug

### Lỗi: Chấm điểm không đúng
- **Kiểm tra:** Console log trong `checkAnswer()`
- **Kiểm tra:** Dữ liệu `acceptedAnswers` có được truyền đúng không
- **Giải pháp:** Xem log client-side

---

## 📝 GHI CHÚ

- Đáp án chính vẫn là đáp án hiển thị cho thí sinh
- Đáp án bổ sung chỉ dùng để hệ thống chấm điểm
- Tất cả đáp án đều được chuẩn hóa (lowercase, trim) trước khi so sánh
- Có thể để trống đáp án bổ sung (không bắt buộc)
- Không giới hạn số lượng đáp án bổ sung

---

## 🎯 TƯƠNG LAI

Có thể mở rộng thêm:
- [ ] Import đáp án bổ sung từ file Excel
- [ ] Gợi ý đáp án bổ sung tự động dựa trên AI
- [ ] Thống kê đáp án nào được sử dụng nhiều nhất
- [ ] Hỗ trợ regex pattern cho đáp án

---

**Hoàn thành bởi:** AI Assistant  
**Ngày:** 2025-10-09

