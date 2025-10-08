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

  let allQuestions = [];

  if (section.players) {
    // Section có players (Khởi Động Riêng, Về Đích)
    section.players.forEach((player, playerIndex) => {
      if (player.questions) {
        player.questions.forEach(q => {
          allQuestions.push({
            ...q,
            player_index: player.player_index,
            actual_player_index: playerIndex,
            section: sectionKey
          });
        });
      }
    });
  } else {
    // Section không có players
    if (section.questions) {
      allQuestions = section.questions.map(q => ({
        ...q,
        player_index: null,
        section: sectionKey
      }));
    }
  }

  if (allQuestions.length === 0) {
    container.innerHTML = `
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
    return;
  }

  let html = '';
  allQuestions.forEach((question, index) => {
    html += renderQuestionCard(question, index, sectionConfig);
  });

  container.innerHTML = html;
}

/**
 * Render một câu hỏi
 */
function renderQuestionCard(question, index, sectionConfig) {
  const playerInfo = question.player_index !== null && question.player_index !== undefined
    ? `Người chơi ${question.player_index + 1}`
    : 'Chưa gán';

  return `
    <div class="question-card">
      <div class="question-header">
        <div class="question-number">
          <i class="fas fa-question-circle"></i> Câu ${question.order + 1}
          ${question.player_index !== null ? ` - ${playerInfo}` : ''}
        </div>
        <div class="question-actions">
          <button class="btn btn-danger" onclick="deleteQuestion('${question.section}', ${question.actual_player_index}, ${question.order})">
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

      ${sectionConfig.hasPlayers ? `
        <div class="player-selector">
          <label>
            <i class="fas fa-user-tag"></i> Gán cho thí sinh:
          </label>
          <div class="player-buttons">
            ${Array.from({length: sectionConfig.totalPlayers}, (_, i) => `
              <button class="player-btn ${question.player_index === i ? 'selected' : ''}" 
                      onclick="assignPlayer('${question.section}', ${question.actual_player_index}, ${question.order}, ${i})">
                Thí sinh ${i + 1}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Gán câu hỏi cho thí sinh
 * @param {string} section - Section key
 * @param {number} currentPlayerIndex - Index hiện tại trong array players
 * @param {number} questionOrder - Order của câu hỏi
 * @param {number} newPlayerIndex - Player index mới (0, 1, 2, 3)
 */
async function assignPlayer(section, currentPlayerIndex, questionOrder, newPlayerIndex) {
  // Lấy player_index hiện tại từ matchData
  let currentPlayerIndexValue = null;
  if (matchData.sections[section].players) {
    const player = matchData.sections[section].players[currentPlayerIndex];
    currentPlayerIndexValue = player ? player.player_index : null;
  }

  // Kiểm tra nếu đã gán cho thí sinh này rồi
  if (currentPlayerIndexValue === newPlayerIndex) {
    alert(`Câu hỏi này đã được gán cho Thí sinh ${newPlayerIndex + 1} rồi!`);
    return;
  }

  if (!confirm(`Gán câu hỏi này cho Thí sinh ${newPlayerIndex + 1}?`)) {
    return;
  }

  try {
    console.log('Assigning player:', {
      section,
      currentPlayerIndex: currentPlayerIndexValue,
      questionOrder,
      newPlayerIndex
    });

    const response = await fetch(`/api/matches/${matchId}/questions/assign-player`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        section,
        currentPlayerIndex: currentPlayerIndexValue,
        questionOrder,
        newPlayerIndex
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Không thể gán thí sinh');
    }

    alert('Đã gán câu hỏi cho thí sinh mới!');
    await loadMatchData();

  } catch (error) {
    console.error('Error assigning player:', error);
    alert('Lỗi: ' + error.message);
  }
}

/**
 * Xóa câu hỏi
 * @param {string} section - Section key
 * @param {number} actualPlayerIndex - Index trong array players (không phải player_index)
 * @param {number} order - Order của câu hỏi
 */
async function deleteQuestion(section, actualPlayerIndex, order) {
  if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) {
    return;
  }

  try {
    // Lấy player_index thực tế từ matchData
    let playerIndex = null;
    if (matchData.sections[section].players) {
      const player = matchData.sections[section].players[actualPlayerIndex];
      playerIndex = player ? player.player_index : null;
    }

    console.log('Deleting question:', { section, actualPlayerIndex, playerIndex, order });

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

