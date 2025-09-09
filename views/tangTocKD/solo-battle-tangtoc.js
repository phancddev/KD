// Solo Battle Tăng Tốc JavaScript
class TangTocSoloBattle {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.timer = null;
        this.timeLeft = 0;
        this.isGameActive = false;
        this.soundEnabled = true;
        
        this.initializeElements();
        this.bindEvents();
        this.loadUserInfo();
        this.startGame();
    }

    initializeElements() {
        this.elements = {
            usernameDisplay: document.getElementById('username-display'),
            currentQuestion: document.getElementById('current-question'),
            totalQuestions: document.getElementById('total-questions'),
            totalTimer: document.getElementById('total-timer'),
            questionText: document.getElementById('question-text'),
            questionImage: document.getElementById('question-image'),
            answerInput: document.getElementById('answer-input'),
            submitAnswer: document.getElementById('submit-answer'),
            answerResult: document.getElementById('answer-result'),
            progressBar: document.getElementById('progress-bar'),
            userScore: document.getElementById('user-score'),
            soloBattleRoom: document.getElementById('solo-battle-room'),
            resultRoom: document.getElementById('result-room'),
            finalScore: document.getElementById('final-score'),
            maxScore: document.getElementById('max-score'),
            questionReviewList: document.getElementById('question-review-list'),
            playAgainBtn: document.getElementById('play-again-btn'),
            countdownPopup: document.getElementById('countdown-popup'),
            countdownNumber: document.getElementById('countdown-number'),
            soundToggle: document.getElementById('sound-toggle'),
            soundIcon: document.getElementById('sound-icon'),
            battleSound: document.getElementById('battle-sound'),
            preBattleSound: document.getElementById('pre-battle-sound'),
            correctSound: document.getElementById('correct-sound'),
            wrongSound: document.getElementById('wrong-sound')
        };
    }

    bindEvents() {
        this.elements.submitAnswer.addEventListener('click', () => this.submitAnswer());
        this.elements.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitAnswer();
        });
        this.elements.playAgainBtn.addEventListener('click', () => this.restartGame());
        this.elements.soundToggle.addEventListener('click', () => this.toggleSound());
    }

    async loadUserInfo() {
        try {
            const response = await fetch('/api/user', { credentials: 'include' });
            if (response.ok) {
                const user = await response.json();
                this.elements.usernameDisplay.textContent = user.username;
            }
        } catch (error) {
            console.error('Lỗi khi tải thông tin người dùng:', error);
        }
    }

    async startGame() {
        try {
            // Hiển thị countdown
            this.showCountdown();
            
            // Tải câu hỏi Tăng Tốc
            await this.loadTangTocQuestions();
            
            // Bắt đầu game sau countdown
            setTimeout(() => {
                this.hideCountdown();
                this.startBattle();
            }, 5000);
            
        } catch (error) {
            console.error('Lỗi khi bắt đầu game:', error);
            alert('Không thể tải câu hỏi. Vui lòng thử lại.');
        }
    }

    async loadTangTocQuestions() {
        try {
            const response = await fetch('/api/tangtoc/questions', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Không thể tải câu hỏi Tăng Tốc');
            }
            
            this.questions = await response.json();
            // Fallback: ensure correct time per question number
            this.questions = this.questions.map(q => ({
                ...q,
                timeLimit: q.timeLimit || (q.questionNumber === 1 ? 10 : q.questionNumber === 2 ? 20 : q.questionNumber === 3 ? 30 : 40)
            }));
            console.log('Loaded TangToc questions:', this.questions);
            
            if (this.questions.length === 0) {
                throw new Error('Không có câu hỏi Tăng Tốc nào');
            }
            
        } catch (error) {
            console.error('Lỗi khi tải câu hỏi:', error);
            throw error;
        }
    }

    showCountdown() {
        this.elements.countdownPopup.style.display = 'flex';
        this.elements.preBattleSound.play().catch(e => console.log('Không thể phát âm thanh'));
        
        let count = 5;
        this.elements.countdownNumber.textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                this.elements.countdownNumber.textContent = count;
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    hideCountdown() {
        this.elements.countdownPopup.style.display = 'none';
    }

    startBattle() {
        this.isGameActive = true;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        
        this.elements.totalQuestions.textContent = this.questions.length;
        this.elements.maxScore.textContent = this.questions.length;
        
        this.showQuestion();
    }

    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endGame();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        
        // Cập nhật UI
        this.elements.currentQuestion.textContent = this.currentQuestionIndex + 1;
        this.elements.questionText.textContent = question.text;
        
        // Hiển thị ảnh nếu có
        if (question.imageUrl) {
            this.elements.questionImage.src = question.imageUrl;
            this.elements.questionImage.style.display = 'block';
            this.elements.questionImage.alt = `Câu hỏi ${this.currentQuestionIndex + 1}`;
        } else {
            this.elements.questionImage.style.display = 'none';
        }
        
        // Reset input
        this.elements.answerInput.value = '';
        this.elements.answerResult.innerHTML = '';
        this.elements.answerInput.focus();
        
        // Bắt đầu timer
        this.startTimer(question.timeLimit);
        
        // Cập nhật progress bar
        this.updateProgressBar();
    }

    startTimer(timeLimit) {
        this.timeLeft = timeLimit;
        this.elements.totalTimer.textContent = this.timeLeft;
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.elements.totalTimer.textContent = this.timeLeft;
            
            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    timeUp() {
        clearInterval(this.timer);
        this.submitAnswer(true); // true = time up
    }

    async submitAnswer(isTimeUp = false) {
        if (!this.isGameActive) return;
        
        clearInterval(this.timer);
        
        const userAnswer = this.elements.answerInput.value.trim();
        const question = this.questions[this.currentQuestionIndex];
        
        // Lưu câu trả lời
        this.userAnswers.push({
            questionId: question.id,
            questionText: question.text,
            questionImageUrl: question.imageUrl,
            correctAnswer: question.answer,
            userAnswer: userAnswer,
            isCorrect: false,
            isTimeUp: isTimeUp,
            timeLeft: this.timeLeft
        });
        
        // Kiểm tra đáp án
        if (!isTimeUp && userAnswer) {
            const isCorrect = this.checkAnswer(userAnswer, question.answer, question.acceptedAnswers);
            this.userAnswers[this.userAnswers.length - 1].isCorrect = isCorrect;
            
            if (isCorrect) {
                this.score++;
                this.showAnswerResult('correct', 'Chính xác!');
                this.elements.correctSound.play().catch(e => console.log('Không thể phát âm thanh'));
            } else {
                this.showAnswerResult('incorrect', `Sai! Đáp án đúng: ${question.answer}`);
                this.elements.wrongSound.play().catch(e => console.log('Không thể phát âm thanh'));
            }
        } else if (isTimeUp) {
            this.showAnswerResult('timeup', `Hết thời gian! Đáp án đúng: ${question.answer}`);
        } else {
            this.showAnswerResult('empty', `Chưa trả lời! Đáp án đúng: ${question.answer}`);
        }
        
        // Cập nhật điểm
        this.elements.userScore.textContent = this.score;
        
        // Chuyển câu tiếp theo sau 2 giây
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.showQuestion();
        }, 2000);
    }

    checkAnswer(userAnswer, correctAnswer, acceptedAnswers = []) {
        const normalize = (text) => (text || '').toString().trim().toLowerCase();
        
        const normalizedUserAnswer = normalize(userAnswer);
        const normalizedCorrectAnswer = normalize(correctAnswer);
        
        // Kiểm tra với đáp án chính
        if (normalizedUserAnswer === normalizedCorrectAnswer) return true;
        
        // Kiểm tra với các đáp án bổ sung
        if (Array.isArray(acceptedAnswers)) {
            for (const a of acceptedAnswers) {
                const answerText = typeof a === 'string' ? a : (a && a.answer ? a.answer : '');
                if (normalize(answerText) === normalizedUserAnswer) return true;
            }
        }
        
        return false;
    }

    showAnswerResult(type, message) {
        this.elements.answerResult.innerHTML = `
            <div class="answer-result-${type}" style="
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                font-weight: 600;
                margin-top: 10px;
                ${type === 'correct' ? 'background: rgba(34, 197, 94, 0.1); color: #059669; border: 1px solid rgba(34, 197, 94, 0.3);' : ''}
                ${type === 'incorrect' ? 'background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3);' : ''}
                ${type === 'timeup' ? 'background: rgba(107, 114, 128, 0.1); color: #6b7280; border: 1px solid rgba(107, 114, 128, 0.3);' : ''}
                ${type === 'empty' ? 'background: rgba(107, 114, 128, 0.1); color: #6b7280; border: 1px solid rgba(107, 114, 128, 0.3);' : ''}
            ">
                ${message}
            </div>
        `;
    }

    updateProgressBar() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.elements.progressBar.style.width = `${progress}%`;
    }

    async endGame() {
        this.isGameActive = false;
        clearInterval(this.timer);
        
        // Lưu kết quả
        await this.saveGameResult();
        
        // Hiển thị kết quả
        this.showResults();
    }

    async saveGameResult() {
        try {
            const response = await fetch('/api/solo-game/finish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    score: this.score,
                    correctAnswers: this.score,
                    totalQuestions: this.questions.length,
                    mode: 'tangtoc'
                })
            });
            
            if (!response.ok) {
                throw new Error('Không thể lưu kết quả');
            }
            
            const result = await response.json();
            console.log('Game result saved:', result);
            
        } catch (error) {
            console.error('Lỗi khi lưu kết quả:', error);
        }
    }

    showResults() {
        this.elements.soloBattleRoom.style.display = 'none';
        this.elements.resultRoom.style.display = 'block';
        
        this.elements.finalScore.textContent = this.score;
        
        // Hiển thị review các câu hỏi
        this.showQuestionReview();
    }

    showQuestionReview() {
        this.elements.questionReviewList.innerHTML = '';
        
        this.userAnswers.forEach((answer, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = `question-review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            
            let statusText = '';
            if (answer.isTimeUp) {
                statusText = 'Hết thời gian';
            } else if (answer.isCorrect) {
                statusText = 'Đúng';
            } else {
                statusText = 'Sai';
            }
            
            reviewItem.innerHTML = `
                <span class="question-number-review">Câu ${index + 1}</span>
                <div class="question-text-review">
                    ${answer.questionText}
                    ${answer.questionImageUrl ? `<br><img src="${answer.questionImageUrl}" style="max-width: 200px; margin-top: 10px; border-radius: 8px;" alt="Hình ảnh câu hỏi">` : ''}
                </div>
                <div class="answer-info">
                    <span class="user-answer">Bạn: ${answer.userAnswer || 'Chưa trả lời'}</span>
                    <span class="correct-answer">Đúng: ${answer.correctAnswer}</span>
                    <span class="answer-status ${answer.isCorrect ? 'correct' : 'incorrect'}">${statusText}</span>
                    <button class="report-btn" onclick="window.__openReportModal({
                        mode: 'solo',
                        questionId: ${answer.questionId},
                        questionText: '${answer.questionText.replace(/'/g, "\\'")}',
                        correctAnswer: '${answer.correctAnswer.replace(/'/g, "\\'")}',
                        userAnswer: '${(answer.userAnswer || '').replace(/'/g, "\\'")}',
                        sessionId: null,
                        roomId: null
                    })">Báo lỗi</button>
                </div>
            `;
            
            this.elements.questionReviewList.appendChild(reviewItem);
        });
    }

    restartGame() {
        this.elements.resultRoom.style.display = 'none';
        this.elements.soloBattleRoom.style.display = 'block';
        this.startGame();
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.elements.soundIcon.textContent = this.soundEnabled ? '🔊' : '🔇';
        
        // Tắt/bật âm thanh cho tất cả audio elements
        const audioElements = [
            this.elements.battleSound,
            this.elements.preBattleSound,
            this.elements.correctSound,
            this.elements.wrongSound
        ];
        
        audioElements.forEach(audio => {
            audio.muted = !this.soundEnabled;
        });
    }
}

// Khởi tạo game khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    new TangTocSoloBattle();
});
