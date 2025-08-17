document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo Socket.IO
    const socket = io();
    
    // Lấy thông tin admin
    fetchAdminInfo();
    
    // Lấy thống kê tổng quan
    fetchDashboardStats();
    
    // Lấy danh sách người dùng đang online
    fetchOnlineUsers();
    
    // Lấy danh sách trận đấu đang diễn ra
    fetchActiveGames();
    
    // Lấy hoạt động gần đây
    fetchRecentActivities();
    
    // Xử lý sự kiện làm mới danh sách người dùng online
    document.getElementById('refresh-online').addEventListener('click', function() {
        fetchOnlineUsers();
    });
    
    // Xử lý sự kiện làm mới danh sách trận đấu đang diễn ra
    document.getElementById('refresh-games').addEventListener('click', function() {
        fetchActiveGames();
    });
    
    // Lắng nghe sự kiện từ Socket.IO
    setupSocketListeners(socket);
    
    // Cập nhật dữ liệu mỗi 30 giây
    setInterval(function() {
        fetchOnlineUsers();
        fetchActiveGames();
    }, 30000);
});

// Lấy thông tin admin
async function fetchAdminInfo() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin người dùng');
        }
        
        const user = await response.json();
        
        // Hiển thị tên admin
        document.getElementById('admin-name').textContent = user.username;
        
        // Hiển thị avatar
        const avatarText = document.getElementById('avatar-text');
        if (avatarText) {
            avatarText.textContent = user.username.charAt(0).toUpperCase();
        }
        
        // Kiểm tra quyền admin
        if (!user.isAdmin) {
            // Nếu không phải admin, chuyển hướng về trang chủ
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        window.location.href = '/login';
    }
}

// Lấy thống kê tổng quan
async function fetchDashboardStats() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
            throw new Error('Không thể lấy thống kê tổng quan');
        }
        
        const stats = await response.json();
        
        // Cập nhật thống kê
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('online-users').textContent = stats.onlineUsers;
        document.getElementById('today-games').textContent = stats.todayGames;
        document.getElementById('total-questions').textContent = stats.totalQuestions;
        
        // Thêm hiệu ứng đếm số
        animateNumbers();
    } catch (error) {
        console.error('Lỗi khi lấy thống kê tổng quan:', error);
    }
}

// Lấy danh sách người dùng đang online
async function fetchOnlineUsers() {
    try {
        const response = await fetch('/api/admin/online-users');
        if (!response.ok) {
            throw new Error('Không thể lấy danh sách người dùng đang online');
        }
        
        const users = await response.json();
        const tableBody = document.getElementById('online-users-table');
        const noDataDiv = document.getElementById('no-online-users');
        
        // Xóa dữ liệu cũ
        tableBody.innerHTML = '';
        
        if (users.length === 0) {
            noDataDiv.style.display = 'block';
            return;
        }
        
        noDataDiv.style.display = 'none';
        
        // Thêm dữ liệu mới
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // ID
            const idCell = document.createElement('td');
            idCell.textContent = user.id;
            row.appendChild(idCell);
            
            // Họ tên
            const nameCell = document.createElement('td');
            nameCell.textContent = user.fullName;
            row.appendChild(nameCell);
            
            // Username
            const usernameCell = document.createElement('td');
            usernameCell.textContent = user.username;
            row.appendChild(usernameCell);
            
            // Địa chỉ IP
            const ipCell = document.createElement('td');
            ipCell.textContent = user.ip;
            row.appendChild(ipCell);
            
            // Trạng thái
            const statusCell = document.createElement('td');
            let statusHTML = '';
            
            if (user.inGame) {
                statusHTML = `<span class="status active">Đang chơi</span>`;
            } else {
                statusHTML = `<span class="status online">Online</span>`;
            }
            
            statusCell.innerHTML = statusHTML;
            row.appendChild(statusCell);
            
            // Thời gian online
            const timeCell = document.createElement('td');
            timeCell.textContent = formatTimeAgo(user.loginTime);
            row.appendChild(timeCell);
            
            // Hành động
            const actionCell = document.createElement('td');
            actionCell.innerHTML = `
                <div class="actions">
                    <button class="btn-action view" onclick="viewUserDetails(${user.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action" onclick="sendMessage(${user.id})" title="Gửi tin nhắn">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="btn-action delete" onclick="kickUser(${user.id})" title="Đăng xuất người dùng">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            `;
            row.appendChild(actionCell);
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng đang online:', error);
    }
}

