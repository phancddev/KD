/**
 * VCNV Play - Logic chơi game Vượt Chướng Ngại Vật
 */

let matchId = null;
let vcnvData = null;
let currentQuestionIndex = 0;
let revealedPieces = [];

// Khởi tạo game
document.addEventListener('DOMContentLoaded', async () => {
  // Lấy match ID từ URL
  const urlParams = new URLSearchParams(window.location.search);
  matchId = urlParams.get('matchId');

  // Kiểm tra mode
  const isPreview = urlParams.get('preview') === 'true';
  const useDemo = urlParams.get('demo') === 'true';

  // Load dữ liệu VCNV
  if (isPreview) {
    await loadVCNVDataFromPreview();
    // Thêm badge PREVIEW
    addPreviewBadge();
  } else if (useDemo || !matchId) {
    await loadVCNVData(true);
    // Thêm badge DEMO
    addDemoBadge();
  } else {
    await loadVCNVData(false);
  }

  // Render câu hỏi đầu tiên
  renderQuestion();
  updateProgressBar();
});

/**
 * Load dữ liệu VCNV từ sessionStorage (preview mode)
 */
async function loadVCNVDataFromPreview() {
  try {
    console.log('📊 Loading VCNV data from preview...');

    // Đọc dữ liệu từ sessionStorage
    const previewDataStr = sessionStorage.getItem('vcnv_preview_data');

    if (!previewDataStr) {
      throw new Error('Không tìm thấy dữ liệu preview. Vui lòng thử lại từ trang upload.');
    }

    vcnvData = JSON.parse(previewDataStr);

    // Set ảnh nền cho puzzle
    const mainImageUrl = vcnvData.main_image_url;
    if (mainImageUrl) {
      document.querySelectorAll('.puzzle-piece').forEach(piece => {
        piece.style.backgroundImage = `url(${mainImageUrl})`;
      });
    }

    console.log(`✅ Loaded ${vcnvData.questions.length} VCNV questions from preview`);

    // Xóa dữ liệu preview sau khi load (tùy chọn)
    // sessionStorage.removeItem('vcnv_preview_data');

  } catch (error) {
    console.error('Lỗi khi load VCNV preview data:', error);
    alert('Không thể load dữ liệu preview! Lỗi: ' + error.message);
  }
}

/**
 * Load dữ liệu VCNV từ API hoặc demo
 */
async function loadVCNVData(useDemo = false) {
  try {
    let data;

    if (useDemo) {
      // Load demo data
      console.log('📊 Loading demo VCNV data...');
      const response = await fetch('/demo-vcnv-data.json');
      vcnvData = await response.json();
      data = { success: true, data: vcnvData };
    } else {
      // Load từ API
      const response = await fetch(`/api/matches/${matchId}/vcnv`);
      data = await response.json();

      if (data.success) {
        vcnvData = data.data;
      }
    }

    if (data.success && vcnvData) {
      // Set ảnh nền cho puzzle
      const mainImageUrl = vcnvData.main_image_url;
      if (mainImageUrl) {
        document.querySelectorAll('.puzzle-piece').forEach(piece => {
          piece.style.backgroundImage = `url(${mainImageUrl})`;
        });
      }

      console.log(`✅ Loaded ${vcnvData.questions.length} VCNV questions`);
    } else {
      throw new Error(data.error || 'Không thể load dữ liệu VCNV');
    }
  } catch (error) {
    console.error('Lỗi khi load VCNV data:', error);
    alert('Không thể load dữ liệu trò chơi! Lỗi: ' + error.message);
  }
}

/**
 * Render câu hỏi hiện tại
 */
function renderQuestion() {
  if (!vcnvData || !vcnvData.questions) return;

  const question = vcnvData.questions[currentQuestionIndex];
  if (!question) {
    showCompletedScreen();
    return;
  }

  // Hiển thị số câu hỏi
  document.getElementById('questionNumber').textContent = `Chướng ngại vật ${currentQuestionIndex + 1}`;
  
  // Hiển thị câu hỏi
  document.getElementById('questionText').textContent = question.question_text;

  // Render ô chữ cho đáp án
  renderAnswerBoxes(question.word_count);

  // Clear input
  document.getElementById('answerInput').value = '';
  document.getElementById('answerInput').focus();
}

/**
 * Render các ô chữ cho đáp án
 */
function renderAnswerBoxes(wordCount) {
  const container = document.getElementById('answerDisplay');
  container.innerHTML = '';

  for (let i = 0; i < wordCount; i++) {
    const box = document.createElement('div');
    box.className = 'letter-box';
    box.id = `letter-${i}`;
    container.appendChild(box);
  }
}

/**
 * Submit đáp án
 */
