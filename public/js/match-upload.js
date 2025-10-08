/**
 * Match Upload - Quản lý upload câu hỏi cho trận đấu
 */

// Cấu hình số lượng câu hỏi
const QUESTION_CONFIG = {
  'khoi_dong_rieng': {
    questionsPerPlayer: 6,
    totalPlayers: 4,
    allowedTypes: ['text', 'image', 'video']
  },
  'khoi_dong_chung': {
    totalQuestions: 12,
    allowedTypes: ['text', 'image', 'video']
  },
  'vcnv': {
    totalQuestions: 6,
    textQuestions: 5,
    imageQuestions: 1,
    allowedTypes: ['text', 'image']
  },
  'tang_toc': {
    option1: { images: 3, videos: 1 },
    option2: { images: 2, videos: 2 },
    allowedTypes: ['image', 'video']
  },
  've_dich': {
    questionsPerPlayer: 3,
    totalPlayers: 4,
    allowedTypes: ['text', 'video']
  }
};

// State
let matchId = null;
let matchData = null;
let currentTangTocOption = 1;
let currentPlayers = {
  'khoi_dong_rieng': 0,
  've_dich': 0
};
let questions = {
  'khoi_dong_rieng': {},
  'khoi_dong_chung': [],
  'vcnv': [],
  'tang_toc': [],
  've_dich': {}
};

// Khởi tạo khi load trang
document.addEventListener('DOMContentLoaded', async () => {
  // Lấy match ID từ URL
  const urlParams = new URLSearchParams(window.location.search);
  matchId = urlParams.get('matchId');

  if (!matchId) {
    alert('Không tìm thấy ID trận đấu!');
    window.location.href = '/admin/matches';
    return;
  }

  // Load match data (bao gồm cả match info và existing questions)
  await loadMatchData();

  updateTotalQuestions();
});

/**
 * Disable toàn bộ UI upload khi Data Node offline
 */
function disableUploadUI(message) {
  console.error('🚫 Disabling upload UI:', message);

  // Hiển thị warning lớn
  const warningBanner = document.createElement('div');
  warningBanner.style.cssText = `
    background: #fff3cd;
    border: 2px solid #ffc107;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    color: #856404;
  `;
  warningBanner.innerHTML = `
    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
    ${message}
  `;

  const container = document.querySelector('.upload-container');
  container.insertBefore(warningBanner, container.firstChild);

  // Disable tất cả input fields
  document.querySelectorAll('.question-input, textarea').forEach(el => {
    el.disabled = true;
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
  });

  // Disable file upload areas
  document.querySelectorAll('.file-upload-area').forEach(el => {
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
  });

  // Disable type buttons
  document.querySelectorAll('.type-btn').forEach(el => {
    el.disabled = true;
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
  });

  // Disable save button
  document.querySelectorAll('.btn-success, .btn-primary').forEach(el => {
    el.disabled = true;
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
  });

  // Disable player tabs
  document.querySelectorAll('.player-tab').forEach(el => {
    el.disabled = true;
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
  });
}

/**
 * Load match data từ API (bao gồm match info và existing questions)
 */