// Lấy danh sách trận đấu đang diễn ra
async function fetchActiveGames() {
    try {
        const response = await fetch('/api/admin/active-games');
        if (!response.ok) {
            throw new Error('Không thể lấy danh sách trận đấu đang diễn ra');
        }
        
        const games = await response.json();
        const tableBody = document.getElementById('active-games-table');
        const noDataDiv = document.getElementById('no-active-games');
        
        // Xóa dữ liệu cũ
        tableBody.innerHTML = '';
        
        if (games.length === 0) {
            noDataDiv.style.display = 'block';
            return;
        }
        
        noDataDiv.style.display = 'none';
        
        // Thêm dữ liệu mới
        games.forEach(game => {
            const row = document.createElement('tr');
            
            // ID
            const idCell = document.createElement('td');
            idCell.textContent = game.id;
            row.appendChild(idCell);
            
            // Loại trận
            const typeCell = document.createElement('td');
            typeCell.textContent = game.isSolo ? 'Tự đấu' : 'Đấu phòng';
            row.appendChild(typeCell);
            
            // Phòng
            const roomCell = document.createElement('td');
            if (game.isSolo) {
                roomCell.textContent = 'N/A';
            } else {
                roomCell.textContent = `${game.roomName} (${game.roomCode})`;
            }
            row.appendChild(roomCell);
            
            // Người tham gia
            const participantsCell = document.createElement('td');
            if (game.isSolo) {
                participantsCell.textContent = game.playerName;
            } else {
                participantsCell.textContent = `${game.participants.length} người`;
                
                // Thêm tooltip hiển thị danh sách người tham gia
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.innerHTML = game.participants.map(p => p.username).join('<br>');
                participantsCell.appendChild(tooltip);
            }
            row.appendChild(participantsCell);
            
            // Bắt đầu
            const startCell = document.createElement('td');
            startCell.textContent = formatTime(game.startedAt);
            row.appendChild(startCell);
            
            // Câu hỏi
            const questionCell = document.createElement('td');
            questionCell.textContent = `${game.currentQuestion}/${game.totalQuestions}`;
            row.appendChild(questionCell);
            
            // Hành động
            const actionCell = document.createElement('td');
            actionCell.innerHTML = `
                <div class="actions">
                    <button class="btn-action view" onclick="viewGameDetails(${game.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action delete" onclick="endGame(${game.id})" title="Kết thúc trận đấu">
                        <i class="fas fa-stop-circle"></i>
                    </button>
                </div>
            `;
            row.appendChild(actionCell);
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách trận đấu đang diễn ra:', error);
    }
}

// Lấy hoạt động gần đây
async function fetchRecentActivities() {
    try {
        const response = await fetch('/api/admin/activities');
        if (!response.ok) {
            throw new Error('Không thể lấy hoạt động gần đây');
        }
        
        const activities = await response.json();
        const timelineDiv = document.getElementById('activity-timeline');
        const noDataDiv = document.getElementById('no-activities');
        
        // Xóa dữ liệu cũ
        timelineDiv.innerHTML = '';
        
        if (activities.length === 0) {
            noDataDiv.style.display = 'block';
            return;
        }
        
        noDataDiv.style.display = 'none';
        
        // Thêm dữ liệu mới
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            activityItem.innerHTML = `
                <div class="activity-time">${formatTime(activity.timestamp)}</div>
                <div class="activity-content">
                    <span class="activity-user">${activity.username}</span> ${activity.action}
                </div>
            `;
            
            timelineDiv.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Lỗi khi lấy hoạt động gần đây:', error);
    }
}

// Thiết lập lắng nghe sự kiện từ Socket.IO
function setupSocketListeners(socket) {
    // Sự kiện khi có người dùng đăng nhập
    socket.on('user_login', function(data) {
        // Cập nhật số người dùng online
        document.getElementById('online-users').textContent = data.onlineUsers;
        
        // Thêm hoạt động mới
        addNewActivity({
            username: data.username,
            action: 'đã đăng nhập vào hệ thống',
            timestamp: new Date()
        });
        
        // Làm mới danh sách người dùng online
        fetchOnlineUsers();
    });
    
    // Sự kiện khi có người dùng đăng xuất
    socket.on('user_logout', function(data) {
        // Cập nhật số người dùng online
        document.getElementById('online-users').textContent = data.onlineUsers;
        
        // Thêm hoạt động mới
        addNewActivity({
            username: data.username,
            action: 'đã đăng xuất khỏi hệ thống',
            timestamp: new Date()
        });
        
        // Làm mới danh sách người dùng online
        fetchOnlineUsers();
    });
    
    // Sự kiện khi có trận đấu mới bắt đầu
    socket.on('game_started', function(data) {
        // Cập nhật số trận đấu hôm nay
        document.getElementById('today-games').textContent = data.todayGames;
        
        // Thêm hoạt động mới
        let action = '';
        if (data.isSolo) {
            action = 'đã bắt đầu một trận tự đấu';
        } else {
            action = `đã bắt đầu một trận đấu phòng (${data.roomCode})`;
        }
        
        addNewActivity({
            username: data.username,
            action: action,
            timestamp: new Date()
        });
        
        // Làm mới danh sách trận đấu đang diễn ra
        fetchActiveGames();
    });
    
    // Sự kiện khi có trận đấu kết thúc
    socket.on('game_ended', function(data) {
        // Thêm hoạt động mới
        let action = '';
        if (data.isSolo) {
            action = `đã kết thúc trận tự đấu với điểm số ${data.score}`;
        } else {
            action = `đã kết thúc trận đấu phòng (${data.roomCode}) với điểm số ${data.score}`;
        }
        
        addNewActivity({
            username: data.username,
            action: action,
            timestamp: new Date()
        });
        
        // Làm mới danh sách trận đấu đang diễn ra
        fetchActiveGames();
    });
}

// Thêm hoạt động mới vào timeline
function addNewActivity(activity) {
    const timelineDiv = document.getElementById('activity-timeline');
    const noDataDiv = document.getElementById('no-activities');
    
    // Ẩn thông báo không có dữ liệu
    noDataDiv.style.display = 'none';
    
    // Tạo phần tử mới
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    activityItem.innerHTML = `
        <div class="activity-time">${formatTime(activity.timestamp)}</div>
        <div class="activity-content">
            <span class="activity-user">${activity.username}</span> ${activity.action}
        </div>
    `;
    
    // Thêm vào đầu timeline
    timelineDiv.insertBefore(activityItem, timelineDiv.firstChild);
    
    // Giới hạn số lượng hoạt động hiển thị
    const maxActivities = 10;
    const activities = timelineDiv.querySelectorAll('.activity-item');
    
    if (activities.length > maxActivities) {
        timelineDiv.removeChild(activities[activities.length - 1]);
    }
}

// Xem chi tiết người dùng
function viewUserDetails(userId) {
    window.location.href = `/admin/users?view=${userId}`;
}

// Gửi tin nhắn cho người dùng
function sendMessage(userId) {
    // Hiển thị modal gửi tin nhắn
    alert('Chức năng gửi tin nhắn đang được phát triển');
}

// Đăng xuất người dùng
async function kickUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất người dùng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/kick-user/${userId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Không thể đăng xuất người dùng');
        }
        
        // Làm mới danh sách người dùng online
        fetchOnlineUsers();
        
        // Cập nhật số người dùng online
        fetchDashboardStats();
    } catch (error) {
        console.error('Lỗi khi đăng xuất người dùng:', error);
        alert('Không thể đăng xuất người dùng. Vui lòng thử lại sau.');
    }
}

