/**
 * Match Questions Management
 * Add/Edit/Delete questions one by one
 */

// Configuration
const SECTIONS = {
  'khoi_dong_rieng': {
    title: 'Khởi Động Riêng',
    icon: 'fa-user',
    color: '#667eea',
    questionsPerPlayer: 6,
    totalPlayers: 4,
    allowedTypes: ['text', 'image', 'video'],
    hasPlayers: true
  },
  'khoi_dong_chung': {
    title: 'Khởi Động Chung',
    icon: 'fa-users',
    color: '#f093fb',
    totalQuestions: 12,
    allowedTypes: ['text', 'image', 'video'],
    hasPlayers: false
  },
  'vcnv': {
    title: 'Vượt Chướng Ngại Vật',
    icon: 'fa-mountain',
    color: '#4facfe',
    totalQuestions: 6,
    allowedTypes: ['text', 'image'],
    hasPlayers: false
  },
  'tang_toc': {
    title: 'Tăng Tốc',
    icon: 'fa-bolt',
    color: '#43e97b',
    totalQuestions: 4,
    allowedTypes: ['image', 'video'],
    hasPlayers: false
  },
  've_dich': {
    title: 'Về Đích',
    icon: 'fa-flag-checkered',
    color: '#fa709a',
    questionsPerPlayer: 3,
    totalPlayers: 4,
    allowedTypes: ['text', 'video'],
    hasPlayers: true
  }
};

// State
let matchId = null;
let matchData = null;
let questions = {};
let currentQuestion = null;
let uploadedFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  matchId = urlParams.get('matchId');
  
  if (!matchId) {
    alert('Không tìm thấy ID trận đấu!');
    window.location.href = '/admin/matches';
    return;
  }
  
  await loadMatchInfo();
  await loadQuestions();
  renderSections();
});

/**
 * Load match info
 */
async function loadMatchInfo() {
  try {
    const response = await fetch(`/api/matches/${matchId}`);
    const result = await response.json();

    if (result.success) {
      matchData = result.data; // Fix: API returns 'data' not 'match'
      document.getElementById('matchName').textContent = matchData.name;
      document.getElementById('playerCount').textContent = matchData.max_players || 4;

      console.log('📋 Match data:', matchData);

      // Load data node info
      if (matchData.data_node_id) {
        await loadDataNodeInfo(matchData.data_node_id);
      } else {
        document.getElementById('dataNodeName').textContent = 'Chưa chọn';
        document.getElementById('dataNodeHost').textContent = '-';
        document.getElementById('dataNodeStatus').textContent = '-';
        showDataNodeWarning('Trận đấu chưa có Data Node. Vui lòng chọn Data Node trước khi upload file.');
      }
    }
  } catch (error) {
    console.error('Lỗi load match info:', error);
  }
}

/**
 * Load data node info
 */
async function loadDataNodeInfo(nodeId) {
  try {
    const response = await fetch(`/api/data-nodes/${nodeId}`);
    const data = await response.json();

    if (data.success) {
      const node = data.data;

      // Update UI
      document.getElementById('dataNodeName').textContent = node.name;
      document.getElementById('dataNodeHost').textContent = `${node.host}:${node.port}`;

      const statusIcon = document.getElementById('dataNodeStatusIcon');
      const statusText = document.getElementById('dataNodeStatus');

      if (node.status === 'online') {
        statusText.textContent = 'Online';
        statusText.style.color = '#4CAF50';
        statusIcon.style.color = '#4CAF50';
        hideDataNodeWarning();
      } else {
        statusText.textContent = 'Offline';
        statusText.style.color = '#f44336';
        statusIcon.style.color = '#f44336';
        showDataNodeWarning('Data Node đang offline! Không thể upload file ảnh/video.');
      }

      // Store node info
      matchData.dataNode = node;
    }
  } catch (error) {
    console.error('Lỗi load data node info:', error);
    showDataNodeWarning('Không thể kết nối tới Data Node.');
  }
}

/**
 * Show data node warning
 */
function showDataNodeWarning(message) {
  const warning = document.getElementById('dataNodeWarning');
  if (message) {
    warning.querySelector('strong').nextSibling.textContent = ' ' + message;
  }
  warning.style.display = 'block';
}

