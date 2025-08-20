/**
 * Login Logs Management
 * Quản lý và hiển thị login logs với bộ lọc và phân trang
 */

document.addEventListener('DOMContentLoaded', () => {
  const logsTable = document.getElementById('logs-table');
  const statsOverview = document.getElementById('stats-overview');
  const paginationEl = document.getElementById('logs-pagination');
  const paginationInfoEl = document.getElementById('pagination-info');
  const refreshBtn = document.getElementById('refresh-logs');
  const exportBtn = document.getElementById('export-logs');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const clearFiltersBtn = document.getElementById('clear-filters');

  let currentPage = 1;
  let currentLimit = 50;
  let currentFilters = {};

  // Format date
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('vi-VN');
  }

  // Format session duration
  function formatSessionDuration(seconds) {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Render pagination info
  function renderPaginationInfo(total) {
    if (!paginationInfoEl) return;
    const start = (currentPage - 1) * currentLimit + 1;
    const end = Math.min(start + currentLimit - 1, total);
    
    if (total === 0) {
      paginationInfoEl.innerHTML = '<p class="no-data-text">Không có dữ liệu</p>';
      return;
    }
    
    // Tạo filter summary
    let filterSummary = '';
    if (Object.keys(currentFilters).length > 0) {
      const activeFilters = [];
      if (currentFilters.username) activeFilters.push(`Username: ${currentFilters.username}`);
      if (currentFilters.ipAddress) activeFilters.push(`IP: ${currentFilters.ipAddress}`);
      if (currentFilters.deviceType) activeFilters.push(`Thiết bị: ${currentFilters.deviceType}`);
      if (currentFilters.loginStatus) activeFilters.push(`Trạng thái: ${currentFilters.loginStatus}`);
      if (currentFilters.fromDate) {
        let dateRange = `Từ: ${currentFilters.fromDate}`;
        if (currentFilters.toDate) dateRange += ` đến ${currentFilters.toDate}`;
        if (currentFilters.fromHour !== null) dateRange += ` ${currentFilters.fromHour}:00`;
        if (currentFilters.toHour !== null) dateRange += ` - ${currentFilters.toHour}:59`;
        activeFilters.push(dateRange);
      } else if (currentFilters.fromHour !== null) {
        activeFilters.push(`Giờ: ${currentFilters.fromHour}:00 - ${currentFilters.toHour}:59`);
      }
      if (currentFilters.isSuspicious !== null) {
        activeFilters.push(`Đáng ngờ: ${currentFilters.isSuspicious === 'true' ? 'Có' : 'Không'}`);
      }
      
      if (activeFilters.length > 0) {
        filterSummary = `<div class="filter-summary"><strong>Bộ lọc đang áp dụng:</strong> ${activeFilters.join(', ')}</div>`;
      }
    }
    
    paginationInfoEl.innerHTML = `
      <div class="pagination-info-content">
        <span class="pagination-text">Hiển thị ${start}-${end} trong tổng số ${total} login logs</span>
        ${filterSummary}
      </div>
    `;
  }

  // Render pagination
  function renderPagination(total) {
    if (!paginationEl) return;
    const pages = Math.max(Math.ceil(total / currentLimit), 1);
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
        <option value="25" ${currentLimit === 25 ? 'selected' : ''}>25</option>
        <option value="50" ${currentLimit === 50 ? 'selected' : ''}>50</option>
        <option value="100" ${currentLimit === 100 ? 'selected' : ''}>100</option>
        <option value="200" ${currentLimit === 200 ? 'selected' : ''}>200</option>
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
          loadLogs();
        }
      });
    }
    
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < pages) {
          currentPage++;
          loadLogs();
        }
      });
    }
    
    if (pageInput) {
      pageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const newPage = parseInt(pageInput.value);
          if (newPage >= 1 && newPage <= pages) {
            currentPage = newPage;
            loadLogs();
          } else {
            pageInput.value = currentPage;
          }
        }
      });
      
      pageInput.addEventListener('blur', () => {
        const newPage = parseInt(pageInput.value);
        if (newPage >= 1 && newPage <= pages) {
          currentPage = newPage;
          loadLogs();
        } else {
          pageInput.value = currentPage;
        }
      });
    }
    
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        const newLimit = parseInt(pageSizeSelect.value);
        if (newLimit !== currentLimit) {
          currentLimit = newLimit;
          currentPage = 1;
          loadLogs();
        }
      });
    }
  }

  // Render logs table
  function renderLogsTable(logs) {
    if (!logsTable) return;
    
    if (logs.length === 0) {
      logsTable.innerHTML = '<tr><td colspan="10" class="no-data">Không có login logs nào.</td></tr>';
      return;
    }
    
    logsTable.innerHTML = logs.map(log => {
      const sessionDuration = formatSessionDuration(log.sessionDuration);
      const suspiciousBadge = log.isSuspicious ? 
        '<span class="badge badge-danger" title="' + (log.suspiciousReason || 'Hoạt động đáng ngờ') + '">⚠️ Đáng ngờ</span>' : 
        '<span class="badge badge-success">✅ Bình thường</span>';
      
      return `
        <tr>
          <td>${formatDate(log.loginAt)}</td>
          <td>
            <div class="user-info">
              <span class="username">${log.username}</span>
              ${log.fullName ? `<small class="full-name">${log.fullName}</small>` : ''}
            </div>
          </td>
          <td>
            <div class="ip-info">
              <span class="ip-address">${log.ipAddress}</span>
            </div>
          </td>
          <td>
            <div class="location-info">
              <span class="location">${log.location}</span>
            </div>
          </td>
          <td>
            <div class="device-info">
              <span class="device-type">${log.deviceType}</span>
              <small class="device-model">${log.deviceModel}</small>
            </div>
          </td>
          <td>
            <div class="browser-info">
              <span class="browser-name">${log.browser}</span>
            </div>
          </td>
          <td>
            <div class="os-info">
              <span class="os-name">${log.os}</span>
            </div>
          </td>
          <td>
            <span class="badge badge-${log.loginStatus === 'success' ? 'success' : 'danger'}">
              ${log.loginStatus === 'success' ? '✅ Thành công' : '❌ Thất bại'}
            </span>
          </td>
          <td>${sessionDuration}</td>
          <td>${suspiciousBadge}</td>
          <td>
            <button class="btn btn-outline btn-detail" data-log='${JSON.stringify(log).replace(/'/g, "&apos;")}'>Chi tiết</button>
          </td>
        </tr>
      `;
    }).join('');

    // Wire up detail buttons
    logsTable.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const log = JSON.parse(btn.getAttribute('data-log').replace(/&apos;/g, "'"));
        showDetailModal(log);
      });
    });
  }

  // Modal for log detail
  function showDetailModal(log) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Chi tiết đăng nhập</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-grid">
            <div><strong>Thời gian:</strong> ${formatDate(log.loginAt)}</div>
            <div><strong>Username:</strong> ${log.username}</div>
            <div><strong>Họ tên:</strong> ${log.fullName || 'N/A'}</div>
            <div><strong>IP:</strong> ${log.ipAddress}</div>
            <div><strong>Vị trí:</strong> ${log.location || 'Unknown'}</div>
            <div><strong>Timezone:</strong> ${log.timezone || 'Unknown'}</div>
            <div><strong>Thiết bị:</strong> ${log.deviceType} - ${log.deviceModel}</div>
            <div><strong>Trình duyệt:</strong> ${log.browser}</div>
            <div><strong>Hệ điều hành:</strong> ${log.os}</div>
            <div><strong>Phương thức:</strong> ${log.loginMethod}</div>
            <div><strong>Trạng thái:</strong> ${log.loginStatus}</div>
            <div><strong>Session ID:</strong> ${log.sessionId || 'N/A'}</div>
            <div><strong>Thời gian session:</strong> ${formatSessionDuration(log.sessionDuration)}</div>
            <div><strong>Đáng ngờ:</strong> ${log.isSuspicious ? 'Có' : 'Không'}</div>
            <div><strong>Lý do:</strong> ${log.suspiciousReason || 'N/A'}</div>
            <div><strong>User Agent:</strong> ${log.userAgent || 'N/A'}</div>
            <div><strong>Email:</strong> ${log.email || 'N/A'}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary modal-close">Đóng</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('.modal-close').forEach(el => el.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  // Render stats overview
  function renderStatsOverview(stats) {
    if (!statsOverview) return;
    
    statsOverview.innerHTML = `
      <div class="stat-card">
        <div class="stat-title">Tổng số đăng nhập</div>
        <div class="stat-value">${stats.suspiciousStats.total || 0}</div>
        <div class="stat-change">Tất cả thời gian</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Đăng nhập thành công</div>
        <div class="stat-value">${(stats.suspiciousStats.total || 0) - (stats.suspiciousStats.suspicious || 0)}</div>
        <div class="stat-change">Thành công</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Hoạt động đáng ngờ</div>
        <div class="stat-value">${stats.suspiciousStats.suspicious || 0}</div>
        <div class="stat-change">Cần chú ý</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Thiết bị phổ biến</div>
        <div class="stat-value">${stats.deviceStats?.[0]?.device_type || 'N/A'}</div>
        <div class="stat-change">${stats.deviceStats?.[0]?.count || 0} lần</div>
      </div>
    `;
  }

  // Load logs from API
  async function loadLogs() {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: currentLimit,
        ...currentFilters
      });
      
      const response = await fetch(`/api/admin/login-logs?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      
      renderLogsTable(data.logs);
      renderPaginationInfo(data.pagination.total);
      renderPagination(data.pagination.total);
      
    } catch (error) {
      console.error('Lỗi khi tải logs:', error);
      logsTable.innerHTML = '<tr><td colspan="10" class="error">Lỗi khi tải dữ liệu.</td></tr>';
    }
  }

  // Load stats from API
  async function loadStats() {
    try {
      const params = new URLSearchParams(currentFilters);
      const response = await fetch(`/api/admin/login-stats?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const stats = await response.json();
      renderStatsOverview(stats);
      
    } catch (error) {
      console.error('Lỗi khi tải stats:', error);
    }
  }

  // Get current filters
  function getCurrentFilters() {
    const fromDate = document.getElementById('from-date')?.value;
    const toDate = document.getElementById('to-date')?.value;
    const fromHour = document.getElementById('from-hour')?.value;
    const toHour = document.getElementById('to-hour')?.value;
    
    // Validate date range
    if (fromDate && toDate && fromDate > toDate) {
      alert('Ngày bắt đầu không thể lớn hơn ngày kết thúc!');
      return null;
    }
    
    // Validate hour range
    if (fromHour !== '' && toHour !== '' && parseInt(fromHour) > parseInt(toHour)) {
      alert('Giờ bắt đầu không thể lớn hơn giờ kết thúc!');
      return null;
    }
    
    return {
      username: document.getElementById('username-filter')?.value || null,
      ipAddress: document.getElementById('ip-filter')?.value || null,
      deviceType: document.getElementById('device-filter')?.value || null,
      loginStatus: document.getElementById('status-filter')?.value || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      fromHour: fromHour !== '' ? parseInt(fromHour) : null,
      toHour: toHour !== '' ? parseInt(toHour) : null,
      isSuspicious: document.getElementById('suspicious-filter')?.value || null
    };
  }

  // Clear all filters
  function clearFilters() {
    document.getElementById('username-filter').value = '';
    document.getElementById('ip-filter').value = '';
    document.getElementById('device-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('from-date').value = '';
    document.getElementById('to-date').value = '';
    document.getElementById('from-hour').value = '';
    document.getElementById('to-hour').value = '';
    document.getElementById('suspicious-filter').value = '';
    
    currentFilters = {};
    currentPage = 1;
    loadLogs();
    loadStats();
  }

  // Export logs to CSV
  function exportLogs() {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 10000, // Export tất cả
        ...currentFilters
      });
      
      // Tạo link download
      const link = document.createElement('a');
      link.href = `/api/admin/login-logs?${params}&export=csv`;
      link.download = `login-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
    } catch (error) {
      console.error('Lỗi khi xuất logs:', error);
      alert('Lỗi khi xuất logs');
    }
  }

  // Wire events
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      const filters = getCurrentFilters();
      if (filters === null) return; // Filter không hợp lệ
      
      currentFilters = filters;
      currentPage = 1;
      loadLogs();
      loadStats();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadLogs();
      loadStats();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportLogs);
  }

  // Initial load
  loadLogs();
  loadStats();
}); 