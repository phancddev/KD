// Solo Battle Tăng Tốc JavaScript (public)
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
    static extractMediaUrlFromText(text){
        if(!text) return null;
        // Case 1: full pattern with data tail
        const m = text.match(/@?(https:\/\/[^\s]+?\/revision\/latest\?cb=[^&]+&path-prefix=vi)\s+data:image\/[^^\s]+/);
        if (m && m[1]) return decodeURIComponent(m[1]);
        // Case 2: plain https URL (image or mp4) without data tail
        const m2 = text.match(/@?(https:\/\/[^\s]+?(?:\.png|\.jpe?g|\.webp|\.gif|\.mp4)\/[\w\-\/]+\?[^\s]+|https:\/\/[^\s]+?\.(?:png|jpe?g|webp|gif|mp4)(?:\?[^\s]+)?)/i);
        if (m2 && m2[1]) return m2[1];
        // Fallback: any https URL
        const m3 = text.match(/@?(https:\/\/[^\s]+)/);
        return m3 && m3[1] ? m3[1] : null;
    }
    static cleanQuestionText(text){
        if(!text) return text;
        return text
            .replace(/@?https:\/\/[^\s]+\s+data:image\/[^^\s]+/g,'')
            .replace(/@?https:\/\/[^\s]+/g,'')
            .trim();
    }

    initializeElements() {
        this.elements = {
            usernameDisplay: document.getElementById('username-display'),
            currentQuestion: document.getElementById('current-question'),
            totalQuestions: document.getElementById('total-questions'),
            totalTimer: document.getElementById('total-timer'),
            questionText: document.getElementById('question-text'),
            questionMedia: document.getElementById('question-media'),
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
        this.elements.answerInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.submitAnswer(); });
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
        } catch {}
    }

    async startGame() {
        try {
            console.log('[SoloTangToc] startGame() begin');
            this.showCountdown();
            await this.loadTangTocQuestions();
            console.log('[SoloTangToc] questions loaded:', this.questions);
            setTimeout(() => { this.hideCountdown(); this.startBattle(); }, 5000);
        } catch (e) {
            console.error('[SoloTangToc] startGame() error:', e);
            alert('Không thể tải câu hỏi. Vui lòng thử lại.');
        }
    }

    async loadTangTocQuestions() {
        console.log('[SoloTangToc] fetching /public/tangtoc/questions ...');
        const res = await fetch('/public/tangtoc/questions');
        console.log('[SoloTangToc] response status:', res.status);
        if (!res.ok) {
            let text = '';
            try { text = await res.text(); } catch {}
            console.error('[SoloTangToc] response not ok. body:', text);
            throw new Error('fetch-questions-failed');
        }
        const text = await res.text();
        console.log('[SoloTangToc] raw body length:', text.length);
        try {
            this.questions = JSON.parse(text);
        } catch (e) {
            console.error('[SoloTangToc] JSON parse failed:', e, 'body:', text);
            throw e;
        }
        this.questions = this.questions.map(q => {
            const isQ4 = Number(q.questionNumber) === 4;
            const computedTime = isQ4 ? 60 : (q.timeLimit || (q.questionNumber === 1 ? 10 : q.questionNumber === 2 ? 20 : 30));
            return {
                ...q,
                timeLimit: computedTime,
                mediaUrl: TangTocSoloBattle.extractMediaUrlFromText(q.text) || q.imageUrl,
                cleanText: TangTocSoloBattle.cleanQuestionText(q.text)
            };
        });
        console.log('[SoloTangToc] normalized questions:', this.questions);
        if (this.questions.length === 0) throw new Error('no-questions');

        // Preload media (images/videos) so the first render is instant
        this.preloadedMedia = new Map();
        try {
            await Promise.all(this.questions.map(q => this.preloadMedia(q.mediaUrl)));
        } catch (e) {
            console.warn('[SoloTangToc] preloadMedia warning:', e);
        }
    }

    async preloadMedia(url){
        if (!url || this.preloadedMedia.has(url)) return;
        // For images: use Image() to warm cache; for other resources (e.g., video), fire a HEAD fetch
        try {
            if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) {
                await new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(); img.onerror = () => resolve(); img.referrerPolicy = 'no-referrer'; img.src = url; });
            } else if (/\.mp4/i.test(url)) {
                // Không preload video mp4 để tránh request HEAD
            } else {
                await fetch(url, { method: 'HEAD', mode: 'no-cors' }).catch(() => {});
            }
            this.preloadedMedia.set(url, true);
        } catch {}
    }

    showCountdown() {
        this.elements.countdownPopup.style.display = 'flex';
        this.elements.preBattleSound.play().catch(() => {});
        let count = 5; this.elements.countdownNumber.textContent = count;
        const it = setInterval(() => { count--; if (count > 0) this.elements.countdownNumber.textContent = count; else clearInterval(it); }, 1000);
    }
    hideCountdown() { this.elements.countdownPopup.style.display = 'none'; }

    startBattle() {
        this.isGameActive = true; this.currentQuestionIndex = 0; this.score = 0; this.userAnswers = [];
        this.elements.totalQuestions.textContent = this.questions.length; this.elements.maxScore.textContent = this.questions.length;
        this.showQuestion();
    }

    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) return this.endGame();
        const q = this.questions[this.currentQuestionIndex];
        this.elements.currentQuestion.textContent = this.currentQuestionIndex + 1;
        this.elements.questionText.textContent = q.cleanText || q.text;
        if (q.mediaUrl) {
            this.elements.questionMedia.innerHTML = '';
            if (/\.mp4/i.test(q.mediaUrl)) {
                // Sử dụng proxy để hỗ trợ Range + CORS cho nguồn Wikia
                const proxied = `/api/tangtoc/media-proxy?url=${encodeURIComponent(q.mediaUrl)}`;
                const video = document.createElement('video');
                // Autoplay + không cho tua (ẩn controls và chặn seek)
                video.autoplay = true;
                video.muted = true; // cần muted để autoplay ổn định
                video.playsInline = true;
                video.src = proxied;
                // Ẩn controls để không cho người chơi tua
                video.controls = false;
                // Chặn seek bằng cách cố định currentTime khi có ý định tua
                let lastTime = 0;
                video.addEventListener('timeupdate', () => { lastTime = video.currentTime; });
                video.addEventListener('seeking', () => { if (Math.abs(video.currentTime - lastTime) > 0.5) video.currentTime = lastTime; });
                // Ngăn dùng phím tắt tua nhanh
                video.addEventListener('keydown', (e) => { if (['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key)) e.preventDefault(); });
                // Fallback sang URL gốc nếu proxy gặp sự cố
                video.addEventListener('error', () => { if (video.src !== q.mediaUrl) video.src = q.mediaUrl; }, { once: true });
                this.elements.questionMedia.appendChild(video);
            } else {
                const img = document.createElement('img');
                img.src = q.mediaUrl;
                img.alt = 'Hình ảnh câu hỏi';
                img.referrerPolicy = 'no-referrer';
                img.setAttribute('crossorigin', 'anonymous');
                this.elements.questionMedia.appendChild(img);
            }
            this.elements.questionMedia.style.display = 'block';
        } else {
            this.elements.questionMedia.innerHTML = '';
            this.elements.questionMedia.style.display = 'none';
        }
        this.elements.answerInput.value = ''; this.elements.answerResult.innerHTML=''; this.elements.answerInput.focus();
        this.startTimer(q.timeLimit); this.updateProgressBar();
    }

    startTimer(timeLimit) {
        this.timeLeft = timeLimit; this.elements.totalTimer.textContent = this.timeLeft;
        this.timer = setInterval(() => { this.timeLeft--; this.elements.totalTimer.textContent = this.timeLeft; if (this.timeLeft <= 0) this.timeUp(); }, 1000);
    }
    timeUp() { clearInterval(this.timer); this.submitAnswer(true); }

    async submitAnswer(isTimeUp=false) {
        if (!this.isGameActive) return; clearInterval(this.timer);
        const userAnswer = this.elements.answerInput.value.trim(); const q = this.questions[this.currentQuestionIndex];
        this.userAnswers.push({ questionId: q.id, questionText: q.text, questionImageUrl: q.imageUrl, correctAnswer: q.answer, userAnswer, isCorrect: false, isTimeUp, timeLeft: this.timeLeft });
        if (!isTimeUp && userAnswer) { const ok = this.checkAnswer(userAnswer, q.answer, q.acceptedAnswers); this.userAnswers[this.userAnswers.length-1].isCorrect = ok; if (ok) { this.score++; this.showAnswerResult('correct','Chính xác!'); this.elements.correctSound.play().catch(()=>{});} else { this.showAnswerResult('incorrect',`Sai! Đáp án đúng: ${q.answer}`); this.elements.wrongSound.play().catch(()=>{});} }
        else if (isTimeUp) this.showAnswerResult('timeup',`Hết thời gian! Đáp án đúng: ${q.answer}`); else this.showAnswerResult('empty',`Chưa trả lời! Đáp án đúng: ${q.answer}`);
        this.elements.userScore.textContent = this.score; setTimeout(()=>{ this.currentQuestionIndex++; this.showQuestion(); }, 2000);
    }

    checkAnswer(u, c, acc=[]) {
        const norm = t => (t||'').toString().trim().toLowerCase();
        if (norm(u) === norm(c)) return true; for (const a of (Array.isArray(acc)?acc:[])) { const t = typeof a==='string'?a:(a&&a.answer?a.answer:''); if (norm(t)===norm(u)) return true; } return false;
    }
    showAnswerResult(type,msg){ this.elements.answerResult.innerHTML = `<div class="answer-result-${type}" style="padding:10px;border-radius:8px;text-align:center;font-weight:600;margin-top:10px;${type==='correct'?'background:rgba(34,197,94,.1);color:#059669;border:1px solid rgba(34,197,94,.3);':''}${type==='incorrect'?'background:rgba(220,38,38,.1);color:#dc2626;border:1px solid rgba(220,38,38,.3);':''}${type==='timeup'?'background:rgba(107,114,128,.1);color:#6b7280;border:1px solid rgba(107,114,128,.3);':''}${type==='empty'?'background:rgba(107,114,128,.1);color:#6b7280;border:1px solid rgba(107,114,128,.3);':''}">${msg}</div>`; }
    updateProgressBar(){ const p=((this.currentQuestionIndex+1)/this.questions.length)*100; this.elements.progressBar.style.width=`${p}%`; }
    async endGame(){ this.isGameActive=false; clearInterval(this.timer); await this.saveGameResult(); this.showResults(); }
    async saveGameResult(){ try{ const r=await fetch('/api/solo-game/finish',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({score:this.score,correctAnswers:this.score,totalQuestions:this.questions.length,mode:'tangtoc'})}); if(!r.ok) throw 0; await r.json(); }catch{} }
    showResults(){ this.elements.soloBattleRoom.style.display='none'; this.elements.resultRoom.style.display='block'; this.elements.finalScore.textContent=this.score; this.showQuestionReview(); }
    showQuestionReview(){ this.elements.questionReviewList.innerHTML=''; this.userAnswers.forEach((a,i)=>{ const el=document.createElement('div'); el.className=`question-review-item ${a.isCorrect?'correct':'incorrect'}`; const status=a.isTimeUp?'Hết thời gian':(a.isCorrect?'Đúng':'Sai'); el.innerHTML=`<span class="question-number-review">Câu ${i+1}</span><div class="question-text-review">${a.questionText}${a.questionImageUrl?`<br><img src="${a.questionImageUrl}" style="max-width:200px;margin-top:10px;border-radius:8px;" alt="Hình ảnh câu hỏi">`:''}</div><div class="answer-info"><span class="user-answer">Bạn: ${a.userAnswer||'Chưa trả lời'}</span><span class="correct-answer">Đúng: ${a.correctAnswer}</span><span class="answer-status ${a.isCorrect?'correct':'incorrect'}">${status}</span><button class="report-btn" onclick="window.__openReportModal({mode:'solo',questionId:${a.questionId},questionText:'${a.questionText.replace(/'/g,"\\'")}',correctAnswer:'${a.correctAnswer.replace(/'/g,"\\'")}',userAnswer:'${(a.userAnswer||'').replace(/'/g,"\\'")}',sessionId:null,roomId:null})">Báo lỗi</button></div>`; this.elements.questionReviewList.appendChild(el); }); }
    restartGame(){ this.elements.resultRoom.style.display='none'; this.elements.soloBattleRoom.style.display='block'; this.startGame(); }
    toggleSound(){ this.soundEnabled=!this.soundEnabled; this.elements.soundIcon.textContent=this.soundEnabled?'🔊':'🔇'; [this.elements.battleSound,this.elements.preBattleSound,this.elements.correctSound,this.elements.wrongSound].forEach(a=>a.muted=!this.soundEnabled); }
}
document.addEventListener('DOMContentLoaded',()=>{ new TangTocSoloBattle(); });


