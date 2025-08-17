document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const waitingRoom = document.getElementById('waiting-room');
    const battleRoom = document.getElementById('battle-room');
    const resultRoom = document.getElementById('result-room');
    const startBattleBtn = document.getElementById('start-battle-btn');
    const participantsList = document.getElementById('participants-list');
    const roomNameDisplay = document.getElementById('room-name-display');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const currentQuestionEl = document.getElementById('current-question');
    const totalQuestionsEl = document.getElementById('total-questions');
    // Removed timerEl since we only use total timer now
    const questionTextEl = document.getElementById('question-text');
    const answerOptionsEl = document.getElementById('answer-options');
    const participantsStatusEl = document.getElementById('participants-status');
    const resultTableBodyEl = document.getElementById('result-table-body');
    const playAgainBtn = document.getElementById('play-again-btn');
    const endRoomBtn = document.getElementById('end-room-btn');
    const endGameBtn = document.getElementById('end-game-btn');
    
    // Khởi tạo biến
    let socket;
    let userId;
    let username;
    let roomInfo;
    let currentQuestionIndex = 0;
    let playerScore = 0;
    let timerInterval;
    let currentQuestion = null;
    let questionStartTime;
    let allQuestions = []; // Lưu tất cả câu hỏi
    let myQuestionOrder = []; // Thứ tự câu hỏi của tôi
    let gameStartTime; // Thời gian bắt đầu game
    let totalTimeRemaining = 60; // 60 giây tổng
    let gameFinished = false;
    
    // Kết nối Socket.IO
    function connectSocket() {
        socket = io();
        
        // Xử lý sự kiện khi người tham gia mới vào phòng
        socket.on('participant_joined', function(data) {
            renderParticipants(data.participants);
        });
        
        // Xử lý sự kiện khi người tham gia ngắt kết nối
        socket.on('participant_disconnected', function(data) {
            showNotification(`${data.username} đã ngắt kết nối.`);
        });
        
        // Xử lý sự kiện khi trò chơi sắp bắt đầu
        socket.on('game_starting', function(data) {
            showCountdown(data.countDown);
        });
        
        // Xử lý sự kiện khi có câu hỏi mới (approach mới)
        socket.on('new_question_start', function(data) {
            console.log('📨 Nhận event new_question_start:', data);
            handleNewQuestionStart(data);
        });
        
        // Xử lý sự kiện cập nhật timer
        socket.on('timer_update', function(data) {
            console.log('⏰ Timer update:', data.totalTimeLeft);
            updateTimer(data.totalTimeLeft);
        });
        
                // Xử lý sự kiện khi có người trả lời  
        socket.on('participant_answered', function(data) {
            updateParticipantStatus(data);
        });
        
        // Xử lý khi có người hoàn thành game
        socket.on('player_finished', function(data) {
            console.log('🏁 Người chơi hoàn thành:', data);
            showNotification(`${data.username} đã hoàn thành! Điểm: ${data.score}`, 'info');
        });
        
        // Xử lý kết quả cuối cùng
        socket.on('game_results', function(data) {
            console.log('🎯 Kết quả cuối cùng:', data);
            showResults(data.results);
        });
        
        // Xử lý sự kiện khi hết thời gian câu hỏi
        socket.on('question_timeout', function() {
            handleQuestionTimeout();
        });
        
        // Xử lý sự kiện khi trò chơi kết thúc
        socket.on('game_over', function(data) {
            showResults(data.results);
        });
        
        // Xử lý sự kiện khi phòng bị kết thúc
        socket.on('room_ended', function(data) {
            alert(data.message);
            window.location.href = '/';
        });
    }
    
    // Lấy thông tin người dùng từ session với retry logic
    function fetchUserInfo(retryCount = 0) {
        console.log('🔍 Đang lấy thông tin user, attempt:', retryCount + 1);
        
        fetch('/api/user', {
            credentials: 'include', // Đảm bảo cookies được gửi
            headers: {
                'Cache-Control': 'no-cache'
            }
        })
        .then(response => {
            console.log('📡 User API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('👤 User data received:', data);
            
            if (data.id && data.username) {
                userId = data.id;
                username = data.username;
                document.getElementById('username-display').textContent = username;
                
                // Lưu user info vào localStorage để backup
                localStorage.setItem('userInfo', JSON.stringify({
                    id: userId,
                    username: username,
                    timestamp: Date.now()
                }));
                
                // Sau khi có thông tin người dùng, kết nối Socket.IO
                connectSocket();
                
                // Kiểm tra thông tin phòng từ localStorage
                checkRoomInfo();
            } else {
                handleAuthFailure(retryCount);
            }
        })
        .catch(error => {
            console.error('❌ Lỗi khi lấy thông tin người dùng:', error);
            handleAuthFailure(retryCount);
        });
    }
    
    // Xử lý khi authentication thất bại
    function handleAuthFailure(retryCount) {
        // Thử backup từ localStorage
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo && retryCount < 2) {
            try {
                const userInfo = JSON.parse(storedUserInfo);
                const timeElapsed = Date.now() - userInfo.timestamp;
                
                // Nếu thông tin còn mới (dưới 1 giờ), thử retry
                if (timeElapsed < 60 * 60 * 1000) {
                    console.log('🔄 Thử retry với backup info...');
                    setTimeout(() => fetchUserInfo(retryCount + 1), 1000);
                    return;
                }
            } catch (e) {
                console.log('❌ Backup user info không hợp lệ');
            }
        }
        
        // Xóa localStorage và chuyển về login
        localStorage.removeItem('userInfo');
        localStorage.removeItem('currentRoom');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = '/login';
    }
    
    // Gọi function lấy thông tin user
    fetchUserInfo();
    
    // Kiểm tra thông tin phòng từ localStorage
    function checkRoomInfo() {
        roomInfo = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        
        if (!roomInfo.code) {
            // Không có thông tin phòng, chuyển về trang chủ
            window.location.href = '/';
            return;
        }
        
        // Hiển thị thông tin phòng
        roomCodeDisplay.textContent = roomInfo.code;
        roomNameDisplay.textContent = roomInfo.name || 'Phòng thi đấu';
        
        // Chỉ hiển thị nút bắt đầu và kết thúc cho người tạo phòng
        const isCreator = roomInfo.creator;
        startBattleBtn.style.display = isCreator ? 'block' : 'none';
        if (endRoomBtn) endRoomBtn.style.display = isCreator ? 'block' : 'none';
        
        // Tham gia phòng qua Socket.IO
        joinRoom();
    }
    
    // Tham gia phòng
    function joinRoom() {
        if (!socket || !roomInfo.code) return;
        
        socket.emit('join_room', {
            userId: userId,
            username: username,
            roomCode: roomInfo.code
        }, function(response) {
            if (response.success) {
                // Cập nhật thông tin phòng
                roomInfo = response.room;
                
                // Hiển thị danh sách người tham gia
                renderParticipants(response.room.participants);
            } else {
                // Xử lý lỗi
                alert('Không thể tham gia phòng: ' + response.error);
                window.location.href = '/';
            }
        });
    }
    
    // Hiển thị danh sách người tham gia
    function renderParticipants(participants) {
        if (!participants) return;
        
        participantsList.innerHTML = '';
        participants.forEach(participant => {
            const li = document.createElement('li');
            li.textContent = participant.username + (participant.isCreator ? ' (Chủ phòng)' : '');
            participantsList.appendChild(li);
        });
    }
    
    // Nút bắt đầu trò chơi
    startBattleBtn.addEventListener('click', function() {
        startBattle();
    });
    
    // Nút chơi lại
    playAgainBtn.addEventListener('click', function() {
        // Quay lại trang chủ
        window.location.href = '/';
    });
    
    // Nút kết thúc phòng (trong waiting room)
    if (endRoomBtn) {
        endRoomBtn.addEventListener('click', function() {
            if (confirm('Bạn có chắc muốn kết thúc phòng? Tất cả người chơi sẽ bị đưa ra ngoài.')) {
                endRoom();
            }
        });
    }
    
    // Nút kết thúc game (trong battle room)
    if (endGameBtn) {
        endGameBtn.addEventListener('click', function() {
            if (confirm('Bạn có chắc muốn kết thúc trận đấu? Kết quả hiện tại sẽ được lưu.')) {
                endGame();
            }
        });
    }
    
    // Bắt đầu trò chơi
    function startBattle() {
        if (!socket || !roomInfo.code) return;
        
        socket.emit('start_game', {
            roomCode: roomInfo.code,
            userId: userId
        }, function(response) {
            if (!response.success) {
                alert('Không thể bắt đầu trò chơi: ' + response.error);
            }
        });
    }
    
    // Hiển thị đếm ngược
    function showCountdown(seconds) {
        // Ẩn phòng chờ, hiển thị phòng thi đấu
        waitingRoom.style.display = 'none';
        battleRoom.style.display = 'block';
        
        // Hiển thị nút kết thúc game cho chủ phòng
        if (roomInfo.creator && endGameBtn) {
            endGameBtn.style.display = 'block';
        }
        
        // Reset điểm số
        playerScore = 0;
        document.getElementById('user-score').textContent = '0';
        
        // Tạo phần tử đếm ngược
        const countdownEl = document.createElement('div');
        countdownEl.className = 'countdown';
        countdownEl.textContent = seconds;
        battleRoom.appendChild(countdownEl);
        
        // Đếm ngược
        let count = seconds;
        const countInterval = setInterval(() => {
            count--;
            countdownEl.textContent = count;
            
            if (count <= 0) {
                clearInterval(countInterval);
                battleRoom.removeChild(countdownEl);
            }
        }, 1000);
    }
    
    // Thêm event listener cho nút submit answer
    document.getElementById('submit-answer').addEventListener('click', function() {
        submitAnswer();
    });
    
    // Thêm event listener cho phím Enter trong input
    document.getElementById('answer-input').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            submitAnswer();
        }
    });
    
    // Hiển thị câu hỏi
    function showQuestion(data) {
        const { questionNumber, totalQuestions, question, totalTimeLeft } = data;
        
        console.log('📋 showQuestion called:', { questionNumber, totalQuestions, questionText: question?.text?.substring(0, 50) + '...' });
        
        // Lưu câu hỏi hiện tại
        currentQuestion = question;
        currentQuestionIndex = questionNumber - 1;
        questionStartTime = Date.now();
        
        // Cập nhật số câu hỏi
        currentQuestionEl.textContent = questionNumber;
        totalQuestionsEl.textContent = totalQuestions;
        
        // Đặt nội dung câu hỏi
        questionTextEl.textContent = question.text;
        
        // Reset input và nút trả lời
        const answerInput = document.getElementById('answer-input');
        answerInput.value = '';
        answerInput.disabled = false;
        document.getElementById('submit-answer').disabled = false;
        
        // Xóa kết quả câu trả lời trước đó
        const answerResult = document.getElementById('answer-result');
        answerResult.textContent = '';
        answerResult.className = 'answer-result';
        
        // Cập nhật timer tổng
        updateTimer(totalTimeLeft);
        
        // Cập nhật trạng thái người tham gia
        updateParticipantsStatus([]);
        
        // Focus vào input để người dùng có thể nhập ngay
        answerInput.focus();
    }
    
    // Chọn câu trả lời
    function submitAnswer() {
        if (!currentQuestion) return;
        
        const answerInput = document.getElementById('answer-input');
        const userAnswer = answerInput.value.trim();
        
        if (!userAnswer) {
            showNotification('Vui lòng nhập câu trả lời!', 'warning');
            return;
        }
        
        // Vô hiệu hóa input và nút trả lời
        answerInput.disabled = true;
        document.getElementById('submit-answer').disabled = true;
        
        // Tính thời gian trả lời (giây)
        const answerTime = Math.floor((Date.now() - questionStartTime) / 1000);
        
        // Gửi câu trả lời đến server
        socket.emit('submit_answer', {
            roomCode: roomInfo.code,
            userId: userId,
            userAnswer: userAnswer,
            answerTime: answerTime
        }, function(response) {
            if (response.success) {
                const answerResult = document.getElementById('answer-result');
                
                // Cập nhật điểm số - mỗi câu đúng được 10 điểm
                if (response.isCorrect) {
                    playerScore += 10; // Cố định 10 điểm cho mỗi câu đúng
                    document.getElementById('user-score').textContent = playerScore;
                    
                    answerResult.textContent = 'Đúng! +10 điểm';
                    answerResult.className = 'answer-result correct';
                    showNotification('Đúng! +10 điểm', 'success');
                } else {
                    answerResult.textContent = `Sai! Đáp án đúng: ${response.correctAnswer}`;
                    answerResult.className = 'answer-result incorrect';
                    showNotification('Sai rồi!', 'error');
                }
                
                // ✅ Tự chuyển câu tiếp theo như solo battle - KHÔNG chờ người khác
                setTimeout(() => {
                    currentQuestionIndex++;
                    
                    // Kiểm tra nếu hết câu hỏi
                    if (currentQuestionIndex >= allQuestions.length) {
                        console.log('🏁 Đã hoàn thành tất cả câu hỏi!');
                        finishMyGame();
                        return;
                    }
                    
                    // Hiển thị câu tiếp theo
                    const questionIndex = myQuestionOrder[currentQuestionIndex];
                    const nextQuestion = allQuestions[questionIndex];
                    
                    showQuestion({
                        questionNumber: currentQuestionIndex + 1,
                        totalQuestions: allQuestions.length,
                        question: nextQuestion,
                        totalTimeLeft: document.getElementById('total-timer').textContent
                    });
                }, 1500);
            } else {
                showNotification('Lỗi khi gửi câu trả lời: ' + response.error, 'error');
            }
        });
    }
    
    // Xử lý khi hết thời gian câu hỏi
    function handleQuestionTimeout() {
        // Vô hiệu hóa input và nút trả lời
        const answerInput = document.getElementById('answer-input');
        answerInput.disabled = true;
        document.getElementById('submit-answer').disabled = true;
        
        // Hiển thị thông báo
        const answerResult = document.getElementById('answer-result');
        answerResult.textContent = 'Hết thời gian! Bạn không nhận được điểm cho câu hỏi này.';
        answerResult.className = 'answer-result incorrect';
        
        showNotification('Hết thời gian!');
    }
    
    // Xử lý khi có thông báo bắt đầu câu hỏi mới  
    function handleNewQuestionStart(data) {
        console.log('📨 Nhận event new_question_start với data:', data);
        
        // Lần đầu nhận data, lưu tất cả câu hỏi và tạo thứ tự ngẫu nhiên
        allQuestions = data.questionData;
        myQuestionOrder = shuffleArray([...Array(allQuestions.length).keys()]);
        console.log('🔀 Thứ tự câu hỏi của tôi:', myQuestionOrder);
        
        currentQuestionIndex = 0; // Reset về câu đầu tiên
        gameStartTime = Date.now();
        gameFinished = false;
        
        // Bắt đầu timer 60 giây tổng
        startTotalTimer();
        
        // Hiển thị câu hỏi đầu tiên
        const questionIndex = myQuestionOrder[currentQuestionIndex];
        const question = allQuestions[questionIndex];
        
        console.log('📋 Hiển thị câu hỏi đầu tiên:', currentQuestionIndex + 1);
        
        showQuestion({
            questionNumber: currentQuestionIndex + 1,
            totalQuestions: allQuestions.length,
            question: question,
            totalTimeLeft: totalTimeRemaining
        });
    }
    
    // Bắt đầu timer 60 giây tổng (từ solo battle)
    function startTotalTimer() {
        totalTimeRemaining = 60;
        updateTimer(totalTimeRemaining);
        
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        timerInterval = setInterval(() => {
            totalTimeRemaining--;
            updateTimer(totalTimeRemaining);
            
            if (totalTimeRemaining <= 0) {
                clearInterval(timerInterval);
                if (!gameFinished) {
                    console.log('⏰ Hết thời gian! Kết thúc game tự động');
                    handleGameTimeout();
                }
            }
        }, 1000);
    }
    
    // Cập nhật hiển thị timer
    function updateTimer(timeLeft) {
        document.getElementById('total-timer').textContent = timeLeft;
    }
    
    // Xử lý khi hết thời gian tổng
    function handleGameTimeout() {
        if (gameFinished) return;
        
        gameFinished = true;
        clearInterval(timerInterval);
        
        // Vô hiệu hóa input và nút trả lời
        const answerInput = document.getElementById('answer-input');
        const submitBtn = document.getElementById('submit-answer');
        if (answerInput) answerInput.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        
        showNotification('Hết thời gian! Game kết thúc.', 'warning');
        
        // Kết thúc game của mình
        finishMyGame();
    }
    
    // Kết thúc game của riêng mình 
    function finishMyGame() {
        if (gameFinished) return;
        
        gameFinished = true;
        clearInterval(timerInterval);
        
        const completionTime = Math.floor((Date.now() - gameStartTime) / 1000);
        
        console.log('🏁 Hoàn thành game! Điểm:', playerScore, '- Thời gian:', completionTime);
        
        // Gửi kết quả đến server
        socket.emit('finish_game', {
            roomCode: roomInfo.code,
            userId: userId,
            score: playerScore,
            completionTime: completionTime,
            questionsAnswered: currentQuestionIndex
        }, function(response) {
            if (response.success) {
                showNotification('Đã gửi kết quả thành công!', 'success');
            } else {
                console.error('Lỗi gửi kết quả:', response.error);
            }
        });
    }
    
    // Helper function: Shuffle array (giống bên server)
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // Cập nhật timer tổng
    function updateTimer(totalTimeLeft) {
        const totalTimerEl = document.getElementById('total-timer');
        if (totalTimerEl) {
            totalTimerEl.textContent = totalTimeLeft;
            
            // Đổi màu thời gian tổng khi còn ít
            if (totalTimeLeft <= 10) {
                totalTimerEl.style.color = '#e74c3c';
            } else {
                totalTimerEl.style.color = '';
            }
        }
    }
    
    // Cập nhật trạng thái người tham gia trong trận đấu
    function updateParticipantsStatus(answeredUsers = []) {
        if (!roomInfo || !roomInfo.participants) return;
        
        participantsStatusEl.innerHTML = '';
        
        // Sắp xếp người chơi theo điểm số
        const sortedParticipants = [...roomInfo.participants].sort((a, b) => b.score - a.score);
        
        sortedParticipants.forEach((participant, index) => {
            const div = document.createElement('div');
            div.className = `participant-item participant-rank-${index + 1}`;
            
            // Kiểm tra xem người dùng đã trả lời chưa
            const hasAnswered = answeredUsers.some(u => u.userId === participant.id);
            
            div.innerHTML = `
                <span class="participant-name">${participant.username}</span>
                <div class="participant-info">
                    <span class="participant-score">${participant.score || 0}</span>
                    <span class="participant-status-indicator ${hasAnswered ? 'answered' : ''}">
                        ${hasAnswered ? '✓' : '...'}
                    </span>
                </div>
            `;
            
            participantsStatusEl.appendChild(div);
        });
    }
    
    // Cập nhật trạng thái người tham gia khi có người trả lời
    function updateParticipantStatus(data) {
        const { userId, username, hasAnswered } = data;
        
        // Tìm người tham gia trong roomInfo
        const participant = roomInfo.participants.find(p => p.id === userId);
        if (participant) {
            participant.hasAnswered = hasAnswered;
        }
        
        // Tìm phần tử trạng thái của người dùng
        const statusElements = document.querySelectorAll('.participant-item');
        for (const element of statusElements) {
            const nameEl = element.querySelector('.participant-name');
            if (nameEl && nameEl.textContent === username) {
                const indicatorEl = element.querySelector('.participant-status-indicator');
                if (indicatorEl) {
                    indicatorEl.classList.add('answered');
                    indicatorEl.textContent = '✓';
                }
                break;
            }
        }
    }
    
    // Hiển thị kết quả cuối cùng
    function showResults(results) {
        // Ẩn phòng thi đấu, hiển thị phòng kết quả
        battleRoom.style.display = 'none';
        resultRoom.style.display = 'block';
        
        // Xóa bộ đếm thời gian
        clearInterval(timerInterval);
        
        // Hiển thị bảng kết quả
        resultTableBodyEl.innerHTML = '';
        results.forEach(result => {
            const tr = document.createElement('tr');
            
            // Thêm class cho top 3
            if (result.rank <= 3) {
                tr.className = `rank-${result.rank}`;
            }
            
            tr.innerHTML = `
                <td>${result.rank}</td>
                <td>${result.username}</td>
                <td>${result.score}</td>
            `;
            resultTableBodyEl.appendChild(tr);
        });
    }
    
    // Kết thúc phòng (chủ phòng)
    function endRoom() {
        if (!socket || !roomInfo.code) return;
        
        socket.emit('end_room', {
            roomCode: roomInfo.code,
            userId: userId
        }, function(response) {
            if (response.success) {
                alert('Đã kết thúc phòng');
                window.location.href = '/';
            } else {
                alert('Không thể kết thúc phòng: ' + response.error);
            }
        });
    }
    
    // Kết thúc game (chủ phòng)
    function endGame() {
        if (!socket || !roomInfo.code) return;
        
        socket.emit('end_game', {
            roomCode: roomInfo.code,
            userId: userId
        }, function(response) {
            if (response.success) {
                console.log('Đã yêu cầu kết thúc game');
            } else {
                alert('Không thể kết thúc game: ' + response.error);
            }
        });
    }
    
    // Hiển thị thông báo
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
});