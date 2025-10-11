// Room Battle Tăng Tốc JavaScript
class TangTocRoomBattle {
    constructor() {
        this.socket = io();
        this.roomId = null;
        this.roomCode = null;
        this.roomName = null;
        this.userId = null;
        this.username = null;
        this.isHost = false;
        this.isGameActive = false;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.timer = null;
        this.timeLeft = 0;
        this.participants = [];
        this.soundEnabled = true;
        this.joined = false;
        
        this.initializeElements();
        this.bindEvents();
        this.bindSocketEvents();
        this.loadUserInfo();
    }

    static extractMediaUrlFromText(text){
        if(!text) return null;
        const m = text.match(/@?(https:\/\/[^^\s]+?\/revision\/latest\?cb=[^&]+&path-prefix=vi)\s+data:image\/[^^\s]+/);
        if (m && m[1]) return decodeURIComponent(m[1]);
        const m2 = text.match(/@?(https:\/\/[^^\s]+?(?:\.png|\.jpe?g|\.webp|\.gif|\.mp4)\/[\w\-\/]+\?[^\s]+|https:\/\/[^^\s]+?\.(?:png|jpe?g|webp|gif|mp4)(?:\?[^\s]+)?)/i);
        if (m2 && m2[1]) return m2[1];
        const m3 = text.match(/@?(https:\/\/[^^\s]+)/);
        return m3 && m3[1] ? m3[1] : null;
    }
    static cleanQuestionText(text){
        if(!text) return text;
        return text
            .replace(/@?https:\/\/[^^\s]+\s+data:image\/[^^\s]+/g,'')
            .replace(/@?https:\/\/[^^\s]+/g,'')
            .trim();
    }

    initializeElements() {
        this.elements = {
            usernameDisplay: document.getElementById('username-display'),
            avatarText: document.getElementById('avatar-text'),
            roomNameDisplay: document.getElementById('room-name-display'),
            roomCodeDisplay: document.getElementById('room-code-display'),
            participantsList: document.getElementById('participants-list'),
            startBattleBtn: document.getElementById('start-battle-btn'),
            endRoomBtn: document.getElementById('end-room-btn'),
            waitingRoom: document.getElementById('waiting-room'),
            battleRoom: document.getElementById('battle-room'),
            resultRoom: document.getElementById('result-room'),
            battleCountdown: document.getElementById('battle-countdown'),
            battleCountdownNumber: document.getElementById('battle-countdown-number'),
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
            participantsStatus: document.getElementById('participants-status'),
            resultTableBody: document.getElementById('result-table-body'),
            questionReviewList: document.getElementById('question-review-list'),
            backToWaitingBtn: document.getElementById('back-to-waiting-btn'),
            playAgainBtn: document.getElementById('play-again-btn'),
            endGameBtn: document.getElementById('end-game-btn'),
            soundToggle: document.getElementById('sound-toggle'),
            soundIcon: document.getElementById('sound-icon'),
            battleSound: document.getElementById('battle-sound'),
            preBattleSound: document.getElementById('pre-battle-sound'),
            correctSound: document.getElementById('correct-sound'),
            wrongSound: document.getElementById('wrong-sound')
        };
    }

