# Test History API

## Các vấn đề cần kiểm tra:

### 1. User có thể xem lịch sử không?
- ✅ Route `/history` đã có (line 697 server.js)
- ✅ Yêu cầu đăng nhập
- ✅ Trả về file `views/history.html`

**Test:**
1. Đăng nhập với user thường
2. Truy cập http://localhost:2701/history
3. Kiểm tra xem trang có load không

### 2. Admin có thể xem logs câu hỏi không?
- ✅ API `/api/admin/game-history/:gameId` đã có (line 942 routes/admin-api.js)
- ✅ Gọi `getGameSessionDetails(gameId)` 
- ✅ Trả về đầy đủ: id, userId, username, gameMode, answers[]
- ✅ Mỗi answer có: questionId, questionText, userAnswer, correctAnswer, isCorrect, answerTime

**Test:**
1. Đăng nhập với admin
2. Vào http://localhost:2701/admin/game-history
3. Click "Xem" một trận đấu
4. Kiểm tra modal có hiển thị bảng câu hỏi không

### 3. Thống kê user có hoạt động không?
- ✅ API `/api/history` đã có (line 761 server.js)
- ✅ Trả về `{ history, stats }`
- ✅ Stats có: totalGames, totalScore, totalCorrectAnswers, totalQuestions, highestScore
- ✅ Frontend có error handling (line 180 public/js/history.js)

**Test:**
1. Đăng nhập với user
2. Vào http://localhost:2701/history
3. Mở DevTools Console
4. Kiểm tra request `/api/history?year=2025&month=1`
5. Xem response có stats không

## Debug Commands

### Kiểm tra logs
```bash
docker logs kd-app-1 --tail 50 -f
```

### Kiểm tra database
```bash
docker exec -i kd-mariadb-1 mysql -u root -proot_password nqd_database -e "SELECT * FROM game_sessions ORDER BY id DESC LIMIT 5;"
```

### Kiểm tra game_mode column
```bash
docker exec -i kd-mariadb-1 mysql -u root -proot_password nqd_database -e "DESCRIBE game_sessions;"
```

### Kiểm tra user_answers
```bash
docker exec -i kd-mariadb-1 mysql -u root -proot_password nqd_database -e "SELECT session_id, COUNT(*) as answer_count FROM user_answers GROUP BY session_id ORDER BY session_id DESC LIMIT 10;"
```

## Expected Console Logs

Khi user truy cập `/history`:
```
📊 User 123 requesting history - month: 1, year: 2025
📊 Found 5 games for month 1/2025
📊 Stats: { totalGames: 5, totalScore: 450, ... }
```

Khi admin xem chi tiết game:
```
📊 Admin requesting game details for gameId: 456
✅ Game 456 details: { id: 456, userId: 123, username: 'test', gameMode: 'khoidong', answersCount: 12 }
```

## Troubleshooting

### Nếu stats không hiển thị:
1. Kiểm tra console có lỗi không
2. Kiểm tra network tab - request `/api/history` có thành công không
3. Kiểm tra response có field `stats` không
4. Kiểm tra các element ID: `total-games`, `total-score`, `correct-answers`, `highest-score`

### Nếu admin không thấy câu hỏi:
1. Kiểm tra request `/api/admin/game-history/:gameId` có thành công không
2. Kiểm tra response có field `answers` không
3. Kiểm tra table `user_answers` có dữ liệu cho session đó không
4. Kiểm tra modal có element `answer-details-table` không

### Nếu user không vào được /history:
1. Kiểm tra session có hợp lệ không
2. Kiểm tra route có conflict không
3. Kiểm tra file `views/history.html` có tồn tại không

