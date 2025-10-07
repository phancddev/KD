document.addEventListener('DOMContentLoaded', function() {
    // Lấy thông tin người dùng
    fetchUserInfo();
    
    // Khởi tạo bộ chọn năm
    initYearSelector();
    
    // Khởi tạo phân trang
    initPagination();
    
    // Lấy dữ liệu lịch sử trận đấu
    fetchHistory();
    
    // Xử lý sự kiện khi thay đổi tháng hoặc năm
    document.getElementById('month-select').addEventListener('change', function() {
        resetPagination();
        fetchHistory();
    });
    document.getElementById('year-select').addEventListener('change', function() {
        resetPagination();
        fetchHistory();
    });
    
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

// Biến phân trang
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let totalItems = 0;
let allHistoryData = [];

// Khởi tạo phân trang
function initPagination() {
    // Xử lý sự kiện các nút phân trang
    document.getElementById('first-page').addEventListener('click', () => goToPage(1));
    document.getElementById('prev-page').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('next-page').addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('last-page').addEventListener('click', () => goToPage(totalPages));
    
    // Xử lý sự kiện ô nhập số trang
    document.getElementById('page-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const page = parseInt(this.value);
            if (page >= 1 && page <= totalPages) {
                goToPage(page);
            } else {
                this.value = currentPage;
            }
        }
    });
    
    // Xử lý sự kiện thay đổi kích thước trang
    document.getElementById('page-size').addEventListener('change', function() {
        pageSize = parseInt(this.value);
        resetPagination();
        fetchHistory();
    });
}

// Đặt lại phân trang
function resetPagination() {
    currentPage = 1;
    document.getElementById('page-input').value = '1';
}

// Chuyển đến trang cụ thể
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    document.getElementById('page-input').value = page;
    displayHistory(allHistoryData);
    updatePaginationControls();
}

// Cập nhật điều khiển phân trang
function updatePaginationControls() {
    const firstBtn = document.getElementById('first-page');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const lastBtn = document.getElementById('last-page');
    
    // Cập nhật trạng thái nút
    firstBtn.disabled = currentPage === 1;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    lastBtn.disabled = currentPage === totalPages;
    
    // Cập nhật thông tin hiển thị
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    document.getElementById('current-range').textContent = `${startItem}-${endItem}`;
    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('total-pages').textContent = totalPages;
}

// Lấy thông tin người dùng
async function fetchUserInfo() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin người dùng');
        }

        const user = await response.json();
        document.getElementById('username-display').textContent = user.username;

        // Update avatar text with first letter of username
        const avatarText = document.getElementById('avatar-text');
        if (avatarText && user.username) {
            avatarText.textContent = user.username.charAt(0).toUpperCase();
        }
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
        
        // Lưu toàn bộ dữ liệu để phân trang
        allHistoryData = data.history || [];
        totalItems = allHistoryData.length;
        totalPages = Math.ceil(totalItems / pageSize);
        
        // Hiển thị thống kê người dùng
        displayUserStats(data.stats);
        
        // Hiển thị lịch sử trận đấu với phân trang
        displayHistory(allHistoryData);
        
        // Cập nhật điều khiển phân trang
        updatePaginationControls();
        
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử trận đấu:', error);
    }
}

// Hiển thị thống kê người dùng
function displayUserStats(stats) {
    if (!stats) {
        console.warn('No stats data received');
        stats = {
            totalGames: 0,
            totalScore: 0,
            totalCorrectAnswers: 0,
            totalQuestions: 0,
            highestScore: 0,
            byMode: {
                khoidongSolo: 0,
                khoidongRoom: 0,
                tangtocSolo: 0,
                tangtocRoom: 0
            }
        };
    }

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
    } else {
        document.getElementById('khoidong-solo-games').textContent = '0';
        document.getElementById('khoidong-room-games').textContent = '0';
        document.getElementById('tangtoc-solo-games').textContent = '0';
        document.getElementById('tangtoc-room-games').textContent = '0';
    }
}