    bindEvents() {
        this.elements.startBattleBtn.addEventListener('click', () => this.startBattle());
        this.elements.endRoomBtn.addEventListener('click', () => this.endRoom());
        this.elements.submitAnswer.addEventListener('click', () => this.submitAnswer());
        this.elements.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitAnswer();
        });
        this.elements.backToWaitingBtn.addEventListener('click', () => this.backToWaiting());
        this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.elements.endGameBtn.addEventListener('click', () => this.endGame());
        this.elements.soundToggle.addEventListener('click', () => this.toggleSound());
    }

    bindSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('roomJoined', (data) => {
            console.log('Joined room:', data);
            this.roomId = data.roomId;
            this.roomCode = data.roomCode;
            this.roomName = data.roomName;
            this.isHost = data.isHost;
            this.updateRoomInfo();
        });

        this.socket.on('participantJoined', (data) => {
            console.log('Participant joined:', data);
            this.updateParticipantsList();
        });

        // Receive refreshed participant list from server and render immediately
        this.socket.on('participantList', (list) => {
            try {
                if (Array.isArray(list)) {
                    this.participants = list.map(p => ({
                        id: p.id,
                        username: p.username,
                        fullName: (p.fullName && String(p.fullName).trim()) || p.username,
                        isHost: !!p.isHost
                    }));
                    this.renderParticipantsList();
                }
            } catch (e) { console.error('participantList handling error', e); }
        });

        this.socket.on('participantLeft', (data) => {
            console.log('Participant left:', data);
            this.updateParticipantsList();
        });

        this.socket.on('battleStarted', (data) => {
            console.log('Battle started:', data);
            this.questions = data.questions;
            // Reset game state for new battle
            this.resetGame();
            this.startBattleUI();
        });

        this.socket.on('questionStarted', (data) => {
            console.log('Question started:', data);
            this.showQuestion(data);
        });

        this.socket.on('questionEnded', (data) => {
            console.log('Question ended:', data);
            this.showQuestionResult(data);
        });

        // Kết quả cá nhân sau khi hết giờ để play sound
        this.socket.on('questionResult', (data) => {
            if (!data) return;
            if (data.isCorrect) {
                this.elements.correctSound.play().catch(()=>{});
                this.showAnswerResult('correct', 'Chính xác!');
            } else {
                this.elements.wrongSound.play().catch(()=>{});
                // Chỉ hiển thị đáp án chính, đáp án phụ chỉ dùng để so sánh
                this.showAnswerResult('incorrect', `Sai! Đáp án đúng: ${data.correctAnswer || 'N/A'}`);
            }
            // Cập nhật lại bản ghi câu hỏi cho phần xem lại
            try {
                const qIdx = typeof data.questionIndex === 'number' ? data.questionIndex : this.currentQuestionIndex;
                const question = this.questions[qIdx];
                if (question) {
                    const i = this.userAnswers.findIndex(a => a.questionId === question.id);
                    if (i !== -1) {
                        this.userAnswers[i].isCorrect = !!data.isCorrect;
                        this.userAnswers[i].correctAnswer = data.correctAnswer || question.answer;
                        // Đánh dấu đây là kết quả chấm, không coi là hết thời gian
                        this.userAnswers[i].isTimeUp = false;
                    }
                }
            } catch {}
        });

        this.socket.on('battleEnded', (data) => {
            console.log('Battle ended:', data);
            this.showBattleResults(data);
        });

        this.socket.on('participantAnswer', (data) => {
            console.log('Participant answer:', data);
            this.updateParticipantStatus(data);
        });

        // Nhận cập nhật xếp hạng sau mỗi câu
        this.socket.on('rankingUpdate', (data) => {
            if (data && Array.isArray(data.ranking)) {
                this.renderRanking(data.ranking);
            }
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        });
    }

    async loadUserInfo() {
        try {
            const response = await fetch('/api/user', { credentials: 'include' });
            if (response.ok) {
                const user = await response.json();
                this.userId = user.id;
                this.username = user.username;
                this.fullName = (user.fullName && user.fullName.trim()) || user.username;
                this.elements.usernameDisplay.textContent = this.fullName;
                this.elements.avatarText.textContent = this.fullName.charAt(0).toUpperCase();
                // Chỉ join/create khi đã có thông tin người dùng
                if (!this.joined) {
                    this.joinRoom();
                }
            }
        } catch (error) {
            console.error('Lỗi khi tải thông tin người dùng:', error);
            // Dù lỗi vẫn thử join để không chặn luồng, nhưng sẽ fallback tên ngẫu nhiên
            if (!this.joined) {
                this.joinRoom();
            }
        }
    }

    joinRoom() {
        if (this.joined) return;
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('code');
        
        if (roomCode) {
            this.socket.emit('joinRoom', { roomCode, username: this.username, userId: this.userId, fullName: this.fullName });
        } else {
            // Hỏi tên phòng rồi tạo phòng mới (đọc từ localStorage nếu có)
            let nameFromHome = null;
            try { nameFromHome = localStorage.getItem('tangtocRoomName'); localStorage.removeItem('tangtocRoomName'); } catch(e) {}
            let defaultName = `Phòng Tăng Tốc - ${this.username || 'Người chơi'}`;
            let name = nameFromHome || window.prompt('Nhập tên phòng Tăng Tốc', defaultName);
            if (!name) name = defaultName;
            this.socket.emit('createRoom', { 
                name,
                mode: 'tangtoc',
                username: this.username,
                fullName: this.fullName,
                userId: this.userId
            });
        }
        this.joined = true;
    }

    updateRoomInfo() {
        this.elements.roomNameDisplay.textContent = this.roomName;
        this.elements.roomCodeDisplay.textContent = this.roomCode;
        
        if (this.isHost) {
            this.elements.startBattleBtn.style.display = 'inline-flex';
            this.elements.endRoomBtn.style.display = 'inline-flex';
        } else {
            this.elements.startBattleBtn.style.display = 'none';
            this.elements.endRoomBtn.style.display = 'none';
        }
    }

    async updateParticipantsList() {
        try {
            const response = await fetch(`/api/room/${this.roomId}/participants`, { 
                credentials: 'include' 
            });
            if (response.ok) {
                this.participants = await response.json();
                this.renderParticipantsList();
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật danh sách người tham gia:', error);
        }
    }

    renderParticipantsList() {
        console.log('🎯 [TangToc] renderParticipantsList called with:', this.participants);
        console.log('🔍 [TangToc] AvatarModule available?', typeof AvatarModule !== 'undefined');

        // Use AvatarModule if available
        if (typeof AvatarModule !== 'undefined') {
            console.log('✅ [TangToc] Using AvatarModule to render participants');
            AvatarModule.renderParticipantsList(this.elements.participantsList, this.participants);
            return;
        }

        console.warn('⚠️ [TangToc] AvatarModule not available, using fallback');
        // Fallback method
        this.elements.participantsList.innerHTML = '';

        this.participants.forEach(participant => {
            const participantDiv = document.createElement('div');
            participantDiv.className = 'participant-item';
            participantDiv.style.cssText = `
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(220, 38, 127, 0.2);
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
                transition: all 0.3s ease;
            `;

            const displayName = (participant.fullName && participant.fullName.trim()) || participant.username;
            const avatarInitial = displayName.charAt(0).toUpperCase();

            let avatarHTML;
            if (participant.avatar) {
                avatarHTML = `
                    <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; margin: 0 auto 0.5rem; border: 2px solid rgba(220, 38, 127, 0.3);">
                        <img src="${participant.avatar}?t=${Date.now()}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                `;
            } else {
                avatarHTML = `
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #dc2626, #ef4444); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin: 0 auto 0.5rem;">
                        ${avatarInitial}
                    </div>
                `;
            }

            participantDiv.innerHTML = `
                ${avatarHTML}
                <div class="participant-name" style="font-weight: 600; color: #374151;">${displayName}</div>
                <div style="font-size: 0.8rem; color: #6b7280;">${participant.isHost ? 'Chủ phòng' : 'Thành viên'}</div>
            `;

            this.elements.participantsList.appendChild(participantDiv);
        });
    }

    async startBattle() {
        if (!this.isHost) return;
        
        try {
            // Tải câu hỏi Tăng Tốc
            const response = await fetch('/api/tangtoc/questions', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Không thể tải câu hỏi Tăng Tốc');
            }
            
            const questions = await response.json();
            
            if (questions.length === 0) {
                alert('Không có câu hỏi Tăng Tốc nào');
                return;
            }
            
            // Bắt đầu trận đấu
            this.socket.emit('startBattle', { 
                roomId: this.roomId, 
                questions: questions 
            });
            
        } catch (error) {
            console.error('Lỗi khi bắt đầu trận đấu:', error);
            alert('Không thể bắt đầu trận đấu: ' + error.message);
        }
    }

    startBattleUI() {
        this.elements.waitingRoom.style.display = 'none';
        this.elements.battleRoom.style.display = 'block';
        
        // Hiển thị countdown
        this.showBattleCountdown();
        
        // Bắt đầu trận đấu sau countdown
        setTimeout(() => {
            this.hideBattleCountdown();
            this.socket.emit('readyForBattle', { roomId: this.roomId });
        }, 5000);
    }

    showBattleCountdown() {
        this.elements.battleCountdown.style.display = 'flex';
        this.elements.preBattleSound.play().catch(e => console.log('Không thể phát âm thanh'));
        
        let count = 5;
        this.elements.battleCountdownNumber.textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                this.elements.battleCountdownNumber.textContent = count;
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    hideBattleCountdown() {
        this.elements.battleCountdown.style.display = 'none';
    }

    showQuestion(questionData) {
        this.isGameActive = true;
        this.currentQuestionIndex = questionData.questionIndex;
        const question = questionData.question;
        
        // Cập nhật UI
        this.elements.currentQuestion.textContent = this.currentQuestionIndex + 1;
        this.elements.totalQuestions.textContent = this.questions.length;
        const cleanText = TangTocRoomBattle.cleanQuestionText(question.text) || question.text;
        this.elements.questionText.textContent = cleanText;
        
        // Hiển thị media (ảnh hoặc video) như solo
        const container = this.elements.questionText.parentElement;
        const mediaFrame = document.getElementById('media-frame');
        const oldVideo = container.querySelector('video[data-role="question-video"]') || (mediaFrame && mediaFrame.querySelector('video[data-role="question-video"]'));
        if (oldVideo) {
            try { oldVideo.pause(); } catch {}
            oldVideo.parentNode && oldVideo.parentNode.removeChild(oldVideo);
        }
        const mediaUrl = TangTocRoomBattle.extractMediaUrlFromText(question.text) || question.imageUrl;
        if (mediaUrl) {
            if (mediaFrame) mediaFrame.style.display = 'block';
            if (/\.mp4/i.test(mediaUrl)) {
                const proxied = `/api/tangtoc/media-proxy?url=${encodeURIComponent(mediaUrl)}`;
                const video = document.createElement('video');
                video.setAttribute('data-role','question-video');
                video.autoplay = true;
                // Nếu người dùng bật âm thanh, thử phát với âm thanh; nếu bị chặn sẽ fallback muted
                video.muted = !this.soundEnabled;
                video.playsInline = true;
                video.src = proxied;
                video.controls = false;
                let lastTime = 0;
                video.addEventListener('timeupdate', () => { lastTime = video.currentTime; });
                video.addEventListener('seeking', () => { if (Math.abs(video.currentTime - lastTime) > 0.5) video.currentTime = lastTime; });
                video.addEventListener('keydown', (e) => { if (["ArrowLeft","ArrowRight","Home","End","PageUp","PageDown"].includes(e.key)) e.preventDefault(); });
                // Thử phát, nếu bị chặn autoplay khi có âm thanh thì fallback muted
                try {
                    const p = video.play();
                    if (p && typeof p.then === 'function') {
                        p.catch(() => { try { video.muted = true; video.play(); } catch {} });
                    }
                } catch { try { video.muted = true; video.play(); } catch {} }
                video.addEventListener('error', () => { if (video.src !== mediaUrl) video.src = mediaUrl; }, { once: true });
                if (this.elements.questionImage) this.elements.questionImage.style.display = 'none';
                const mount = mediaFrame || container;
                mount.appendChild(video);
            } else {
                if (this.elements.questionImage) {
                    this.elements.questionImage.src = mediaUrl;
                    this.elements.questionImage.alt = `Câu hỏi ${this.currentQuestionIndex + 1}`;
                    this.elements.questionImage.referrerPolicy = 'no-referrer';
                    this.elements.questionImage.style.display = 'block';
                }
            }
        } else {
            if (this.elements.questionImage) this.elements.questionImage.style.display = 'none';
            if (mediaFrame) mediaFrame.style.display = 'none';
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
        
        const userAnswer = this.elements.answerInput.value.trim();
        const question = this.questions[this.currentQuestionIndex];
        
        // Lưu câu trả lời (preview; kết quả sẽ chấm khi hết giờ)
        const submittedAt = Math.max(0, (question.timeLimit || 0) - (this.timeLeft || 0));
        const lastIndex = this.userAnswers.length - 1;
        if (lastIndex >= 0 && this.userAnswers[lastIndex].questionId === question.id) {
            // Ghi đè submission hiện tại, luôn dùng thời điểm mới nhất
            this.userAnswers[lastIndex] = {
                ...this.userAnswers[lastIndex],
                userAnswer: userAnswer,
                timeLeft: this.timeLeft,
                isTimeUp: isTimeUp,
                submittedAt: submittedAt
            };
        } else {
            this.userAnswers.push({
                questionId: question.id,
                questionText: question.text,
                questionImageUrl: question.imageUrl,
                correctAnswer: question.answer,
                userAnswer: userAnswer,
                isCorrect: false,
                isTimeUp: isTimeUp,
                timeLeft: this.timeLeft,
                submittedAt: submittedAt
            });
        }

        // Gửi câu trả lời lên server (server giữ đáp án cuối cùng, chưa chấm ngay)
        this.socket.emit('submitAnswer', {
            roomId: this.roomId,
            questionIndex: this.currentQuestionIndex,
            answer: userAnswer,
            isTimeUp: isTimeUp,
            timeLeft: this.timeLeft
        });
        
        // Chỉ hiển thị preview đáp án và thời điểm nộp
        if (isTimeUp) {
            this.showAnswerResult('timeup', `Hết thời gian!`);
        } else {
            const preview = userAnswer ? `Đã nộp lúc giây ${submittedAt}: “${userAnswer}”` : `Đã ghi nhận, bạn có thể sửa trước khi hết giờ`;
            this.showAnswerResult('preview', preview);
        }
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

    showQuestionResult(resultData) {
        // Hiển thị kết quả câu hỏi
        console.log('Question result:', resultData);
    }

    updateParticipantStatus(data) {
        // Cập nhật trạng thái người tham gia
        console.log('Participant status update:', data);
    }

    renderRanking(ranking){
        if (!this.elements.participantsStatus) return;
        this.elements.participantsStatus.innerHTML = '';
        ranking.forEach((p, idx) => {
            const item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid rgba(220,38,127,.1);';
            item.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:24px;height:24px;border-radius:50%;background:#ef4444;color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">${idx+1}</span>
                    <span style="font-weight:600;color:#374151;">${p.username}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;color:#6b7280;">
                    <span>${p.score}</span>
                    <i class="fas fa-star" style="color:#f59e0b;"></i>
                </div>
            `;
            this.elements.participantsStatus.appendChild(item);
        });
    }

    showBattleResults(resultsData) {
        this.isGameActive = false;
        this.elements.battleRoom.style.display = 'none';
        this.elements.resultRoom.style.display = 'block';
        
        // Hiển thị kết quả
        this.renderResults(resultsData.results);
        this.showQuestionReview();
    }

    renderResults(results) {
        this.elements.resultTableBody.innerHTML = '';
        
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${result.username}</td>
                <td>${result.score}</td>
                <td>${result.timeSpent || 'N/A'}</td>
                <td>${result.totalQuestions}</td>
            `;
            this.elements.resultTableBody.appendChild(row);
        });
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
                <h4>Câu ${index + 1}</h4>
                <p>${answer.questionText}</p>
                ${answer.questionImageUrl ? `<img src="${answer.questionImageUrl}" style="max-width: 200px; margin: 10px 0; border-radius: 8px;" alt="Hình ảnh câu hỏi">` : ''}
                <p><strong>Bạn trả lời:</strong> ${answer.userAnswer || 'Chưa trả lời'}</p>
                <p><strong>Đáp án đúng:</strong> ${answer.correctAnswer}</p>
                <p><strong>Kết quả:</strong> ${statusText}</p>
                <button class="report-btn" onclick="window.__openReportModal({
                    mode: 'room',
                    questionId: ${answer.questionId},
                    questionText: '${answer.questionText.replace(/'/g, "\\'")}',
                    correctAnswer: '${answer.correctAnswer.replace(/'/g, "\\'")}',
                    userAnswer: '${(answer.userAnswer || '').replace(/'/g, "\\'")}',
                    sessionId: null,
                    roomId: ${this.roomId}
                })">Báo lỗi</button>
            `;
            
            this.elements.questionReviewList.appendChild(reviewItem);
        });
    }

    backToWaiting() {
        this.elements.resultRoom.style.display = 'none';
        this.elements.waitingRoom.style.display = 'block';
        this.resetGame();
    }

    playAgain() {
        this.elements.resultRoom.style.display = 'none';
        this.elements.waitingRoom.style.display = 'block';
        this.resetGame();
    }

    endRoom() {
        if (this.isHost) {
            this.socket.emit('endRoom', { roomId: this.roomId });
        }
    }

    endGame() {
        if (this.isHost) {
            this.socket.emit('endGame', { roomId: this.roomId });
        }
    }

    resetGame() {
        this.isGameActive = false;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        clearInterval(this.timer);
        this.elements.userScore.textContent = '0';
        // Reset UI elements
        this.elements.answerResult.innerHTML = '';
        this.elements.questionText.textContent = '';
        if (this.elements.questionImage) this.elements.questionImage.style.display = 'none';
        this.elements.totalTimer.textContent = '0';
        this.elements.currentQuestion.textContent = '0';
        this.elements.progressBar.style.width = '0%';
        // Reset participants status
        if (this.elements.participantsStatus) {
            this.elements.participantsStatus.innerHTML = '';
        }
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
        
        audioElements.forEach(audio => { audio.muted = !this.soundEnabled; });
        // Áp dụng cho video câu hỏi hiện tại (nếu có)
        try {
            const container = this.elements.questionText && this.elements.questionText.parentElement;
            const mediaFrame = document.getElementById('media-frame');
            const video = (container && container.querySelector('video[data-role="question-video"]')) || (mediaFrame && mediaFrame.querySelector('video[data-role="question-video"]'));
            if (video) {
                video.muted = !this.soundEnabled;
                if (this.soundEnabled) {
                    const p = video.play && video.play();
                    if (p && typeof p.then === 'function') p.catch(()=>{});
                }
            }
        } catch {}
    }
}

// Khởi tạo game khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    new TangTocRoomBattle();
});
