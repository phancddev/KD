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
    pageSize = pagination.limit || 10;
    currentPage = pagination.page || 1;
    const pages = Math.max(pagination.pages || 1, 1);
    let html = '';
    for (let p = 1; p <= pages; p++) {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.getAttribute('data-page'));
        loadGames();
      });
    });
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