async function loadMatchData() {
  try {
    const response = await fetch(`/api/matches/${matchId}`);
    const data = await response.json();

    if (data.success) {
      matchData = data.data || data.match;

      console.log('📊 Match Data loaded:', matchData);

      // Hiển thị thông tin cơ bản
      document.getElementById('matchName').textContent = matchData.match_name || matchData.name || '-';
      document.getElementById('playerCount').textContent = matchData.max_players || 4;

      // Hiển thị thông tin node
      const nodeInfo = matchData._node_info || {};
      const nodeName = nodeInfo.node_name || matchData.data_node_name || '-';
      const nodeId = nodeInfo.node_id || matchData.data_node_id || '-';

      const dataNodeEl = document.getElementById('dataNodeName');
      dataNodeEl.innerHTML = `${nodeName} <small style="color: #666;">(ID: ${nodeId})</small>`;

      // Log thông tin node
      console.log('🖥️  Data Node Info:');
      console.log(`   Node ID: ${nodeId}`);
      console.log(`   Node Name: ${nodeName}`);
      console.log(`   Storage Folder: ${nodeInfo.storage_folder || matchData.storage_folder || '-'}`);

      if (nodeInfo.error || data.warning) {
        console.warn(`⚠️  Node Warning: ${nodeInfo.error || data.warning}`);
        dataNodeEl.innerHTML += ` <span style="color: #f44336;">⚠️ Offline</span>`;

        // DISABLE UI khi Data Node offline
        disableUploadUI('Data Node đang offline hoặc không thể đọc dữ liệu trận đấu. Vui lòng kiểm tra kết nối Data Node.');
      } else {
        dataNodeEl.innerHTML += ` <span style="color: #4caf50;">🟢 Online</span>`;

        // Log sections để debug
        console.log('📦 Sections:', matchData.sections);
        if (matchData.sections) {
          console.log('   - khoi_dong_rieng:', matchData.sections.khoi_dong_rieng);
          console.log('   - ve_dich:', matchData.sections.ve_dich);
        }

        // Render các câu hỏi với existing data
        renderKhoiDongRieng();
        renderKhoiDongChung();
        renderVCNV();
        renderTangToc();
        renderVeDich();

        // UPDATE PROGRESS cho các player
        updatePlayerProgress();
      }
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('❌ Lỗi khi load match data:', error);
    alert('Không thể load thông tin trận đấu!');
  }
}

/**
 * Update progress counter cho các player
 */
function updatePlayerProgress() {
  console.log('🔄 updatePlayerProgress() called');

  if (!matchData || !matchData.sections) {
    console.warn('⚠️  matchData or sections not available');
    return;
  }

  // Khởi Động Riêng
  const kdr = matchData.sections.khoi_dong_rieng;
  console.log('📊 Khởi Động Riêng:', kdr);

  if (kdr && kdr.players) {
    console.log(`   Found ${kdr.players.length} players`);
    for (let i = 0; i < 4; i++) {
      const player = kdr.players.find(p => p.player_index === i);
      const count = player?.questions?.length || 0;
      console.log(`   Player ${i}: ${count} questions`);

      const progressEl = document.getElementById(`kdr-p${i}-progress`);
      if (progressEl) {
        progressEl.textContent = `(${count}/6)`;

        // Đổi màu tab nếu đủ 6 câu
        const tab = progressEl.closest('.player-tab');
        if (count >= 6) {
          tab.classList.add('complete');
        } else {
          tab.classList.remove('complete');
        }
      }
    }
  }

  // Về Đích
  const vd = matchData.sections.ve_dich;
  console.log('📊 Về Đích:', vd);

  if (vd && vd.players) {
    console.log(`   Found ${vd.players.length} players`);
    for (let i = 0; i < 4; i++) {
      const player = vd.players.find(p => p.player_index === i);
      const count = player?.questions?.length || 0;
      console.log(`   Player ${i}: ${count} questions`);

      const progressEl = document.getElementById(`vd-p${i}-progress`);
      if (progressEl) {
        progressEl.textContent = `(${count}/3)`;

        // Đổi màu tab nếu đủ 3 câu
        const tab = progressEl.closest('.player-tab');
        if (count >= 3) {
          tab.classList.add('complete');
        } else {
          tab.classList.remove('complete');
        }
      }
    }
  }
}

/**
 * Lấy câu hỏi đã có từ match.json
 */
function getExistingQuestions(section, playerIndex) {
  if (!matchData || !matchData.sections || !matchData.sections[section]) {
    return [];
  }

  const sectionData = matchData.sections[section];

  // Sections có players (khoi_dong_rieng, ve_dich)
  if (sectionData.players) {
    const player = sectionData.players.find(p => p.player_index === playerIndex);
    return player?.questions || [];
  }

  // Sections không có players
  return sectionData.questions || [];
}

/**
 * Populate existing data vào form
 */
function populateExistingData(section, playerIndex, existingQuestions) {
  existingQuestions.forEach(q => {
    const questionId = playerIndex !== null ?
      `${section.replace('_', '-')}-p${playerIndex}-q${q.order}` :
      `${section.replace('_', '-')}-q${q.order}`;

    // Fill answer
    const answerInput = document.getElementById(`${questionId}-answer`);
    if (answerInput && q.answer) {
      answerInput.value = q.answer;
    }

    // Fill question text
    if (q.question_text) {
      const textInput = document.getElementById(`${questionId}-text`);
      if (textInput) {
        textInput.value = q.question_text;
      }
    }

    // Show media preview and save media info to local state
    if (q.media_url) {
      // Save media info to local state for later submission
      saveQuestionData(questionId, {
        mediaUrl: q.media_url,
        mediaFileName: q.media_file,
        mediaFileSize: q.media_size,
        mediaType: q.type
      });

      const previewDiv = document.getElementById(`${questionId}-preview`);
      if (previewDiv) {
        if (q.type === 'image') {
          previewDiv.innerHTML = `
            <img src="${q.media_url}" class="file-preview" style="max-width: 200px; border-radius: 4px; margin-top: 10px;" />
            <div style="margin-top: 5px; font-size: 12px; color: #666;">
              ✅ Đã upload
              <button onclick="deleteExistingMedia('${questionId}')" style="margin-left: 10px; color: #f44336; cursor: pointer; border: none; background: none;">
                <i class="fas fa-trash"></i> Xóa
              </button>
            </div>
          `;
        } else if (q.type === 'video') {
          previewDiv.innerHTML = `
            <video src="${q.media_url}" class="file-preview" controls style="max-width: 300px; border-radius: 4px; margin-top: 10px;"></video>
            <div style="margin-top: 5px; font-size: 12px; color: #666;">
              ✅ Đã upload
              <button onclick="deleteExistingMedia('${questionId}')" style="margin-left: 10px; color: #f44336; cursor: pointer; border: none; background: none;">
                <i class="fas fa-trash"></i> Xóa
              </button>
            </div>
          `;
        }
      }
    }
  });
}

/**
 * Render câu hỏi Khởi Động Riêng
 */
function renderKhoiDongRieng() {
  const container = document.getElementById('khoi-dong-rieng-questions');
  const playerIndex = currentPlayers['khoi_dong_rieng'];
  const config = QUESTION_CONFIG.khoi_dong_rieng;

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('khoi_dong_rieng', playerIndex);

  let html = '';
  for (let i = 0; i < config.questionsPerPlayer; i++) {
    const existingQ = existingQuestions.find(q => q.order === i);
    html += createQuestionItem('khoi_dong_rieng', playerIndex, i, config.allowedTypes, existingQ);
  }

  container.innerHTML = html;

  // ✅ Populate existing data vào form
  populateExistingData('khoi_dong_rieng', playerIndex, existingQuestions);
}

/**
 * Render câu hỏi Khởi Động Chung
 */
function renderKhoiDongChung() {
  const container = document.getElementById('khoi-dong-chung-questions');
  const config = QUESTION_CONFIG.khoi_dong_chung;

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('khoi_dong_chung', null);

  let html = '';
  for (let i = 0; i < config.totalQuestions; i++) {
    const existingQ = existingQuestions.find(q => q.order === i);
    html += createQuestionItem('khoi_dong_chung', null, i, config.allowedTypes, existingQ);
  }

  container.innerHTML = html;

  // ✅ Populate existing data vào form
  populateExistingData('khoi_dong_chung', null, existingQuestions);
}

/**
 * Render câu hỏi VCNV
 */
function renderVCNV() {
  const container = document.getElementById('vcnv-questions');
  const config = QUESTION_CONFIG.vcnv;

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('vcnv', null);

  let html = '';
  // 5 câu text
  for (let i = 0; i < config.textQuestions; i++) {
    const existingQ = existingQuestions.find(q => q.order === i);
    html += createQuestionItem('vcnv', null, i, ['text'], existingQ);
  }
  // 1 câu ảnh
  const existingQ5 = existingQuestions.find(q => q.order === 5);
  html += createQuestionItem('vcnv', null, 5, ['image'], existingQ5);

  container.innerHTML = html;

  // ✅ Populate existing data vào form
  populateExistingData('vcnv', null, existingQuestions);
}

/**
 * Render câu hỏi Tăng Tốc
 */
function renderTangToc() {
  const container = document.getElementById('tang-toc-questions');
  const option = currentTangTocOption === 1 ?
    QUESTION_CONFIG.tang_toc.option1 :
    QUESTION_CONFIG.tang_toc.option2;

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('tang_toc', null);

  let html = '';
  let questionIndex = 0;

  // Render ảnh
  for (let i = 0; i < option.images; i++) {
    const existingQ = existingQuestions.find(q => q.order === questionIndex);
    html += createQuestionItem('tang_toc', null, questionIndex++, ['image', 'text'], existingQ);
  }

  // Render video
  for (let i = 0; i < option.videos; i++) {
    const existingQ = existingQuestions.find(q => q.order === questionIndex);
    html += createQuestionItem('tang_toc', null, questionIndex++, ['video', 'text'], existingQ);
  }

  container.innerHTML = html;

  // ✅ Populate existing data vào form
  populateExistingData('tang_toc', null, existingQuestions);
}

/**
 * Render câu hỏi Về Đích
 */
function renderVeDich() {
  const container = document.getElementById('ve-dich-questions');
  const playerIndex = currentPlayers['ve_dich'];
  const config = QUESTION_CONFIG.ve_dich;

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('ve_dich', playerIndex);

  let html = '';
  for (let i = 0; i < config.questionsPerPlayer; i++) {
    const existingQ = existingQuestions.find(q => q.order === i);
    html += createQuestionItem('ve_dich', playerIndex, i, config.allowedTypes, existingQ);
  }

  container.innerHTML = html;

  // ✅ Populate existing data vào form
  populateExistingData('ve_dich', playerIndex, existingQuestions);
}

/**
 * Tạo HTML cho 1 câu hỏi
 */
function createQuestionItem(section, playerIndex, questionIndex, allowedTypes, existingQuestion = null) {
  const questionId = playerIndex !== null ?
    `${section}-p${playerIndex}-q${questionIndex}` :
    `${section}-q${questionIndex}`;

  // Xác định type từ existing question hoặc default
  let defaultType = 'text';
  if (existingQuestion) {
    defaultType = existingQuestion.type || 'text';
  } else if (allowedTypes.length === 1) {
    defaultType = allowedTypes[0];
  }

  let typeButtons = '';
  allowedTypes.forEach(type => {
    const active = type === defaultType ? 'active' : '';
    const icon = type === 'text' ? 'fa-font' : type === 'image' ? 'fa-image' : 'fa-video';
    typeButtons += `
      <button class="type-btn ${active}" onclick="changeQuestionType('${questionId}', '${type}')">
        <i class="fas ${icon}"></i> ${type.toUpperCase()}
      </button>
    `;
  });

  // Badge hiển thị trạng thái
  let statusBadge = '';
  if (existingQuestion) {
    statusBadge = '<span style="background: #4CAF50; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; margin-left: 10px;">✓ Đã có</span>';
  }

  return `
    <div class="question-item" id="${questionId}">
      <div class="question-header">
        <span class="question-number">Câu ${questionIndex + 1}${statusBadge}</span>
        <div class="question-type-selector">
          ${typeButtons}
        </div>
      </div>

      <div class="question-content" data-type="${defaultType}">
        ${defaultType === 'text' ? createTextInput(questionId) : createFileUpload(questionId, defaultType)}
      </div>

      <input type="text" class="question-input" placeholder="Đáp án"
             id="${questionId}-answer" />

      <div class="progress-bar" id="${questionId}-progress" style="display: none;">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    </div>
  `;
}

/**
 * Tạo input text
 */
function createTextInput(questionId) {
  return `
    <textarea class="question-input" rows="3" placeholder="Nhập câu hỏi..." 
              id="${questionId}-text"></textarea>
  `;
}

/**
 * Tạo file upload
 */
function createFileUpload(questionId, type) {
  const accept = type === 'image' ? 'image/*' : 'video/*';
  return `
    <div class="file-upload-area" 
         ondrop="handleDrop(event, '${questionId}')" 
         ondragover="handleDragOver(event)"
         ondragleave="handleDragLeave(event)"
         onclick="document.getElementById('${questionId}-file').click()">
      <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: #ccc;"></i>
      <p>Kéo thả file hoặc click để chọn</p>
      <input type="file" id="${questionId}-file" accept="${accept}" 
             style="display: none;" onchange="handleFileSelect(event, '${questionId}')" />
    </div>
    <div id="${questionId}-preview"></div>
  `;
}

/**
 * Thay đổi loại câu hỏi
 */
function changeQuestionType(questionId, type) {
  const questionItem = document.getElementById(questionId);
  const contentDiv = questionItem.querySelector('.question-content');
  const typeButtons = questionItem.querySelectorAll('.type-btn');
  
  // Update active button
  typeButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(type.toUpperCase())) {
      btn.classList.add('active');
    }
  });
  
  // Update content
  contentDiv.setAttribute('data-type', type);
  contentDiv.innerHTML = type === 'text' ? 
    createTextInput(questionId) : 
    createFileUpload(questionId, type);
}

