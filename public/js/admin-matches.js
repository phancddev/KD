/**
 * Admin Matches Management
 */

let matches = [];
let dataNodes = [];
let currentMatchId = null;
let currentSection = 'khoi_dong_rieng';

// Load matches
async function loadMatches() {
  try {
    const response = await fetch('/api/matches');
    const result = await response.json();
    
    if (result.success) {
      matches = result.data;
      renderMatches();
    }
  } catch (error) {
    console.error('Error loading matches:', error);
    alert('Lỗi khi tải danh sách trận đấu');
  }
}

// Load data nodes
async function loadDataNodes() {
  try {
    const response = await fetch('/api/data-nodes');
    const result = await response.json();

    if (result.success) {
      dataNodes = result.data.filter(node => node.status === 'online');
      console.log(`📊 Loaded ${dataNodes.length} online data nodes:`, dataNodes.map(n => `${n.name} (ID: ${n.id})`));
      renderDataNodeSelect();

      // Hiển thị warning nếu không có node online
      if (dataNodes.length === 0) {
        console.warn('⚠️ CẢNH BÁO: Không có Data Node nào online! Không thể tạo trận đấu.');
      }
    }
  } catch (error) {
    console.error('❌ Error loading data nodes:', error);
    dataNodes = [];
    renderDataNodeSelect();
  }
}

// Render matches table
function renderMatches() {
  const tbody = document.getElementById('matchesTableBody');
  
  if (matches.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Chưa có trận đấu nào</td></tr>';
    return;
  }
  
  tbody.innerHTML = matches.map(match => {
    const statusText = {
      draft: 'Nháp',
      ready: 'Sẵn sàng',
      playing: 'Đang chơi',
      finished: 'Kết thúc'
    };

    // Hiển thị thông tin node với badge trạng thái
    let nodeDisplay = 'Chưa chọn';
    if (match.data_node_name) {
      const nodeStatus = match.data_node_status === 'online' ? '🟢' : '🔴';
      const nodeStatusText = match.data_node_status === 'online' ? 'Online' : 'Offline';
      const nodeColor = match.data_node_status === 'online' ? '#4caf50' : '#f44336';
      nodeDisplay = `
        ${match.data_node_name}
        <br>
        <small style="color: ${nodeColor};">${nodeStatus} ${nodeStatusText}</small>
      `;
    }

    return `
      <tr>
        <td><strong>${match.match_code || match.code}</strong></td>
        <td>${match.match_name || match.name}</td>
        <td>${match.host_username || 'N/A'}</td>
        <td>${nodeDisplay}</td>
        <td>${match.participant_count || 0}/4</td>
        <td><span class="status-badge status-${match.status}">${statusText[match.status]}</span></td>
        <td>${new Date(match.created_at).toLocaleDateString('vi-VN')}</td>
        <td>
          <button class="btn btn-primary" onclick="manageQuestions('${match.match_id || match.id}')">Câu hỏi</button>
          <button class="btn btn-danger" onclick="deleteMatch('${match.match_id || match.id}')">Xóa</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render data node select
function renderDataNodeSelect() {
  const select = document.getElementById('dataNodeSelect');
  const errorDiv = document.getElementById('dataNodeError');
  const submitBtn = document.getElementById('createMatchSubmitBtn');

  if (dataNodes.length === 0) {
    select.innerHTML = '<option value="">-- Không có Data Node online --</option>';
    select.disabled = true;
    errorDiv.style.display = 'block';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }
  } else {
    select.innerHTML = '<option value="">-- Chọn Data Node --</option>' +
      dataNodes.map(node => `
        <option value="${node.id}">${node.name} (${node.host}:${node.port}) - ${node.status === 'online' ? '🟢 Online' : '🔴 Offline'}</option>
      `).join('');
    select.disabled = false;
    errorDiv.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
  }
}

// Show create modal
function showCreateModal() {
  document.getElementById('createMatchForm').reset();
  document.getElementById('createMatchModal').style.display = 'block';
  loadDataNodes();
}

// Close create modal
function closeCreateModal() {
  document.getElementById('createMatchModal').style.display = 'none';
}

// Create match form submit
document.getElementById('createMatchForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const dataNodeId = document.getElementById('dataNodeSelect').value;
  const matchName = document.getElementById('matchName').value;

  // Validate Data Node selection
  if (!dataNodeId) {
    alert('⚠️ Vui lòng chọn Data Node!\n\nData Node là nơi lưu trữ file ảnh/video của trận đấu.\nKhông có Data Node thì không thể upload câu hỏi.');
    return;
  }

  // Double check: Kiểm tra node có thực sự online không
  if (dataNodes.length === 0) {
    alert('❌ KHÔNG THỂ TẠO TRẬN ĐẤU!\n\nKhông có Data Node nào đang online.\nVui lòng khởi động ít nhất 1 Data Node trước khi tạo trận đấu.');
    return;
  }

  const selectedNode = dataNodes.find(n => n.id === parseInt(dataNodeId));
  if (!selectedNode) {
    alert('❌ Data Node đã chọn không còn online!\n\nVui lòng chọn lại Data Node khác.');
    await loadDataNodes(); // Reload danh sách
    return;
  }

  console.log(`🎮 Đang tạo trận đấu "${matchName}" trên Data Node: ${selectedNode.name} (ID: ${selectedNode.id})`);

  const data = {
    name: matchName,
    dataNodeId: dataNodeId
  };

  try {
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      alert('✅ ' + result.message);
      closeCreateModal();
      loadMatches();
    } else {
      alert('❌ Lỗi: ' + result.error);
    }
  } catch (error) {
    console.error('Error creating match:', error);
    alert('❌ Lỗi khi tạo trận đấu');
  }
});

// Delete match
async function deleteMatch(id) {
  if (!confirm('Bạn có chắc muốn xóa trận đấu này?')) return;
  
  try {
    const response = await fetch(`/api/matches/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(result.message);
      loadMatches();
    } else {
      alert('Lỗi: ' + result.error);
    }
  } catch (error) {
    console.error('Error deleting match:', error);
    alert('Lỗi khi xóa trận đấu');
  }
}