// Hiển thị lịch sử trận đấu với phân trang
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
    
    // Tính toán dữ liệu cho trang hiện tại
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, history.length);
    const currentPageData = history.slice(startIndex, endIndex);
    
    // Thêm dữ liệu mới
    currentPageData.forEach(game => {
        const row = document.createElement('tr');

        // Thời gian
        const timeCell = document.createElement('td');
        timeCell.textContent = formatDate(game.startedAt);
        row.appendChild(timeCell);

        // Chế độ - hiển thị cả loại trận và game mode
        const modeCell = document.createElement('td');
        const gameType = game.isSolo ? 'Tự đấu' : `Đấu phòng (${game.roomName || 'Không tên'})`;
        const gameMode = game.gameMode === 'tangtoc' ? '🚀 Tăng Tốc' : '🎯 Khởi Động';
        modeCell.innerHTML = `${gameType}<br><small style="color: #666;">${gameMode}</small>`;
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
    
    // Cập nhật điều khiển phân trang
    updatePaginationControls();
}

// Hiển thị chi tiết trận đấu
async function showGameDetails(gameId) {
    try {
        const response = await fetch(`/api/game/${gameId}`);
        if (!response.ok) {
            throw new Error('Không thể lấy chi tiết trận đấu');
        }

        const details = await response.json();

        // Cập nhật thông tin modal
        document.getElementById('modal-time').textContent = formatDate(details.startedAt);
        const gameType = details.isSolo ? 'Tự đấu' : `Đấu phòng (${details.roomName || 'Không tên'})`;
        const gameMode = details.gameMode === 'tangtoc' ? '🚀 Tăng Tốc' : '🎯 Khởi Động';
        document.getElementById('modal-mode').innerHTML = `${gameType} - ${gameMode}`;
        document.getElementById('modal-score').textContent = details.score;
        const correctCount = (details.answers || []).filter(a => a.isCorrect).length;
        document.getElementById('modal-correct').textContent = `${correctCount}/${details.answers.length}`;

        // Hiển thị danh sách câu hỏi dạng bảng
        const questionList = document.getElementById('question-review-list');
        questionList.innerHTML = '';

        if (details.answers && details.answers.length > 0) {
            const rows = details.answers.map((answer, index) => {
                const resultBadge = answer.isCorrect
                    ? '<span class="badge badge-success">✅ Đúng</span>'
                    : '<span class="badge badge-danger">❌ Sai</span>';

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${answer.questionText || ''}</td>
                        <td>${answer.correctAnswer || ''}</td>
                        <td>${answer.userAnswer || '<em style="color: #9ca3af;">Không trả lời</em>'}</td>
                        <td>${resultBadge}</td>
                        <td>
                            <button class="btn-report-small" onclick="reportQuestion(${answer.questionId}, '${(answer.questionText || '').replace(/'/g, "\\'")}', '${(answer.correctAnswer || '').replace(/'/g, "\\'")}', '${(answer.userAnswer || '').replace(/'/g, "\\'")}', '${details.gameMode}')">
                                <i class="fas fa-flag"></i> Báo lỗi
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            questionList.innerHTML = rows;
        } else {
            questionList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #9ca3af; padding: 2rem;">Không có dữ liệu câu hỏi.</td></tr>';
        }

        // Hiển thị modal
        document.getElementById('game-details-modal').style.display = 'block';
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết trận đấu:', error);
        alert('Không thể tải chi tiết trận đấu. Vui lòng thử lại.');
    }
}

// Định dạng ngày tháng
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Báo lỗi câu hỏi (global function)
window.reportQuestion = async function(questionId, questionText, correctAnswer, userAnswer, gameMode) {
    const reportText = prompt('Vui lòng mô tả lỗi bạn tìm thấy:');

    if (!reportText || reportText.trim() === '') {
        return;
    }

    try {
        // Xác định endpoint dựa trên game mode
        const endpoint = gameMode === 'tangtoc' ? '/api/tangtoc-report-question' : '/api/report-question';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                questionId: questionId,
                questionText: questionText,
                correctAnswer: correctAnswer,
                userAnswer: userAnswer || '',
                reportText: reportText.trim(),
                mode: 'solo'
            })
        });

        if (!response.ok) {
            throw new Error('Không thể gửi báo cáo');
        }

        alert('Cảm ơn bạn đã báo cáo! Chúng tôi sẽ xem xét và xử lý sớm nhất.');
    } catch (error) {
        console.error('Lỗi khi báo cáo câu hỏi:', error);
        alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại sau.');
    }
}