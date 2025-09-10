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
  const approveBtn = document.getElementById('approve-report');
  const rejectBtn = document.getElementById('reject-report');

  let currentPage = 1;
  let currentLimit = parseInt(pageSizeSelect?.value || '20');
  let currentReports = [];
  let currentSelectedReportId = null;

  // Helpers to extract media URL and clean text (reuse logic from solo tangtoc)
  function extractMediaUrlFromText(text) {
    if (!text) return null;
    const m = text.match(/@?(https:\/\/[^\s]+?\/revision\/latest\?cb=[^&]+&path-prefix=vi)\s+data:image\/[^ ^\s]+/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    const m2 = text.match(/@?(https:\/\/[^\s]+?(?:\.png|\.jpe?g|\.webp|\.gif|\.mp4)\/[\w\-\/]+\?[^\s]+|https:\/\/[^\s]+?\.(?:png|jpe?g|webp|gif|mp4)(?:\?[^\s]+)?)/i);
    if (m2 && m2[1]) return m2[1];
    const m3 = text.match(/@?(https:\/\/[^\s]+)/);
    return m3 && m3[1] ? m3[1] : null;
  }
  function cleanQuestionText(text) {
    if (!text) return text;
    return text
      .replace(/@?https:\/\/[^\s]+\s+data:image\/[^ ^\s]+/g, '')
      .replace(/@?https:\/\/[^\s]+/g, '')
      .trim();
  }

  async function loadReports(page = 1) {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', currentLimit.toString());
    if (statusSelect.value) params.set('status', statusSelect.value);
    
    const res = await fetch(`/api/admin/tangtoc-reports?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) { alert('Không thể tải danh sách báo lỗi'); return; }
    
    const data = await res.json();
    currentReports = data.reports || [];
    currentPage = data.pagination?.page || 1;
    renderTable();
    renderPagination(data.pagination || { page: 1, pages: 1 });
  }

  function renderTable() {
    const q = qInput.value.trim().toLowerCase();
    const filtered = currentReports.filter(report => 
      !q || 
      (report.question_text || '').toLowerCase().includes(q) ||
      (report.report_text || '').toLowerCase().includes(q)
    );
    
    tableBody.innerHTML = filtered.map(report => `
      <tr>
        <td>#${report.id}</td>
        <td>${formatDate(report.created_at)}</td>
        <td>${report.user_username || 'Ẩn danh'}</td>
        <td>
          <div class="question-text">
            <span class="question-number">Câu ${report.question_number || 'N/A'}</span>
            ${escapeHtml((report.question_text || '').slice(0, 100))}
          </div>
          <div class="question-answer">Đáp án: ${escapeHtml((report.correct_answer || '').slice(0, 50))}</div>
        </td>
        <td>
          ${report.question_image_url ? 
            `<img src="${escapeHtml(report.question_image_url)}" alt="Hình ảnh câu hỏi" class="question-image" style="max-width:80px;max-height:60px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;">` : 
            '<span style="color:#9ca3af;font-style:italic;">Không có ảnh</span>'
          }
        </td>
        <td>${escapeHtml((report.report_text || '').slice(0, 100))}</td>
        <td>${report.status === 'open' ? 
          '<span class="badge badge-open">Chưa xử lý</span>' : 
          '<span class="badge badge-resolved">Đã xử lý</span>'
        }</td>
        <td>
          <button class="btn btn-outline" data-id="${report.id}"><i class="fas fa-eye"></i> Xem</button>
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
    const res = await fetch(`/api/admin/tangtoc-reports/${id}`, { credentials: 'include' });
    if (!res.ok) { alert('Không thể tải chi tiết'); return; }
    
    const report = await res.json();
    currentSelectedReportId = report.id;
    
    const suggestionsHtml = (report.suggestions || []).map(s => `
      <div class="suggestion-item">
        <div class="suggestion-text">${escapeHtml(s.suggested_answer)}</div>
        <div class="suggestion-actions">
          <button class="btn btn-success btn-sm" onclick="approveSuggestion(${s.id})">
            <i class="fas fa-check"></i> Duyệt
          </button>
          <button class="btn btn-danger btn-sm" onclick="rejectSuggestion(${s.id})">
            <i class="fas fa-times"></i> Từ chối
          </button>
        </div>
      </div>
    `).join('');
    
    const timeLimit = report.question_number ? 
      (report.question_number == 1 ? 10 : 
       report.question_number == 2 ? 20 : 
       report.question_number == 3 ? 30 : 
       report.question_number == 4 ? 40 : 'N/A') : 'N/A';

    // Compute media from text or fallback to existing image field
    const mediaUrl = extractMediaUrlFromText(report.question_text) || report.question_image_url || null;
    const cleanedQuestionText = cleanQuestionText(report.question_text || '');
    
    detailContainer.innerHTML = `
      <div class="report-details">
        <p><strong>ID Báo lỗi:</strong> #${report.id}</p>
        <p><strong>ID Câu hỏi:</strong> #${report.question_id}</p>
        <p><strong>Thời gian báo lỗi:</strong> ${formatDate(report.created_at)}</p>
        <p><strong>Người báo lỗi:</strong> ${report.user_username || 'Ẩn danh'}</p>
        <p><strong>Chế độ chơi:</strong> ${report.mode === 'solo' ? 'Solo' : 'Room'}</p>
        <p><strong>Trạng thái:</strong> ${report.status === 'open' ? 'Chưa xử lý' : 'Đã xử lý'}</p>
        ${report.resolved_at ? `<p><strong>Thời gian xử lý:</strong> ${formatDate(report.resolved_at)}</p>` : ''}
      </div>
      
      <div style="margin-top:1rem;">
        <h3>Câu hỏi bị báo lỗi:</h3>
        <div style="margin-bottom:1rem;">
          <span class="question-number">Câu ${report.question_number || 'N/A'}</span>
          <span class="time-limit">${timeLimit}s</span>
        </div>
        <div class="question-text">${escapeHtml(cleanedQuestionText || '')}</div>
        <div id="report-detail-media" style="margin-top:10px;width:100%;display:flex;justify-content:center;align-items:center;overflow:hidden"></div>
        <div class="question-answer">Đáp án: ${escapeHtml(report.correct_answer || '')}</div>
        ${report.user_answer ? `<p><strong>Đáp án người chơi:</strong> ${escapeHtml(report.user_answer)}</p>` : ''}
      </div>
      
      <div style="margin-top:1rem;">
        <h3>Lý do báo lỗi:</h3>
        <div style="padding:1rem;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
          ${escapeHtml(report.report_text || '')}
        </div>
      </div>
      
      ${suggestionsHtml ? `
        <div class="suggestions-list">
          <h3>Đề xuất đáp án từ người dùng:</h3>
          ${suggestionsHtml}
        </div>
      ` : ''}
    `;
    
    // Render media similar to solo tangtoc, constrained to modal
    const mediaContainer = document.getElementById('report-detail-media');
    if (mediaContainer) {
      mediaContainer.innerHTML = '';
      if (mediaUrl) {
        if (/\.mp4/i.test(mediaUrl)) {
          const proxied = `/api/tangtoc/media-proxy?url=${encodeURIComponent(mediaUrl)}`;
          const video = document.createElement('video');
          video.autoplay = false;
          video.controls = true;
          video.playsInline = true;
          video.muted = false;
          video.volume = 1.0;
          video.src = proxied;
          // Fit within modal
          video.style.width = '100%';
          video.style.maxWidth = '100%';
          video.style.maxHeight = '50vh';
          video.style.objectFit = 'contain';
          video.style.borderRadius = '8px';
          video.style.border = '1px solid #e5e7eb';
          video.addEventListener('error', () => { if (video.src !== mediaUrl) video.src = mediaUrl; }, { once: true });
          mediaContainer.appendChild(video);
        } else {
          const img = document.createElement('img');
          img.src = mediaUrl;
          img.alt = 'Hình ảnh câu hỏi';
          img.referrerPolicy = 'no-referrer';
          img.setAttribute('crossorigin', 'anonymous');
          // Fit within modal
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.maxWidth = '100%';
          img.style.maxHeight = '50vh';
          img.style.objectFit = 'contain';
          img.style.borderRadius = '8px';
          img.style.border = '1px solid #e5e7eb';
          mediaContainer.appendChild(img);
        }
      }
    }
    
    modal.style.display = 'block';
    
    // Cập nhật trạng thái nút
    if (approveBtn) {
      approveBtn.disabled = report.status === 'resolved';
      approveBtn.style.display = report.status === 'open' ? 'inline-flex' : 'none';
    }
    
    if (rejectBtn) {
      rejectBtn.disabled = report.status === 'resolved';
      rejectBtn.style.display = report.status === 'open' ? 'inline-flex' : 'none';
    }
  });

  closeDetail.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  });
  window.addEventListener('click', (e) => { 
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  });

  // Xử lý duyệt báo lỗi
  if (approveBtn) {
    approveBtn.addEventListener('click', async () => {
      if (!currentSelectedReportId) return;
      
      try {
        const res = await fetch(`/api/admin/tangtoc-reports/${currentSelectedReportId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        if (res.ok) {
          alert('Đã duyệt báo lỗi và thêm câu hỏi vào database Tăng Tốc');
          modal.style.display = 'none';
          document.body.classList.remove('modal-open');
          loadReports(currentPage);
        } else {
          const error = await res.json();
          alert('Lỗi khi duyệt báo lỗi: ' + (error.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error approving report:', error);
        alert('Lỗi khi duyệt báo lỗi: ' + error.message);
      }
    });
  }

  // Xử lý từ chối báo lỗi
  if (rejectBtn) {
    rejectBtn.addEventListener('click', async () => {
      if (!currentSelectedReportId) return;
      
      if (!confirm('Bạn có chắc chắn muốn từ chối báo lỗi này?')) return;
      
      try {
        const res = await fetch(`/api/admin/tangtoc-reports/${currentSelectedReportId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        if (res.ok) {
          alert('Đã từ chối báo lỗi');
          modal.style.display = 'none';
          document.body.classList.remove('modal-open');
          loadReports(currentPage);
        } else {
          const error = await res.json();
          alert('Lỗi khi từ chối báo lỗi: ' + (error.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error rejecting report:', error);
        alert('Lỗi khi từ chối báo lỗi: ' + error.message);
      }
    });
  }

  

  // Global functions for suggestion actions
  window.approveSuggestion = async (suggestionId) => {
    try {
      const res = await fetch(`/api/admin/tangtoc-suggestions/${suggestionId}/approve`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Không thể duyệt đề xuất');
        return;
      }
      
      const result = await res.json();
      if (result.success) {
        alert('Đã duyệt đề xuất đáp án thành công');
        // Reload current report detail
        if (currentSelectedReportId) {
          const btn = document.querySelector(`button[data-id="${currentSelectedReportId}"]`);
          if (btn) btn.click();
        }
      } else {
        alert(result.error || 'Không thể duyệt đề xuất');
      }
    } catch (error) {
      console.error('Lỗi khi duyệt đề xuất:', error);
      alert('Có lỗi xảy ra khi duyệt đề xuất');
    }
  };

  window.rejectSuggestion = async (suggestionId) => {
    try {
      const res = await fetch(`/api/admin/tangtoc-suggestions/${suggestionId}/reject`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Không thể từ chối đề xuất');
        return;
      }
      
      const result = await res.json();
      if (result.success) {
        alert('Đã từ chối đề xuất đáp án thành công');
        // Reload current report detail
        if (currentSelectedReportId) {
          const btn = document.querySelector(`button[data-id="${currentSelectedReportId}"]`);
          if (btn) btn.click();
        }
      } else {
        alert(result.error || 'Không thể từ chối đề xuất');
      }
    } catch (error) {
      console.error('Lỗi khi từ chối đề xuất:', error);
      alert('Có lỗi xảy ra khi từ chối đề xuất');
    }
  };

  statusSelect.addEventListener('change', () => loadReports(1));
  qInput.addEventListener('input', () => renderTable());
  refreshBtn.addEventListener('click', () => loadReports(currentPage));
  if (pageSizeSelect) pageSizeSelect.addEventListener('change', () => { 
    currentLimit = parseInt(pageSizeSelect.value || '20'); 
    loadReports(1); 
  });

  function formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleString('vi-VN'); } catch { return d; }
  }
  
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  loadReports(1);
});