// Manage questions
async function manageQuestions(matchId) {
  // Redirect to new questions management page
  window.location.href = `/admin/match-manage?matchId=${matchId}`;
}

// Close questions modal
function closeQuestionsModal() {
  document.getElementById('questionsModal').style.display = 'none';
  currentMatchId = null;
}

// Switch tab
function switchTab(section) {
  currentSection = section;
  
  // Update tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update content
  document.querySelectorAll('.section-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(section).classList.add('active');
}

// Load questions
async function loadQuestions() {
  if (!currentMatchId) return;
  
  try {
    const response = await fetch(`/api/matches/${currentMatchId}/questions`);
    const result = await response.json();
    
    if (result.success) {
      const questions = result.data;
      
      // Group by section
      const sections = ['khoi_dong_rieng', 'khoi_dong_chung', 'vcnv', 'tang_toc', 've_dich'];
      
      sections.forEach(section => {
        const sectionQuestions = questions.filter(q => q.section === section);
        renderSectionQuestions(section, sectionQuestions);
      });
    }
  } catch (error) {
    console.error('Error loading questions:', error);
  }
}

// Render section questions
function renderSectionQuestions(section, questions) {
  const container = document.getElementById(`${section}_questions`);
  
  if (questions.length === 0) {
    container.innerHTML = '<p>Chưa có câu hỏi nào</p>';
    return;
  }
  
  container.innerHTML = questions.map(q => `
    <div class="question-item">
      <div><strong>Câu ${q.question_order + 1}</strong> ${q.player_index !== null ? `(Người chơi ${q.player_index + 1})` : ''}</div>
      <div>Loại: ${q.question_type}</div>
      ${q.question_text ? `<div>Câu hỏi: ${q.question_text}</div>` : ''}
      ${q.media_url ? `<div>Media: <a href="${q.media_url}" target="_blank">Xem</a></div>` : ''}
      ${q.answer_text ? `<div>Đáp án: ${q.answer_text}</div>` : ''}
      <div>Điểm: ${q.points}</div>
      <button class="btn btn-danger" onclick="deleteQuestion(${q.id})">Xóa</button>
    </div>
  `).join('');
}

// Add question
function addQuestion(section) {
  // Redirect to upload page or show upload form
  alert(`Chức năng upload câu hỏi cho phần ${section} sẽ được triển khai tiếp`);
  // TODO: Implement upload form
}

// Delete question
async function deleteQuestion(questionId) {
  if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
  
  // TODO: Implement delete question API
  alert('Chức năng xóa câu hỏi sẽ được triển khai tiếp');
}

// Initialize
loadMatches();
loadDataNodes();

// Auto refresh every 30 seconds
setInterval(loadMatches, 30000);

