document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('reports-table');
  const pagination = document.getElementById('reports-pagination');
  const statusSelect = document.getElementById('filter-status');
  const qInput = document.getElementById('filter-q');
  const refreshBtn = document.getElementById('refresh-btn');
  const pageSizeSelect = document.getElementById('page-size');
  const modal = document.getElementById('report-detail-modal');
  const closeDetail = document.getElementById('close-detail');
  const detailContainer = document.getElementById('report-detail');
  const markResolvedBtn = document.getElementById('mark-resolved');
  const markOpenBtn = document.getElementById('mark-open');

  let currentPage = 1;
  let currentLimit = parseInt(pageSizeSelect?.value || '20');
  let currentReports = [];
  let currentSelectedId = null;

  async function loadReports(page = 1) {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', currentLimit.toString());
    if (statusSelect.value) params.set('status', statusSelect.value);
    const res = await fetch(`/api/admin/reports?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) { alert('Không thể tải danh sách báo lỗi'); return; }
    const data = await res.json();
    currentReports = data.reports || [];
    currentPage = data.pagination?.page || 1;
    renderTable();
    renderPagination(data.pagination || { page:1, pages:1 });
  }

  function renderTable() {
    const q = qInput.value.trim().toLowerCase();
    const filtered = currentReports.filter(r => !q || (r.question_text||'').toLowerCase().includes(q) || (r.report_text||'').toLowerCase().includes(q));
    tableBody.innerHTML = filtered.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td>${formatDate(r.created_at)}</td>
        <td>${r.username || ''}</td>
        <td>${r.mode}</td>
        <td>${escapeHtml((r.question_text || '').slice(0, 100))}</td>
        <td>${r.status === 'resolved' ? '<span class="badge badge-resolved">Đã xử lý</span>' : '<span class="badge badge-open">Chưa xử lý</span>'}</td>
        <td>
          <button class="btn btn-outline" data-id="${r.id}"><i class="fas fa-eye"></i> Xem</button>
        </td>
      </tr>
    `).join('');
  }

  function renderPagination(p) {
    const totalPages = Math.max(1, p.pages || 1);
    const page = Math.min(totalPages, Math.max(1, p.page || 1));
    pagination.innerHTML = '';

    const addBtn = (label, targetPage, opts = {}) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      if (opts.disabled) btn.disabled = true;
      if (opts.active) btn.classList.add('active');
      if (!opts.disabled) btn.addEventListener('click', () => loadReports(targetPage));
      pagination.appendChild(btn);
    };

    // Prev
    addBtn('Prev', Math.max(1, page - 1), { disabled: page <= 1 });

    // Condensed page numbers: first, window around current, last
    const windowSize = 1; // shows current ±1
    const pages = new Set([1, totalPages]);
    for (let i = page - windowSize; i <= page + windowSize; i++) if (i >= 1 && i <= totalPages) pages.add(i);
    const sorted = Array.from(pages).sort((a,b)=>a-b);
    let last = 0;
    sorted.forEach(n => {
      if (last && n - last > 1) {
        const ell = document.createElement('span');
        ell.textContent = '…';
        ell.style.padding = '0 .4rem';
        pagination.appendChild(ell);
      }
      addBtn(String(n), n, { active: n === page });
      last = n;
    });

    // Next
    addBtn('Next', Math.min(totalPages, page + 1), { disabled: page >= totalPages });

    // Jump to page input
    const jumpWrap = document.createElement('span');
    jumpWrap.style.display = 'inline-flex';
    jumpWrap.style.alignItems = 'center';
    jumpWrap.style.gap = '.25rem';
    jumpWrap.style.marginLeft = '.5rem';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = String(totalPages);
    input.value = String(page);
    input.style.width = '4rem';
    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.addEventListener('click', () => {
      let v = parseInt(input.value || '1');
      if (isNaN(v)) v = 1;
      v = Math.max(1, Math.min(totalPages, v));
      loadReports(v);
    });
    jumpWrap.appendChild(input);
    jumpWrap.appendChild(goBtn);
    pagination.appendChild(jumpWrap);
  }

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const res = await fetch(`/api/admin/reports/${id}`, { credentials: 'include' });
    if (!res.ok) { alert('Không thể tải chi tiết'); return; }
    const r = await res.json();
    currentSelectedId = r.id;
    detailContainer.innerHTML = `
      <p><strong>ID:</strong> #${r.id}</p>
      <p><strong>Thời gian:</strong> ${formatDate(r.created_at)}</p>
      <p><strong>Người dùng:</strong> ${r.username || ''} (ID: ${r.user_id || ''})</p>
      <p><strong>Chế độ:</strong> ${r.mode}</p>
      <p><strong>Room/Session:</strong> Room ${r.room_id || ''} / Session ${r.session_id || ''}</p>
      <p><strong>Câu hỏi:</strong></p>
      <pre>${escapeHtml(r.question_text || '')}</pre>
      <p><strong>Đáp án đúng:</strong></p>
      <pre>${escapeHtml(r.correct_answer || '')}</pre>
      <p><strong>Đáp án người dùng:</strong></p>
      <pre>${escapeHtml(r.user_answer || '')}</pre>
      <p><strong>Nội dung báo lỗi:</strong></p>
      <pre>${escapeHtml(r.report_text || '')}</pre>
      <p><strong>Trạng thái:</strong> ${r.status}</p>
    `;
    modal.style.display = 'block';
  });

  closeDetail.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  markResolvedBtn.addEventListener('click', async () => {
    if (!currentSelectedId) return;
    const res = await fetch(`/api/admin/reports/${currentSelectedId}/status`, { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'include', body: JSON.stringify({ status: 'resolved' }) });
    if (!res.ok) { alert('Cập nhật thất bại'); return; }
    modal.style.display = 'none';
    loadReports(currentPage);
  });

  markOpenBtn.addEventListener('click', async () => {
    if (!currentSelectedId) return;
    const res = await fetch(`/api/admin/reports/${currentSelectedId}/status`, { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'include', body: JSON.stringify({ status: 'open' }) });
    if (!res.ok) { alert('Cập nhật thất bại'); return; }
    modal.style.display = 'none';
    loadReports(currentPage);
  });

  statusSelect.addEventListener('change', () => loadReports(1));
  qInput.addEventListener('input', () => renderTable());
  refreshBtn.addEventListener('click', () => loadReports(currentPage));
  if (pageSizeSelect) pageSizeSelect.addEventListener('change', () => { currentLimit = parseInt(pageSizeSelect.value || '20'); loadReports(1); });

  function formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleString('vi-VN'); } catch { return d; }
  }
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  loadReports(1);
});