/**
 * Switch player tab
 */
function switchPlayer(section, playerIndex) {
  currentPlayers[section] = playerIndex;
  
  // Update tabs
  const tabs = document.querySelectorAll(`#${section}-content .player-tab`);
  tabs.forEach((tab, index) => {
    tab.classList.toggle('active', index === playerIndex);
  });
  
  // Re-render questions
  if (section === 'khoi_dong_rieng') {
    renderKhoiDongRieng();
  } else if (section === 've_dich') {
    renderVeDich();
  }
}

/**
 * Select Tăng Tốc option
 */
function selectTangTocOption(option) {
  currentTangTocOption = option;
  
  // Update UI
  document.querySelectorAll('.option-card').forEach((card, index) => {
    card.classList.toggle('selected', index + 1 === option);
  });
  
  // Re-render
  renderTangToc();
}

/**
 * Toggle section
 */
function toggleSection(sectionId) {
  const content = document.getElementById(`${sectionId}-content`);
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

/**
 * Handle file drag & drop
 */
function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove('dragover');
}

function handleDrop(event, questionId) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');

  const files = event.dataTransfer.files;

  if (files.length > 0) {
    uploadFile(questionId, files[0]);
  }
}

function handleFileSelect(event, questionId) {
  const file = event.target.files[0];
  if (file) {
    uploadFile(questionId, file);
  }
}

