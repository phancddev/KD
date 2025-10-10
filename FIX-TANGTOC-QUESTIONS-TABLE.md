# Fix: Lỗi bảng tangtoc_questions không tồn tại

**Date:** 2025-10-10  
**Version:** 1.2.5  
**Type:** Bug Fix

## 🐛 Vấn đề

Khi xem chi tiết phiên chơi (game session details), hệ thống báo lỗi:

```
Error: Table 'nqd_database.tangtoc_questions' doesn't exist
```

**Stack trace:**
```javascript
at getGameSessionDetails (file:///app/db/game-sessions.js:112:33)
at async file:///app/routes/admin-api.js:946:25

sql: 'SELECT ua.*,
        COALESCE(tq.text, q.text) as question_text,
        COALESCE(tq.answer, q.answer) as answer
      FROM user_answers ua
      LEFT JOIN tangtoc_questions tq ON ua.question_id = tq.id
      LEFT JOIN questions q ON ua.question_id = q.id
      WHERE ua.session_id = 5656
      ORDER BY ua.answered_at'
```

## 🔍 Nguyên nhân

### 1. Thiết kế database thực tế

Hệ thống **KHÔNG có** bảng `tangtoc_questions` riêng. Tất cả câu hỏi (cả Khởi Động và Tăng Tốc) đều lưu trong bảng `questions` với cột `category`:

```sql
CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  category ENUM('khoidong', 'vuotchuongngaivat', 'tangtoc', 'vedich') DEFAULT 'khoidong',
  question_number INT NULL,  -- Chỉ dùng cho Tăng Tốc (1,2,3,4)
  image_url TEXT NULL,
  time_limit INT NULL,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Phân biệt:**
- Câu hỏi Khởi Động: `category = 'khoidong'`
- Câu hỏi Tăng Tốc: `category = 'tangtoc'`

### 2. Code sai trong `db/game-sessions.js`

Hàm `getGameSessionDetails()` đang cố JOIN với bảng `tangtoc_questions` không tồn tại:

```javascript
// Line 111-122 (SAI)
if (gameMode === 'tangtoc') {
  [answerRows] = await pool.query(
    `SELECT ua.*,
            COALESCE(tq.text, q.text) as question_text,
            COALESCE(tq.answer, q.answer) as answer
     FROM user_answers ua
     LEFT JOIN tangtoc_questions tq ON ua.question_id = tq.id  // ❌ Bảng không tồn tại
     LEFT JOIN questions q ON ua.question_id = q.id
     WHERE ua.session_id = ?
     ORDER BY ua.answered_at`,
    [sessionId]
  );
}
```

### 3. File `check-database.js` cũng sai

```javascript
// Line 18-22 (SAI)
// Bảng Tăng Tốc
'tangtoc_questions',      // ❌ Không tồn tại
'tangtoc_game_history',   // ❌ Không tồn tại
'tangtoc_reports',        // ❌ Không tồn tại
'tangtoc_question_logs',  // ❌ Không tồn tại
```

## ✅ Giải pháp

### 1. Sửa query trong `db/game-sessions.js`

**File:** `db/game-sessions.js` (Line 108-118)

**Trước:**
```javascript
// Lấy chi tiết các câu trả lời
// Nếu là Tăng Tốc, JOIN với tangtoc_questions, nếu không thì JOIN với questions
let answerRows;
if (gameMode === 'tangtoc') {
  [answerRows] = await pool.query(
    `SELECT ua.*,
            COALESCE(tq.text, q.text) as question_text,
            COALESCE(tq.answer, q.answer) as answer
     FROM user_answers ua
     LEFT JOIN tangtoc_questions tq ON ua.question_id = tq.id
     LEFT JOIN questions q ON ua.question_id = q.id
     WHERE ua.session_id = ?
     ORDER BY ua.answered_at`,
    [sessionId]
  );
} else {
  [answerRows] = await pool.query(
    `SELECT ua.*, q.text as question_text, q.answer
     FROM user_answers ua
     JOIN questions q ON ua.question_id = q.id
     WHERE ua.session_id = ?
     ORDER BY ua.answered_at`,
    [sessionId]
  );
}
```

**Sau:**
```javascript
// Lấy chi tiết các câu trả lời
// Tất cả câu hỏi (cả Khởi Động và Tăng Tốc) đều lưu trong bảng questions
// Phân biệt bằng cột category: 'khoidong' hoặc 'tangtoc'
const [answerRows] = await pool.query(
  `SELECT ua.*, q.text as question_text, q.answer, q.category
   FROM user_answers ua
   JOIN questions q ON ua.question_id = q.id
   WHERE ua.session_id = ?
   ORDER BY ua.answered_at`,
  [sessionId]
);
```

### 2. Sửa danh sách bảng trong `check-database.js`

**File:** `check-database.js` (Line 8-43)

**Trước:**
```javascript
const REQUIRED_TABLES = [
  // Bảng cơ bản
  'users',
  'questions',
  'game_history',
  'reports',
  'login_logs',
  'question_logs',
  
  // Bảng Tăng Tốc
  'tangtoc_questions',      // ❌ Không tồn tại
  'tangtoc_game_history',   // ❌ Không tồn tại
  'tangtoc_reports',        // ❌ Không tồn tại
  'tangtoc_question_logs',  // ❌ Không tồn tại
  'tangtoc_question_deletion_logs',
  ...
];
```

**Sau:**
```javascript
const REQUIRED_TABLES = [
  // Bảng cơ bản
  'users',
  'questions',  // Lưu cả câu hỏi Khởi Động và Tăng Tốc (phân biệt bằng category)
  'game_sessions',  // Lưu lịch sử game (cả Khởi Động và Tăng Tốc)
  'user_answers',
  'rooms',
  'room_participants',
  'answers',  // Đáp án bổ sung cho questions
  'question_reports',
  'answer_suggestions',
  'answer_suggestion_logs',
  'question_deletion_logs',
  'deleted_question_answers',
  'login_logs',
  'ip_geolocation',
  
  // Bảng Tăng Tốc (riêng cho reports và logs)
  'tangtoc_answers',  // Đáp án bổ sung riêng cho Tăng Tốc
  'tangtoc_question_reports',
  'tangtoc_answer_suggestions',
  'tangtoc_answer_suggestion_logs',
  'tangtoc_question_deletion_logs',
  'deleted_tangtoc_question_answers',
  
  // Bảng Data Nodes & Matches
  'data_nodes',
  'matches',
  ...
];
```

## 📊 Cấu trúc Database thực tế

### Bảng chính

1. **questions** - Lưu TẤT CẢ câu hỏi
   - Khởi Động: `category = 'khoidong'`
   - Tăng Tốc: `category = 'tangtoc'` + `question_number` (1-4)
   - Vượt Chướng Ngại Vật: `category = 'vuotchuongngaivat'`
   - Về Đích: `category = 'vedich'`

2. **game_sessions** - Lưu TẤT CẢ lịch sử game
   - Khởi Động: `game_mode = 'khoidong'`
   - Tăng Tốc: `game_mode = 'tangtoc'`

3. **user_answers** - Lưu câu trả lời của user
   - `question_id` → JOIN với `questions.id`

### Bảng phụ cho Tăng Tốc

Chỉ có các bảng **reports và logs** riêng cho Tăng Tốc:

- `tangtoc_answers` - Đáp án bổ sung riêng
- `tangtoc_question_reports` - Báo lỗi câu hỏi
- `tangtoc_answer_suggestions` - Đề xuất đáp án
- `tangtoc_answer_suggestion_logs` - Log xử lý đề xuất
- `tangtoc_question_deletion_logs` - Log xóa câu hỏi
- `deleted_tangtoc_question_answers` - Đáp án đã xóa

## 📝 Files Changed

### Modified

1. **db/game-sessions.js**
   - Line 108-118: Sửa query `getGameSessionDetails()`
   - Bỏ JOIN với `tangtoc_questions`
   - Chỉ JOIN với `questions`

2. **check-database.js**
   - Line 8-43: Cập nhật danh sách bảng cần thiết
   - Bỏ các bảng không tồn tại
   - Thêm các bảng thực tế

### Created

3. **FIX-TANGTOC-QUESTIONS-TABLE.md** (file này)
   - Tài liệu chi tiết về vấn đề và giải pháp

## 🧪 Kiểm tra

### 1. Kiểm tra bảng questions

```sql
-- Xem cấu trúc bảng
DESCRIBE questions;

-- Đếm câu hỏi theo category
SELECT category, COUNT(*) as count
FROM questions
GROUP BY category;
```

### 2. Kiểm tra game_sessions

```sql
-- Xem cấu trúc bảng
DESCRIBE game_sessions;

-- Đếm game theo mode
SELECT game_mode, COUNT(*) as count
FROM game_sessions
GROUP BY game_mode;
```

### 3. Test query chi tiết phiên chơi

```sql
-- Test query mới
SELECT ua.*, q.text as question_text, q.answer, q.category
FROM user_answers ua
JOIN questions q ON ua.question_id = q.id
WHERE ua.session_id = 5656
ORDER BY ua.answered_at;
```

## 🎉 Kết quả

- ✅ Query không còn lỗi `tangtoc_questions doesn't exist`
- ✅ Chi tiết phiên chơi hiển thị đúng
- ✅ Cả Khởi Động và Tăng Tốc đều hoạt động
- ✅ Không cần tạo bảng mới
- ✅ Không cần migration database

## 🔗 Related

- Issue: Table 'tangtoc_questions' doesn't exist
- Root Cause: Code JOIN với bảng không tồn tại
- Solution: Sửa query JOIN với bảng `questions`
- Impact: Chi tiết phiên chơi (admin và user)