/**
 * Hide data node warning
 */
function hideDataNodeWarning() {
  document.getElementById('dataNodeWarning').style.display = 'none';
}

/**
 * Load existing questions
 */
async function loadQuestions() {
  try {
    const response = await fetch(`/api/matches/${matchId}/questions`);
    const data = await response.json();
    
    if (data.success) {
      // Group questions by section
      questions = {};
      data.questions.forEach(q => {
        if (!questions[q.section]) {
          questions[q.section] = [];
        }
        questions[q.section].push(q);
      });
      
      updateTotalQuestions();
    }
  } catch (error) {
    console.error('Lỗi load questions:', error);
  }
}

/**
 * Render all sections
 */
function renderSections() {
  const container = document.getElementById('sectionsContainer');
  container.innerHTML = '';
  
  Object.keys(SECTIONS).forEach(sectionKey => {
    const section = SECTIONS[sectionKey];
    const sectionQuestions = questions[sectionKey] || [];
    
    const card = document.createElement('div');
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-header" style="background: linear-gradient(135deg, ${section.color} 0%, ${adjustColor(section.color, -20)} 100%);">
        <div>
          <div class="section-title">
            <i class="fas ${section.icon}"></i> ${section.title}
          </div>
          <div class="section-stats">
            ${sectionQuestions.length}/${getTotalQuestionsForSection(sectionKey)} câu
          </div>
        </div>
        <button class="btn btn-primary" onclick="addQuestion('${sectionKey}')">
          <i class="fas fa-plus"></i> Thêm câu hỏi
        </button>
      </div>
      <div class="section-content">
        <div class="questions-list" id="questions-${sectionKey}">
          ${renderQuestionsList(sectionKey, sectionQuestions)}
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

/**
 * Render questions list for a section
 */
function renderQuestionsList(sectionKey, sectionQuestions) {
  if (sectionQuestions.length === 0) {
    return `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>Chưa có câu hỏi nào</p>
      </div>
    `;
  }
  
  const section = SECTIONS[sectionKey];
  
  // Group by player if needed
  if (section.hasPlayers) {
    let html = '';
    for (let p = 0; p < section.totalPlayers; p++) {
      const playerQuestions = sectionQuestions.filter(q => q.player_index === p);
      html += `
        <div style="margin-bottom: 20px;">
          <h3 style="color: ${section.color}; margin-bottom: 10px;">
            <i class="fas fa-user"></i> Người chơi ${p + 1}
          </h3>
          ${playerQuestions.map(q => renderQuestionCard(q)).join('')}
        </div>
      `;
    }
    return html;
  } else {
    return sectionQuestions.map(q => renderQuestionCard(q)).join('');
  }
}

/**
 * Render single question card
 */
function renderQuestionCard(question) {
  return `
    <div class="question-card">
      <div class="question-header">
        <span class="question-number">
          <i class="fas fa-question-circle"></i> Câu ${question.question_order + 1}
          ${question.player_index !== null ? ` - Người chơi ${question.player_index + 1}` : ''}
        </span>
        <div class="question-actions">
          <button class="btn btn-primary" onclick="editQuestion(${question.id})">
            <i class="fas fa-edit"></i> Sửa
          </button>
          <button class="btn btn-danger" onclick="deleteQuestion(${question.id})">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      </div>
      
      <div class="question-content">
        ${question.question_type === 'text' ? `
          <div class="question-text">${question.question_text}</div>
        ` : `
          <div class="question-media">
            ${question.question_type === 'image' ? `
              <img src="${question.media_url}" alt="Question image">
            ` : `
              <video src="${question.media_url}" controls></video>
            `}
          </div>
        `}
      </div>
      
      <div class="question-answer">
        <div class="answer-label">Đáp án:</div>
        <div>${question.answer_text}</div>
      </div>
    </div>
  `;
}

/**
 * Get total questions for section
 */
function getTotalQuestionsForSection(sectionKey) {
  const section = SECTIONS[sectionKey];
  if (section.hasPlayers) {
    return section.questionsPerPlayer * section.totalPlayers;
  } else {
    return section.totalQuestions;
  }
}

/**
 * Update total questions count
 */
function updateTotalQuestions() {
  let total = 0;
  Object.keys(questions).forEach(key => {
    total += questions[key].length;
  });
  
  const expected = Object.keys(SECTIONS).reduce((sum, key) => {
    return sum + getTotalQuestionsForSection(key);
  }, 0);
  
  document.getElementById('totalQuestions').textContent = `${total}/${expected}`;
}

/**
 * Adjust color brightness
 */
function adjustColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

/**
 * Add new question
 */
function addQuestion(sectionKey) {
  const section = SECTIONS[sectionKey];
  const sectionQuestions = questions[sectionKey] || [];

  // Determine next question order and player index
  let questionOrder = 0;
  let playerIndex = null;

  if (section.hasPlayers) {
    // Find which player needs questions
    for (let p = 0; p < section.totalPlayers; p++) {
      const playerQuestions = sectionQuestions.filter(q => q.player_index === p);
      if (playerQuestions.length < section.questionsPerPlayer) {
        playerIndex = p;
        questionOrder = playerQuestions.length;
        break;
      }
    }

    if (playerIndex === null) {
      alert('Đã đủ câu hỏi cho phần này!');
      return;
    }
  } else {
    if (sectionQuestions.length >= section.totalQuestions) {
      alert('Đã đủ câu hỏi cho phần này!');
      return;
    }
    questionOrder = sectionQuestions.length;
  }

  // Open modal
  currentQuestion = {
    section: sectionKey,
    question_order: questionOrder,
    player_index: playerIndex,
    question_type: 'text'
  };

  openModal('Thêm Câu Hỏi', section);
}

/**
 * Edit existing question
 */
async function editQuestion(questionId) {
  try {
    const response = await fetch(`/api/matches/questions/${questionId}`);
    const data = await response.json();

    if (data.success) {
      currentQuestion = data.question;
      const section = SECTIONS[currentQuestion.section];
      openModal('Sửa Câu Hỏi', section);

      // Fill form
      document.getElementById('questionId').value = currentQuestion.id;
      document.getElementById('questionText').value = currentQuestion.question_text || '';
      document.getElementById('answerText').value = currentQuestion.answer_text || '';

      // Select type
      selectQuestionType(currentQuestion.question_type);

      // Show media if exists
      if (currentQuestion.media_url) {
        const preview = document.getElementById('filePreview');
        if (currentQuestion.question_type === 'image') {
          preview.innerHTML = `<img src="${currentQuestion.media_url}" alt="Preview">`;
        } else if (currentQuestion.question_type === 'video') {
          preview.innerHTML = `<video src="${currentQuestion.media_url}" controls></video>`;
        }
      }
    }
  } catch (error) {
    console.error('Lỗi load question:', error);
    alert('Không thể load câu hỏi!');
  }
}

/**
 * Delete question
 */
async function deleteQuestion(questionId) {
  if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) {
    return;
  }

  try {
    const response = await fetch(`/api/matches/${matchId}/questions/${questionId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      alert('Đã xóa câu hỏi!');
      await loadQuestions();
      renderSections();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Lỗi xóa question:', error);
    alert('Không thể xóa câu hỏi!');
  }
}

/**
 * Open modal
 */
function openModal(title, section) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('questionModal').classList.add('active');

  // Reset form
  document.getElementById('questionForm').reset();
  document.getElementById('questionId').value = '';
  document.getElementById('section').value = currentQuestion.section;
  document.getElementById('questionOrder').value = currentQuestion.question_order;
  document.getElementById('playerIndex').value = currentQuestion.player_index || '';
  document.getElementById('filePreview').innerHTML = '';
  uploadedFile = null;

  // Set allowed types
  const typeButtons = document.querySelectorAll('.type-btn');
  typeButtons.forEach(btn => {
    const type = btn.getAttribute('data-type');
    if (section.allowedTypes.includes(type)) {
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';
    }
  });

  // Select first allowed type
  selectQuestionType(section.allowedTypes[0]);
}

/**
 * Close modal
 */
function closeModal() {
  document.getElementById('questionModal').classList.remove('active');
  currentQuestion = null;
  uploadedFile = null;
}

/**
 * Select question type
 */
function selectQuestionType(type) {
  // Update buttons
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-type') === type) {
      btn.classList.add('active');
    }
  });

  // Show/hide content
  if (type === 'text') {
    document.getElementById('textContent').style.display = 'block';
    document.getElementById('fileContent').style.display = 'none';
  } else {
    document.getElementById('textContent').style.display = 'none';
    document.getElementById('fileContent').style.display = 'block';

    // Update file input accept
    const fileInput = document.getElementById('fileInput');
    if (type === 'image') {
      fileInput.accept = 'image/*';
    } else if (type === 'video') {
      fileInput.accept = 'video/*';
    }
  }

  if (currentQuestion) {
    currentQuestion.question_type = type;
  }
}

/**
 * Handle file drag & drop
 */
function handleDragOver(event) {
  event.preventDefault();
  document.getElementById('fileUpload').classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  document.getElementById('fileUpload').classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('fileUpload').classList.remove('dragover');

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    uploadFile(files[0]);
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    uploadFile(file);
  }
}

/**
 * Upload file to data node
 */
async function uploadFile(file) {
  // Check if data node is online
  if (!matchData.dataNode) {
    alert('Trận đấu chưa có Data Node. Vui lòng chọn Data Node trước!');
    return;
  }

  if (matchData.dataNode.status !== 'online') {
    alert('Data Node đang offline! Không thể upload file.\n\nVui lòng:\n1. Khởi động Data Node\n2. Hoặc chọn Data Node khác cho trận đấu');
    return;
  }

  const progressBar = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const preview = document.getElementById('filePreview');

  progressBar.style.display = 'block';
  progressFill.style.width = '0%';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matchId', matchId);

    const response = await fetch('/api/matches/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      progressFill.style.width = '100%';
      uploadedFile = data;

      // Show preview
      if (file.type.startsWith('image/')) {
        preview.innerHTML = `<img src="${data.url}" alt="Preview">`;
      } else if (file.type.startsWith('video/')) {
        preview.innerHTML = `<video src="${data.url}" controls></video>`;
      }

      setTimeout(() => {
        progressBar.style.display = 'none';
      }, 1000);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Lỗi upload:', error);
    alert('Upload thất bại: ' + error.message);
    progressBar.style.display = 'none';
  }
}

/**
 * Save question
 */
async function saveQuestion(event) {
  event.preventDefault();

  const questionId = document.getElementById('questionId').value;
  const questionType = currentQuestion.question_type;
  const questionText = document.getElementById('questionText').value;
  const answerText = document.getElementById('answerText').value;

  // Validate
  if (questionType === 'text' && !questionText) {
    alert('Vui lòng nhập câu hỏi!');
    return;
  }

  if ((questionType === 'image' || questionType === 'video') && !uploadedFile && !questionId) {
    alert('Vui lòng upload file!');
    return;
  }

  if (!answerText) {
    alert('Vui lòng nhập đáp án!');
    return;
  }

  // Prepare data
  const questionData = {
    match_id: matchId,
    section: currentQuestion.section,
    question_order: currentQuestion.question_order,
    player_index: currentQuestion.player_index,
    question_type: questionType,
    question_text: questionType === 'text' ? questionText : null,
    media_url: uploadedFile ? uploadedFile.url : (currentQuestion.media_url || null),
    media_type: uploadedFile ? uploadedFile.fileType : (currentQuestion.media_type || null),
    answer_text: answerText,
    points: 10,
    time_limit: currentQuestion.section === 'khoi_dong_rieng' ? 10 : null
  };

  try {
    let response;
    if (questionId) {
      // Update
      response = await fetch(`/api/matches/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });
    } else {
      // Create
      response = await fetch(`/api/matches/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });
    }

    const data = await response.json();

    if (data.success) {
      alert(questionId ? 'Đã cập nhật câu hỏi!' : 'Đã thêm câu hỏi!');
      closeModal();
      await loadQuestions();
      renderSections();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Lỗi save question:', error);
    alert('Không thể lưu câu hỏi: ' + error.message);
  }
}

// Expose functions to global scope
window.addQuestion = addQuestion;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.closeModal = closeModal;
window.selectQuestionType = selectQuestionType;
window.handleDrop = handleDrop;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleFileSelect = handleFileSelect;
window.saveQuestion = saveQuestion;

