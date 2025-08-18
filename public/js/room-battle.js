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
    
    // Audio element for battle sound
    const battleSound = document.getElementById('battle-sound');
    const preBattleSound = document.getElementById('pre-battle-sound');
    const soundToggleBtn = document.getElementById('sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    
    // Âm thanh cho câu trả lời đúng/sai - lấy từ HTML
    const correctSound = document.getElementById('correct-sound');
    const wrongSound = document.getElementById('wrong-sound');
    
    // Battle countdown elements
    const battleCountdown = document.getElementById('battle-countdown');
    const battleCountdownNumber = document.getElementById('battle-countdown-number');
    
    // Debug: Kiểm tra các element
    console.log('🔍 battleCountdown:', battleCountdown);
    console.log('🔍 battleCountdownNumber:', battleCountdownNumber);
    console.log('🔍 battleSound:', battleSound);
    console.log('🔍 preBattleSound:', preBattleSound);
    
    // Kiểm tra xem các element có tồn tại không
    if (!battleCountdown) {
        console.error('❌ battleCountdown không tìm thấy!');
    }
    if (!battleCountdownNumber) {
        console.error('❌ battleCountdownNumber không tìm thấy!');
    }
    
    // Biến để theo dõi trạng thái âm thanh
    let soundEnabled = true;
    
    // Biến để theo dõi trạng thái đếm ngược
    let isCountdownActive = false;
    
    // Hàm để kiểm tra và chuẩn bị âm thanh
    function prepareBattleSound() {
        console.log('🔊 prepareBattleSound được gọi');
        
        if (battleSound) {
            // Đặt âm lượng mặc định
            battleSound.volume = 0.7;
            // Preload âm thanh
            battleSound.load();
            console.log('✅ battleSound đã được chuẩn bị');
        } else {
            console.log('❌ battleSound không tồn tại');
        }
        
        if (preBattleSound) {
            // Đặt âm lượng mặc định
            preBattleSound.volume = 0.7;
            // Preload âm thanh
            preBattleSound.load();
            console.log('✅ preBattleSound đã được chuẩn bị');
        } else {
            console.log('❌ preBattleSound không tồn tại');
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
        console.log('✅ Âm thanh đúng/sai đã được chuẩn bị');
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
        console.log('✅ Event listener cho soundToggleBtn đã được thêm');
    } else {
        console.log('❌ soundToggleBtn không tìm thấy');
    }
    
    // Chuẩn bị âm thanh khi trang load
    console.log('🚀 Chuẩn bị âm thanh khi trang load...');
    prepareBattleSound();
    
    // Khởi tạo biến TRƯỚC khi định nghĩa các hàm
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
    let gameAnswers = []; // Lưu câu trả lời local
    // Cờ ổn định kết nối
    let socketInitialized = false; // tránh connect socket nhiều lần
    let roomJoinInitiated = false; // tránh emit join_room nhiều lần

    // Hàm hiển thị countdown 5 giây trực tiếp trong battle room
    function showBattleCountdown() {
        console.log('🎯 showBattleCountdown được gọi!');
        console.log('🔊 soundEnabled:', soundEnabled);
        console.log('⏰ isCountdownActive:', isCountdownActive);
        console.log('📚 allQuestions length:', allQuestions.length);
        console.log('🔢 myQuestionOrder:', myQuestionOrder);
        console.log('📍 currentQuestionIndex:', currentQuestionIndex);
        
        if (!soundEnabled || isCountdownActive) {
            console.log('❌ Không thể hiện countdown - soundEnabled:', soundEnabled, 'isCountdownActive:', isCountdownActive);
            return;
        }
        
        // Kiểm tra xem có câu hỏi không
        if (allQuestions.length === 0) {
            console.log('❌ Không thể hiện countdown - chưa có câu hỏi');
            return;
        }
        
        // Kiểm tra xem các element có tồn tại không
        if (!battleCountdown) {
            console.error('❌ battleCountdown không tồn tại!');
            return;
        }
        if (!battleCountdownNumber) {
            console.error('❌ battleCountdownNumber không tìm thấy!');
            return;
        }
        
        isCountdownActive = true;
        console.log('✅ Bắt đầu hiển thị countdown 5 giây!');
        
        // Hiển thị countdown
        battleCountdown.style.display = 'flex';
        battleCountdownNumber.textContent = '5';
        console.log('📱 Countdown đã hiện, số đếm: 5');
        
        // Phát âm thanh pre-battle ngay lập tức
        if (preBattleSound) {
            preBattleSound.currentTime = 0;
            preBattleSound.volume = 0.7;
            preBattleSound.play().catch(error => {
                console.log('❌ Không thể phát âm thanh pre-battle:', error);
            });
            console.log('🔊 Đang phát âm thanh pre-battle...');
        } else {
            console.log('❌ preBattleSound không tồn tại!');
            console.error('❌ preBattleSound element không tìm thấy!');
        }
        
        // Tranh thủ gọi câu hỏi về trong lúc đếm ngược
        console.log('🔄 Đang chuẩn bị câu hỏi trong lúc đếm ngược...');
        
        // Chuẩn bị câu hỏi đầu tiên ngay lập tức
        const questionIndex = myQuestionOrder[currentQuestionIndex];
        const question = allQuestions[questionIndex];
        console.log('✅ Chuẩn bị câu hỏi đầu tiên:', question);
        console.log('🔢 questionIndex:', questionIndex);
        console.log('📚 question object:', question);
        
        if (question) {
            showQuestion({
                questionNumber: currentQuestionIndex + 1,
                totalQuestions: allQuestions.length,
                question: question,
                totalTimeLeft: totalTimeRemaining
            });
        } else {
            console.error('❌ Không thể lấy câu hỏi từ allQuestions!');
        }
        
        // Đếm ngược từ 5 giây
        let count = 5;
        const countdownInterval = setInterval(() => {
            count--;
            battleCountdownNumber.textContent = count;
            console.log('⏰ Đếm ngược:', count);
            
            if (count <= 0) {
                clearInterval(countdownInterval);
                isCountdownActive = false;
                console.log('✅ Đếm ngược hoàn thành, ẩn countdown sau 1 giây...');
                // Ẩn countdown sau 1 giây
                setTimeout(() => {
                    if (battleCountdown) {
                        battleCountdown.style.display = 'none';
                        console.log('📱 Countdown đã ẩn, bắt đầu trận đấu...');
                        // Bắt đầu trận đấu ngay lập tức với câu hỏi đã sẵn sàng
                        startTotalTimer();
                    } else {
                        console.error('❌ battleCountdown không tồn tại khi ẩn!');
                    }
                }, 1000);
            }
        }, 1000);
    }
    
    // Kết nối Socket.IO
    function connectSocket() {
        if (socketInitialized && socket && socket.connected) {
            console.log('⚠️ Socket already initialized, skip reconnect');
            return;
        }
        socketInitialized = true;
        socket = io({
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 500
        });
        
        // Đảm bảo reset cờ khi disconnect để có thể kết nối lại hợp lệ
        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            socketInitialized = false;
            roomJoinInitiated = false;
        });
        
        // Xử lý sự kiện khi người tham gia mới vào phòng
        socket.on('participant_joined', function(data) {
            console.log('👥 Người tham gia mới vào phòng:', data);
            renderParticipants(data.participants);
            
            // Preload sound khi tham gia phòng
            console.log('🔊 Preload sound khi tham gia phòng...');
            prepareBattleSound();
        });
        
        // Xử lý sự kiện khi người tham gia ngắt kết nối
        socket.on('participant_disconnected', function(data) {
            showNotification(`${data.username} đã ngắt kết nối.`);
        });
        
        // Xử lý sự kiện khi trò chơi sắp bắt đầu
        socket.on('game_starting', function(data) {
            console.log('🎮 Event game_starting được nhận:', data);
            console.log('⏰ countDown:', data.countDown);
            console.log('📚 allQuestions length hiện tại:', allQuestions.length);
            
            // Giữ nguyên ở trang phòng chờ để load sound trong 3 giây
            console.log('📱 Giữ nguyên ở trang phòng chờ để load sound...');
            
            // Hiển thị thông báo đang load
            const waitingRoom = document.getElementById('waiting-room');
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            loadingMessage.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3>Đang chuẩn bị trận đấu...</h3>
                    <p>Vui lòng chờ trong giây lát</p>
                </div>
            `;
            waitingRoom.appendChild(loadingMessage);
            
            // Load sound trong 3 giây
            console.log('🔊 Bắt đầu load sound trong 3 giây...');
            setTimeout(() => {
                console.log('✅ Đã load sound xong, chuyển vào trang thi đấu...');
                
                // Xóa thông báo loading
                if (loadingMessage.parentNode) {
                    loadingMessage.parentNode.removeChild(loadingMessage);
                }
                
                // Chuyển vào trang thi đấu
                waitingRoom.style.display = 'none';
                battleRoom.style.display = 'block';
                
                // Hiển thị nút kết thúc game cho chủ phòng
                if (roomInfo.creator && endGameBtn) {
                    endGameBtn.style.display = 'block';
                }
                
                // Reset điểm số
                playerScore = 0;
                document.getElementById('user-score').textContent = '0';
                
                console.log('✅ Đã chuyển sang phòng thi đấu, chờ event new_question_start...');
            }, 3000);
        });
        
        // Xử lý sự kiện khi có câu hỏi mới (approach mới)
        socket.on('new_question_start', function(data) {
            console.log('📨 Nhận event new_question_start:', data);
            console.log('📨 questionData length:', data.questionData?.length);
            console.log('📨 allQuestions length trước khi cập nhật:', allQuestions.length);
            
            handleNewQuestionStart(data);
            
            console.log('📚 allQuestions length sau khi cập nhật:', allQuestions.length);
            
            // Gọi ngay countdown 5 giây + sound pre cho tất cả người chơi
            console.log('🎯 Gọi ngay showBattleCountdown cho tất cả người chơi...');
            showBattleCountdown();
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
            showResults(data.results, data.canPlayAgain, data.message);
        });
        
        // Xử lý khi game bị kết thúc bởi chủ phòng
        socket.on('game_ended', function(data) {
            console.log('⏹️ Game ended by host:', data);
            showNotification(data.message || 'Trận đấu đã kết thúc!', 'info');
            
            // Quay về phòng chờ
            setTimeout(() => {
                resultRoom.style.display = 'none';
                waitingRoom.style.display = 'block';
                resetGameState();
                
                // Cập nhật danh sách người tham gia
                if (roomInfo && roomInfo.participants) {
                    renderParticipants(roomInfo.participants);
                }
            }, 2000);
        });
        
        // Xử lý khi hết thời gian game (60s)
        socket.on('game_time_finished', function() {
            console.log('⏰ Server báo hết thời gian game! FORCE FINISHING...');
            console.log('🔍 Current gameFinished:', gameFinished);
            console.log('🔍 Current playerScore:', playerScore);
            console.log('🔍 Current userId:', userId);
            
            // FORCE FINISH - luôn gọi finishMyGame() để đảm bảo gửi kết quả
            if (!gameFinished) {
                console.log('▶️ Calling finishMyGame() directly from server timeout...');
                finishMyGame();
            } else {
                console.log('⚠️ Game already finished, but ensuring result was sent...');
                // Đảm bảo kết quả đã được gửi, nếu chưa thì gửi lại
                console.log('🔄 Double-checking result submission...');
            }
        });
        
        // Xử lý sự kiện khi hết thời gian câu hỏi
        socket.on('question_timeout', function() {
            handleQuestionTimeout();
        });
        
        // Xử lý sự kiện khi trò chơi kết thúc
        socket.on('game_over', function(data) {
            // Dừng tất cả âm thanh trước khi hiển thị kết quả
            if (battleSound) {
                battleSound.pause();
                battleSound.currentTime = 0;
            }
            if (preBattleSound) {
                preBattleSound.pause();
                preBattleSound.currentTime = 0;
            }
            if (correctSound) {
                correctSound.pause();
                correctSound.currentTime = 0;
            }
            if (wrongSound) {
                wrongSound.pause();
                wrongSound.currentTime = 0;
            }
            
            showResults(data.results);
        });
        
        // Xử lý sự kiện khi phòng bị kết thúc
        socket.on('room_ended', function(data) {
            // Dừng tất cả âm thanh trước khi kết thúc phòng
            if (battleSound) {
                battleSound.pause();
                battleSound.currentTime = 0;
            }
            if (preBattleSound) {
                preBattleSound.pause();
                preBattleSound.currentTime = 0;
            }
            if (correctSound) {
                correctSound.pause();
                correctSound.currentTime = 0;
            }
            if (wrongSound) {
                wrongSound.pause();
                wrongSound.currentTime = 0;
            }
            
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
    
    // Chờ có userId rồi mới xử lý room + socket để tránh race
    const initAfterUserInterval = setInterval(() => {
        if (userId) {
            clearInterval(initAfterUserInterval);
            // Kiểm tra xem có phải reload trang không
            if (!handlePageReload()) {
                // Nếu không phải reload, kiểm tra thông tin phòng từ localStorage
                checkRoomInfo();
            }
        }
    }, 100);
    
    // Kiểm tra thông tin phòng từ localStorage
    function checkRoomInfo() {
        roomInfo = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        
        console.log('🔍 checkRoomInfo - roomInfo from localStorage:', roomInfo);
        console.log('🔍 checkRoomInfo - userId:', userId);
        console.log('🔍 checkRoomInfo - roomInfo.creator:', roomInfo.creator);
        console.log('🔍 checkRoomInfo - roomInfo.createdBy:', roomInfo.createdBy);
        
        if (!roomInfo.code) {
            // Không có thông tin phòng, chuyển về trang chủ
            console.log('❌ Không có mã phòng, chuyển về trang chủ');
            window.location.href = '/';
            return;
        }
        
        // Hiển thị thông tin phòng
        roomCodeDisplay.textContent = roomInfo.code;
        roomNameDisplay.textContent = roomInfo.name || 'Phòng thi đấu';
        
        // Cập nhật hiển thị nút sử dụng hàm helper
        console.log('🔄 Calling updateButtonVisibility from checkRoomInfo...');
        updateButtonVisibility();
        
        console.log('🔍 checkRoomInfo - Button visibility updated');
        
        // Tham gia phòng qua Socket.IO
        joinRoom();
    }
    
    // Xử lý khi trang được reload - tự động reconnect vào phòng
    function handlePageReload() {
        // Kiểm tra xem có phải reload không
        if (performance.navigation.type === 1) {
            console.log('🔄 Trang được reload, kiểm tra reconnect...');
            
            // Lấy thông tin phòng từ localStorage
            const storedRoom = localStorage.getItem('currentRoom');
            const storedUser = localStorage.getItem('userInfo');
            
            if (storedRoom && storedUser) {
                try {
                    const roomData = JSON.parse(storedRoom);
                    const userData = JSON.parse(storedUser);
                    
                    // Kiểm tra thời gian lưu trữ (dưới 1 giờ)
                    const timeElapsed = Date.now() - userData.timestamp;
                    if (timeElapsed < 60 * 60 * 1000) {
                        console.log('✅ Thông tin phòng còn hợp lệ, tự động reconnect...');
                        
                        // Cập nhật thông tin người dùng
                        userId = userData.id;
                        username = userData.username;
                        document.getElementById('username-display').textContent = username;
                        
                        // Cập nhật thông tin phòng
                        roomInfo = roomData;
                        
                        // Hiển thị thông tin phòng
                        roomCodeDisplay.textContent = roomInfo.code;
                        roomNameDisplay.textContent = roomInfo.name || 'Phòng thi đấu';
                        
                        // Cập nhật hiển thị nút sử dụng hàm helper
                        updateButtonVisibility();
                        
                        console.log('🔄 Reconnect - Button visibility updated');
                        
                        // Kết nối socket và tham gia phòng
                        connectSocket();
                        
                        return true; // Đã xử lý reconnect
                    }
                } catch (e) {
                    console.error('❌ Lỗi khi parse thông tin phòng:', e);
                }
            }
        }
        
        return false; // Không phải reload hoặc không có thông tin phòng
    }
    
    // Tham gia phòng
    function joinRoom() {
        if (!socket || !roomInfo?.code) return;
        if (roomJoinInitiated) {
            console.log('⚠️ joinRoom already in progress, skip duplicate');
            return;
        }
        roomJoinInitiated = true;
        
        socket.emit('join_room', {
            userId: userId,
            username: username,
            roomCode: roomInfo.code
        }, function(response) {
            roomJoinInitiated = false; // cho phép gọi lại nếu thất bại
            if (response.success) {
                        // Cập nhật thông tin phòng
        roomInfo = response.room;
        
        console.log('🔍 Response room data:', response.room);
        console.log('🔍 Current userId:', userId);
        console.log('🔍 roomInfo.createdBy:', roomInfo.createdBy);
        console.log('🔍 roomInfo.creator:', roomInfo.creator);
        console.log('🔍 userId type:', typeof userId);
        console.log('🔍 roomInfo.createdBy type:', typeof roomInfo.createdBy);
        console.log('🔍 userId === roomInfo.createdBy:', userId === roomInfo.createdBy);
        console.log('🔍 userId == roomInfo.createdBy:', userId == roomInfo.createdBy);
        console.log('🔍 userId.toString() === roomInfo.createdBy.toString():', userId.toString() === roomInfo.createdBy.toString());
        
        // Lưu thông tin phòng vào localStorage để reconnect
        const isCreator = roomInfo.createdBy === userId || roomInfo.creator === true;
        console.log('🔍 Calculated isCreator:', isCreator);
        
        localStorage.setItem('currentRoom', JSON.stringify({
            code: roomInfo.code,
            name: roomInfo.name,
            creator: isCreator,
            createdBy: roomInfo.createdBy,
            participants: roomInfo.participants,
            status: roomInfo.status,
            currentGame: roomInfo.currentGame
        }));
        
        console.log('💾 Saved to localStorage:', {
            code: roomInfo.code,
            creator: isCreator,
            createdBy: roomInfo.createdBy,
            userId: userId
        });
                
                // Hiển thị danh sách người tham gia
                renderParticipants(response.room.participants);
                
                // Cập nhật hiển thị nút dựa trên trạng thái phòng
                if (roomInfo.status === 'waiting') {
                    // Phòng đang chờ - hiển thị phòng chờ
                    waitingRoom.style.display = 'block';
                    battleRoom.style.display = 'none';
                    resultRoom.style.display = 'none';
                } else if (roomInfo.status === 'playing') {
                    // Phòng đang chơi - hiển thị phòng thi đấu
                    waitingRoom.style.display = 'none';
                    battleRoom.style.display = 'block';
                    resultRoom.style.display = 'none';
                }
                
                // Cập nhật hiển thị nút sử dụng hàm helper
                updateButtonVisibility();
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
    
    // Nút quay về phòng chờ
    const backToWaitingBtn = document.getElementById('back-to-waiting-btn');
    if (backToWaitingBtn) {
        backToWaitingBtn.addEventListener('click', function() {
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
            
            // Reset trạng thái đếm ngược
            isCountdownActive = false;
            
            // Quay về phòng chờ
            resultRoom.style.display = 'none';
            waitingRoom.style.display = 'block';
            
            // Reset trạng thái game
            resetGameState();
            
            // Cập nhật danh sách người tham gia
            if (roomInfo && roomInfo.participants) {
                renderParticipants(roomInfo.participants);
            }
        });
    }
    
    // Nút chơi tiếp trận khác
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
        
        // Reset trạng thái đếm ngược
        isCountdownActive = false;
        
        // Nếu là chủ phòng, bắt đầu trận mới ngay
        if (roomInfo && roomInfo.creator) {
            startBattle();
        } else {
            // Nếu không phải chủ phòng, quay về phòng chờ để chờ
            resultRoom.style.display = 'none';
            waitingRoom.style.display = 'block';
            resetGameState();
            
            // Cập nhật danh sách người tham gia
            if (roomInfo && roomInfo.participants) {
                renderParticipants(roomInfo.participants);
            }
        }
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
    
    // Thêm event listener cho nút submit answer
    document.getElementById('submit-answer').addEventListener('click', function() {
        console.log('🔥 Submit button clicked!');
        submitAnswer();
    });
    
    // Thêm event listener cho phím Enter trong input
    document.getElementById('answer-input').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            console.log('🔥 Enter key pressed!');
            submitAnswer();
        }
    });
    
    // Hiển thị câu hỏi
    function showQuestion(data) {
        const { questionNumber, totalQuestions, question, totalTimeLeft } = data;
        
        console.log('📋 showQuestion called:', { 
            questionNumber, 
            totalQuestions, 
            questionText: question?.text?.substring(0, 50) + '...',
            questionId: question?.id,
            answer: question?.answer
        });
        
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
        console.log('🔥 submitAnswer called!');
        console.log('🔍 gameFinished:', gameFinished);
        console.log('🔍 userId:', userId);
        console.log('🔍 username:', username);
        console.log('🔍 currentQuestion:', currentQuestion);
        console.log('🔍 allQuestions.length:', allQuestions.length);
        console.log('🔍 currentQuestionIndex:', currentQuestionIndex);
        
        if (gameFinished) {
            console.log('⚠️ Game already finished, ignoring submit...');
            return;
        }
        
        if (!currentQuestion) {
            console.log('❌ No currentQuestion!');
            console.log('❌ allQuestions:', allQuestions);
            console.log('❌ myQuestionOrder:', myQuestionOrder);
            showNotification('Không có câu hỏi hiện tại! Check console.', 'error');
            return;
        }
        
        const answerInput = document.getElementById('answer-input');
        let userAnswer = answerInput.value.trim();
        
        console.log('📝 User answer:', userAnswer);
        
        // Nếu người chơi không nhập gì nhưng bấm Enter/Trả lời => coi như "không trả lời"
        if (!userAnswer) {
            userAnswer = 'không trả lời';
        }
        
        // Vô hiệu hóa input và nút trả lời
        answerInput.disabled = true;
        document.getElementById('submit-answer').disabled = true;
        
        // Tính thời gian trả lời (giây)
        const answerTime = Math.floor((Date.now() - questionStartTime) / 1000);
        
        // ✅ CHECK ANSWER LOCAL - NO SERVER CALL (Maximum Speed!)
        const isCorrect = checkAnswer(userAnswer, currentQuestion.answer);
        const answerResult = document.getElementById('answer-result');
        
        console.log('🎯 Answer check:', {
            userAnswer,
            correctAnswer: currentQuestion.answer,
            isCorrect
        });
        
        // Cập nhật điểm số và UI ngay lập tức
        if (isCorrect) {
            playerScore += 10; // Cố định 10 điểm cho mỗi câu đúng
            document.getElementById('user-score').textContent = playerScore;
            
            answerResult.textContent = 'Đúng! +10 điểm';
            answerResult.className = 'answer-result correct';
            showNotification('Đúng! +10 điểm', 'success');
            console.log('✅ Score updated! Current playerScore:', playerScore);
            
            // Phát âm thanh đúng
            playAnswerSound(true);
        } else {
            answerResult.textContent = `Sai! Đáp án đúng: ${currentQuestion.answer}`;
            answerResult.className = 'answer-result incorrect';
            showNotification('Sai rồi!', 'error');
            console.log('❌ Wrong answer. Current playerScore:', playerScore);
            
            // Phát âm thanh sai
            playAnswerSound(false);
        }
        
        // Lưu câu trả lời local
        if (!gameAnswers) gameAnswers = [];
        gameAnswers.push({
            questionId: currentQuestion.id,
            questionText: currentQuestion.text,
            userAnswer: userAnswer,
            correctAnswer: currentQuestion.answer,
            isCorrect: isCorrect,
            answerTime: answerTime
        });
        
        console.log('✅ Checked answer locally:', isCorrect ? 'CORRECT' : 'WRONG');
        
        // ✅ CHUYỂN CÂU NGAY LẬP TỨC - NO DELAY!
        currentQuestionIndex++;
        console.log('➡️ Moving to question index:', currentQuestionIndex);
        
        // Kiểm tra nếu hết câu hỏi
        if (currentQuestionIndex >= allQuestions.length) {
            console.log('🏁 Đã hoàn thành tất cả câu hỏi! Final score:', playerScore);
            finishMyGame();
            return;
        }
        
        // Hiển thị câu tiếp theo NGAY
        const questionIndex = myQuestionOrder[currentQuestionIndex];
        const nextQuestion = allQuestions[questionIndex];
        
        console.log('📋 Showing next question:', {
            currentQuestionIndex,
            questionIndex,
            questionText: nextQuestion?.text?.substring(0, 50) + '...'
        });
        
        showQuestion({
            questionNumber: currentQuestionIndex + 1,
            totalQuestions: allQuestions.length,
            question: nextQuestion,
            totalTimeLeft: document.getElementById('total-timer').textContent
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
        console.log('📨 questionData length:', data.questionData?.length);
        console.log('📨 First question:', data.questionData?.[0]);
        
        // Lần đầu nhận data, lưu tất cả câu hỏi và tạo thứ tự ngẫu nhiên
        allQuestions = data.questionData;
        myQuestionOrder = shuffleArray([...Array(allQuestions.length).keys()]);
        console.log('🔀 Thứ tự câu hỏi của tôi:', myQuestionOrder);
        console.log('📚 allQuestions sau khi cập nhật:', allQuestions);
        
        // Khởi tạo mảng câu trả lời với cấu trúc giống solo-battle
        gameAnswers = [];
        
        currentQuestionIndex = 0; // Reset về câu đầu tiên
        gameStartTime = Date.now();
        gameFinished = false;
        
        // Không cần gọi showBattleCountdown ở đây nữa, sẽ được gọi từ event listener
        // để đảm bảo đồng loạt cho tất cả người chơi
        console.log('✅ handleNewQuestionStart hoàn thành, countdown sẽ được gọi từ event listener...');
    }
    
    // Bắt đầu timer 60 giây tổng (từ solo battle)
    function startTotalTimer() {
        totalTimeRemaining = 60;
        updateTimer(totalTimeRemaining);
        
        // Phát nhạc khi bắt đầu trận đấu
        if (battleSound && soundEnabled) {
            battleSound.currentTime = 0; // Reset về đầu
            battleSound.volume = 0.7; // Đặt âm lượng 70%
            battleSound.loop = true; // Lặp lại để phát trong 60 giây
            battleSound.play().catch(error => {
                console.log('❌ Không thể phát nhạc battle:', error);
            });
            console.log('🔊 Đang phát nhạc battle...');
        } else {
            console.log('❌ Không thể phát nhạc battle - battleSound:', !!battleSound, 'soundEnabled:', soundEnabled);
        }
        
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        timerInterval = setInterval(() => {
            totalTimeRemaining--;
            updateTimer(totalTimeRemaining);
            
            // Log mỗi 10 giây để debug
            if (totalTimeRemaining % 10 === 0) {
                console.log(`⏰ Timer: ${totalTimeRemaining}s left, gameFinished: ${gameFinished}, score: ${playerScore}`);
            }
            
            if (totalTimeRemaining <= 0) {
                clearInterval(timerInterval);
                if (!gameFinished) {
                    console.log('⏰ Hết thời gian! Kết thúc game tự động');
                    handleGameTimeout();
                }
            }
        }, 1000);
    }
    
    // Cập nhật hiển thị timer (đã được định nghĩa ở dưới)
    // function updateTimer(timeLeft) {
    //     document.getElementById('total-timer').textContent = timeLeft;
    // }
    
    // Xử lý khi hết thời gian tổng (LOCAL TIMER)
    function handleGameTimeout() {
        console.log('🔥 handleGameTimeout() called from LOCAL TIMER!');
        console.log('🔍 gameFinished:', gameFinished);
        console.log('🔍 playerScore:', playerScore);
        console.log('🔍 userId:', userId);
        
        if (gameFinished) {
            console.log('⚠️ Game already finished in handleGameTimeout, returning...');
            return;
        }
        
        // Dừng nhạc khi hết thời gian
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
            console.log('🔇 Đã dừng nhạc battle');
        }
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
            console.log('🔇 Đã dừng nhạm thanh pre-battle');
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
        console.log('🔇 Đã dừng âm thanh đúng/sai');
        
        // Vô hiệu hóa input và nút trả lời
        const answerInput = document.getElementById('answer-input');
        const submitBtn = document.getElementById('submit-answer');
        if (answerInput) answerInput.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        
        console.log('⏰ Local Timeout! Final score before finish:', playerScore);
        showNotification('Hết thời gian! Game kết thúc.', 'warning');
        
        // NGAY LẬP TỨC gọi finishMyGame() để gửi kết quả
        console.log('▶️ Calling finishMyGame() from LOCAL timeout...');
        finishMyGame();
    }
    
    // Kết thúc game của riêng mình 
    function finishMyGame() {
        console.log('🔥 finishMyGame() called! From:', new Error().stack.split('\n')[2].trim());
        console.log('🔍 gameFinished:', gameFinished);
        console.log('🔍 userId:', userId);
        console.log('🔍 username:', username);
        console.log('🔍 roomInfo:', roomInfo);
        
        if (gameFinished) {
            console.log('⚠️ Game already finished, skipping...');
            return;
        }
        
        // SET IMMEDIATELY to prevent double calls
        gameFinished = true;
        clearInterval(timerInterval);
        
        // Dừng nhạc khi kết thúc game
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
            console.log('🔇 Đã dừng nhạc battle trong finishMyGame');
        }
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
            console.log('🔇 Đã dừng nhạc pre-battle trong finishMyGame');
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
        console.log('🔇 Đã dừng âm thanh đúng/sai trong finishMyGame');
        
        const completionTime = Math.floor((Date.now() - gameStartTime) / 1000);
        
        console.log('🏁 Chuẩn bị gửi kết quả lên server:');
        console.log('📊 playerScore:', playerScore);
        console.log('⏱️ completionTime:', completionTime);
        console.log('📝 questionsAnswered:', currentQuestionIndex);
        console.log('📋 gameAnswers length:', gameAnswers?.length);
        
        // Check conditions trước khi gửi
        if (!socket) {
            console.error('❌ No socket connection!');
            return;
        }
        
        if (!roomInfo?.code) {
            console.error('❌ No room code!');
            return;
        }
        
        if (!userId) {
            console.error('❌ No userId!');
            return;
        }
        
        console.log('✅ All conditions met, sending finish_game...');
        
        // Gửi kết quả đến server (bao gồm all answers)
        socket.emit('finish_game', {
            roomCode: roomInfo.code,
            userId: userId,
            score: playerScore,
            completionTime: completionTime,
            questionsAnswered: currentQuestionIndex,
            allAnswers: gameAnswers // Gửi tất cả câu trả lời để lưu vào DB
        }, function(response) {
            console.log('📨 Server response:', response);
            if (response && response.success) {
                console.log('✅ Gửi kết quả thành công!');
                showNotification('Đã gửi kết quả thành công!', 'success');
            } else {
                console.error('❌ Lỗi gửi kết quả:', response?.error || 'Unknown error');
                showNotification('Lỗi gửi kết quả: ' + (response?.error || 'Unknown error'), 'error');
            }
        });
    }
    
    // Kiểm tra câu trả lời local (chỉ khớp hoàn toàn sau khi chuẩn hóa)
    function checkAnswer(userAnswer, correctAnswer) {
        const normalizedUserAnswer = userAnswer.trim().toLowerCase();
        const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
        return normalizedUserAnswer === normalizedCorrectAnswer;
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
    function showResults(results, canPlayAgain = false, message = '') {
        console.log('🏆 Showing final results:', results);
        console.log('🔄 Can play again:', canPlayAgain);
        console.log('💬 Message:', message);
        
        // Ẩn phòng thi đấu, hiển thị phòng kết quả
        battleRoom.style.display = 'none';
        resultRoom.style.display = 'block';
        
        // Xóa bộ đếm thời gian
        clearInterval(timerInterval);
        
        // Dừng nhạc khi hiển thị kết quả
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
            console.log('🔇 Đã dừng nhạc battle trong showResults');
        }
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
            console.log('🔇 Đã dừng nhạc pre-battle trong showResults');
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
        console.log('🔇 Đã dừng nhạc đúng/sai trong showResults');
        
        // Hiển thị thông báo nếu có
        if (message) {
            showNotification(message, 'info');
        }
        
        // Hiển thị bảng kết quả với thời gian hoàn thành
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
                <td>${result.score} điểm</td>
                <td>${result.completionTime}s</td>
                <td>${result.questionsAnswered}/${allQuestions && allQuestions.length ? allQuestions.length : 20} câu</td>
            `;
            resultTableBodyEl.appendChild(tr);
        });
        
        // Hiển thị đáp án từng câu của người chơi hiện tại
        showQuestionReview();
        
        // Cập nhật hiển thị nút dựa trên quyền và khả năng chơi tiếp
        if (backToWaitingBtn) {
            backToWaitingBtn.style.display = 'block';
        }
        if (playAgainBtn) {
            if (canPlayAgain && roomInfo && roomInfo.creator) {
                playAgainBtn.style.display = 'block';
                playAgainBtn.textContent = '🎮 Chơi tiếp trận khác';
            } else if (canPlayAgain) {
                playAgainBtn.style.display = 'block';
                playAgainBtn.textContent = '⏳ Chờ chủ phòng bắt đầu';
                playAgainBtn.disabled = true;
            } else {
                playAgainBtn.style.display = 'none';
            }
        }
    }
    
    // Hiển thị đáp án từng câu của người chơi
    function showQuestionReview() {
        console.log('📚 Hiển thị đáp án từng câu...');
        console.log('📚 gameAnswers:', gameAnswers);
        console.log('📚 allQuestions:', allQuestions);
        
        const questionReviewListEl = document.getElementById('question-review-list');
        if (!questionReviewListEl) {
            console.error('❌ Không tìm thấy question-review-list element!');
            return;
        }
        
        // Xóa nội dung cũ
        questionReviewListEl.innerHTML = '';
        
        // Kiểm tra xem có câu hỏi không
        if (!allQuestions || allQuestions.length === 0) {
            questionReviewListEl.innerHTML = '<p class="text-muted">Không có câu hỏi nào để hiển thị.</p>';
            return;
        }
        
        // Hiển thị đáp án cho tất cả câu hỏi
        for (let i = 0; i < allQuestions.length; i++) {
            const div = document.createElement('div');
            
            // Lấy câu hỏi theo thứ tự đã được sắp xếp
            const questionIndex = myQuestionOrder[i];
            const question = allQuestions[questionIndex];
            
            // Tìm câu trả lời tương ứng (nếu có)
            const answer = gameAnswers.find(a => a.questionId === question.id);
            
            if (answer) {
                // Có câu trả lời
                div.className = `question-review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
                
                div.innerHTML = `
                    <h4>Câu ${i + 1}: ${question.text || question.question}</h4>
                    <p>Câu trả lời của bạn: <strong>${answer.userAnswer || 'Không trả lời'}</strong></p>
                    <p>Câu trả lời đúng: <strong>${question.answer}</strong></p>
                    <p>Điểm: <strong>${answer.isCorrect ? '10' : '0'}</strong></p>
                    ${answer.answerTime ? `<p>Thời gian trả lời: <strong>${answer.answerTime}s</strong></p>` : ''}
                `;
            } else {
                // Không có câu trả lời (câu hỏi bị bỏ qua)
                div.className = 'question-review-item unanswered';
                
                div.innerHTML = `
                    <h4>Câu ${i + 1}: ${question.text || question.question}</h4>
                    <p>Câu trả lời của bạn: <strong>Không trả lời</strong></p>
                    <p>Câu trả lời đúng: <strong>${question.answer}</strong></p>
                    <p>Điểm: <strong>0</strong></p>
                    <p>Thời gian trả lời: <strong>Không trả lời</strong></p>
                `;
            }
            
            questionReviewListEl.appendChild(div);
        }
        
        console.log('✅ Đã hiển thị đáp án cho tất cả', allQuestions.length, 'câu hỏi');
    }
    
    // Reset trạng thái game để chuẩn bị trận mới
    function resetGameState() {
        console.log('🔄 Resetting game state...');
        
        // Reset các biến game
        currentQuestionIndex = 0;
        playerScore = 0;
        gameFinished = false;
        allQuestions = [];
        myQuestionOrder = [];
        gameAnswers = [];
        
        // Reset UI
        if (document.getElementById('user-score')) {
            document.getElementById('user-score').textContent = '0';
        }
        if (document.getElementById('current-question')) {
            document.getElementById('current-question').textContent = '1';
        }
        if (document.getElementById('total-questions')) {
            document.getElementById('total-questions').textContent = '20';
        }
        if (document.getElementById('total-timer')) {
            document.getElementById('total-timer').textContent = '60';
        }
        if (document.getElementById('question-text')) {
            document.getElementById('question-text').textContent = 'Nội dung câu hỏi sẽ hiển thị ở đây';
        }
        if (document.getElementById('answer-input')) {
            document.getElementById('answer-input').value = '';
            document.getElementById('answer-input').disabled = false;
        }
        if (document.getElementById('submit-answer')) {
            document.getElementById('submit-answer').disabled = false;
        }
        if (document.getElementById('answer-result')) {
            document.getElementById('answer-result').textContent = '';
            document.getElementById('answer-result').className = 'answer-result';
        }
        
        // Clear timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        console.log('✅ Game state reset completed');
    }
    
    // Hàm helper để cập nhật hiển thị nút một cách nhất quán
    function updateButtonVisibility() {
        if (!roomInfo) {
            console.log('❌ updateButtonVisibility: roomInfo is null');
            return;
        }
        
        if (!userId) {
            console.log('❌ updateButtonVisibility: userId is null');
            return;
        }
        
        // Kiểm tra quyền chủ phòng - ưu tiên creator từ localStorage
        let isCreator = false;
        
        if (roomInfo.creator === true) {
            isCreator = true;
            console.log('✅ Creator from roomInfo.creator');
        } else if (roomInfo.createdBy === userId) {
            isCreator = true;
            console.log('✅ Creator from roomInfo.createdBy === userId');
        } else if (roomInfo.createdBy && roomInfo.createdBy.toString() === userId.toString()) {
            isCreator = true;
            console.log('✅ Creator from string comparison');
        }
        
        console.log('🔍 updateButtonVisibility:', {
            roomInfoCreatedBy: roomInfo.createdBy,
            userId: userId,
            roomInfoCreator: roomInfo.creator,
            isCreator: isCreator,
            roomStatus: roomInfo.status,
            roomInfoKeys: Object.keys(roomInfo)
        });
        
        // Cập nhật hiển thị nút dựa trên trạng thái phòng
        if (roomInfo.status === 'waiting') {
            // Phòng đang chờ
            startBattleBtn.style.display = isCreator ? 'block' : 'none';
            if (endRoomBtn) endRoomBtn.style.display = isCreator ? 'block' : 'none';
            if (endGameBtn) endGameBtn.style.display = 'none';
            
            console.log('📱 Waiting room buttons:', {
                startBattleBtn: startBattleBtn.style.display,
                endRoomBtn: endRoomBtn ? endRoomBtn.style.display : 'N/A',
                isCreator: isCreator
            });
        } else if (roomInfo.status === 'playing') {
            // Phòng đang chơi
            startBattleBtn.style.display = 'none';
            if (endRoomBtn) endRoomBtn.style.display = 'none';
            if (endGameBtn) endGameBtn.style.display = isCreator ? 'block' : 'none';
            
            console.log('📱 Playing room buttons:', {
                endGameBtn: endGameBtn ? endGameBtn.style.display : 'N/A',
                isCreator: isCreator
            });
        } else if (roomInfo.status === 'finished') {
            // Phòng đã kết thúc
            startBattleBtn.style.display = 'none';
            if (endRoomBtn) endRoomBtn.style.display = 'none';
            if (endGameBtn) endGameBtn.style.display = 'none';
        }
        
        // Cập nhật localStorage
        const currentRoomData = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        currentRoomData.creator = isCreator;
        currentRoomData.status = roomInfo.status;
        localStorage.setItem('currentRoom', JSON.stringify(currentRoomData));
        
        console.log('📱 Button visibility updated:', {
            startBattleBtn: startBattleBtn.style.display,
            endRoomBtn: endRoomBtn ? endRoomBtn.style.display : 'N/A',
            endGameBtn: endGameBtn ? endGameBtn.style.display : 'N/A'
        });
        
        // Force update display nếu cần
        if (isCreator && roomInfo.status === 'waiting') {
            console.log('🔄 Force showing buttons for creator in waiting room');
            startBattleBtn.style.display = 'block';
            if (endRoomBtn) endRoomBtn.style.display = 'block';
        }
    }
    
    // Kết thúc phòng (chủ phòng)
    function endRoom() {
        if (!socket || !roomInfo.code) return;
        
        // Dừng tất cả âm thanh trước khi kết thúc phòng
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
        }
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
        }
        if (correctSound) {
            correctSound.pause();
            correctSound.currentTime = 0;
        }
        if (wrongSound) {
            wrongSound.pause();
            wrongSound.currentTime = 0;
        }
        
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
        
        // Dừng tất cả âm thanh trước khi kết thúc game
        if (battleSound) {
            battleSound.pause();
            battleSound.currentTime = 0;
        }
        if (preBattleSound) {
            preBattleSound.pause();
            preBattleSound.currentTime = 0;
        }
        if (correctSound) {
            correctSound.pause();
            correctSound.currentTime = 0;
        }
        if (wrongSound) {
            wrongSound.pause();
            wrongSound.currentTime = 0;
        }
        
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
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
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