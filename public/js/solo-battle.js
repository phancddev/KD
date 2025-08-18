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
    const preBattleSound = document.getElementById('pre-battle-sound');
    const soundToggleBtn = document.getElementById('sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    
    // Âm thanh cho câu trả lời đúng/sai - lấy từ HTML
    const correctSound = document.getElementById('correct-sound');
    const wrongSound = document.getElementById('wrong-sound');
    
    // Countdown popup elements
    const countdownPopup = document.getElementById('countdown-popup');
    const countdownNumber = document.getElementById('countdown-number');
    
    // Biến để theo dõi trạng thái âm thanh
    let soundEnabled = true;
    
    // Biến để theo dõi trạng thái đếm ngược
    let isCountdownActive = false;
    
    // Hàm để kiểm tra và chuẩn bị âm thanh
    function prepareBattleSound() {
        if (battleSound) {
            // Đặt âm lượng mặc định
            battleSound.volume = 0.7;
            // Preload âm thanh
            battleSound.load();
        }
        if (preBattleSound) {
            // Đặt âm lượng mặc định
            preBattleSound.volume = 0.7;
            // Preload âm thanh
            preBattleSound.load();
        }
        
        // Chuẩn bị âm thanh đúng/sai
        if (correctSound) {
            correctSound.volume = 0.8;
            correctSound.load();
        }
        if (wrongSound) {
            wrongSound.volume = 0.8;
            wrongSound.load();
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
            if (preBattleSound) {
                preBattleSound.volume = 0.7;
            }
            if (correctSound) {
                correctSound.volume = 0.8;
            }
            if (wrongSound) {
                wrongSound.volume = 0.8;
            }
        } else {
            soundIcon.textContent = '🔇';
            if (battleSound) {
                battleSound.volume = 0;
            }
            if (preBattleSound) {
                preBattleSound.volume = 0;
            }
            if (correctSound) {
                correctSound.volume = 0;
            }
            if (wrongSound) {
                wrongSound.volume = 0;
            }
        }
    }
    
    // Hàm phát âm thanh đúng/sai
    function playAnswerSound(isCorrect) {
        if (!soundEnabled) return;
        
        if (isCorrect) {
            if (correctSound) {
                correctSound.currentTime = 0;
                correctSound.play().catch(error => {
                    console.log('Không thể phát âm thanh đúng:', error);
                });
            }
        } else {
            if (wrongSound) {
                wrongSound.currentTime = 0;
                wrongSound.play().catch(error => {
                    console.log('Không thể phát âm thanh sai:', error);
                });
            }
        }
    }
    
    // Event listener cho nút bật/tắt âm thanh
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', toggleSound);
    }
    
    // Chuẩn bị âm thanh khi trang load
    prepareBattleSound();
    
    // Hàm hiển thị popup đếm ngược 5 giây
    function showCountdownPopup() {
        if (!soundEnabled || isCountdownActive) return;
        
        isCountdownActive = true;
        
        // Hiển thị popup
        countdownPopup.style.display = 'flex';
        countdownNumber.textContent = '5';
        
        // Phát âm thanh pre-battle
        if (preBattleSound) {
            preBattleSound.currentTime = 0;
            preBattleSound.volume = 0.7;
            preBattleSound.play().catch(error => {
                console.log('Không thể phát âm thanh pre-battle:', error);
            });
        }
        
        // Tranh thủ gọi câu hỏi về trong lúc đếm ngược
        console.log('🔄 Đang chuẩn bị câu hỏi trong lúc đếm ngược...');
        
        // Chuẩn bị câu hỏi đầu tiên ngay lập tức
        if (questions.length > 0) {
            showQuestion(currentQuestionIndex);
        }
        
        // Đếm ngược từ 5 đến 1
        let count = 5;
        const countdownInterval = setInterval(() => {
            count--;
            countdownNumber.textContent = count;
            
            if (count <= 0) {
                clearInterval(countdownInterval);
                isCountdownActive = false;
                // Ẩn popup sau 1 giây
                setTimeout(() => {
                    countdownPopup.style.display = 'none';
                    // Bắt đầu trận đấu ngay lập tức với câu hỏi đã sẵn sàng
                    startTimer();
                }, 1000);
            }
        }, 1000);
    }
    
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
    let totalTimeRemaining = 60; // Tổng thời gian (có thể điều chỉnh theo số câu hỏi nếu cần)
    
    // Hàm lấy câu hỏi từ server và bắt đầu trò chơi
    function fetchQuestionsAndStart() {
        fetch('/admin/api/questions/random?count=20')
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
                currentQuestionIndex = 0;
                showQuestion(currentQuestionIndex);
            })
            .catch(error => {
                console.error('Lỗi khi lấy câu hỏi:', error);
                // Hiển thị thông báo lỗi cho người dùng
                questionTextEl.textContent = `Lỗi: Không thể tải câu hỏi từ database. ${error.message}`;
                alert('Không thể tải câu hỏi. Vui lòng thử lại sau hoặc liên hệ admin.');
            });
    }

    // Lấy câu hỏi lần đầu
    fetchQuestionsAndStart();
    

    
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
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
        }
        
        // Dừng âm thanh đúng/sai
        if (correctSound) {
            correctSound.pause();
            correctSound.currentTime = 0;
        }
        if (wrongSound) {
            wrongSound.pause();
            wrongSound.currentTime = 0;
        }
        
        // Reset trạng thái trò chơi
        currentQuestionIndex = 0;
        playerScore = 0;
        userAnswers = [];
        totalTimeRemaining = 60; // Khôi phục thời gian tổng
        isCountdownActive = false; // Reset trạng thái đếm ngược
        
        // Reset giao diện
        soloBattleRoom.style.display = 'block';
        resultRoom.style.display = 'none';
        userScoreEl.textContent = '0';
        
        // Lấy bộ câu hỏi mới và bắt đầu
        questions = [];
        fetchQuestionsAndStart();
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
            // Không gọi startTimer() ở đây nữa, sẽ gọi sau khi đếm ngược
            // Chỉ hiển thị câu hỏi
        }
        
        // Focus vào input để người dùng có thể nhập ngay
        answerInput.focus();
        
        // Nếu là câu hỏi đầu tiên, bắt đầu đếm ngược
        if (index === 0) {
            showCountdownPopup();
        }
    }
    
    // Trả lời câu hỏi
    function submitAnswer() {
        if (currentQuestionIndex >= questions.length) return;
        
        const answerInput = document.getElementById('answer-input');
        let userAnswer = answerInput.value.trim();
        
        // Nếu người chơi bấm Enter khi không nhập gì => coi như "không trả lời"
        if (!userAnswer) {
            userAnswer = 'không trả lời';
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
            playAnswerSound(true); // Phát âm thanh đúng
        } else {
            answerResult.textContent = `Sai! Đáp án đúng: ${question.answer}`;
            answerResult.className = 'answer-result incorrect';
            playAnswerSound(false); // Phát âm thanh sai
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
        }, 1000);
    }
    
    // Kiểm tra câu trả lời (chỉ khớp hoàn toàn sau khi chuẩn hóa)
    function checkAnswer(userAnswer, correctAnswer) {
        const normalizedUserAnswer = userAnswer.trim().toLowerCase();
        const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
        return normalizedUserAnswer === normalizedCorrectAnswer;
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
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
        }
        
        // Dừng âm thanh đúng/sai
        if (correctSound) {
            correctSound.pause();
            correctSound.currentTime = 0;
        }
        if (wrongSound) {
            wrongSound.pause();
            wrongSound.currentTime = 0;
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
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
        }
        
        // Dừng âm thanh đúng/sai
        if (correctSound) {
            correctSound.pause();
            correctSound.currentTime = 0;
        }
        if (wrongSound) {
            wrongSound.pause();
            wrongSound.currentTime = 0;
        }
        
        // Cập nhật điểm số
        finalScoreEl.textContent = playerScore;
        
        // Đếm số câu trả lời đúng
        let correctAnswersCount = userAnswers.filter(answer => answer.isCorrect).length;
        
        // Lưu kết quả trận đấu vào server
        saveSoloGameResult(playerScore, correctAnswersCount);
        
        // Tạo danh sách xem lại câu hỏi
        questionReviewListEl.innerHTML = '';
        
        // Hiển thị đáp án cho tất cả câu hỏi
        for (let i = 0; i < questions.length; i++) {
            const div = document.createElement('div');
            const question = questions[i];
            
            // Tìm câu trả lời tương ứng (nếu có)
            const answer = userAnswers.find(a => a.questionId === question.id);
            
            if (answer) {
                // Có câu trả lời
                div.className = `question-review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
                
                let answerText = 'Không trả lời';
                if (answer.userAnswer !== null) {
                    answerText = answer.userAnswer;
                }
                
                div.innerHTML = `
                    <h4>Câu ${i + 1}: ${answer.questionText}</h4>
                    <p>Câu trả lời của bạn: <strong>${answerText}</strong></p>
                    <p>Câu trả lời đúng: <strong>${answer.correctAnswer}</strong></p>
                `;
            } else {
                // Không có câu trả lời (câu hỏi bị bỏ qua)
                div.className = 'question-review-item unanswered';
                
                div.innerHTML = `
                    <h4>Câu ${i + 1}: ${question.text}</h4>
                    <p>Câu trả lời của bạn: <strong>Không trả lời</strong></p>
                    <p>Câu trả lời đúng: <strong>${question.answer}</strong></p>
                `;
            }
            
            questionReviewListEl.appendChild(div);
        }
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