/**
 * Match Management - Quản lý câu hỏi trận đấu
 * Hiển thị tất cả câu hỏi và cho phép assign thí sinh
 */

const SECTIONS = {
  'khoi_dong_rieng': {
    title: 'Khởi Động Riêng',
    icon: 'fa-user',
    hasPlayers: true,
    totalPlayers: 4
  },
  'khoi_dong_chung': {
    title: 'Khởi Động Chung',
    icon: 'fa-users',
    hasPlayers: false
  },
  'vcnv': {
    title: 'Vượt Chướng Ngại Vật',
    icon: 'fa-mountain',
    hasPlayers: false
  },
  'tang_toc': {
    title: 'Tăng Tốc',
    icon: 'fa-bolt',
    hasPlayers: false
  },
  've_dich': {
    title: 'Về Đích',
    icon: 'fa-flag-checkered',
    hasPlayers: true,
    totalPlayers: 4
  }
};

let matchId = null;
let matchData = null;
let currentSection = 'khoi_dong_rieng';
let currentPlayer = {
  'khoi_dong_rieng': 0,
  've_dich': 0
};

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
  // Lấy matchId từ URL
  const urlParams = new URLSearchParams(window.location.search);
  matchId = urlParams.get('matchId');

  if (!matchId) {
    alert('Không tìm thấy ID trận đấu!');
    window.location.href = '/admin/matches';
    return;
  }

  loadMatchData();

  // Setup nút "Thêm câu hỏi"
  const addQuestionBtn = document.getElementById('add-question-btn');
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `/admin/match-upload?matchId=${matchId}`;
    });
  }
});

/**
 * Load dữ liệu trận đấu
 */
