document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('game-history-table');
  const noData = document.getElementById('no-game-history');
  const refreshBtn = document.getElementById('refresh-history');
  const exportBtn = document.getElementById('export-csv');
  const paginationEl = document.getElementById('history-pagination');
  const filterUser = document.getElementById('filter-user');
  const filterType = document.getElementById('filter-type');
  const filterFrom = document.getElementById('filter-date-from');
  const filterTo = document.getElementById('filter-date-to');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const resetFiltersBtn = document.getElementById('reset-filters');

  let currentPage = 1;
  let pageSize = 10;
  let totalItems = 0;
  let currentGames = [];

  function formatDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  function queryParams() {
    const params = new URLSearchParams(window.location.search);
    const pUser = params.get('userId');
    return { prefillUserId: pUser ? parseInt(pUser) : null };
  }

  async function populateUsersFilter() {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) return;
      const users = await res.json();
      const options = users.map(u => `<option value="${u.id}">${u.fullName || u.username} (#${u.id})</option>`).join('');
      filterUser.insertAdjacentHTML('beforeend', options);
      const { prefillUserId } = queryParams();
      if (prefillUserId) {
        filterUser.value = String(prefillUserId);
      }
    } catch {}
  }

  function renderPagination(pagination) {
    totalItems = pagination.total || 0;
    pageSize = pagination.limit || pageSize || 10;
    currentPage = pagination.page || currentPage || 1;
    const pages = Math.max(pagination.pages || 1, 1);

    const isFirst = currentPage <= 1;
    const isLast = currentPage >= pages;

    let html = '';
    html += `<button class="page-btn first" data-page="1" ${isFirst ? 'disabled' : ''}>«</button>`;
    html += `<button class="page-btn prev" data-page="${Math.max(1, currentPage - 1)}" ${isFirst ? 'disabled' : ''}>‹</button>`;
    html += `
      <div class="page-input-container" style="display:flex;align-items:center;gap:.5rem;padding:.25rem .5rem;border:1px solid #d1d5db;border-radius:8px;background:rgba(255,255,255,0.8)">
        <span>Trang</span>
        <input type="number" id="page-jump" min="1" max="${pages}" value="${currentPage}" style="width:70px;padding:.35rem .5rem;border:1px solid #d1d5db;border-radius:6px;text-align:center" />
        <span>của <strong>${pages}</strong></span>
      </div>`;
    html += `<button class="page-btn next" data-page="${Math.min(pages, currentPage + 1)}" ${isLast ? 'disabled' : ''}>›</button>`;
    html += `<button class="page-btn last" data-page="${pages}" ${isLast ? 'disabled' : ''}>»</button>`;
    html += `
      <div class="pagination-size" style="display:flex;align-items:center;gap:.5rem;margin-left:.5rem">
        <label for="page-size-select">Hiển thị:</label>
        <select id="page-size-select" class="page-size-select">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
        </select>
        <span>/trang</span>
      </div>`;

    paginationEl.innerHTML = html;

    const bindNav = (selector) => {
      const btn = paginationEl.querySelector(selector);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page'));
        if (!Number.isFinite(page)) return;
        currentPage = Math.min(Math.max(1, page), pages);
        loadGames();
      });
    };

    bindNav('.first');
    bindNav('.prev');
    bindNav('.next');
    bindNav('.last');

    const jump = paginationEl.querySelector('#page-jump');
    if (jump) {
      jump.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter') return;
        const val = parseInt(jump.value);
        if (Number.isFinite(val) && val >= 1 && val <= pages) {
          currentPage = val;
          loadGames();
        } else {
          jump.value = String(currentPage);
        }
      });
    }

    const sizeSel = paginationEl.querySelector('#page-size-select');
    if (sizeSel) {
      sizeSel.addEventListener('change', () => {
        const val = parseInt(sizeSel.value) || 10;
        if (val !== pageSize) {
          pageSize = val;
          currentPage = 1;
          loadGames();
        }
      });
    }
  }

  function renderTable(games) {
    currentGames = games || [];
    if (!currentGames.length) {
      tableBody.innerHTML = '';
      if (noData) noData.style.display = 'block';
      return;
    }
    if (noData) noData.style.display = 'none';
    const rows = currentGames.map(g => {
      const typeText = g.isSolo ? 'Tự đấu' : 'Đấu phòng';
      const gameModeText = g.gameMode === 'tangtoc' ? '<span class="badge badge-warning">Tăng Tốc</span>' : '<span class="badge badge-info">Khởi Động</span>';
      const statusText = g.finishedAt ? '<span class="badge badge-success">Đã kết thúc</span>' : '<span class="badge badge-warning">Đang diễn ra</span>';
      const player = `${g.fullName || g.username} (#${g.userId})`;
      const timeText = `${formatDate(g.startedAt)}${g.finishedAt ? ' - ' + formatDate(g.finishedAt) : ''}`;
      const scoreText = `${g.score ?? 0}`;
      const correctText = `${g.correctAnswers ?? 0}/${g.totalQuestions ?? 0}`;
      return `
        <tr>
          <td>${g.id}</td>
          <td>${player}</td>
          <td>${typeText}</td>
          <td>${gameModeText}</td>
          <td>${scoreText}</td>
          <td>${correctText}</td>
          <td>${timeText}</td>
          <td>${statusText}</td>
          <td><button class="btn btn-small view-game" data-id="${g.id}">Xem</button></td>
        </tr>
      `;
    }).join('');
    tableBody.innerHTML = rows;
    tableBody.querySelectorAll('.view-game').forEach(btn => {
      btn.addEventListener('click', () => openGameDetails(parseInt(btn.getAttribute('data-id'))));
    });
  }

  async function loadGames() {
    const params = new URLSearchParams();
    if (filterUser.value) params.set('userId', filterUser.value);
    if (filterType.value) params.set('type', filterType.value);
    if (filterFrom.value) params.set('from', filterFrom.value);
    if (filterTo.value) params.set('to', filterTo.value);
    params.set('page', String(currentPage));
    params.set('limit', String(pageSize));
    const res = await fetch(`/api/admin/game-history?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Fetch game history failed');
    const data = await res.json();
    renderTable(data.games || []);
    renderPagination(data.pagination || { total: 0, page: 1, limit: pageSize, pages: 1 });
  }

  async function openGameDetails(gameId) {
    try {
      const res = await fetch(`/api/admin/game-history/${gameId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fetch game details failed');
      const d = await res.json();
      document.getElementById('modal-game-id').textContent = d.id;
      document.getElementById('modal-player').textContent = `${d.username} (#${d.userId})`;
      document.getElementById('modal-type').textContent = d.isSolo ? 'Tự đấu' : 'Đấu phòng';
      document.getElementById('modal-game-mode').textContent = d.gameMode === 'tangtoc' ? 'Tăng Tốc' : 'Khởi Động';
      document.getElementById('modal-score').textContent = d.score ?? 0;
      document.getElementById('modal-correct').textContent = `${(d.answers || []).filter(a => a.isCorrect).length}/${d.totalQuestions ?? (d.answers || []).length}`;
      document.getElementById('modal-start-time').textContent = formatDate(d.startedAt);
      document.getElementById('modal-end-time').textContent = d.finishedAt ? formatDate(d.finishedAt) : '';
      const duration = d.finishedAt && d.startedAt ? Math.max(0, Math.round((new Date(d.finishedAt) - new Date(d.startedAt)) / 1000)) : '';
      document.getElementById('modal-duration').textContent = duration ? `${duration}s` : '';
      const tbody = document.getElementById('answer-details-table');
      tbody.innerHTML = (d.answers || []).map((a, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${a.questionText || ''}</td>
          <td>${a.correctAnswer || ''}</td>
          <td>${a.userAnswer ?? ''}</td>
          <td>${a.isCorrect ? '<span class="badge badge-success">Đúng</span>' : '<span class="badge badge-secondary">Sai</span>'}</td>
          <td>${a.answerTime != null ? a.answerTime + 's' : ''}</td>
        </tr>
      `).join('');
      const modal = document.getElementById('game-details-modal');
      if (modal) modal.style.display = 'block';
    } catch (e) {
      alert('Không thể tải chi tiết trận đấu');
    }
  }

  function exportCSV() {
    const rows = currentGames.map(g => ({
      id: g.id,
      userId: g.userId,
      username: g.username,
      fullName: g.fullName || '',
      type: g.isSolo ? 'solo' : 'room',
      score: g.score ?? 0,
      correctAnswers: g.correctAnswers ?? 0,
      totalQuestions: g.totalQuestions ?? 0,
      roomCode: g.roomCode || '',
      startedAt: formatDate(g.startedAt),
      finishedAt: g.finishedAt ? formatDate(g.finishedAt) : ''
    }));
    const header = Object.keys(rows[0] || { id: '', userId: '', username: '', fullName: '', type: '', score: '', correctAnswers: '', totalQuestions: '', roomCode: '', startedAt: '', finishedAt: '' });
    const csv = [header.join(',')].concat(rows.map(r => header.map(k => `"${String(r[k]).replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game_history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Modal handlers
  const modal = document.getElementById('game-details-modal');
  if (modal) {
    const closeBtn = modal.querySelector('.close');
    const hide = () => modal.style.display = 'none';
    if (closeBtn) closeBtn.addEventListener('click', hide);
    window.addEventListener('click', (e) => { if (e.target === modal) hide(); });
  }

  // Wire
  if (refreshBtn) refreshBtn.addEventListener('click', () => { loadGames().catch(() => alert('Không thể tải lịch sử trận đấu')); });
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => { currentPage = 1; loadGames().catch(() => {}); });
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => {
    filterUser.value = '';
    filterType.value = '';
    filterFrom.value = '';
    filterTo.value = '';
    currentPage = 1;
    loadGames().catch(() => {});
  });

  // Init
  populateUsersFilter().finally(() => {
    loadGames().catch(() => {
      tableBody.innerHTML = '';
      if (noData) noData.style.display = 'block';
    });
  });
});




