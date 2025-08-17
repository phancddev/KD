document.addEventListener('DOMContentLoaded', function() {
    // Lấy thông tin người dùng
    fetchUserInfo();
    
    // Khởi tạo bộ chọn năm
    initYearSelector();
    
    // Lấy dữ liệu xếp hạng
    fetchRanking();
    
    // Xử lý sự kiện khi thay đổi tháng hoặc năm
    document.getElementById('month-select').addEventListener('change', fetchRanking);
    document.getElementById('year-select').addEventListener('change', fetchRanking);
});

// Lấy thông tin người dùng
async function fetchUserInfo() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin người dùng');
        }
        
        const user = await response.json();
        document.getElementById('username-display').textContent = user.username;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
    }
}

// Khởi tạo bộ chọn năm
function initYearSelector() {
    const yearSelect = document.getElementById('year-select');
    const currentYear = new Date().getFullYear();
    
    // Thêm các năm từ năm hiện tại trở về 5 năm trước
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

// Lấy dữ liệu xếp hạng
async function fetchRanking() {
    try {
        const monthSelect = document.getElementById('month-select');
        const yearSelect = document.getElementById('year-select');
        
        const month = monthSelect.value;
        const year = yearSelect.value;
        
        const response = await fetch(`/api/ranking?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error('Không thể lấy dữ liệu xếp hạng');
        }
        
        const data = await response.json();
        
        // Hiển thị xếp hạng
        displayRanking(data.ranking, data.currentUserId);
    } catch (error) {
        console.error('Lỗi khi lấy xếp hạng:', error);
    }
}

// Hiển thị xếp hạng
function displayRanking(ranking, currentUserId) {
    const tableBody = document.getElementById('ranking-table-body');
    const noRankingDiv = document.getElementById('no-ranking');
    
    // Xóa dữ liệu cũ
    tableBody.innerHTML = '';
    
    // Cập nhật top 3 người chơi
    updateTopPlayers(ranking);
    
    if (ranking.length === 0) {
        // Hiển thị thông báo không có dữ liệu
        noRankingDiv.style.display = 'block';
        return;
    }
    
    // Ẩn thông báo không có dữ liệu
    noRankingDiv.style.display = 'none';
    
    // Thêm dữ liệu mới
    ranking.forEach(player => {
        // Bỏ qua top 3 vì đã hiển thị ở trên
        if (player.rank <= 3) {
            return;
        }
        
        const row = document.createElement('tr');
        if (player.userId === currentUserId) {
            row.className = 'highlight';
        }
        
        // Hạng
        const rankCell = document.createElement('td');
        rankCell.textContent = player.rank;
        if (player.rank <= 3) {
            rankCell.className = `rank-${player.rank}`;
        }
        row.appendChild(rankCell);
        
        // Người chơi
        const playerCell = document.createElement('td');
        playerCell.textContent = player.fullName || player.username;
        row.appendChild(playerCell);
        
        // Số trận
        const gamesCell = document.createElement('td');
        gamesCell.textContent = player.totalGames;
        row.appendChild(gamesCell);
        
        // Tổng điểm
        const scoreCell = document.createElement('td');
        scoreCell.textContent = player.totalScore;
        row.appendChild(scoreCell);
        
        // Câu đúng
        const correctCell = document.createElement('td');
        correctCell.textContent = player.totalCorrectAnswers;
        row.appendChild(correctCell);
        
        tableBody.appendChild(row);
    });
}

// Cập nhật top 3 người chơi
function updateTopPlayers(ranking) {
    const firstPlace = document.getElementById('first-place');
    const secondPlace = document.getElementById('second-place');
    const thirdPlace = document.getElementById('third-place');
    
    // Reset top 3
    firstPlace.querySelector('.player-name').textContent = '---';
    firstPlace.querySelector('.player-games').textContent = '0 trận';
    firstPlace.querySelector('.avatar-text').textContent = '1';
    
    secondPlace.querySelector('.player-name').textContent = '---';
    secondPlace.querySelector('.player-games').textContent = '0 trận';
    secondPlace.querySelector('.avatar-text').textContent = '2';
    
    thirdPlace.querySelector('.player-name').textContent = '---';
    thirdPlace.querySelector('.player-games').textContent = '0 trận';
    thirdPlace.querySelector('.avatar-text').textContent = '3';
    
    // Nếu không có dữ liệu, dừng lại
    if (ranking.length === 0) {
        return;
    }
    
    // Cập nhật top 1
    if (ranking.length >= 1) {
        const top1 = ranking[0];
        firstPlace.querySelector('.player-name').textContent = top1.fullName || top1.username;
        firstPlace.querySelector('.player-games').textContent = `${top1.totalGames} trận`;
        firstPlace.querySelector('.avatar-text').textContent = top1.username.charAt(0).toUpperCase();
    }
    
    // Cập nhật top 2
    if (ranking.length >= 2) {
        const top2 = ranking[1];
        secondPlace.querySelector('.player-name').textContent = top2.fullName || top2.username;
        secondPlace.querySelector('.player-games').textContent = `${top2.totalGames} trận`;
        secondPlace.querySelector('.avatar-text').textContent = top2.username.charAt(0).toUpperCase();
    }
    
    // Cập nhật top 3
    if (ranking.length >= 3) {
        const top3 = ranking[2];
        thirdPlace.querySelector('.player-name').textContent = top3.fullName || top3.username;
        thirdPlace.querySelector('.player-games').textContent = `${top3.totalGames} trận`;
        thirdPlace.querySelector('.avatar-text').textContent = top3.username.charAt(0).toUpperCase();
    }
}