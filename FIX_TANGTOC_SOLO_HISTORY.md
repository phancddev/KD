# Fix: Câu Hỏi Tăng Tốc Solo Không Hiện Trong Lịch Sử

## 🐛 Vấn Đề

Khi chơi chế độ **Tăng Tốc - Tự đấu (Solo)**, kết quả trận đấu được lưu nhưng **các câu hỏi không hiện trong lịch sử**.

### Nguyên Nhân:

1. **Frontend không gửi answers**: Code `solo-battle-tangtoc.js` chỉ gửi `score`, `correctAnswers`, `totalQuestions` nhưng KHÔNG gửi danh sách `answers` (câu trả lời).

2. **Backend không lưu answers**: API `/api/solo-game/finish` chỉ tạo session và lưu điểm, không lưu từng câu trả lời vào bảng `user_answers`.

3. **Database query không hỗ trợ Tăng Tốc**: Hàm `getGameSessionDetails()` chỉ JOIN với bảng `questions` (Khởi Động), không JOIN với `tangtoc_questions` (Tăng Tốc).

## ✅ Giải Pháp

### 1. Cập Nhật Backend API (`server.js`)

**Thêm xử lý lưu answers trong `/api/solo-game/finish`:**

```javascript
app.post('/api/solo-game/finish', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { score, correctAnswers, totalQuestions, mode, answers } = req.body;

    if (score === undefined || correctAnswers === undefined || totalQuestions === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const gameMode = mode === 'tangtoc' ? 'tangtoc' : 'khoidong';

    // Tạo phiên chơi solo và lưu kết quả
    const gameSession = await createGameSession(req.session.user.id, null, true, totalQuestions, gameMode);
    await finishGameSession(gameSession.id, score, correctAnswers);

    // Lưu các câu trả lời nếu có
    if (answers && Array.isArray(answers)) {
      const { saveUserAnswer } = await import('./db/game-sessions.js');
      for (const answer of answers) {
        try {
          await saveUserAnswer(
            gameSession.id,
            answer.questionId,
            answer.userAnswer || 'none',
            answer.isCorrect || false,
            answer.answerTime || 0
          );
        } catch (error) {
          console.error('Lỗi khi lưu câu trả lời:', error);
        }
      }
    }

    res.json({ success: true, sessionId: gameSession.id });
  } catch (error) {
    console.error('Lỗi khi lưu kết quả trận đấu solo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

**Thay đổi:**
- ✅ Thêm parameter `answers` vào request body
- ✅ Import `saveUserAnswer` từ `db/game-sessions.js`
- ✅ Loop qua từng answer và lưu vào database
- ✅ Error handling cho từng câu trả lời

### 2. Cập Nhật Frontend Tăng Tốc (`public/js/tangtoc/solo-battle-tangtoc.js`)

**Cập nhật hàm `saveGameResult()` để gửi answers:**

```javascript
async saveGameResult(){ 
    try{ 
        // Chuẩn bị dữ liệu answers để gửi
        const answers = this.userAnswers.map(a => ({
            questionId: a.questionId,
            userAnswer: a.userAnswer || 'none',
            isCorrect: a.isCorrect || false,
            answerTime: 0
        }));
        
        const r=await fetch('/api/solo-game/finish',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            credentials:'include',
            body:JSON.stringify({
                score:this.score,
                correctAnswers:this.score,
                totalQuestions:this.questions.length,
                mode:'tangtoc',
                answers: answers  // ← THÊM DÒNG NÀY
            })
        }); 
        if(!r.ok) throw 0; 
        await r.json(); 
    }catch(e){ 
        console.error('Lỗi khi lưu kết quả:', e);
    } 
}
```

**Thay đổi:**
- ✅ Map `this.userAnswers` thành format phù hợp
- ✅ Thêm `answers` vào request body
- ✅ Thêm error logging

### 3. Cập Nhật Frontend Khởi Động (`public/js/solo-battle.js`)

**Cập nhật hàm `saveSoloGameResult()` để nhất quán:**

```javascript
async function saveSoloGameResult(score, correctAnswers) {
    try {
        // Chuẩn bị dữ liệu answers để gửi
        const answers = userAnswers.map(a => ({
            questionId: a.questionId,
            userAnswer: a.userAnswer || 'none',
            isCorrect: a.isCorrect || false,
            answerTime: 0
        }));
        
        const response = await fetch('/api/solo-game/finish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                score: score,
                correctAnswers: correctAnswers,
                totalQuestions: questions.length,
                mode: 'khoidong',  // ← THÊM DÒNG NÀY
                answers: answers    // ← THÊM DÒNG NÀY
            })
        });
        
        if (!response.ok) {
            throw new Error('Không thể lưu kết quả trận đấu');
        }
        
        const data = await response.json();
        if (data && data.sessionId) {
            soloSessionId = data.sessionId;
        }
        console.log('Đã lưu kết quả trận đấu thành công');
    } catch (error) {
        console.error('Lỗi khi lưu kết quả trận đấu:', error);
    }
}
```

**Thay đổi:**
- ✅ Thêm `mode: 'khoidong'` để rõ ràng
- ✅ Thêm `answers` vào request body
- ✅ Nhất quán với code Tăng Tốc

### 4. Cập Nhật Database Query (`db/game-sessions.js`)

**Cập nhật `getGameSessionDetails()` để hỗ trợ cả 2 chế độ:**

```javascript
async function getGameSessionDetails(sessionId) {
  try {
    // Lấy thông tin phiên chơi
    const [sessionRows] = await pool.query(
      `SELECT gs.*, u.username, r.name as room_name, r.code as room_code
       FROM game_sessions gs
       JOIN users u ON gs.user_id = u.id
       LEFT JOIN rooms r ON gs.room_id = r.id
       WHERE gs.id = ?`,
      [sessionId]
    );
    
    if (sessionRows.length === 0) {
      return null;
    }
    
    const session = sessionRows[0];
    const gameMode = session.game_mode || 'khoidong';
    
    // Lấy chi tiết các câu trả lời
    // Nếu là Tăng Tốc, JOIN với tangtoc_questions, nếu không thì JOIN với questions
    let answerRows;
    if (gameMode === 'tangtoc') {
      [answerRows] = await pool.query(
        `SELECT ua.*, 
                COALESCE(tq.question_text, q.text) as question_text, 
                COALESCE(tq.correct_answer, q.answer) as answer
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
    
    const answers = answerRows.map(row => {
      return {
        questionId: row.question_id,
        questionText: row.question_text,
        userAnswer: row.user_answer === 'none' ? null : row.user_answer,
        correctAnswer: row.answer,
        isCorrect: row.is_correct === 1,
        answerTime: row.answer_time,
        answeredAt: row.answered_at
      };
    });
    
    return {
      id: session.id,
      userId: session.user_id,
      username: session.username,
      isSolo: session.is_solo === 1,
      gameMode: gameMode,
      roomId: session.room_id,
      roomName: session.room_name,
      roomCode: session.room_code,
      score: session.score,
      totalQuestions: session.total_questions,
      startedAt: session.started_at,
      finishedAt: session.finished_at,
      answers
    };
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết phiên chơi:', error);
    throw error;
  }
}
```

**Thay đổi:**
- ✅ Kiểm tra `gameMode` từ session
- ✅ Nếu `tangtoc`: JOIN với `tangtoc_questions`
- ✅ Nếu `khoidong`: JOIN với `questions`
- ✅ Sử dụng `COALESCE` để fallback nếu không tìm thấy

## 📊 Luồng Dữ Liệu

### Trước (Không Hoạt Động):
```
Frontend → API: { score, correctAnswers, totalQuestions, mode }
API → DB: INSERT game_sessions (chỉ lưu session)
DB → user_answers: (KHÔNG LƯU GÌ CẢ)
History → Query: JOIN questions (không có data)
Result: ❌ Không có câu hỏi trong lịch sử
```

### Sau (Hoạt Động):
```
Frontend → API: { score, correctAnswers, totalQuestions, mode, answers }
API → DB: INSERT game_sessions (lưu session)
API → DB: INSERT user_answers (lưu từng câu trả lời)
History → Query: JOIN tangtoc_questions/questions (có data)
Result: ✅ Hiển thị đầy đủ câu hỏi trong lịch sử
```

## 🧪 Testing

### Test Case 1: Tăng Tốc Solo
1. Chơi trận Tăng Tốc - Tự đấu
2. Trả lời 4 câu hỏi
3. Kết thúc trận đấu
4. Vào History → Chi tiết trận đấu
5. **Kỳ vọng**: Hiển thị đầy đủ 4 câu hỏi với đáp án

### Test Case 2: Khởi Động Solo
1. Chơi trận Khởi Động - Tự đấu
2. Trả lời câu hỏi
3. Kết thúc trận đấu
4. Vào History → Chi tiết trận đấu
5. **Kỳ vọng**: Hiển thị đầy đủ câu hỏi với đáp án

### Test Case 3: Báo Lỗi Từ History
1. Vào History → Chi tiết trận Tăng Tốc
2. Click "Báo lỗi" ở một câu hỏi
3. **Kỳ vọng**: Modal hiện ra, gửi đến `/api/tangtoc-report-question`

## ✅ Checklist

- [x] Cập nhật API `/api/solo-game/finish` để nhận và lưu answers
- [x] Cập nhật `solo-battle-tangtoc.js` để gửi answers
- [x] Cập nhật `solo-battle.js` để gửi answers (nhất quán)
- [x] Cập nhật `getGameSessionDetails()` để JOIN đúng bảng
- [x] Test Tăng Tốc solo
- [x] Test Khởi Động solo
- [x] Test báo lỗi từ history

## 📝 Files Đã Thay Đổi

1. ✅ `server.js` - Thêm logic lưu answers
2. ✅ `public/js/tangtoc/solo-battle-tangtoc.js` - Gửi answers
3. ✅ `public/js/solo-battle.js` - Gửi answers (nhất quán)
4. ✅ `db/game-sessions.js` - Query hỗ trợ cả 2 chế độ

## 🎉 Kết Quả

Bây giờ khi chơi Tăng Tốc - Tự đấu:
- ✅ Kết quả được lưu vào `game_sessions`
- ✅ Từng câu trả lời được lưu vào `user_answers`
- ✅ Lịch sử hiển thị đầy đủ câu hỏi
- ✅ Có thể báo lỗi từ lịch sử
- ✅ Nhất quán với chế độ Khởi Động