// Xem chi tiết trận đấu
function viewGameDetails(gameId) {
    window.location.href = `/admin/game-history?view=${gameId}`;
}

// Kết thúc trận đấu
async function endGame(gameId) {
    if (!confirm('Bạn có chắc chắn muốn kết thúc trận đấu này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/end-game/${gameId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Không thể kết thúc trận đấu');
        }
        
        // Làm mới danh sách trận đấu đang diễn ra
        fetchActiveGames();
    } catch (error) {
        console.error('Lỗi khi kết thúc trận đấu:', error);
        alert('Không thể kết thúc trận đấu. Vui lòng thử lại sau.');
    }
}

// Hiệu ứng đếm số
function animateNumbers() {
    const statValues = document.querySelectorAll('.stat-value');
    
    statValues.forEach(statValue => {
        const finalValue = statValue.textContent;
        
        // Nếu giá trị không phải là số, bỏ qua
        if (isNaN(parseInt(finalValue))) {
            return;
        }
        
        // Đặt giá trị ban đầu là 0
        statValue.textContent = '0';
        
        // Đếm từ 0 đến giá trị cuối cùng
        let currentValue = 0;
        const targetValue = parseInt(finalValue);
        const duration = 1000; // 1 giây
        const stepTime = 50; // 50ms mỗi bước
        const steps = duration / stepTime;
        const increment = targetValue / steps;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                clearInterval(timer);
                statValue.textContent = finalValue;
            } else {
                statValue.textContent = Math.floor(currentValue);
            }
        }, stepTime);
    });
}

// Định dạng thời gian
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Định dạng thời gian đã trôi qua
function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) {
        return 'vừa xong';
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} phút trước`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} giờ trước`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 30) {
        return `${days} ngày trước`;
    }
    
    const months = Math.floor(days / 30);
    if (months < 12) {
        return `${months} tháng trước`;
    }
    
    const years = Math.floor(months / 12);
    return `${years} năm trước`;
}