async function submitAnswer() {
  const input = document.getElementById('answerInput');
  const userAnswer = input.value.trim().toUpperCase();
  
  if (!userAnswer) {
    showMessage('Vui lòng nhập đáp án!', 'error');
    return;
  }

  const question = vcnvData.questions[currentQuestionIndex];
  const correctAnswer = question.answer_text.toUpperCase();

  // Kiểm tra đáp án
  if (userAnswer === correctAnswer) {
    // Đúng - hiển thị đáp án và lật ảnh
    revealAnswer(correctAnswer);
    revealPuzzlePiece(currentQuestionIndex);
    showMessage('🎉 Chính xác! Đã lật mở mảnh ảnh!', 'success');

    // Chuyển sang câu tiếp theo sau 2 giây
    setTimeout(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex < vcnvData.questions.length) {
        renderQuestion();
        updateProgressBar();
        clearMessage();
      } else {
        showCompletedScreen();
      }
    }, 2000);
  } else {
    // Sai
    showMessage('❌ Sai rồi! Thử lại nhé!', 'error');
    input.value = '';
    input.focus();
  }
}

/**
 * Hiển thị đáp án đúng
 */
function revealAnswer(answer) {
  const letters = answer.split('');
  letters.forEach((letter, index) => {
    const box = document.getElementById(`letter-${index}`);
    if (box) {
      setTimeout(() => {
        box.textContent = letter;
        box.classList.add('revealed');
      }, index * 100);
    }
  });
}

/**
 * Lật mở mảnh ảnh
 */
function revealPuzzlePiece(index) {
  const pieceNumber = index + 1;
  const piece = document.querySelector(`.puzzle-piece[data-piece="${pieceNumber}"]`);
  
  if (piece) {
    setTimeout(() => {
      piece.classList.add('revealed');
      revealedPieces.push(pieceNumber);
    }, 500);
  }
}

/**
 * Cập nhật thanh tiến trình
 */
function updateProgressBar() {
  const container = document.getElementById('progressBar');
  container.innerHTML = '';

  for (let i = 0; i < vcnvData.questions.length; i++) {
    const item = document.createElement('div');
    item.className = 'progress-item';
    
    if (i < currentQuestionIndex) {
      item.classList.add('completed');
    } else if (i === currentQuestionIndex) {
      item.classList.add('current');
    }
    
    container.appendChild(item);
  }
}

/**
 * Hiển thị thông báo
 */
function showMessage(text, type) {
  const container = document.getElementById('messageArea');
  container.innerHTML = `<div class="message ${type}">${text}</div>`;
}

/**
 * Xóa thông báo
 */
function clearMessage() {
  document.getElementById('messageArea').innerHTML = '';
}

/**
 * Hiển thị màn hình hoàn thành
 */
function showCompletedScreen() {
  const gameBoard = document.getElementById('gameBoard');
  const mainImageUrl = vcnvData.main_image_url;
  
  gameBoard.innerHTML = `
    <div class="completed-screen" style="grid-column: 1 / 3;">
      <h2>🎊 CHÚC MỪNG! 🎊</h2>
      <p style="font-size: 1.5rem; margin-bottom: 2rem;">
        Bạn đã hoàn thành tất cả các chướng ngại vật!
      </p>
      <img src="${mainImageUrl}" alt="Ảnh hoàn chỉnh" class="final-image">
      <button class="btn-submit" onclick="window.location.reload()" style="max-width: 300px; margin: 2rem auto;">
        <i class="fas fa-redo"></i> Chơi lại
      </button>
    </div>
  `;
}

/**
 * Thêm badge PREVIEW vào header
 */
function addPreviewBadge() {
  const header = document.querySelector('.game-header h1');
  if (header && !header.querySelector('.preview-badge')) {
    const badge = document.createElement('span');
    badge.className = 'preview-badge';
    badge.style.cssText = `
      background: #f59e0b;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.6em;
      margin-left: 1rem;
      vertical-align: middle;
    `;
    badge.textContent = 'PREVIEW';
    header.appendChild(badge);
  }
}

/**
 * Thêm badge DEMO vào header
 */
function addDemoBadge() {
  const header = document.querySelector('.game-header h1');
  if (header && !header.querySelector('.demo-badge')) {
    const badge = document.createElement('span');
    badge.className = 'demo-badge';
    badge.style.cssText = `
      background: #10b981;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.6em;
      margin-left: 1rem;
      vertical-align: middle;
    `;
    badge.textContent = 'DEMO';
    header.appendChild(badge);
  }
}

/**
 * Xử lý phím Enter để submit
 */
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn && !submitBtn.disabled) {
      submitAnswer();
    }
  }
});

// Expose functions to global scope
window.submitAnswer = submitAnswer;

