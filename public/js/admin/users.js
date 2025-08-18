document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('users-table');
  const noUsers = document.getElementById('no-users');
  const refreshBtn = document.getElementById('refresh-users');
  const exportBtn = document.getElementById('export-users');
  const searchInput = document.getElementById('user-search');
  const paginationEl = document.getElementById('users-pagination');

  let allUsers = [];
  let filteredUsers = [];
  let currentPage = 1;
  const pageSize = 10;

  function formatDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  function renderPagination(total) {
    if (!paginationEl) return;
    const pages = Math.max(Math.ceil(total / pageSize), 1);
    currentPage = Math.min(currentPage, pages);
    let html = '';
    for (let p = 1; p <= pages; p++) {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.getAttribute('data-page'));
        renderTable();
      });
    });
  }

  function renderTable() {
    const list = filteredUsers.length ? filteredUsers : allUsers;
    const total = list.length;
    if (total === 0) {
      tableBody.innerHTML = '';
      if (noUsers) noUsers.style.display = 'block';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }
    if (noUsers) noUsers.style.display = 'none';
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const rows = list.slice(start, end).map(u => {
      const statusBadge = u.isActive ? '<span class="badge badge-success">Kích hoạt</span>' : '<span class="badge badge-secondary">Khóa</span>';
      const adminBadge = u.isAdmin ? '<span class="badge badge-warning">Admin</span>' : '<span class="badge">User</span>';
      const created = formatDate(u.createdAt);
      const lastLogin = u.lastLogin ? formatDate(u.lastLogin) : '';
      return `
        <tr>
          <td>${u.id}</td>
          <td>${u.fullName || ''}</td>
          <td>${u.username}</td>
          <td>${u.email || ''}</td>
          <td>${statusBadge}</td>
          <td>${adminBadge}</td>
          <td>${created}</td>
          <td>
            <button class="btn btn-small view-user" data-id="${u.id}">Xem</button>
          </td>
        </tr>
      `;
    }).join('');
    tableBody.innerHTML = rows;
    // Wire actions
    tableBody.querySelectorAll('.view-user').forEach(btn => {
      btn.addEventListener('click', () => openUserDetails(parseInt(btn.getAttribute('data-id'))));
    });
    renderPagination(total);
  }

  async function fetchUsers() {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    if (!res.ok) throw new Error('Fetch users failed');
    const data = await res.json();
    allUsers = Array.isArray(data) ? data : [];
    filteredUsers = [];
    currentPage = 1;
    renderTable();
  }

  function filterUsers() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    if (!q) {
      filteredUsers = [];
    } else {
      filteredUsers = allUsers.filter(u =>
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    currentPage = 1;
    renderTable();
  }

  async function openUserDetails(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fetch user details failed');
      const u = await res.json();
      // Fill modal fields
      document.getElementById('detail-user-id').textContent = u.id;
      document.getElementById('detail-full-name').textContent = u.fullName || '';
      document.getElementById('detail-username').textContent = u.username;
      document.getElementById('detail-email').textContent = u.email || '';
      document.getElementById('detail-status').textContent = u.isActive ? 'Kích hoạt' : 'Khóa';
      document.getElementById('detail-admin').textContent = u.isAdmin ? 'Có' : 'Không';
      document.getElementById('detail-created-at').textContent = formatDate(u.createdAt);
      document.getElementById('detail-last-login').textContent = u.lastLogin ? formatDate(u.lastLogin) : '';
      const avatarText = (u.fullName || u.username || 'A').charAt(0).toUpperCase();
      const avatarEl = document.getElementById('detail-avatar-text');
      if (avatarEl) avatarEl.textContent = avatarText;
      // Stats
      if (u.stats) {
        document.getElementById('detail-total-games').textContent = u.stats.totalGames || 0;
        document.getElementById('detail-total-score').textContent = u.stats.totalScore || 0;
        const correct = u.stats.totalCorrectAnswers || 0;
        const totalQ = u.stats.totalQuestions || 0;
        document.getElementById('detail-correct-answers').textContent = `${correct}/${totalQ}`;
        document.getElementById('detail-highest-score').textContent = u.stats.highestScore || 0;
      }
      // Login history (from global store if any)
      const loginTable = document.getElementById('login-history-table');
      if (loginTable) {
        loginTable.innerHTML = (u.loginHistory || []).map(l => `
          <tr>
            <td>${formatDate(l.timestamp)}</td>
            <td>${l.ip || ''}</td>
            <td>${l.device || ''}</td>
            <td>${l.status || 'success'}</td>
          </tr>
        `).join('');
      }
      // Link to view user games
      const viewGamesBtn = document.getElementById('view-user-games');
      if (viewGamesBtn) {
        viewGamesBtn.onclick = () => {
          window.location.href = `/admin/game-history?userId=${u.id}`;
        };
      }
      // Show modal
      const modal = document.getElementById('user-details-modal');
      if (modal) modal.style.display = 'block';
    } catch (e) {
      alert('Không thể tải chi tiết người dùng');
    }
  }

  function exportCSV() {
    const rows = (filteredUsers.length ? filteredUsers : allUsers).map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName || '',
      email: u.email || '',
      isAdmin: u.isAdmin ? '1' : '0',
      isActive: u.isActive ? '1' : '0',
      createdAt: formatDate(u.createdAt),
      lastLogin: u.lastLogin ? formatDate(u.lastLogin) : ''
    }));
    const header = Object.keys(rows[0] || { id: '', username: '', fullName: '', email: '', isAdmin: '', isActive: '', createdAt: '', lastLogin: '' });
    const csv = [header.join(',')].concat(rows.map(r => header.map(k => `"${String(r[k]).replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Modal close handlers
  const userModal = document.getElementById('user-details-modal');
  if (userModal) {
    const closeBtn = userModal.querySelector('.close');
    const closeFooter = document.getElementById('close-user-details');
    const hide = () => userModal.style.display = 'none';
    if (closeBtn) closeBtn.addEventListener('click', hide);
    if (closeFooter) closeFooter.addEventListener('click', hide);
    window.addEventListener('click', (e) => { if (e.target === userModal) hide(); });
  }

  // Wire UI
  if (refreshBtn) refreshBtn.addEventListener('click', () => fetchUsers().catch(() => alert('Không thể tải danh sách người dùng')));
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);
  if (searchInput) searchInput.addEventListener('input', filterUsers);

  // Initial load
  fetchUsers().catch(() => {
    tableBody.innerHTML = '';
    if (noUsers) noUsers.style.display = 'block';
  });
});

