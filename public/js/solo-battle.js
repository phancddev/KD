document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const soloBattleRoom = document.getElementById('solo-battle-room');
    const resultRoom = document.getElementById('result-room');
    const currentQuestionEl = document.getElementById('current-question');
    const totalQuestionsEl = document.getElementById('total-questions');
    // Removed timerEl since we only use total timer now
    const totalTimerEl = document.getElementById('total-timer');
    const questionTextEl = document.getElementById('question-text');
    const progressBarEl = document.getElementById('progress-bar');
    const finalScoreEl = document.getElementById('final-score');
    const maxScoreEl = document.getElementById('max-score');
    const questionReviewListEl = document.getElementById('question-review-list');
    const playAgainBtn = document.getElementById('play-again-btn');
    const userScoreEl = document.getElementById('user-score');
    
    // Audio element for battle sound
    const battleSound = document.getElementById('battle-sound');
    const soundToggleBtn = document.getElementById('sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    
    // Biến để theo dõi trạng thái âm thanh
    let soundEnabled = true;
    
    // Hàm để kiểm tra và chuẩn bị âm thanh
    function prepareBattleSound() {
        if (battleSound) {
            // Đặt âm lượng mặc định
            battleSound.volume = 0.7;
            // Preload âm thanh
            battleSound.load();
        }
    }
    
    // Hàm để bật/tắt âm thanh
    function toggleSound() {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundIcon.textContent = '🔊';
            if (battleSound) {
                battleSound.volume = 0.7;
            }
        } else {
            soundIcon.textContent = '🔇';
            if (battleSound) {
                battleSound.volume = 0;
            }
        }
    }
    
    // Event listener cho nút bật/tắt âm thanh
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', toggleSound);
    }
    
    // Chuẩn bị âm thanh khi trang load
    prepareBattleSound();
    
    // Biến lưu thông tin người dùng
    let userId;
    
    // Lấy thông tin người dùng từ session
    fetch('/api/user')
        .then(response => response.json())
        .then(data => {
            if (data.username) {
                document.getElementById('username-display').textContent = `${data.username}`;
                userId = data.id;
            } else {
                window.location.href = '/login';
            }
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            window.location.href = '/login';
        });
    
    // Biến để lưu trữ dữ liệu trò chơi
    let currentQuestionIndex = 0;
    let playerScore = 0;
    let timerInterval;
    let userAnswers = [];
    let questionStartTime;
    let questions = [];
    let totalTimeRemaining = 60; // Tổng thời gian 60 giây cho 12 câu hỏi
    
    // Lấy câu hỏi từ server
    fetch('/admin/api/questions/random?count=12')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('Không có câu hỏi nào trong database');
            }
            
            questions = data;
            
            // Thiết lập tổng số câu hỏi
            totalQuestionsEl.textContent = questions.length;
            maxScoreEl.textContent = questions.length * 10; // Mỗi câu 10 điểm
            
            // Bắt đầu với câu hỏi đầu tiên
            showQuestion(currentQuestionIndex);
        })
        .catch(error => {
            console.error('Lỗi khi lấy câu hỏi:', error);
            // Hiển thị thông báo lỗi cho người dùng
            questionTextEl.textContent = `Lỗi: Không thể tải câu hỏi từ database. ${error.message}`;
            alert('Không thể tải câu hỏi. Vui lòng thử lại sau hoặc liên hệ admin.');
        });
    

    
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
    
    // Chơi lại
    playAgainBtn.addEventListener('click', function() {
        // Dừng nhạc nếu đang phát
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
        }
        
        // Reset trạng thái trò chơi
        currentQuestionIndex = 0;
        playerScore = 0;
        userAnswers = [];
        totalTimeRemaining = 60; // Khôi phục thời gian tổng
        
        // Reset giao diện
        soloBattleRoom.style.display = 'block';
        resultRoom.style.display = 'none';
        userScoreEl.textContent = '0';
        
        // Bắt đầu với câu hỏi đầu tiên
        showQuestion(currentQuestionIndex);
    });
    
    // Hiển thị câu hỏi
    function showQuestion(index) {
        if (index >= questions.length) {
            // Hết câu hỏi, hiển thị kết quả
            showResults();
            return;
        }
        
        const question = questions[index];
        questionStartTime = Date.now();
        
        // Cập nhật số câu hỏi
        currentQuestionEl.textContent = index + 1;
        
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
        
        // Cập nhật thanh tiến trình
        const progress = (index / questions.length) * 100;
        progressBarEl.style.width = `${progress}%`;
        
        // Chỉ bắt đầu đếm giờ tổng ở câu hỏi đầu tiên
        if (index === 0) {
            startTimer();
        }
        
        // Focus vào input để người dùng có thể nhập ngay
        answerInput.focus();
    }
    
    // Trả lời câu hỏi
    function submitAnswer() {
        if (currentQuestionIndex >= questions.length) return;
        
        const answerInput = document.getElementById('answer-input');
        const userAnswer = answerInput.value.trim();
        
        if (!userAnswer) {
            alert('Vui lòng nhập câu trả lời!');
            return;
        }
        
        // Vô hiệu hóa input và nút trả lời
        answerInput.disabled = true;
        document.getElementById('submit-answer').disabled = true;
        
        // Tính thời gian trả lời (giây)
        const answerTime = Math.floor((Date.now() - questionStartTime) / 1000);
        
        const question = questions[currentQuestionIndex];
        
        // Kiểm tra đáp án
        const isCorrect = checkAnswer(userAnswer, question.answer);
        
        const answerResult = document.getElementById('answer-result');
        
        // Cập nhật điểm số - mỗi câu đúng được 10 điểm
        if (isCorrect) {
            playerScore += 10;
            userScoreEl.textContent = playerScore;
            
            answerResult.textContent = 'Đúng! +10 điểm';
            answerResult.className = 'answer-result correct';
        } else {
            answerResult.textContent = `Sai! Đáp án đúng: ${question.answer}`;
            answerResult.className = 'answer-result incorrect';
        }
        
        // Lưu câu trả lời
        userAnswers.push({
            questionId: question.id,
            questionText: question.text,
            userAnswer: userAnswer,
            correctAnswer: question.answer,
            isCorrect: isCorrect
        });
        
        // Chờ trước khi chuyển sang câu hỏi tiếp theo
        setTimeout(() => {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        }, 2000);
    }
    
    // Kiểm tra câu trả lời
    function checkAnswer(userAnswer, correctAnswer) {
        // Chuẩn hóa cả hai câu trả lời: loại bỏ dấu cách thừa, chuyển về chữ thường
        const normalizedUserAnswer = userAnswer.trim().toLowerCase();
        const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
        
        // So sánh trực tiếp
        if (normalizedUserAnswer === normalizedCorrectAnswer) {
            return true;
        }
        
        // Kiểm tra nếu câu trả lời của người dùng là một phần của đáp án đúng
        // Hữu ích cho các câu trả lời có nhiều cách diễn đạt
        if (normalizedCorrectAnswer.includes(normalizedUserAnswer) && 
            normalizedUserAnswer.length > normalizedCorrectAnswer.length / 2) {
            return true;
        }
        
        return false;
    }
    
    // Xử lý khi hết thời gian tổng (60 giây)
    function handleGameTimeout() {
        // Dừng trò chơi ngay lập tức và hiển thị kết quả
        clearInterval(timerInterval);
        
        // Dừng nhạc khi hết thời gian
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
        }
        
        // Lưu tất cả câu hỏi còn lại như không trả lời
        for (let i = currentQuestionIndex; i < questions.length; i++) {
            const question = questions[i];
            userAnswers.push({
                questionId: question.id,
                questionText: question.text,
                userAnswer: null,
                correctAnswer: question.answer,
                isCorrect: false
            });
        }
        
        // Hiển thị kết quả
        showResults();
    }
    
    // Bắt đầu đếm giờ tổng cho tất cả câu hỏi
    function startTimer() {
        totalTimerEl.textContent = totalTimeRemaining;
        
        clearInterval(timerInterval);
        
        // Phát nhạc khi bắt đầu trận đấu
        if (battleSound && soundEnabled) {
            battleSound.currentTime = 0; // Reset về đầu
            battleSound.volume = 0.7; // Đặt âm lượng 70%
            battleSound.loop = true; // Lặp lại để phát trong 60 giây
            battleSound.play().catch(error => {
                console.log('Không thể phát nhạc:', error);
            });
        }
        
        timerInterval = setInterval(() => {
            totalTimeRemaining--;
            totalTimerEl.textContent = totalTimeRemaining;
            
            // Đổi màu thời gian tổng khi còn ít
            if (totalTimeRemaining <= 10) {
                totalTimerEl.style.color = '#e74c3c';
            } else {
                totalTimerEl.style.color = '';
            }
            
            // Kết thúc trò chơi khi hết thời gian tổng
            if (totalTimeRemaining <= 0) {
                clearInterval(timerInterval);
                handleGameTimeout();
            }
        }, 1000);
    }
    
    // Hiển thị kết quả cuối cùng
    function showResults() {
        soloBattleRoom.style.display = 'none';
        resultRoom.style.display = 'block';
        
        // Dừng đếm giờ
        clearInterval(timerInterval);
        
        // Dừng nhạc khi kết thúc trận đấu
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
        }
        
        // Cập nhật điểm số
        finalScoreEl.textContent = playerScore;
        
        // Đếm số câu trả lời đúng
        let correctAnswersCount = userAnswers.filter(answer => answer.isCorrect).length;
        
        // Lưu kết quả trận đấu vào server
        saveSoloGameResult(playerScore, correctAnswersCount);
        
        // Tạo danh sách xem lại câu hỏi
        questionReviewListEl.innerHTML = '';
        userAnswers.forEach((answer, index) => {
            const div = document.createElement('div');
            div.className = `question-review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            
            let answerText = 'Không trả lời';
            if (answer.userAnswer !== null) {
                answerText = answer.userAnswer;
            }
            
            div.innerHTML = `
                <h4>Câu ${index + 1}: ${answer.questionText}</h4>
                <p>Câu trả lời của bạn: ${answerText}</p>
                <p>Câu trả lời đúng: ${answer.correctAnswer}</p>
                <p>Điểm: ${answer.isCorrect ? '10' : '0'}</p>
            `;
            
            questionReviewListEl.appendChild(div);
        });
    }
    
    // Lưu kết quả trận đấu solo vào server
    async function saveSoloGameResult(score, correctAnswers) {
        try {
            const response = await fetch('/api/solo-game/finish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    score: score,
                    correctAnswers: correctAnswers,
                    totalQuestions: questions.length
                })
            });
            
            if (!response.ok) {
                throw new Error('Không thể lưu kết quả trận đấu');
            }
            
            console.log('Đã lưu kết quả trận đấu thành công');
        } catch (error) {
            console.error('Lỗi khi lưu kết quả trận đấu:', error);
        }
    }
});