async function loadMatchData() {
  try {
    const response = await fetch(`/api/matches/${matchId}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Không thể tải dữ liệu trận đấu');
    }

    matchData = result.data;
    renderMatchInfo();
    renderSectionTabs();
    renderQuestions(currentSection);

  } catch (error) {
    console.error('Error loading match:', error);
    alert('Lỗi: ' + error.message);
  }
}

/**
 * Hiển thị thông tin trận đấu
 */
function renderMatchInfo() {
  document.getElementById('match-code').textContent = matchData.match?.code || matchData.match_code || '---';
  document.getElementById('match-name').textContent = matchData.match?.name || matchData.match_name || '---';
  document.getElementById('total-questions').textContent = matchData.statistics?.total_questions || 0;
  document.getElementById('match-status').textContent = matchData.status || '---';
}

/**
 * Render tabs phần thi
 */
function renderSectionTabs() {
  const tabsContainer = document.getElementById('section-tabs');
  let html = '';

  for (const [key, section] of Object.entries(SECTIONS)) {
    const questionCount = getQuestionCount(key);
    html += `
      <button class="section-tab ${key === currentSection ? 'active' : ''}" 
              onclick="switchSection('${key}')">
        <i class="fas ${section.icon}"></i>
        ${section.title}
        <span style="background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 10px; font-size: 0.9em;">
          ${questionCount}
        </span>
      </button>
    `;
  }

  tabsContainer.innerHTML = html;
}

/**
 * Đếm số câu hỏi trong section
 */
function getQuestionCount(sectionKey) {
  if (!matchData || !matchData.sections || !matchData.sections[sectionKey]) {
    return 0;
  }

  const section = matchData.sections[sectionKey];

  if (section.players) {
    // Section có players
    return section.players.reduce((total, player) => {
      return total + (player.questions ? player.questions.length : 0);
    }, 0);
  } else {
    // Section không có players
    return section.questions ? section.questions.length : 0;
  }
}

/**
 * Chuyển section
 */
function switchSection(sectionKey) {
  currentSection = sectionKey;
  renderSectionTabs();
  renderQuestions(sectionKey);
}

/**
 * Render danh sách câu hỏi
 */
function renderQuestions(sectionKey) {
  const container = document.getElementById('questions-content');
  const section = matchData.sections[sectionKey];
  const sectionConfig = SECTIONS[sectionKey];

  if (!section) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Không có dữ liệu</p></div>';
    return;
  }

  let html = '';

  // ✅ Nếu section có players, hiển thị theo từng thí sinh
  if (sectionConfig.hasPlayers) {
    // Render player tabs
    html += '<div class="player-tabs" style="margin-bottom: 20px;">';
    for (let i = 0; i < sectionConfig.totalPlayers; i++) {
      const player = section.players?.find(p => p.player_index === i);
      const questionCount = player?.questions?.length || 0;
      const isActive = currentPlayer[sectionKey] === i;

      html += `
        <button class="player-tab ${isActive ? 'active' : ''}"
                onclick="switchPlayer('${sectionKey}', ${i})">
          <i class="fas fa-user"></i> Thí sinh ${i + 1}
          <span style="background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 10px; font-size: 0.9em; margin-left: 5px;">
            ${questionCount}
          </span>
        </button>
      `;
    }
    html += '</div>';

    // Render questions cho player hiện tại
    const playerIdx = currentPlayer[sectionKey];
    const player = section.players?.find(p => p.player_index === playerIdx);
    const questions = player?.questions || [];

    if (questions.length === 0) {
      html += `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>Thí sinh ${playerIdx + 1} chưa có câu hỏi nào</p>
          <p style="margin-top: 10px;">
            <a href="/admin/match-upload?matchId=${matchId}" class="btn btn-primary">
              <i class="fas fa-plus"></i> Thêm câu hỏi
            </a>
          </p>
        </div>
      `;
    } else {
      questions.forEach((question, index) => {
        html += renderQuestionCard(question, index, sectionConfig, playerIdx);
      });
    }

  } else {
    // Section không có players - hiển thị tất cả câu hỏi
    const questions = section.questions || [];

    if (questions.length === 0) {
      html += `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>Chưa có câu hỏi nào trong phần này</p>
          <p style="margin-top: 10px;">
            <a href="/admin/match-upload?matchId=${matchId}" class="btn btn-primary">
              <i class="fas fa-plus"></i> Thêm câu hỏi
            </a>
          </p>
        </div>
      `;
    } else {
      questions.forEach((question, index) => {
        html += renderQuestionCard(question, index, sectionConfig, null);
      });
    }
  }

  container.innerHTML = html;
}

/**
 * Switch player tab
 */
function switchPlayer(sectionKey, playerIndex) {
  currentPlayer[sectionKey] = playerIndex;
  renderQuestions(sectionKey);
}

/**
 * Render một câu hỏi
 */
function renderQuestionCard(question, index, sectionConfig, playerIndex) {
  return `
    <div class="question-card">
      <div class="question-header">
        <div class="question-number">
          <i class="fas fa-question-circle"></i> Câu ${question.order + 1}
        </div>
        <div class="question-actions">
          <button class="btn btn-danger" onclick="deleteQuestion('${currentSection}', ${playerIndex}, ${question.order})">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      </div>

      <div class="question-content">
        ${question.question_text ? `
          <div class="question-text">
            <strong>Câu hỏi:</strong> ${question.question_text}
          </div>
        ` : ''}

        ${question.media_url ? `
          <div style="margin: 10px 0;">
            <strong>Media:</strong>
            ${question.type === 'image' ? `
              <img src="${question.media_url}" alt="Question" style="max-width: 300px; border-radius: 8px; margin-top: 10px;">
            ` : `
              <video src="${question.media_url}" controls style="max-width: 400px; border-radius: 8px; margin-top: 10px;"></video>
            `}
          </div>
        ` : ''}

        <div class="question-answer">
          <div class="answer-label">Đáp án:</div>
          <div>${question.answer || 'Chưa có đáp án'}</div>
        </div>
      </div>

      <div class="question-meta">
        <div class="meta-item">
          <i class="fas fa-tag"></i> Loại: ${question.type}
        </div>
        <div class="meta-item">
          <i class="fas fa-star"></i> Điểm: ${question.points || 10}
        </div>
        ${question.time_limit ? `
          <div class="meta-item">
            <i class="fas fa-clock"></i> Thời gian: ${question.time_limit}s
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ✅ Đã xóa function assignPlayer - không cần nữa vì đã setup sẵn khi upload

/**
 * Xóa câu hỏi
 * @param {string} section - Section key
 * @param {number} playerIndex - Player index (0, 1, 2, 3) hoặc null nếu không có player
 * @param {number} order - Order của câu hỏi
 */
async function deleteQuestion(section, playerIndex, order) {
  if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) {
    return;
  }

  try {
    console.log('Deleting question:', { section, playerIndex, order });

    const response = await fetch(`/api/matches/${matchId}/questions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        section,
        playerIndex,
        order
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Không thể xóa câu hỏi');
    }

    alert('Đã xóa câu hỏi thành công!');
    await loadMatchData();

  } catch (error) {
    console.error('Error deleting question:', error);
    alert('Lỗi: ' + error.message);
  }
}

// Expose functions to global scope
window.switchSection = switchSection;
window.switchPlayer = switchPlayer;
window.deleteQuestion = deleteQuestion;
