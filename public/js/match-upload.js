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
    totalQuestions: 5,
    allowedTypes: ['text', 'image', 'video'],
    requiresMainImage: true, // Yêu cầu upload ảnh tổng
    requiresWordCount: true  // Yêu cầu nhập số chữ cho đáp án
  },
  'tang_toc': {
    totalQuestions: 4,
    allowedTypes: ['text', 'image', 'video']
  },
  've_dich': {
    questionsPerPlayer: 3,
    totalPlayers: 4,
    allowedTypes: ['text', 'image', 'video']
  }
};

// State
let matchId = null;
let matchData = null;
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
 * Cải thiện để hiển thị đầy đủ cả text và media
 */
function populateExistingData(section, playerIndex, existingQuestions) {
  console.log(`📝 Populating ${section} player ${playerIndex}:`, existingQuestions);

  existingQuestions.forEach(q => {
    // Fix: replace ALL underscores, not just first one
    const questionId = playerIndex !== null ?
      `${section.replace(/_/g, '-')}-p${playerIndex}-q${q.order}` :
      `${section.replace(/_/g, '-')}-q${q.order}`;

    console.log(`   Question ${q.order}:`, {
      questionId,
      question_text: q.question_text,
      answer: q.answer,
      media_url: q.media_url
    });

    // Fill answer
    const answerInput = document.getElementById(`${questionId}-answer`);
    if (answerInput && q.answer) {
      answerInput.value = q.answer;
      console.log(`   ✅ Filled answer for ${questionId}`);
    } else if (q.answer) {
      console.warn(`   ❌ Answer input not found: ${questionId}-answer`);
    }

    // Fill question text (luôn hiển thị nếu có)
    if (q.question_text) {
      const textInput = document.getElementById(`${questionId}-text`);
      console.log(`   Looking for text input: ${questionId}-text`, textInput);

      if (textInput) {
        textInput.value = q.question_text;
        // Highlight để người dùng biết đã có nội dung
        textInput.style.backgroundColor = '#f0f8ff';
        console.log(`   ✅ Filled question text for ${questionId}: "${q.question_text}"`);
      } else {
        console.warn(`   ❌ Text input not found: ${questionId}-text`);
        // Debug: show all textarea IDs
        const allTextareas = Array.from(document.querySelectorAll('textarea')).map(el => el.id);
        console.warn(`   Available textareas:`, allTextareas);
      }
    } else {
      console.log(`   ⚠️  No question_text for ${questionId}`);
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
        // Xác định loại media từ URL hoặc type
        const isVideo = q.type === 'video' || q.media_url.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i);
        const isImage = q.type === 'image' || q.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        if (isVideo) {
          previewDiv.innerHTML = `
            <video src="${q.media_url}" class="file-preview" controls style="max-width: 300px; border-radius: 4px; margin-top: 10px;"></video>
            <div style="margin-top: 5px; font-size: 12px; color: #666;">
              ✅ Đã upload video
              <button onclick="deleteExistingMedia('${questionId}')" style="margin-left: 10px; color: #f44336; cursor: pointer; border: none; background: none;">
                <i class="fas fa-trash"></i> Xóa
              </button>
            </div>
          `;
        } else if (isImage) {
          previewDiv.innerHTML = `
            <img src="${q.media_url}" class="file-preview" style="max-width: 200px; border-radius: 4px; margin-top: 10px;" />
            <div style="margin-top: 5px; font-size: 12px; color: #666;">
              ✅ Đã upload ảnh
              <button onclick="deleteExistingMedia('${questionId}')" style="margin-left: 10px; color: #f44336; cursor: pointer; border: none; background: none;">
                <i class="fas fa-trash"></i> Xóa
              </button>
            </div>
          `;
        }
      }
    }

    // Hiển thị thông báo nếu câu hỏi có cả text và media
    if (q.question_text && q.media_url) {
      const questionItem = document.getElementById(questionId);
      if (questionItem) {
        const header = questionItem.querySelector('.question-header');
        if (header && !header.querySelector('.dual-mode-badge')) {
          const badge = document.createElement('span');
          badge.className = 'dual-mode-badge';
          badge.style.cssText = 'background: #2196F3; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; margin-left: 10px;';
          badge.innerHTML = '<i class="fas fa-layer-group"></i> Text + Media';
          header.querySelector('.question-number').appendChild(badge);
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

  console.log(`🎨 Rendering Khởi Động Riêng for player ${playerIndex}`);

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('khoi_dong_rieng', playerIndex);
  console.log(`   Found ${existingQuestions.length} existing questions:`, existingQuestions);

  let html = '';
  for (let i = 0; i < config.questionsPerPlayer; i++) {
    const existingQ = existingQuestions.find(q => q.order === i);
    html += createQuestionItem('khoi_dong_rieng', playerIndex, i, config.allowedTypes, existingQ);
  }

  container.innerHTML = html;
  console.log(`   ✅ HTML rendered, now populating data...`);

  // ✅ Populate existing data vào form - PHẢI GỌI SAU KHI innerHTML đã set
  // Dùng setTimeout để đảm bảo DOM đã render xong
  setTimeout(() => {
    console.log(`   ⏰ setTimeout callback executing...`);
    populateExistingData('khoi_dong_rieng', playerIndex, existingQuestions);
  }, 100);  // Tăng lên 100ms để chắc chắn
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
  setTimeout(() => {
    populateExistingData('khoi_dong_chung', null, existingQuestions);
  }, 0);
}

/**
 * Render câu hỏi VCNV
 * Cập nhật: 5 câu hỏi thi chung với ảnh ghép
 */
function renderVCNV() {
  const container = document.getElementById('vcnv-questions');
  const config = QUESTION_CONFIG.vcnv;

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('vcnv', null);

  let html = '';

  // Thêm phần upload ảnh tổng cho VCNV
  html += `
    <div class="vcnv-main-image-section" style="margin-bottom: 2rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 8px;">
      <h4 style="margin-bottom: 1rem; color: #ef4444;">
        <i class="fas fa-image"></i> Ảnh tổng Vượt Chướng Ngại Vật
      </h4>
      <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 1rem;">
        Upload ảnh lớn sẽ được chia thành 5 mảnh ghép (4 góc + 1 giữa). Mỗi câu trả lời đúng sẽ lật mở 1 mảnh.
      </p>
      <div class="file-upload-area"
           ondrop="handleDrop(event, 'vcnv-main-image')"
           ondragover="handleDragOver(event)"
           ondragleave="handleDragLeave(event)"
           onclick="document.getElementById('vcnv-main-image-file').click()">
        <i class="fas fa-cloud-upload-alt" style="font-size: 36px; color: #ccc;"></i>
        <p style="margin: 10px 0 0 0;">Kéo thả ảnh hoặc click để chọn</p>
        <input type="file" id="vcnv-main-image-file" accept="image/*"
               style="display: none;" onchange="handleFileSelect(event, 'vcnv-main-image')" />
      </div>
      <div id="vcnv-main-image-preview"></div>
    </div>
  `;

  // 5 câu hỏi với trường nhập số chữ
  for (let i = 0; i < config.totalQuestions; i++) {
    const existingQ = existingQuestions.find(q => q.order === i);
    html += createVCNVQuestionItem(i, existingQ);
  }

  container.innerHTML = html;

  // ✅ Populate existing data vào form
  setTimeout(() => {
    populateExistingData('vcnv', null, existingQuestions);
  }, 0);
}

/**
 * Render câu hỏi Tăng Tốc
 * Cập nhật: 4 câu hỏi thi chung
 */
function renderTangToc() {
  const container = document.getElementById('tang-toc-questions');
  const config = QUESTION_CONFIG.tang_toc;

  // ✅ Lấy câu hỏi đã có từ match.json
  const existingQuestions = getExistingQuestions('tang_toc', null);

  let html = '';
  // 4 câu đều cho phép text, image, video
  for (let i = 0; i < config.totalQuestions; i++) {
    const existingQ = existingQuestions.find(q => q.order === i);
    html += createQuestionItem('tang_toc', null, i, config.allowedTypes, existingQ);
  }

  container.innerHTML = html;

  // ✅ Populate existing data vào form
  setTimeout(() => {
    populateExistingData('tang_toc', null, existingQuestions);
  }, 0);
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
  setTimeout(() => {
    populateExistingData('ve_dich', playerIndex, existingQuestions);
  }, 0);
}

/**
 * Tạo HTML cho 1 câu hỏi VCNV (có trường số chữ)
 */
function createVCNVQuestionItem(questionIndex, existingQuestion = null) {
  const questionId = `vcnv-q${questionIndex}`;
  const wordCount = existingQuestion?.word_count || '';

  let statusBadge = '';
  if (existingQuestion) {
    statusBadge = '<span style="background: #4CAF50; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; margin-left: 10px;">✓ Đã có</span>';
  }

  return `
    <div class="question-item" id="${questionId}" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
      <div class="question-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span class="question-number" style="font-weight: 700; color: #ef4444;">
          Chướng ngại vật ${questionIndex + 1}${statusBadge}
        </span>
      </div>

      <div class="question-content">
        <div class="text-input-section" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">
            <i class="fas fa-font"></i> Câu hỏi:
          </label>
          <textarea class="question-input" rows="3" placeholder="Nhập câu hỏi..."
                    id="${questionId}-text"></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">
              <i class="fas fa-spell-check"></i> Đáp án:
            </label>
            <input type="text" class="question-input" placeholder="Nhập đáp án"
                   id="${questionId}-answer" />
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">
              <i class="fas fa-hashtag"></i> Số chữ trong đáp án:
            </label>
            <input type="number" class="question-input" placeholder="VD: 5" min="1" max="20"
                   id="${questionId}-wordcount" value="${wordCount}" />
          </div>
        </div>
      </div>

      <div class="progress-bar" id="${questionId}-progress" style="display: none;">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    </div>
  `;
}

/**
 * Tạo HTML cho 1 câu hỏi
 */
function createQuestionItem(section, playerIndex, questionIndex, allowedTypes, existingQuestion = null) {
  // IMPORTANT: Replace ALL underscores with dashes for consistent ID
  const sectionId = section.replace(/_/g, '-');
  const questionId = playerIndex !== null ?
    `${sectionId}-p${playerIndex}-q${questionIndex}` :
    `${sectionId}-q${questionIndex}`;

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
        ${createTextInput(questionId)}
        ${createFileUpload(questionId, defaultType)}
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
    <div class="text-input-section" style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">
        <i class="fas fa-font"></i> Câu hỏi dạng text (tùy chọn):
      </label>
      <textarea class="question-input" rows="3" placeholder="Nhập câu hỏi dạng text..."
                id="${questionId}-text"></textarea>
    </div>
  `;
}

/**
 * Tạo file upload
 */
function createFileUpload(questionId) {
  return `
    <div class="file-upload-section" style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">
        <i class="fas fa-image"></i> Ảnh/Video (tùy chọn):
      </label>
      <div class="file-upload-area"
           ondrop="handleDrop(event, '${questionId}')"
           ondragover="handleDragOver(event)"
           ondragleave="handleDragLeave(event)"
           onclick="document.getElementById('${questionId}-file').click()">
        <i class="fas fa-cloud-upload-alt" style="font-size: 36px; color: #ccc;"></i>
        <p style="margin: 10px 0 0 0;">Kéo thả file hoặc click để chọn</p>
        <input type="file" id="${questionId}-file" accept="image/*,video/*"
               style="display: none;" onchange="handleFileSelect(event, '${questionId}')" />
      </div>
      <div id="${questionId}-preview"></div>
    </div>
  `;
}

/**
 * Thay đổi loại câu hỏi
 * Giờ chỉ cập nhật active button, không thay đổi nội dung vì cả text và file đều hiển thị
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

  // Update data-type attribute (for reference)
  contentDiv.setAttribute('data-type', type);
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

      // Show preview với nút xóa
      if (file.type.startsWith('image/')) {
        previewDiv.innerHTML = `
          <img src="${data.url}" class="file-preview" style="max-width: 200px; border-radius: 4px; margin-top: 10px;" />
          <div style="margin-top: 5px; font-size: 12px; color: #666;">
            ✅ Đã upload ảnh
            <button onclick="deleteExistingMedia('${questionId}')" style="margin-left: 10px; color: #f44336; cursor: pointer; border: none; background: none;">
              <i class="fas fa-trash"></i> Xóa
            </button>
          </div>
        `;
      } else if (file.type.startsWith('video/')) {
        previewDiv.innerHTML = `
          <video src="${data.url}" class="file-preview" controls style="max-width: 300px; border-radius: 4px; margin-top: 10px;"></video>
          <div style="margin-top: 5px; font-size: 12px; color: #666;">
            ✅ Đã upload video
            <button onclick="deleteExistingMedia('${questionId}')" style="margin-left: 10px; color: #f44336; cursor: pointer; border: none; background: none;">
              <i class="fas fa-trash"></i> Xóa
            </button>
          </div>
        `;
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
  for (let q = 0; q < 5; q++) {
    const questionId = `vcnv-q${q}`;
    const questionData = collectVCNVQuestionData(questionId, q);
    if (questionData) allQuestions.push(questionData);
  }

  // Tăng tốc
  for (let q = 0; q < 4; q++) {
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
 * Collect VCNV question data (có thêm word_count)
 */
function collectVCNVQuestionData(questionId, questionOrder) {
  const questionItem = document.getElementById(questionId);
  if (!questionItem) return null;

  const textInput = document.getElementById(`${questionId}-text`);
  const answerInput = document.getElementById(`${questionId}-answer`);
  const wordCountInput = document.getElementById(`${questionId}-wordcount`);

  const questionText = textInput ? textInput.value.trim() : '';
  const answer = answerInput ? answerInput.value.trim() : '';
  const wordCount = wordCountInput ? parseInt(wordCountInput.value) : 0;

  // Validate: Phải có câu hỏi, đáp án và số chữ
  if (!questionText || !answer || !wordCount) return null;

  return {
    match_id: matchId,
    section: 'vcnv',
    question_order: questionOrder,
    player_index: null,
    question_type: 'text',
    question_text: questionText,
    media_file: null,
    media_size: null,
    answer_text: answer,
    word_count: wordCount,
    points: 10,
    time_limit: null
  };
}

/**
 * Collect single question data
 * Cập nhật để thu thập cả text và media cùng lúc
 */
function collectQuestionData(questionId, section, playerIndex, questionOrder) {
  const questionItem = document.getElementById(questionId);
  if (!questionItem) return null;

  const contentDiv = questionItem.querySelector('.question-content');
  const questionType = contentDiv.getAttribute('data-type');
  const answerInput = document.getElementById(`${questionId}-answer`);

  // Thu thập question text (luôn kiểm tra)
  const textInput = document.getElementById(`${questionId}-text`);
  const questionText = textInput ? textInput.value.trim() : '';

  // Thu thập media info (luôn kiểm tra)
  const savedData = getSavedQuestionData(section, playerIndex, questionOrder);
  const mediaFileName = savedData?.mediaFileName || null;
  const mediaFileSize = savedData?.mediaFileSize || null;

  const answer = answerInput ? answerInput.value.trim() : '';

  // Validate: Phải có ít nhất text HOẶC media, và phải có answer
  if (!questionText && !mediaFileName) return null;
  if (!answer) return null;

  // Xác định question_type dựa trên nội dung thực tế
  let actualType = questionType;
  if (questionText && mediaFileName) {
    // Có cả text và media
    actualType = 'mixed';
  } else if (questionText) {
    actualType = 'text';
  } else if (mediaFileName) {
    // Xác định từ extension
    if (mediaFileName.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)) {
      actualType = 'video';
    } else if (mediaFileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      actualType = 'image';
    }
  }

  return {
    match_id: matchId,
    section: section,
    question_order: questionOrder,
    player_index: playerIndex,
    question_type: actualType,
    question_text: questionText || null,
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
  const total = 57; // 24 + 12 + 5 + 4 + 12 = 57
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

/**
 * Preview VCNV game với dữ liệu từ form
 */
function previewVCNV() {
  try {
    // Thu thập dữ liệu VCNV từ form
    const vcnvData = collectVCNVPreviewData();

    if (!vcnvData) {
      alert('⚠️ Vui lòng nhập đầy đủ thông tin VCNV trước khi xem trước!\n\n' +
            'Cần có:\n' +
            '✓ Ít nhất 1 câu hỏi với đầy đủ: Câu hỏi, Đáp án, Số chữ\n' +
            '✓ Ảnh tổng (nếu chưa có sẽ dùng ảnh mặc định)');
      return;
    }

    const questionCount = vcnvData.questions.length;
    console.log(`📊 Preview VCNV với ${questionCount} câu hỏi`);

    // Lưu vào sessionStorage để trang preview đọc
    sessionStorage.setItem('vcnv_preview_data', JSON.stringify(vcnvData));

    // Mở trang preview trong tab mới
    const previewUrl = `/game/vcnv-play?preview=true`;
    window.open(previewUrl, '_blank');
  } catch (error) {
    console.error('Lỗi khi preview VCNV:', error);
    alert('Có lỗi khi xem trước: ' + error.message);
  }
}

/**
 * Thu thập dữ liệu VCNV từ form để preview
 */
function collectVCNVPreviewData() {
  const questions = [];

  // Thu thập 5 câu hỏi
  for (let i = 0; i < 5; i++) {
    const questionId = `vcnv-q${i}`;
    const textInput = document.getElementById(`${questionId}-text`);
    const answerInput = document.getElementById(`${questionId}-answer`);
    const wordCountInput = document.getElementById(`${questionId}-wordcount`);

    const questionText = textInput ? textInput.value.trim() : '';
    const answerText = answerInput ? answerInput.value.trim() : '';
    const wordCount = wordCountInput ? parseInt(wordCountInput.value) : 0;

    if (!questionText || !answerText || !wordCount) {
      console.warn(`Câu hỏi ${i + 1} chưa đầy đủ thông tin`);
      continue;
    }

    questions.push({
      order: i,
      question_text: questionText,
      answer_text: answerText,
      word_count: wordCount
    });
  }

  if (questions.length === 0) {
    return null;
  }

  // Lấy URL ảnh tổng (nếu đã upload)
  const mainImagePreview = document.getElementById('vcnv-main-image-preview');
  let mainImageUrl = null;

  if (mainImagePreview) {
    const img = mainImagePreview.querySelector('img');
    if (img) {
      mainImageUrl = img.src;
    }
  }

  // Nếu chưa có ảnh, dùng ảnh mặc định
  if (!mainImageUrl) {
    mainImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop';
  }

  return {
    main_image_url: mainImageUrl,
    questions: questions
  };
}

// Expose functions to global scope for HTML onclick handlers
window.changeQuestionType = changeQuestionType;
window.switchPlayer = switchPlayer;
window.toggleSection = toggleSection;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleFileSelect = handleFileSelect;
window.saveAllQuestions = saveAllQuestions;
window.deleteExistingMedia = deleteExistingMedia;
window.previewVCNV = previewVCNV;
