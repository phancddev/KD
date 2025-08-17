document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo biến
    let socket;
    let userId;
    let username;
    
    // Kết nối Socket.IO
    function connectSocket() {
        console.log('Đang kết nối Socket.IO...');
        socket = io();
        
        socket.on('connect', () => {
            console.log('✅ Đã kết nối Socket.IO thành công!', socket.id);
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Lỗi kết nối Socket.IO:', error);
        });
        
        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket.IO đã ngắt kết nối:', reason);
        });
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
    
    // Lấy thông tin người dùng từ session
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
                
                // Kiểm tra element username-display có tồn tại không
                const usernameDisplay = document.getElementById('username-display');
                if (usernameDisplay) {
                    usernameDisplay.textContent = `Xin chào, ${data.username}`;
                } else {
                    console.warn('⚠️ Không tìm thấy element username-display');
                }
                
                // Kiểm tra và hiển thị admin panel nếu người dùng là admin
                if (data.isAdmin) {
                    console.log('👑 Người dùng là admin, hiển thị admin panel');
                    showAdminPanel();
                }
                
                // Kết nối Socket.IO sau khi có thông tin người dùng
                connectSocket();
            } else {
                console.log('❌ Không có thông tin người dùng hợp lệ, chuyển về trang đăng nhập');
                window.location.href = '/login';
            }
        })
        .catch(error => {
            console.error('❌ Lỗi khi lấy thông tin người dùng:', error);
            // Không chuyển hướng ngay lập tức, để người dùng có thể debug
            // window.location.href = '/login';
        });
    
    // Create room button
    createRoomBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        createRoomForm.style.display = 'block';
        joinRoomForm.style.display = 'none';
    });
    
    // Join room button
    joinRoomBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        createRoomForm.style.display = 'none';
        joinRoomForm.style.display = 'block';
    });
    
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
        console.log('Socket trạng thái:', socket ? 'Đã kết nối' : 'Chưa kết nối');
        
        if (!roomName) {
            alert('Vui lòng nhập tên phòng.');
            return;
        }
        
        if (!socket) {
            alert('Đang kết nối đến máy chủ. Vui lòng thử lại sau.');
            return;
        }
        
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
                localStorage.setItem('currentRoom', JSON.stringify({
                    id: response.room.id,
                    name: response.room.name,
                    code: response.room.code,
                    creator: true
                }));
                
                // Chuyển đến trang đấu phòng
                window.location.href = '/room-battle';
            } else {
                alert('Không thể tạo phòng: ' + response.error);
            }
        });
    });
    
    // Join room form submission
    document.getElementById('join-room-submit').addEventListener('click', function() {
        const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
        
        if (!roomCode) {
            alert('Vui lòng nhập mã phòng.');
            return;
        }
        
        if (!socket) {
            alert('Đang kết nối đến máy chủ. Vui lòng thử lại sau.');
            return;
        }
        
        // Lưu thông tin phòng vào localStorage
        localStorage.setItem('currentRoom', JSON.stringify({
            code: roomCode,
            creator: false
        }));
        
        // Chuyển đến trang đấu phòng
        window.location.href = '/room-battle';
    });
    
    // Solo battle button
    soloBtn.addEventListener('click', function() {
        window.location.href = '/solo-battle';
    });
    
    // Xóa phần toggle UI không cần thiết
    // if (toggleUIBtn) {
    //     toggleUIBtn.addEventListener('click', async function() {
    //         try {
    //             // Gửi yêu cầu API để chuyển đổi giao diện
    //             const response = await fetch('/api/settings/ui', {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                 },
    //                 body: JSON.stringify({
    //                     useModernUI: true
    //             }));
    //             
    //             if (!response.ok) {
    //                 throw new Error('Không thể chuyển đổi giao diện');
    //             }
    //             
    //             // Chuyển hướng đến trang chủ với giao diện mới
    //             window.location.href = '/?modern=true';
    //         } catch (error) {
    //             console.error('Lỗi khi chuyển đổi giao diện:', error);
    //             alert('Không thể chuyển đổi giao diện. Vui lòng thử lại sau.');
    //         }
    //     });
    // }
    
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
});