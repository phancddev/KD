document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo biến
    let socket;
    let userId;
    let username;
    
    // Trạng thái kết nối để tránh connect liên tục
    let connecting = false;
    let socketConnectPromise = null;

    // Chỉ kết nối socket khi cần dùng (create/join room)
    function ensureSocketConnected() {
        if (socket && socket.connected) {
            return Promise.resolve(socket);
        }
        if (connecting && socketConnectPromise) {
            return socketConnectPromise;
        }
        
        if (!socket) {
            // Khởi tạo nhưng không tự động kết nối
            socket = io({ autoConnect: false, reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 500 });
            
            socket.on('connect', () => {
                console.log('✅ Socket.IO connected:', socket.id);
                connecting = false;
            });
            
            socket.on('connect_error', (error) => {
                console.error('❌ Socket.IO connect error:', error);
                connecting = false;
            });
            
            socket.on('disconnect', (reason) => {
                console.log('🔌 Socket.IO disconnected:', reason);
            });
        }
        
        connecting = true;
        socketConnectPromise = new Promise((resolve, reject) => {
            const onConnect = () => {
                socket.off('connect_error', onError);
                resolve(socket);
            };
            const onError = (err) => {
                socket.off('connect', onConnect);
                reject(err);
            };
            socket.once('connect', onConnect);
            socket.once('connect_error', onError);
            socket.connect();
        });
        return socketConnectPromise;
    }
    
    // Kiểm tra và lấy các element cần thiết
    function getElements() {
        const elements = {
            modal: document.getElementById('room-modal'),
            createRoomBtn: document.getElementById('create-room-btn'),
            joinRoomBtn: document.getElementById('join-room-btn'),
            closeBtn: document.querySelector('.close'),
            createRoomForm: document.getElementById('create-room-form'),
            joinRoomForm: document.getElementById('join-room-form'),
            soloBtn: document.getElementById('solo-battle-btn')
        };
        
        // Kiểm tra xem tất cả element có tồn tại không
        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`❌ Không tìm thấy element: ${key}`);
                return null;
            }
        }
        
        console.log('✅ Tất cả element đã được tìm thấy');
        return elements;
    }
    
    // Lấy các element
    const elements = getElements();
    if (!elements) {
        console.error('❌ Không thể khởi tạo trang vì thiếu element');
        return;
    }
    
    const { modal, createRoomBtn, joinRoomBtn, closeBtn, createRoomForm, joinRoomForm, soloBtn } = elements;
    const createTangTocBtn = document.getElementById('create-tangtoc-room-btn');
    const joinTangTocBtn = document.getElementById('join-tangtoc-room-btn');
    
    // Lấy thông tin người dùng từ session (không kết nối socket ở đây)
    fetch('/api/user')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📨 Dữ liệu người dùng:', data);
            
            if (data.id && data.username) {
                userId = data.id;
                username = data.username;
                
                const usernameDisplay = document.getElementById('username-display');
                if (usernameDisplay) {
                    usernameDisplay.textContent = `Xin chào, ${data.username}`;
                } else {
                    console.warn('⚠️ Không tìm thấy element username-display');
                }
                
                if (data.isAdmin) {
                    console.log('👑 Người dùng là admin, hiển thị admin panel');
                    showAdminPanel();
                }
            } else {
                console.log('❌ Không có thông tin người dùng hợp lệ, chuyển về trang đăng nhập');
                window.location.href = '/login';
            }
        })
        .catch(error => {
            console.error('❌ Lỗi khi lấy thông tin người dùng:', error);
        });
    
    // Open create room modal và chuẩn bị socket khi người dùng mở modal
    createRoomBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        createRoomForm.style.display = 'block';
        joinRoomForm.style.display = 'none';
        ensureSocketConnected().catch(() => {});
    });
    
    // Open join room modal và chuẩn bị socket khi người dùng mở modal
    joinRoomBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        createRoomForm.style.display = 'none';
        joinRoomForm.style.display = 'block';
        ensureSocketConnected().catch(() => {});
    });

    // Tăng Tốc: đã có modal ở home.html; không dùng prompt/alert tại đây
    // createTangTocBtn / joinTangTocBtn được gắn trong inline script của home.html
    
    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Create room form submission
    document.getElementById('create-room-submit').addEventListener('click', function() {
        const roomName = document.getElementById('room-name').value.trim();
        
        console.log('Đang tạo phòng với tên:', roomName);
        
        if (!roomName) {
            alert('Vui lòng nhập tên phòng.');
            return;
        }
        
        ensureSocketConnected()
            .then(() => {
                // Gửi yêu cầu tạo phòng đến server qua Socket.IO
                console.log('Gửi yêu cầu tạo phòng...');
                socket.emit('create_room', {
                    userId: userId,
                    username: username,
                    roomName: roomName
                }, function(response) {
                    console.log('Phản hồi từ server:', response);
                    if (response.success) {
                        // Lưu thông tin phòng vào localStorage
                        const roomData = {
                            id: response.room.id,
                            name: response.room.name,
                            code: response.room.code,
                            creator: true,
                            createdBy: userId
                        };
                        
                        console.log('🏠 Creating room - saving to localStorage:', roomData);
                        console.log('🏠 userId:', userId);
                        console.log('🏠 userId type:', typeof userId);
                        
                        localStorage.setItem('currentRoom', JSON.stringify(roomData));
                        
                        // Chuyển đến trang đấu phòng
                        window.location.href = '/room-battle';
                    } else {
                        alert('Không thể tạo phòng: ' + response.error);
                    }
                });
            })
            .catch(err => {
                console.error('❌ Không thể kết nối socket để tạo phòng:', err);
                alert('Không thể kết nối máy chủ. Vui lòng thử lại.');
            });
    });
    
    // Join room form submission
    document.getElementById('join-room-submit').addEventListener('click', function() {
        const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
        
        if (!roomCode) {
            alert('Vui lòng nhập mã phòng.');
            return;
        }
        
        ensureSocketConnected()
            .then(() => {
                // Lưu thông tin phòng vào localStorage
                localStorage.setItem('currentRoom', JSON.stringify({
                    code: roomCode,
                    creator: false,
                    createdBy: null
                }));
                
                // Chuyển đến trang đấu phòng
                window.location.href = '/room-battle';
            })
            .catch(err => {
                console.error('❌ Không thể kết nối socket để tham gia phòng:', err);
                alert('Không thể kết nối máy chủ. Vui lòng thử lại.');
            });
    });
    
    // Solo battle button
    soloBtn.addEventListener('click', function() {
        window.location.href = '/solo-battle';
    });
    
    // Hàm hiển thị admin panel
    function showAdminPanel() {
        const adminPanel = document.getElementById('admin-panel');
        const adminUploadLink = document.getElementById('admin-upload-link');

        if (adminPanel) {
            adminPanel.style.display = 'block';
            console.log('✅ Đã hiển thị admin panel');
        } else {
            console.warn('⚠️ Không tìm thấy admin panel');
        }

        if (adminUploadLink) {
            adminUploadLink.style.display = 'block';
            console.log('✅ Đã hiển thị admin upload link');
        } else {
            console.warn('⚠️ Không tìm thấy admin upload link');
        }
    }

    // Load user statistics
    async function loadUserStats() {
        try {
            const response = await fetch('/api/user/stats', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load stats');
            }

            const stats = await response.json();
            console.log('📊 User stats loaded:', stats);

            // Update tổng quan
            document.getElementById('total-games').textContent = stats.totalGames || 0;
            document.getElementById('total-score').textContent = stats.totalScore || 0;
            document.getElementById('correct-answers').textContent = `${stats.totalCorrectAnswers || 0}/${stats.totalQuestions || 0}`;
            document.getElementById('highest-score').textContent = stats.highestScore || 0;

            // Update theo chế độ
            if (stats.byMode) {
                document.getElementById('khoidong-solo-games').textContent = stats.byMode.khoidongSolo || 0;
                document.getElementById('khoidong-room-games').textContent = stats.byMode.khoidongRoom || 0;
                document.getElementById('tangtoc-solo-games').textContent = stats.byMode.tangtocSolo || 0;
                document.getElementById('tangtoc-room-games').textContent = stats.byMode.tangtocRoom || 0;
            }
        } catch (error) {
            console.error('❌ Error loading user stats:', error);
            // Set default values
            document.getElementById('total-games').textContent = '0';
            document.getElementById('total-score').textContent = '0';
            document.getElementById('correct-answers').textContent = '0/0';
            document.getElementById('highest-score').textContent = '0';
            document.getElementById('khoidong-solo-games').textContent = '0';
            document.getElementById('khoidong-room-games').textContent = '0';
            document.getElementById('tangtoc-solo-games').textContent = '0';
            document.getElementById('tangtoc-room-games').textContent = '0';
        }
    }

    // Load stats on page load
    loadUserStats();
});