/**
 * Upload file to data node
 */
async function uploadFile(questionId, file) {
  const progressBar = document.getElementById(`${questionId}-progress`);
  const progressFill = progressBar.querySelector('.progress-fill');
  const previewDiv = document.getElementById(`${questionId}-preview`);
  
  progressBar.style.display = 'block';
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matchId', matchId);
    formData.append('questionId', questionId);
    
    const response = await fetch('/api/matches/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      progressFill.style.width = '100%';

      // Show preview
      if (file.type.startsWith('image/')) {
        previewDiv.innerHTML = `<img src="${data.url}" class="file-preview" />`;
      } else if (file.type.startsWith('video/')) {
        previewDiv.innerHTML = `<video src="${data.url}" class="file-preview" controls></video>`;
      }

      // Save media info (URL, fileName, fileSize, fileType)
      saveQuestionData(questionId, {
        mediaUrl: data.url,
        mediaFileName: data.fileName,
        mediaFileSize: data.fileSize,
        mediaType: data.fileType || file.type
      });

      setTimeout(() => {
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
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
 * Save question data
 */
function saveQuestionData(questionId, data) {
  const parts = questionId.split('-');
  const section = parts[0] + '_' + parts[1]; // khoi_dong_rieng, khoi_dong_chung, etc.

  if (parts.includes('p')) {
    // Has player index
    const playerIndex = parseInt(parts[2].substring(1));
    const questionIndex = parseInt(parts[3].substring(1));

    if (!questions[section][playerIndex]) {
      questions[section][playerIndex] = [];
    }

    if (!questions[section][playerIndex][questionIndex]) {
      questions[section][playerIndex][questionIndex] = {};
    }

    Object.assign(questions[section][playerIndex][questionIndex], data);
  } else {
    // No player index
    const questionIndex = parseInt(parts[2].substring(1));

    if (!questions[section][questionIndex]) {
      questions[section][questionIndex] = {};
    }

    Object.assign(questions[section][questionIndex], data);
  }

  updateTotalQuestions();
}

/**
 * Collect all question data from form
 */
function collectAllQuestions() {
  const allQuestions = [];

  // Khởi động riêng
  for (let p = 0; p < 4; p++) {
    for (let q = 0; q < 6; q++) {
      const questionId = `khoi_dong_rieng-p${p}-q${q}`;
      const questionData = collectQuestionData(questionId, 'khoi_dong_rieng', p, q);
      if (questionData) allQuestions.push(questionData);
    }
  }

  // Khởi động chung
  for (let q = 0; q < 12; q++) {
    const questionId = `khoi_dong_chung-q${q}`;
    const questionData = collectQuestionData(questionId, 'khoi_dong_chung', null, q);
    if (questionData) allQuestions.push(questionData);
  }

  // VCNV
  for (let q = 0; q < 6; q++) {
    const questionId = `vcnv-q${q}`;
    const questionData = collectQuestionData(questionId, 'vcnv', null, q);
    if (questionData) allQuestions.push(questionData);
  }

  // Tăng tốc
  const tangTocCount = currentTangTocOption === 1 ? 4 : 4;
  for (let q = 0; q < tangTocCount; q++) {
    const questionId = `tang_toc-q${q}`;
    const questionData = collectQuestionData(questionId, 'tang_toc', null, q);
    if (questionData) allQuestions.push(questionData);
  }

  // Về đích
  for (let p = 0; p < 4; p++) {
    for (let q = 0; q < 3; q++) {
      const questionId = `ve_dich-p${p}-q${q}`;
      const questionData = collectQuestionData(questionId, 've_dich', p, q);
      if (questionData) allQuestions.push(questionData);
    }
  }

  return allQuestions;
}

/**
 * Collect single question data
 */
function collectQuestionData(questionId, section, playerIndex, questionOrder) {
  const questionItem = document.getElementById(questionId);
  if (!questionItem) return null;

  const contentDiv = questionItem.querySelector('.question-content');
  const questionType = contentDiv.getAttribute('data-type');
  const answerInput = document.getElementById(`${questionId}-answer`);

  let questionText = null;
  let mediaFileName = null;
  let mediaFileSize = null;

  if (questionType === 'text') {
    const textInput = document.getElementById(`${questionId}-text`);
    questionText = textInput ? textInput.value.trim() : '';
  } else {
    // Get from saved data
    const savedData = getSavedQuestionData(section, playerIndex, questionOrder);
    mediaFileName = savedData?.mediaFileName || null;
    mediaFileSize = savedData?.mediaFileSize || null;
  }

  const answer = answerInput ? answerInput.value.trim() : '';

  // Validate
  if (!questionText && !mediaFileName) return null;
  if (!answer) return null;

  return {
    match_id: matchId,
    section: section,
    question_order: questionOrder,
    player_index: playerIndex,
    question_type: questionType,
    question_text: questionText,
    media_file: mediaFileName,
    media_size: mediaFileSize,
    answer_text: answer,
    points: 10,
    time_limit: section === 'khoi_dong_rieng' ? 10 : null
  };
}

/**
 * Get saved question data
 */
function getSavedQuestionData(section, playerIndex, questionOrder) {
  if (playerIndex !== null) {
    return questions[section]?.[playerIndex]?.[questionOrder];
  } else {
    return questions[section]?.[questionOrder];
  }
}

/**
 * Update total questions count
 */
function updateTotalQuestions() {
  const allQuestions = collectAllQuestions();
  const total = 54; // 24 + 12 + 6 + 4 + 12 = 58 (adjust based on actual)
  document.getElementById('totalQuestions').textContent = `${allQuestions.length}/${total}`;
}

/**
 * Save all questions
 */
async function saveAllQuestions() {
  const allQuestions = collectAllQuestions();

  if (allQuestions.length === 0) {
    alert('Chưa có câu hỏi nào để lưu!');
    return;
  }

  if (!confirm(`Bạn có chắc muốn lưu ${allQuestions.length} câu hỏi?`)) {
    return;
  }

  try {
    const response = await fetch('/api/matches/questions/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matchId: matchId,
        questions: allQuestions
      })
    });

    const data = await response.json();

    if (data.success) {
      alert(`Lưu thành công ${data.count} câu hỏi!`);

      // Redirect về trang danh sách matches
      window.location.href = '/admin/matches';
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Lỗi khi lưu:', error);
    alert('Lưu thất bại: ' + error.message);
  }
}

/**
 * Xóa media đã upload (chỉ xóa preview, không xóa trên server)
 */
function deleteExistingMedia(questionId) {
  if (!confirm('Xóa media này? (Bạn sẽ cần upload lại nếu muốn thay đổi)')) {
    return;
  }

  const previewDiv = document.getElementById(`${questionId}-preview`);
  if (previewDiv) {
    previewDiv.innerHTML = '';
  }

  alert('Đã xóa preview. Vui lòng upload file mới nếu cần.');
}

// Expose functions to global scope for HTML onclick handlers
window.changeQuestionType = changeQuestionType;
window.switchPlayer = switchPlayer;
window.selectTangTocOption = selectTangTocOption;
window.toggleSection = toggleSection;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleFileSelect = handleFileSelect;
window.saveAllQuestions = saveAllQuestions;
window.deleteExistingMedia = deleteExistingMedia;
