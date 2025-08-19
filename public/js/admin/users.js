document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('users-table');
  const noUsers = document.getElementById('no-users');
  const refreshBtn = document.getElementById('refresh-users');
  const exportBtn = document.getElementById('export-users');
  const searchInput = document.getElementById('user-search');
  const paginationEl = document.getElementById('users-pagination');
  const paginationInfoEl = document.getElementById('pagination-info');
  
  // Delete related elements
  const selectAllCheckbox = document.getElementById('select-all-users');
  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  const selectedCountSpan = document.getElementById('selected-count');
  const deleteByDateBtn = document.getElementById('delete-by-date-btn');
  const deleteInactiveBtn = document.getElementById('delete-inactive-btn');
  const previewDeleteBtn = document.getElementById('preview-delete-btn');
  
  // Advanced delete options
  const deleteFromDate = document.getElementById('delete-from-date');
  const deleteToDate = document.getElementById('delete-to-date');
  const inactiveDays = document.getElementById('inactive-days');
  const deleteLockedUsers = document.getElementById('delete-locked-users');
  const deleteNonAdminUsers = document.getElementById('delete-non-admin-users');

  let allUsers = [];
  let filteredUsers = [];
  let currentPage = 1;
  let pageSize = 10;
  let selectedUsers = new Set();

  function formatDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  function renderPaginationInfo(total) {
    if (!paginationInfoEl) return;
    const list = filteredUsers.length ? filteredUsers : allUsers;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(start + pageSize - 1, total);
    
    if (total === 0) {
      paginationInfoEl.innerHTML = '<p class="no-data-text">Không có dữ liệu</p>';
      return;
    }
    
    paginationInfoEl.innerHTML = `
      <div class="pagination-info-content">
        <span class="pagination-text">Hiển thị ${start}-${end} trong tổng số ${total} người dùng</span>
        ${filteredUsers.length > 0 ? `<span class="filtered-info">(Đã lọc: ${filteredUsers.length} kết quả)</span>` : ''}
      </div>
    `;
  }

  function renderPagination(total) {
    if (!paginationEl) return;
    const pages = Math.max(Math.ceil(total / pageSize), 1);
    currentPage = Math.min(currentPage, pages);
    
    let html = '';
    
    // Previous button
    html += `<button class="pagination-btn prev-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i> Trước
    </button>`;
    
    // Page input
    html += `<div class="page-input-container">
      <span class="page-label">Trang</span>
      <input type="number" class="page-input" value="${currentPage}" min="1" max="${pages}">
      <span class="page-total">/ ${pages}</span>
    </div>`;
    
    // Next button
    html += `<button class="pagination-btn next-btn ${currentPage === pages ? 'disabled' : ''}" data-page="${currentPage + 1}" ${currentPage === pages ? 'disabled' : ''}>
      Tiếp <i class="fas fa-chevron-right"></i>
    </button>`;
    
    // Page size selector
    html += `<div class="page-size-container">
      <span class="page-size-label">Hiển thị:</span>
      <select class="page-size-select">
        <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
        <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
        <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
        <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
      </select>
    </div>`;
    
    paginationEl.innerHTML = html;
    
    // Wire pagination events
    const prevBtn = paginationEl.querySelector('.prev-btn');
    const nextBtn = paginationEl.querySelector('.next-btn');
    const pageInput = paginationEl.querySelector('.page-input');
    const pageSizeSelect = paginationEl.querySelector('.page-size-select');
    
    if (prevBtn && !prevBtn.disabled) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderTable();
        }
      });
    }
    
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < pages) {
          currentPage++;
          renderTable();
        }
      });
    }
    
    if (pageInput) {
      pageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const newPage = parseInt(pageInput.value);
          if (newPage >= 1 && newPage <= pages) {
            currentPage = newPage;
            renderTable();
          } else {
            pageInput.value = currentPage; // Reset to current page if invalid
          }
        }
      });
      
      pageInput.addEventListener('blur', () => {
        const newPage = parseInt(pageInput.value);
        if (newPage >= 1 && newPage <= pages) {
          currentPage = newPage;
          renderTable();
        } else {
          pageInput.value = currentPage; // Reset to current page if invalid
        }
      });
    }
    
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        const newPageSize = parseInt(pageSizeSelect.value);
        if (newPageSize !== pageSize) {
          pageSize = newPageSize; // Update global pageSize
          currentPage = 1; // Reset to first page
          renderTable();
        }
      });
    }
  }

  function renderTable() {
    const list = filteredUsers.length ? filteredUsers : allUsers;
    const total = list.length;
    if (total === 0) {
      tableBody.innerHTML = '';
      if (noUsers) noUsers.style.display = 'block';
      if (paginationEl) paginationEl.innerHTML = '';
      if (paginationInfoEl) paginationInfoEl.innerHTML = '';
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
      const isSelected = selectedUsers.has(u.id);
      
      return `
        <tr data-user-id="${u.id}">
          <td>
            <label class="checkbox-label">
              <input type="checkbox" class="user-checkbox" data-id="${u.id}" ${isSelected ? 'checked' : ''}>
              <span class="checkbox-text"></span>
            </label>
          </td>
          <td>${u.id}</td>
          <td>${u.fullName || ''}</td>
          <td>${u.username}</td>
          <td>${u.email || ''}</td>
          <td>${statusBadge}</td>
          <td>${adminBadge}</td>
          <td>${created}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-small view-user" data-id="${u.id}">Xem</button>
              <button class="btn btn-small btn-danger delete-user" data-id="${u.id}" data-username="${u.username}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    tableBody.innerHTML = rows;
    // Wire actions
    tableBody.querySelectorAll('.view-user').forEach(btn => {
      btn.addEventListener('click', () => openUserDetails(parseInt(btn.getAttribute('data-id'))));
    });
    
    // Wire delete buttons
    tableBody.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = parseInt(btn.getAttribute('data-id'));
        const username = btn.getAttribute('data-username');
        confirmDeleteUser(userId, username);
      });
    });
    
    // Wire checkboxes
    tableBody.querySelectorAll('.user-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const userId = parseInt(e.target.getAttribute('data-id'));
        if (e.target.checked) {
          selectedUsers.add(userId);
        } else {
          selectedUsers.delete(userId);
        }
        updateSelectedCount();
        updateBulkDeleteButton();
      });
    });
    
    renderPaginationInfo(total);
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
      // Login history (from database)
      const loginTable = document.getElementById('login-history-table');
      if (loginTable) {
        loginTable.innerHTML = (u.loginHistory || []).map(l => {
          const sessionDuration = l.sessionDuration ? 
            `${Math.floor(l.sessionDuration / 60)}m ${l.sessionDuration % 60}s` : 
            'N/A';
          
          const suspiciousBadge = l.isSuspicious ? 
            '<span class="badge badge-danger" title="' + (l.suspiciousReason || 'Hoạt động đáng ngờ') + '">⚠️ Đáng ngờ</span>' : 
            '<span class="badge badge-success">✅ Bình thường</span>';
          
          return `
            <tr>
              <td>${formatDate(l.loginAt)}</td>
              <td>
                <div class="ip-info">
                  <span class="ip-address">${l.ipAddress}</span>
                  <small class="ip-location">${l.location}</small>
                </div>
              </td>
              <td>
                <div class="device-info">
                  <span class="device-type">${l.deviceType}</span>
                  <small class="device-model">${l.deviceModel}</small>
                </div>
              </td>
              <td>
                <div class="browser-info">
                  <span class="browser-name">${l.browser}</span>
                </div>
              </td>
              <td>
                <div class="os-info">
                  <span class="os-name">${l.os}</span>
                </div>
              </td>
              <td>
                <span class="badge badge-${l.loginStatus === 'success' ? 'success' : 'danger'}">
                  ${l.loginStatus === 'success' ? '✅ Thành công' : '❌ Thất bại'}
                </span>
              </td>
              <td>${sessionDuration}</td>
              <td>${suspiciousBadge}</td>
            </tr>
          `;
        }).join('');
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

  // Update selected count display
  function updateSelectedCount() {
    if (selectedCountSpan) {
      selectedCountSpan.textContent = selectedUsers.size;
    }
  }

  // Update bulk delete button state
  function updateBulkDeleteButton() {
    if (bulkDeleteBtn) {
      bulkDeleteBtn.disabled = selectedUsers.size === 0;
    }
  }

  // Confirm delete single user
  function confirmDeleteUser(userId, username) {
    if (confirm(`Bạn có chắc chắn muốn xóa người dùng "${username}" (ID: ${userId})?\n\nHành động này không thể hoàn tác!`)) {
      deleteUser(userId);
    }
  }

  // Delete single user
  async function deleteUser(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Remove from selected users
        selectedUsers.delete(userId);
        updateSelectedCount();
        updateBulkDeleteButton();
        
        // Refresh table
        await fetchUsers();
        alert('Đã xóa người dùng thành công!');
      } else {
        const error = await response.json();
        alert(`Lỗi khi xóa người dùng: ${error.error}`);
      }
    } catch (error) {
      console.error('Lỗi khi xóa người dùng:', error);
      alert('Lỗi khi xóa người dùng!');
    }
  }

  // Bulk delete selected users
  async function bulkDeleteUsers() {
    if (selectedUsers.size === 0) {
      alert('Vui lòng chọn ít nhất một người dùng để xóa!');
      return;
    }

    const userList = Array.from(selectedUsers).map(id => {
      const user = allUsers.find(u => u.id === id);
      return user ? user.username : `ID: ${id}`;
    }).join(', ');

    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedUsers.size} người dùng sau?\n\n${userList}\n\nHành động này không thể hoàn tác!`)) {
      try {
        const response = await fetch('/api/admin/users/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userIds: Array.from(selectedUsers)
          }),
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          selectedUsers.clear();
          updateSelectedCount();
          updateBulkDeleteButton();
          
          await fetchUsers();
          alert(`Đã xóa thành công ${result.deletedCount} người dùng!`);
        } else {
          const error = await response.json();
          alert(`Lỗi khi xóa hàng loạt: ${error.error}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa hàng loạt:', error);
        alert('Lỗi khi xóa hàng loạt!');
      }
    }
  }

  // Delete users by date range
  async function deleteUsersByDate() {
    const fromDate = deleteFromDate.value;
    const toDate = deleteToDate.value;
    
    if (!fromDate || !toDate) {
      alert('Vui lòng chọn khoảng thời gian!');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa tất cả người dùng được tạo từ ${fromDate} đến ${toDate}?\n\nHành động này không thể hoàn tác!`)) {
      try {
        const response = await fetch('/api/admin/users/delete-by-date', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fromDate,
            toDate,
            onlyLocked: deleteLockedUsers.checked,
            onlyNonAdmin: deleteNonAdminUsers.checked
          }),
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          await fetchUsers();
          alert(`Đã xóa thành công ${result.deletedCount} người dùng!`);
        } else {
          const error = await response.json();
          alert(`Lỗi khi xóa theo thời gian: ${error.error}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa theo thời gian:', error);
        alert('Lỗi khi xóa theo thời gian!');
      }
    }
  }

  // Delete inactive users
  async function deleteInactiveUsers() {
    const days = parseInt(inactiveDays.value);
    
    if (confirm(`Bạn có chắc chắn muốn xóa tất cả người dùng không hoạt động trong ${days} ngày qua?\n\nHành động này không thể hoàn tác!`)) {
      try {
        const response = await fetch('/api/admin/users/delete-inactive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inactiveDays: days,
            onlyLocked: deleteLockedUsers.checked,
            onlyNonAdmin: deleteNonAdminUsers.checked
          }),
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          await fetchUsers();
          alert(`Đã xóa thành công ${result.deletedCount} người dùng không hoạt động!`);
        } else {
          const error = await response.json();
          alert(`Lỗi khi xóa người dùng không hoạt động: ${error.error}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa người dùng không hoạt động:', error);
        alert('Lỗi khi xóa người dùng không hoạt động!');
      }
    }
  }

  // Preview users that will be deleted
  async function previewDeleteUsers() {
    const fromDate = deleteFromDate.value;
    const toDate = deleteToDate.value;
    const days = parseInt(inactiveDays.value);
    
    if (!fromDate && !toDate && !days) {
      alert('Vui lòng chọn ít nhất một điều kiện xóa!');
      return;
    }

    try {
      const params = new URLSearchParams({
        fromDate: fromDate || '',
        toDate: toDate || '',
        inactiveDays: days || '',
        onlyLocked: deleteLockedUsers.checked,
        onlyNonAdmin: deleteNonAdminUsers.checked
      });

      const response = await fetch(`/api/admin/users/preview-delete?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        showPreviewModal(result.users, result.totalCount);
      } else {
        const error = await response.json();
        alert(`Lỗi khi xem trước: ${error.error}`);
      }
    } catch (error) {
      console.error('Lỗi khi xem trước:', error);
      alert('Lỗi khi xem trước danh sách!');
    }
  }

  // Show preview modal
  function showPreviewModal(users, totalCount) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content large-modal">
        <span class="close">&times;</span>
        <h2>Xem trước danh sách sẽ xóa</h2>
        <p class="warning-text">⚠️ Cảnh báo: ${totalCount} người dùng sẽ bị xóa!</p>
        
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Ngày tạo</th>
                <th>Lần đăng nhập cuối</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${u.id}</td>
                  <td>${u.username}</td>
                  <td>${u.fullName || ''}</td>
                  <td>${u.email || ''}</td>
                  <td>${formatDate(u.createdAt)}</td>
                  <td>${u.lastLogin ? formatDate(u.lastLogin) : 'Chưa đăng nhập'}</td>
                  <td>${u.isActive ? 'Kích hoạt' : 'Khóa'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-danger" id="confirm-delete-preview">Xác nhận xóa</button>
          <button class="btn btn-secondary" id="cancel-preview">Hủy</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Wire modal events
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('#cancel-preview');
    const confirmBtn = modal.querySelector('#confirm-delete-preview');

    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    confirmBtn.addEventListener('click', () => {
      closeModal();
      deleteUsersByDate();
    });
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
  
  // Wire delete related events
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = tableBody.querySelectorAll('.user-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
        const userId = parseInt(checkbox.getAttribute('data-id'));
        if (e.target.checked) {
          selectedUsers.add(userId);
        } else {
          selectedUsers.delete(userId);
        }
      });
      updateSelectedCount();
      updateBulkDeleteButton();
    });
  }
  
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', bulkDeleteUsers);
  }
  
  if (deleteByDateBtn) {
    deleteByDateBtn.addEventListener('click', deleteUsersByDate);
  }
  
  if (deleteInactiveBtn) {
    deleteInactiveBtn.addEventListener('click', deleteInactiveUsers);
  }
  
  if (previewDeleteBtn) {
    previewDeleteBtn.addEventListener('click', previewDeleteUsers);
  }

  // Initial load
  fetchUsers().catch(() => {
    tableBody.innerHTML = '';
    if (noUsers) noUsers.style.display = 'block';
    if (paginationEl) paginationEl.innerHTML = '';
    if (paginationInfoEl) paginationInfoEl.innerHTML = '';
  });
});

