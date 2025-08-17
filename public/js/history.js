document.addEventListener('DOMContentLoaded', function() {
    // Lấy thông tin người dùng
    fetchUserInfo();
    
    // Khởi tạo bộ chọn năm
    initYearSelector();
    
    // Lấy dữ liệu lịch sử trận đấu
    fetchHistory();
    
    // Xử lý sự kiện khi thay đổi tháng hoặc năm
    document.getElementById('month-select').addEventListener('change', fetchHistory);
    document.getElementById('year-select').addEventListener('change', fetchHistory);
    
    // Xử lý đóng modal
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('game-details-modal').style.display = 'none';
    });
    
    // Đóng modal khi click bên ngoài
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('game-details-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
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

// Lấy dữ liệu lịch sử trận đấu
async function fetchHistory() {
    try {
        const monthSelect = document.getElementById('month-select');
        const yearSelect = document.getElementById('year-select');
        
        const month = monthSelect.value;
        const year = yearSelect.value;
        
        const response = await fetch(`/api/history?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error('Không thể lấy dữ liệu lịch sử');
        }
        
        const data = await response.json();
        
        // Hiển thị thống kê người dùng
        displayUserStats(data.stats);
        
        // Hiển thị lịch sử trận đấu
        displayHistory(data.history);
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử trận đấu:', error);
    }
}

// Hiển thị thống kê người dùng
function displayUserStats(stats) {
    document.getElementById('total-games').textContent = stats.totalGames;
    document.getElementById('total-score').textContent = stats.totalScore;
    document.getElementById('correct-answers').textContent = `${stats.totalCorrectAnswers}/${stats.totalQuestions}`;
    document.getElementById('highest-score').textContent = stats.highestScore;
}

// Hiển thị lịch sử trận đấu
function displayHistory(history) {
    const tableBody = document.getElementById('history-table-body');
    const noHistoryDiv = document.getElementById('no-history');
    
    // Xóa dữ liệu cũ
    tableBody.innerHTML = '';
    
    if (history.length === 0) {
        // Hiển thị thông báo không có dữ liệu
        noHistoryDiv.style.display = 'block';
        return;
    }
    
    // Ẩn thông báo không có dữ liệu
    noHistoryDiv.style.display = 'none';
    
    // Thêm dữ liệu mới
    history.forEach(game => {
        const row = document.createElement('tr');
        
        // Thời gian
        const timeCell = document.createElement('td');
        timeCell.textContent = formatDate(game.startedAt);
        row.appendChild(timeCell);
        
        // Chế độ
        const modeCell = document.createElement('td');
        if (game.isSolo) {
            modeCell.textContent = 'Tự đấu';
        } else {
            modeCell.textContent = `Đấu phòng (${game.roomName || 'Không tên'})`;
        }
        row.appendChild(modeCell);
        
        // Điểm số
        const scoreCell = document.createElement('td');
        scoreCell.textContent = game.score;
        row.appendChild(scoreCell);
        
        // Câu đúng
        const correctCell = document.createElement('td');
        correctCell.textContent = `${game.correctAnswers}/${game.totalQuestions}`;
        row.appendChild(correctCell);
        
        // Chi tiết
        const detailsCell = document.createElement('td');
        const detailsButton = document.createElement('button');
        detailsButton.textContent = 'Chi tiết';
        detailsButton.className = 'btn-details';
        detailsButton.addEventListener('click', () => showGameDetails(game.id));
        detailsCell.appendChild(detailsButton);
        row.appendChild(detailsCell);
        
        tableBody.appendChild(row);
    });
}

// Hiển thị chi tiết trận đấu
async function showGameDetails(gameId) {
    try {
        const response = await fetch(`/api/history/${gameId}`);
        if (!response.ok) {
            throw new Error('Không thể lấy chi tiết trận đấu');
        }
        
        const details = await response.json();
        
        // Cập nhật thông tin modal
        document.getElementById('modal-time').textContent = formatDate(details.startedAt);
        document.getElementById('modal-mode').textContent = details.isSolo ? 'Tự đấu' : `Đấu phòng (${details.roomName || 'Không tên'})`;
        document.getElementById('modal-score').textContent = details.score;
        document.getElementById('modal-correct').textContent = `${details.correctAnswers}/${details.answers.length}`;
        
        // Hiển thị danh sách câu hỏi
        const questionList = document.getElementById('question-review-list');
        questionList.innerHTML = '';
        
        details.answers.forEach((answer, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = `question-review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            
            const questionTitle = document.createElement('h4');
            questionTitle.textContent = `Câu ${index + 1}: ${answer.questionText}`;
            questionItem.appendChild(questionTitle);
            
            const answerInfo = document.createElement('p');
            answerInfo.innerHTML = `<strong>Đáp án đúng:</strong> ${answer.correctAnswer}<br>
                                   <strong>Đáp án của bạn:</strong> ${answer.userAnswer}<br>
                                   <strong>Kết quả:</strong> ${answer.isCorrect ? 'Đúng' : 'Sai'}`;
            questionItem.appendChild(answerInfo);
            
            questionList.appendChild(questionItem);
        });
        
        // Hiển thị modal
        document.getElementById('game-details-modal').style.display = 'block';
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết trận đấu:', error);
    }
}

// Định dạng ngày tháng
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}