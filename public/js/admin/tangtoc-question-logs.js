document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('logs-table');
  const pagination = document.getElementById('logs-pagination');
  const statusSelect = document.getElementById('filter-status');
  const qInput = document.getElementById('filter-q');
  const refreshBtn = document.getElementById('refresh-btn');
  const pageSizeSelect = document.getElementById('page-size');
  const modal = document.getElementById('log-detail-modal');
  const closeDetail = document.getElementById('close-detail');
  const detailContainer = document.getElementById('log-detail');
  const restoreBtn = document.getElementById('restore-question');
  const permanentlyDeleteBtn = document.getElementById('permanently-delete');

  let currentPage = 1;
  let currentLimit = parseInt(pageSizeSelect?.value || '20');
  let currentLogs = [];
  let currentSelectedLogId = null;

  async function loadLogs(page = 1) {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', currentLimit.toString());
    if (statusSelect.value) params.set('canRestore', statusSelect.value);
    
    const res = await fetch(`/api/admin/tangtoc-question-logs?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) { alert('Không thể tải danh sách logs'); return; }
    
    const data = await res.json();
    currentLogs = data.logs || [];
    currentPage = data.pagination?.page || 1;
    renderTable();
    renderPagination(data.pagination || { page: 1, pages: 1 });
  }

  function renderTable() {
    const q = qInput.value.trim().toLowerCase();
    const filtered = currentLogs.filter(log => 
      !q || 
      (log.question_text || '').toLowerCase().includes(q) ||
      (log.deletion_reason || '').toLowerCase().includes(q)
    );
    
    tableBody.innerHTML = filtered.map(log => `
      <tr>
        <td>#${log.id}</td>
        <td>${formatDate(log.deleted_at)}</td>
        <td>${log.deleted_by_username || ''}</td>
        <td>
          <div class="question-text">
            <span class="question-number">Câu ${log.question_number || 'N/A'}</span>
            ${escapeHtml((log.question_text || '').slice(0, 100))}
          </div>
          <div class="question-answer">Đáp án: ${escapeHtml((log.question_answer || '').slice(0, 50))}</div>
        </td>
        <td>
          ${log.question_image_url ? 
            `<img src="${escapeHtml(log.question_image_url)}" alt="Hình ảnh câu hỏi" class="question-image" style="max-width:80px;max-height:60px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;">` : 
            '<span style="color:#9ca3af;font-style:italic;">Không có ảnh</span>'
          }
        </td>
        <td>${escapeHtml((log.deletion_reason || '').slice(0, 100))}</td>
        <td>${log.can_restore ? 
          '<span class="badge badge-restorable">Có thể khôi phục</span>' : 
          '<span class="badge badge-restored">Đã khôi phục</span>'
        }</td>
        <td>
          <button class="btn btn-outline" data-id="${log.id}"><i class="fas fa-eye"></i> Xem</button>
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
      if (!opts.disabled) btn.addEventListener('click', () => loadLogs(targetPage));
      pagination.appendChild(btn);
    };

    // Prev
    addBtn('Prev', Math.max(1, page - 1), { disabled: page <= 1 });

    // Condensed page numbers
    const windowSize = 1;
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
      loadLogs(v);
    });
    jumpWrap.appendChild(input);
    jumpWrap.appendChild(goBtn);
    pagination.appendChild(jumpWrap);
  }

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    
    const id = btn.getAttribute('data-id');
    const res = await fetch(`/api/admin/tangtoc-question-logs/${id}`, { credentials: 'include' });
    if (!res.ok) { alert('Không thể tải chi tiết'); return; }
    
    const log = await res.json();
    currentSelectedLogId = log.id;
    
    const answersHtml = (log.deleted_answers || []).map(a => 
      `<li>${escapeHtml(a.answer_text)}</li>`
    ).join('');
    
    const timeLimit = log.question_number ? 
      (log.question_number == 1 ? 10 : 
       log.question_number == 2 ? 20 : 
       log.question_number == 3 ? 30 : 
       log.question_number == 4 ? 40 : 'N/A') : 'N/A';
    
    detailContainer.innerHTML = `
      <div class="log-details">
        <p><strong>ID Log:</strong> #${log.id}</p>
        <p><strong>ID Câu hỏi:</strong> #${log.question_id}</p>
        <p><strong>Thời gian xóa:</strong> ${formatDate(log.deleted_at)}</p>
        <p><strong>Người xóa:</strong> ${log.deleted_by_username || ''}</p>
        <p><strong>Lý do xóa:</strong> ${escapeHtml(log.deletion_reason || '')}</p>
        ${log.report_id ? `<p><strong>Báo lỗi liên quan:</strong> #${log.report_id}</p>` : ''}
        ${log.restored_at ? `<p><strong>Đã khôi phục lúc:</strong> ${formatDate(log.restored_at)}</p>` : ''}
        ${log.restored_by_username ? `<p><strong>Người khôi phục:</strong> ${log.restored_by_username}</p>` : ''}
        ${log.question_creator_username ? `<p><strong>Người tạo câu hỏi:</strong> ${log.question_creator_username}</p>` : ''}
      </div>
      
      <div style="margin-top:1rem;">
        <h3>Câu hỏi đã bị xóa:</h3>
        <div style="margin-bottom:1rem;">
          <span class="question-number">Câu ${log.question_number || 'N/A'}</span>
          <span class="time-limit">${timeLimit}s</span>
        </div>
        <div class="question-text">${escapeHtml(log.question_text || '')}</div>
        <div class="question-answer">Đáp án: ${escapeHtml(log.question_answer || '')}</div>
        ${log.question_image_url ? `
          <div style="margin-top:1rem;">
            <strong>Hình ảnh:</strong><br>
            <img src="${escapeHtml(log.question_image_url)}" alt="Hình ảnh câu hỏi" class="question-image" style="max-width:300px;max-height:200px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;">
          </div>
        ` : ''}
        ${log.question_category ? `<p><strong>Danh mục:</strong> ${log.question_category}</p>` : ''}
        ${log.question_difficulty ? `<p><strong>Độ khó:</strong> ${log.question_difficulty}</p>` : ''}
        ${log.question_created_at ? `<p><strong>Ngày tạo:</strong> ${formatDate(log.question_created_at)}</p>` : ''}
      </div>
      
      ${answersHtml ? `
        <div style="margin-top:1rem;">
          <h3>Đáp án bổ sung đã bị xóa:</h3>
          <ul>${answersHtml}</ul>
        </div>
      ` : ''}
    `;
    
    modal.style.display = 'block';
    
    // Cập nhật trạng thái nút
    if (restoreBtn) {
      restoreBtn.disabled = !log.can_restore;
      restoreBtn.style.display = log.can_restore ? 'inline-flex' : 'none';
    }
    
    if (permanentlyDeleteBtn) {
      permanentlyDeleteBtn.style.display = log.can_restore ? 'inline-flex' : 'none';
    }
  });

  closeDetail.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  restoreBtn.addEventListener('click', async () => {
    if (!currentSelectedLogId) return;
    
    const confirmed = confirm('Bạn có chắc chắn muốn khôi phục câu hỏi Tăng Tốc này không?');
    if (!confirmed) return;
    
    try {
      const res = await fetch(`/api/admin/tangtoc-question-logs/${currentSelectedLogId}/restore`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Không thể khôi phục câu hỏi');
        return;
      }
      
      const result = await res.json();
      if (result.success) {
        alert('Đã khôi phục câu hỏi Tăng Tốc thành công');
        modal.style.display = 'none';
        loadLogs(currentPage);
      } else {
        alert(result.error || 'Không thể khôi phục câu hỏi');
      }
    } catch (error) {
      console.error('Lỗi khi khôi phục câu hỏi:', error);
      alert('Có lỗi xảy ra khi khôi phục câu hỏi');
    }
  });

  permanentlyDeleteBtn.addEventListener('click', async () => {
    if (!currentSelectedLogId) return;
    
    const confirmed = confirm('Bạn có chắc chắn muốn xóa vĩnh viễn log này không? Thao tác này không thể hoàn tác.');
    if (!confirmed) return;
    
    try {
      const res = await fetch(`/api/admin/tangtoc-question-logs/${currentSelectedLogId}/permanently-delete`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Không thể xóa vĩnh viễn log');
        return;
      }
      
      const result = await res.json();
      if (result.success) {
        alert('Đã xóa vĩnh viễn log thành công');
        modal.style.display = 'none';
        loadLogs(currentPage);
      } else {
        alert(result.error || 'Không thể xóa vĩnh viễn log');
      }
    } catch (error) {
      console.error('Lỗi khi xóa vĩnh viễn log:', error);
      alert('Có lỗi xảy ra khi xóa vĩnh viễn log');
    }
  });

  statusSelect.addEventListener('change', () => loadLogs(1));
  qInput.addEventListener('input', () => renderTable());
  refreshBtn.addEventListener('click', () => loadLogs(currentPage));
  if (pageSizeSelect) pageSizeSelect.addEventListener('change', () => { 
    currentLimit = parseInt(pageSizeSelect.value || '20'); 
    loadLogs(1); 
  });

  function formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleString('vi-VN'); } catch { return d; }
  }
  
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  loadLogs(1);
});
