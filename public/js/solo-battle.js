document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const soloBattleRoom = document.getElementById('solo-battle-room');
    const resultRoom = document.getElementById('result-room');
    const currentQuestionEl = document.getElementById('current-question');
    const totalQuestionsEl = document.getElementById('total-questions');
    const timerEl = document.getElementById('timer');
    const totalTimerEl = document.getElementById('total-timer');
    const questionTextEl = document.getElementById('question-text');
    const progressBarEl = document.getElementById('progress-bar');
    const finalScoreEl = document.getElementById('final-score');
    const maxScoreEl = document.getElementById('max-score');
    const questionReviewListEl = document.getElementById('question-review-list');
    const playAgainBtn = document.getElementById('play-again-btn');
    const userScoreEl = document.getElementById('user-score');
    
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
    let timePerQuestion = 5; // 5 giây cho mỗi câu hỏi (60/12)
    
    // Lấy câu hỏi từ server
    fetch('/api/questions/random?count=12')
        .then(response => response.json())
        .then(data => {
            questions = data;
            
            // Thiết lập tổng số câu hỏi
            totalQuestionsEl.textContent = questions.length;
            maxScoreEl.textContent = questions.length * 10; // Mỗi câu 10 điểm
            
            // Bắt đầu với câu hỏi đầu tiên
            showQuestion(currentQuestionIndex);
        })
        .catch(error => {
            console.error('Lỗi khi lấy câu hỏi:', error);
            // Sử dụng câu hỏi mẫu nếu không lấy được từ server
            initSampleQuestions();
        });
    
    // Khởi tạo câu hỏi mẫu nếu không lấy được từ server
    function initSampleQuestions() {
        questions = [
            {
                id: 1,
                text: 'Thủ đô của Việt Nam là gì?',
                answer: 'Hà Nội'
            },
            {
                id: 2,
                text: 'Ngôn ngữ lập trình nào không phải là ngôn ngữ hướng đối tượng?',
                answer: 'C'
            },
            {
                id: 3,
                text: 'Đâu là một hệ điều hành mã nguồn mở?',
                answer: 'Linux'
            },
            {
                id: 4,
                text: 'HTML là viết tắt của gì?',
                answer: 'Hyper Text Markup Language'
            },
            {
                id: 5,
                text: 'Đâu là một ngôn ngữ lập trình phía máy chủ (server-side)?',
                answer: 'PHP'
            },
            {
                id: 6,
                text: 'Hệ quản trị cơ sở dữ liệu nào là mã nguồn mở?',
                answer: 'MySQL'
            },
            {
                id: 7,
                text: 'Giao thức nào được sử dụng để truyền tải trang web?',
                answer: 'HTTP'
            },
            {
                id: 8,
                text: 'Đơn vị đo tốc độ xử lý của CPU là gì?',
                answer: 'Hertz'
            },
            {
                id: 9,
                text: 'Ngôn ngữ lập trình nào được phát triển bởi Google?',
                answer: 'Go'
            },
            {
                id: 10,
                text: 'Đâu là một framework JavaScript phổ biến?',
                answer: 'React'
            },
            {
                id: 11,
                text: 'Hệ điều hành Android được phát triển dựa trên nhân (kernel) nào?',
                answer: 'Linux'
            },
            {
                id: 12,
                text: 'Đâu là một công cụ quản lý phiên bản mã nguồn?',
                answer: 'Git'
            }
        ];
        
        // Thiết lập tổng số câu hỏi
        totalQuestionsEl.textContent = questions.length;
        maxScoreEl.textContent = questions.length * 10; // Mỗi câu 10 điểm
        
        // Bắt đầu với câu hỏi đầu tiên
        showQuestion(currentQuestionIndex);
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
    
    // Chơi lại
    playAgainBtn.addEventListener('click', function() {
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
        
        // Bắt đầu đếm giờ
        startTimer();
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
        
        // Dừng đếm giờ
        clearInterval(timerInterval);
        
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
        
        const question = questions[currentQuestionIndex];
        
        // Lưu câu trả lời là "không trả lời"
        userAnswers.push({
            questionId: question.id,
            questionText: question.text,
            userAnswer: null,
            correctAnswer: question.answer,
            isCorrect: false
        });
        
        // Chờ trước khi chuyển sang câu hỏi tiếp theo
        setTimeout(() => {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        }, 2000);
    }
    
    // Bắt đầu đếm giờ cho câu hỏi hiện tại
    function startTimer() {
        let timeLeft = timePerQuestion; // Thời gian cho câu hỏi hiện tại
        timerEl.textContent = timeLeft;
        totalTimerEl.textContent = totalTimeRemaining;
        
        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            timeLeft--;
            totalTimeRemaining--;
            timerEl.textContent = timeLeft;
            totalTimerEl.textContent = totalTimeRemaining;
            
            // Đổi màu khi còn ít thời gian
            if (timeLeft <= 5) {
                timerEl.style.color = '#e74c3c';
            } else {
                timerEl.style.color = '';
            }
            
            // Đổi màu thời gian tổng khi còn ít
            if (totalTimeRemaining <= 10) {
                totalTimerEl.style.color = '#e74c3c';
            } else {
                totalTimerEl.style.color = '';
            }
            
            if (timeLeft <= 0 || totalTimeRemaining <= 0) {
                clearInterval(timerInterval);
                handleQuestionTimeout();
            }
        }, 1000);
    }
    
    // Hiển thị kết quả cuối cùng
    function showResults() {
        soloBattleRoom.style.display = 'none';
        resultRoom.style.display = 'block';
        
        // Dừng đếm giờ
        clearInterval(timerInterval);
        
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