# TÍNH NĂNG: HỖ TRỢ NHIỀU ĐÁP ÁN TRONG MATCH-UPLOAD

**Ngày:** 2025-10-09  
**Phiên bản:** 2.2.1  
**Trạng thái:** ✅ HOÀN THÀNH

---

## 📋 MÔ TẢ

Nâng cấp trang **Match Upload** (`/admin/match-upload`) để hỗ trợ nhập nhiều đáp án cho mỗi câu hỏi, tương tự như trang Match Questions.

### Trước đây:
- Chỉ có 1 ô nhập đáp án duy nhất
- Không thể thêm đáp án bổ sung

### Bây giờ:
- Có ô nhập "Đáp án chính"
- Có phần "Các đáp án chấp nhận khác" với khả năng:
  - Thêm nhiều đáp án bổ sung
  - Xóa từng đáp án bổ sung
  - Hiển thị danh sách đáp án đã thêm

---

## 🔧 CÁC THAY ĐỔI

### File: `KD/public/js/match-upload.js`

#### 1. **Thêm State quản lý accepted answers**

```javascript
// Lưu accepted answers cho từng câu hỏi
let acceptedAnswersMap = {}; // { questionId: [answer1, answer2, ...] }
```

#### 2. **Cập nhật UI cho tất cả sections**

**Trước:**
```html
<input type="text" placeholder="Đáp án" id="questionId-answer" />
```

**Sau:**
```html
<!-- Đáp án chính -->
<label>Đáp án chính:</label>
<input type="text" placeholder="Nhập đáp án chính..." id="questionId-answer" />

<!-- Đáp án bổ sung -->
<label>Các đáp án chấp nhận khác (tùy chọn):</label>
<div id="questionId-accepted-list">
  <!-- Danh sách đáp án bổ sung -->
</div>
<div style="display: flex; gap: 8px;">
  <input type="text" placeholder="Nhập đáp án bổ sung..." id="questionId-new-accepted" />
  <button onclick="addAcceptedAnswerToQuestion('questionId')">
    <i class="fas fa-plus"></i> Thêm
  </button>
</div>
<small>Đáp án hiển thị vẫn là "Đáp án chính" ở trên...</small>
```

#### 3. **Thêm các hàm xử lý**

**Hàm `addAcceptedAnswerToQuestion(questionId)`:**
- Lấy giá trị từ input
- Kiểm tra trùng lặp
- Thêm vào `acceptedAnswersMap[questionId]`
- Render lại danh sách

**Hàm `removeAcceptedAnswerFromQuestion(questionId, index)`:**
- Xóa đáp án tại vị trí `index`
- Render lại danh sách

**Hàm `renderAcceptedAnswersForQuestion(questionId)`:**
- Hiển thị danh sách đáp án bổ sung
- Mỗi đáp án có nút xóa

#### 4. **Cập nhật hàm collect data**

**Hàm `collectQuestionData()`:**
```javascript
// Lấy accepted answers cho câu hỏi này
const acceptedAnswers = acceptedAnswersMap[questionId] || [];

return {
  // ... các field khác
  answer_text: answer,
  accepted_answers: acceptedAnswers.length > 0 ? acceptedAnswers : null,
  // ...
};
```

**Hàm `collectVCNVQuestionData()`:**
```javascript
// Lấy accepted answers cho câu hỏi này
const acceptedAnswers = acceptedAnswersMap[questionId] || [];

return {
  // ... các field khác
  answer_text: answer,
  accepted_answers: acceptedAnswers.length > 0 ? acceptedAnswers : null,
  word_count: wordCount,
  // ...
};
```

#### 5. **Expose functions to global scope**

```javascript
window.addAcceptedAnswerToQuestion = addAcceptedAnswerToQuestion;
window.removeAcceptedAnswerFromQuestion = removeAcceptedAnswerFromQuestion;
```

---

## 🎨 GIAO DIỆN

### Tất cả các sections (Khởi Động Riêng, Khởi Động Chung, Tăng Tốc, Về Đích):

```
┌─────────────────────────────────────────────────┐
│ Câu 1                                           │
├─────────────────────────────────────────────────┤
│ Câu hỏi dạng text (tùy chọn):                   │
│ [Nhập câu hỏi dạng text...                   ]  │
│                                                  │
│ Ảnh/Video (tùy chọn):                           │
│ [Kéo thả file hoặc click để chọn            ]   │
│                                                  │
│ Đáp án chính:                                   │
│ [Nhập đáp án chính...                        ]  │
│                                                  │
│ Các đáp án chấp nhận khác (tùy chọn):           │
│ ┌─────────────────────────────────────────┐    │
│ │ Chưa có đáp án bổ sung nào              │    │
│ └─────────────────────────────────────────┘    │
│ [Nhập đáp án bổ sung...        ] [+ Thêm]      │
│ Đáp án hiển thị vẫn là "Đáp án chính"...       │
└─────────────────────────────────────────────────┘
```

### Sau khi thêm đáp án bổ sung:

```
┌─────────────────────────────────────────────────┐
│ Các đáp án chấp nhận khác (tùy chọn):           │
│ ┌─────────────────────────────────────────┐    │
│ │ Ha Noi                          [X]     │    │
│ │ Hanoi                           [X]     │    │
│ │ HN                              [X]     │    │
│ └─────────────────────────────────────────┘    │
│ [Nhập đáp án bổ sung...        ] [+ Thêm]      │
└─────────────────────────────────────────────────┘
```

### VCNV (Vượt Chướng Ngại Vật):

```
┌─────────────────────────────────────────────────┐
│ Chướng ngại vật 1                               │
├─────────────────────────────────────────────────┤
│ Câu hỏi:                                        │
│ [Nhập câu hỏi...                             ]  │
│                                                  │
│ Đáp án chính:        │ Số chữ trong đáp án:    │
│ [Nhập đáp án chính]  │ [8] (Tự động)           │
│                                                  │
│ Các đáp án chấp nhận khác (tùy chọn):           │
│ ┌─────────────────────────────────────────┐    │
│ │ Chưa có đáp án bổ sung nào              │    │
│ └─────────────────────────────────────────┘    │
│ [Nhập đáp án bổ sung...        ] [+ Thêm]      │
└─────────────────────────────────────────────────┘
```

---

## 🧪 HƯỚNG DẪN TEST

### Bước 1: Truy cập trang Match Upload

```
http://localhost:3000/admin/match-upload?matchId=YOUR_MATCH_ID
```

### Bước 2: Test thêm đáp án bổ sung

1. Mở một section (ví dụ: Khởi Động Chung)
2. Tại câu hỏi bất kỳ:
   - Nhập câu hỏi: "Thủ đô của Việt Nam?"
   - Nhập đáp án chính: "Hà Nội"
   - Nhập đáp án bổ sung: "Ha Noi" → Click "Thêm"
   - Nhập đáp án bổ sung: "Hanoi" → Click "Thêm"
   - Nhập đáp án bổ sung: "HN" → Click "Thêm"

3. Kiểm tra danh sách hiển thị:
   ```
   ┌─────────────────────────────┐
   │ Ha Noi              [X]     │
   │ Hanoi               [X]     │
   │ HN                  [X]     │
   └─────────────────────────────┘
   ```

### Bước 3: Test xóa đáp án bổ sung

1. Click nút [X] bên cạnh "Hanoi"
2. Kiểm tra danh sách còn lại:
   ```
   ┌─────────────────────────────┐
   │ Ha Noi              [X]     │
   │ HN                  [X]     │
   └─────────────────────────────┘
   ```

### Bước 4: Test lưu câu hỏi

1. Click "Lưu Tất Cả Câu Hỏi"
2. Kiểm tra console log:
   ```javascript
   {
     question_text: "Thủ đô của Việt Nam?",
     answer_text: "Hà Nội",
     accepted_answers: ["Ha Noi", "HN"],
     // ...
   }
   ```

### Bước 5: Test VCNV

1. Mở section "Vượt Chướng Ngại Vật"
2. Tại chướng ngại vật 1:
   - Nhập câu hỏi: "Thủ đô của Việt Nam?"
   - Nhập đáp án chính: "Hà Nội" (số chữ tự động: 6)
   - Thêm đáp án bổ sung: "Ha Noi", "Hanoi", "HN"
3. Lưu và kiểm tra

### Bước 6: Kiểm tra dữ liệu trên Data Node

1. Truy cập file `match.json` trên Data Node
2. Kiểm tra câu hỏi vừa tạo:
   ```json
   {
     "order": 0,
     "type": "text",
     "question_text": "Thủ đô của Việt Nam?",
     "answer": "Hà Nội",
     "accepted_answers": ["Ha Noi", "HN"],
     "points": 10,
     "time_limit": null
   }
   ```

---

## ✅ KẾT QUẢ MONG ĐỢI

✅ Tất cả sections đều có phần nhập nhiều đáp án  
✅ Có thể thêm/xóa đáp án bổ sung  
✅ Danh sách đáp án hiển thị đúng  
✅ Dữ liệu `accepted_answers` được gửi lên server  
✅ Dữ liệu lưu đúng vào match.json  
✅ VCNV cũng hỗ trợ nhiều đáp án  
✅ Không ảnh hưởng đến chức năng hiện có  

---

## 🔗 LIÊN KẾT

- **Tính năng gốc:** [FEATURE-MULTIPLE-ANSWERS.md](./FEATURE-MULTIPLE-ANSWERS.md)
- **Match Questions:** `/admin/match-questions`
- **Match Upload:** `/admin/match-upload`

---

## 📝 GHI CHÚ

- Đáp án chính vẫn là đáp án hiển thị cho thí sinh
- Đáp án bổ sung chỉ dùng để hệ thống chấm điểm
- Tất cả đáp án đều được chuẩn hóa (lowercase, trim) trước khi so sánh
- Có thể để trống đáp án bổ sung (không bắt buộc)
- Không giới hạn số lượng đáp án bổ sung
- Áp dụng cho tất cả sections: Khởi Động Riêng, Khởi Động Chung, VCNV, Tăng Tốc, Về Đích

---

**Hoàn thành bởi:** AI Assistant  
**Ngày:** 2025-10-09

