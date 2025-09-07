document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo biến
    let questions = [];
    let currentPage = 1;
    const questionsPerPage = 10;
    
    // Category mapping
    const categoryDisplayNames = {
        'khoidong': 'Khởi Động',
        'vuotchuongngaivat': 'Vượt Chướng Ngại Vật',
        'tangtoc': 'Tăng Tốc',
        'vedich': 'Về Đích'
    };
    
    const categoryKeys = {
        'Khởi Động': 'khoidong',
        'Vượt Chướng Ngại Vật': 'vuotchuongngaivat',
        'Tăng Tốc': 'tangtoc',
        'Về Đích': 'vedich'
    };
    
    // Debug: Log category mapping for admin
    console.log('🔧 Category Mapping Debug:', {
        displayNames: categoryDisplayNames,
        keys: categoryKeys
    });
    
    // Các phần tử DOM
    const questionsList = document.getElementById('questions-list');
    const questionsPagination = document.getElementById('questions-pagination');
    const searchInput = document.getElementById('search-questions');
    const categoryFilter = document.getElementById('category-filter');
    const addQuestionForm = document.getElementById('add-question-form');
    const importQuestionsForm = document.getElementById('import-questions-form');
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.querySelector('#edit-modal .close');
    const editQuestionForm = document.getElementById('edit-question-form');
    const acceptedAnswersList = document.createElement('div');
    acceptedAnswersList.id = 'accepted-answers-list';
    const selectAllCheckbox = document.getElementById('select-all');
    const deleteSelectedBtn = document.getElementById('delete-selected');
    const selectAllBtn = document.getElementById('select-all-questions');
    const bulkCategoryBtn = document.getElementById('bulk-category-change');
    const bulkCategoryModal = document.getElementById('bulk-category-modal');
    const closeBulkModalBtn = document.getElementById('close-bulk-modal');
    const cancelBulkChangeBtn = document.getElementById('cancel-bulk-change');
    const bulkCategoryForm = document.getElementById('bulk-category-form');
    const bulkSelectedCountSpan = document.getElementById('bulk-selected-count');
    console.log('🔍 selectAllBtn element:', selectAllBtn);
    const selectedCountSpan = document.getElementById('selected-count');
    
    // Hàm helper để reset trạng thái select all
    function resetSelectAllState() {
        window.selectAllQuestionsSelected = false;
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        if (deleteSelectedBtn) {
            deleteSelectedBtn.style.display = 'none';
        }
        if (bulkCategoryBtn) {
            bulkCategoryBtn.style.display = 'none';
        }
        if (selectedCountSpan) {
            selectedCountSpan.textContent = '0';
        }
        if (bulkSelectedCountSpan) {
            bulkSelectedCountSpan.textContent = '0';
        }
    }
    

    
    // Lấy thông tin người dùng
    fetch('/api/user')
        .then(response => response.json())
        .then(data => {
            if (data.username) {
                document.getElementById('username-display').textContent = data.username;
                
                // Kiểm tra quyền admin
                if (!data.isAdmin) {
                    window.location.href = '/';
                }
            } else {
                window.location.href = '/login';
            }
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            window.location.href = '/login';
        });
    
    // Lấy danh sách câu hỏi
    function fetchQuestions() {
        fetch('/admin/api/questions')
            .then(response => response.json())
            .then(data => {
                questions = data;
                renderQuestions();
                renderPagination();
            })
            .catch(error => {
                console.error('Lỗi khi lấy danh sách câu hỏi:', error);
                showNotification('Không thể lấy danh sách câu hỏi. Kiểm tra kết nối database và category mapping.', 'error');
            });
    }
    
    // Hiển thị danh sách câu hỏi
    function renderQuestions(filteredQuestions = null) {
        const displayQuestions = filteredQuestions || questions;
        const startIndex = (currentPage - 1) * questionsPerPage;
        const endIndex = startIndex + questionsPerPage;
        const pageQuestions = displayQuestions.slice(startIndex, endIndex);
        
        questionsList.innerHTML = '';
        
        if (pageQuestions.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="6" class="text-center">Không có câu hỏi nào</td>';
            questionsList.appendChild(emptyRow);
            return;
        }
        
        pageQuestions.forEach((question, index) => {
            const row = document.createElement('tr');
            
            // Tính số thứ tự dựa trên vị trí trong danh sách hiện tại
            const sequenceNumber = (currentPage - 1) * questionsPerPage + index + 1;
            
            // Giới hạn độ dài của text và answer để hiển thị trong bảng
            const truncatedText = question.text.length > 50 ? question.text.substring(0, 50) + '...' : question.text;
            const truncatedAnswer = question.answer.length > 30 ? question.answer.substring(0, 30) + '...' : question.answer;
            const acceptedCount = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.length : 0;
            
            // Format thời gian
            const createdAt = new Date(question.createdAt).toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Style category với màu khác nhau
            const categoryColors = {
                'khoidong': '#22c55e',
                'vuotchuongngaivat': '#f59e0b', 
                'tangtoc': '#ef4444',
                'vedich': '#8b5cf6'
            };
            const categoryDisplayName = categoryDisplayNames[question.category] || question.category;
            const categoryColor = categoryColors[question.category] || '#6b7280';
            
            // Debug: Log category conversion for admin
            if (question.category && !categoryDisplayNames[question.category]) {
                console.warn('⚠️ Unknown category:', question.category, 'for question ID:', question.id);
            }
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="question-checkbox" data-id="${question.id}">
                </td>
                <td>${sequenceNumber}</td>
                <td title="${question.text}">${truncatedText}</td>
                <td title="${question.answer}">${truncatedAnswer}${acceptedCount ? ` <span style="color:#999">(+${acceptedCount} đáp án)</span>` : ''}</td>
                <td><span style="background: ${categoryColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; white-space: nowrap; display: inline-block;">${categoryDisplayName}</span></td>
                <td>${createdAt}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-edit" data-id="${question.id}">Sửa</button>
                        <button class="btn-delete" data-id="${question.id}">Xóa</button>
                    </div>
                </td>
            `;
            
            questionsList.appendChild(row);
        });
        
        // Thêm event listener cho các nút
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', function() {
                const questionId = this.getAttribute('data-id');
                openEditModal(questionId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', function() {
                const questionId = this.getAttribute('data-id');
                if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này không?')) {
                    deleteQuestion(questionId);
                }
            });
        });

        // Thêm event listeners cho checkboxes
        document.querySelectorAll('.question-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Nếu bỏ chọn bất kỳ checkbox nào trong trạng thái "select all", 
                // chỉ reset trạng thái nếu đang ở trang đầu tiên
                if (!this.checked && window.selectAllQuestionsSelected && currentPage === 1) {
                    window.selectAllQuestionsSelected = false;
                }
                updateSelectedCount();
            });
        });
        
        // Nếu đang trong trạng thái "select all", tự động check tất cả checkboxes
        if (window.selectAllQuestionsSelected) {
            document.querySelectorAll('.question-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = true;
            }
            // Cập nhật số lượng đã chọn để hiển thị tổng số câu hỏi
            if (selectedCountSpan) {
                selectedCountSpan.textContent = questions.length;
            }
            // Hiển thị nút delete selected
            if (deleteSelectedBtn) {
                deleteSelectedBtn.style.display = 'inline-block';
            }
        }
        
        updateSelectedCount();
    }
    
    // Hiển thị phân trang với smart pagination
    function renderPagination(filteredQuestions = null) {
        const displayQuestions = filteredQuestions || questions;
        const totalPages = Math.ceil(displayQuestions.length / questionsPerPage);
        
        questionsPagination.innerHTML = '';
        
        if (totalPages <= 1) {
            return;
        }
        
        // Container wrapper
        const paginationWrapper = document.createElement('div');
        paginationWrapper.style.display = 'flex';
        paginationWrapper.style.alignItems = 'center';
        paginationWrapper.style.gap = '0.5rem';
        paginationWrapper.style.flexWrap = 'wrap';
        paginationWrapper.style.justifyContent = 'center';
        
        // Nút First
        const firstButton = document.createElement('button');
        firstButton.innerHTML = '<i class="fas fa-angle-double-left"></i>';
        firstButton.disabled = currentPage === 1;
        firstButton.title = 'Trang đầu';
        firstButton.addEventListener('click', function() {
            resetSelectAllState();
            currentPage = 1;
            renderQuestions(filteredQuestions);
            renderPagination(filteredQuestions);
        });
        paginationWrapper.appendChild(firstButton);
        
        // Nút Previous
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.title = 'Trang trước';
        prevButton.addEventListener('click', function() {
            if (currentPage > 1) {
                resetSelectAllState();
                currentPage--;
                renderQuestions(filteredQuestions);
                renderPagination(filteredQuestions);
            }
        });
        paginationWrapper.appendChild(prevButton);
        
        // Smart page numbers với ellipsis
        function addPageButton(pageNum) {
            const pageButton = document.createElement('button');
            pageButton.textContent = pageNum;
            pageButton.classList.toggle('active', pageNum === currentPage);
                    pageButton.addEventListener('click', function() {
            resetSelectAllState();
            currentPage = pageNum;
            renderQuestions(filteredQuestions);
            renderPagination(filteredQuestions);
        });
            return pageButton;
        }
        
        function addEllipsis() {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0.5rem';
            ellipsis.style.color = '#6b7280';
            return ellipsis;
        }
        
        // Logic hiển thị pages: 3 đầu ... current-1, current, current+1 ... 3 cuối
        if (totalPages <= 9) {
            // Nếu ít trang, hiển thị tất cả
            for (let i = 1; i <= totalPages; i++) {
                paginationWrapper.appendChild(addPageButton(i));
            }
        } else {
            // Luôn hiển thị 3 trang đầu
            for (let i = 1; i <= 3; i++) {
                paginationWrapper.appendChild(addPageButton(i));
            }
            
            if (currentPage > 6) {
                paginationWrapper.appendChild(addEllipsis());
            }
            
            // Hiển thị current page và xung quanh (nếu không overlap với đầu/cuối)
            const start = Math.max(4, currentPage - 1);
            const end = Math.min(totalPages - 3, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (i > 3 && i < totalPages - 2) {
                    paginationWrapper.appendChild(addPageButton(i));
                }
            }
            
            if (currentPage < totalPages - 5) {
                paginationWrapper.appendChild(addEllipsis());
            }
            
            // Luôn hiển thị 3 trang cuối
            for (let i = totalPages - 2; i <= totalPages; i++) {
                paginationWrapper.appendChild(addPageButton(i));
            }
        }
        
        // Nút Next
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.title = 'Trang sau';
        nextButton.addEventListener('click', function() {
            if (currentPage < totalPages) {
                resetSelectAllState();
                currentPage++;
                renderQuestions(filteredQuestions);
                renderPagination(filteredQuestions);
            }
        });
        paginationWrapper.appendChild(nextButton);
        
        // Nút Last
        const lastButton = document.createElement('button');
        lastButton.innerHTML = '<i class="fas fa-angle-double-right"></i>';
        lastButton.disabled = currentPage === totalPages;
        lastButton.title = 'Trang cuối';
        lastButton.addEventListener('click', function() {
            resetSelectAllState();
            currentPage = totalPages;
            renderQuestions(filteredQuestions);
            renderPagination(filteredQuestions);
        });
        paginationWrapper.appendChild(lastButton);
        
        questionsPagination.appendChild(paginationWrapper);
        
        // Thêm Page Input Section
        const pageInputSection = document.createElement('div');
        pageInputSection.style.display = 'flex';
        pageInputSection.style.alignItems = 'center';
        pageInputSection.style.gap = '0.5rem';
        pageInputSection.style.marginTop = '1rem';
        pageInputSection.style.justifyContent = 'center';
        pageInputSection.style.fontSize = '0.875rem';
        
        const pageLabel = document.createElement('span');
        pageLabel.textContent = 'Trang';
        pageLabel.style.color = '#6b7280';
        
        const pageInput = document.createElement('input');
        pageInput.type = 'number';
        pageInput.min = '1';
        pageInput.max = totalPages.toString();
        pageInput.value = currentPage.toString();
        pageInput.style.width = '60px';
        pageInput.style.padding = '0.25rem 0.5rem';
        pageInput.style.border = '1px solid #d1d5db';
        pageInput.style.borderRadius = '4px';
        pageInput.style.textAlign = 'center';
        pageInput.style.fontSize = '0.875rem';
        
        const totalLabel = document.createElement('span');
        totalLabel.textContent = `/ ${totalPages}`;
        totalLabel.style.color = '#6b7280';
        
        const goButton = document.createElement('button');
        goButton.textContent = 'Đi';
        goButton.style.padding = '0.25rem 0.75rem';
        goButton.style.fontSize = '0.875rem';
        goButton.style.border = '1px solid #ef4444';
        goButton.style.background = '#ef4444';
        goButton.style.color = 'white';
        goButton.style.borderRadius = '4px';
        goButton.style.cursor = 'pointer';
        
        function goToPage() {
            const targetPage = parseInt(pageInput.value);
            if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
                resetSelectAllState();
                currentPage = targetPage;
                renderQuestions(filteredQuestions);
                renderPagination(filteredQuestions);
            }
        }
        
        goButton.addEventListener('click', goToPage);
        pageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                goToPage();
            }
        });
        
        pageInputSection.appendChild(pageLabel);
        pageInputSection.appendChild(pageInput);
        pageInputSection.appendChild(totalLabel);
        pageInputSection.appendChild(goButton);
        
        questionsPagination.appendChild(pageInputSection);
    }
    
    // Hàm filter questions dựa trên search và category
    function getFilteredQuestions() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedCategory = categoryFilter.value;
        
        return questions.filter(question => {
            // Filter theo search term
            const matchesSearch = searchTerm === '' || 
                question.text.toLowerCase().includes(searchTerm) ||
                question.answer.toLowerCase().includes(searchTerm);
            
            // Filter theo category
            const matchesCategory = selectedCategory === '' || 
                question.category === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });
    }
    
    // Tìm kiếm câu hỏi
    searchInput.addEventListener('input', function() {
        // Reset trạng thái "select all" khi tìm kiếm
        resetSelectAllState();
        
        const filteredQuestions = getFilteredQuestions();
        currentPage = 1;
        renderQuestions(filteredQuestions);
        renderPagination(filteredQuestions);
    });
    
    // Lọc theo category
    categoryFilter.addEventListener('change', function() {
        // Reset trạng thái "select all" khi filter
        resetSelectAllState();
        
        const filteredQuestions = getFilteredQuestions();
        currentPage = 1;
        renderQuestions(filteredQuestions);
        renderPagination(filteredQuestions);
    });
    
    // Thêm câu hỏi mới
    addQuestionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            text: document.getElementById('question-text').value.trim(),
            answer: document.getElementById('question-answer').value.trim(),
            category: categoryKeys[document.getElementById('question-category').value] || 'khoidong'
        };
        
        if (!formData.text || !formData.answer) {
            showNotification('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }
        
        fetch('/admin/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Thêm câu hỏi thành công');
                addQuestionForm.reset();
                fetchQuestions();
            } else {
                showNotification('Không thể thêm câu hỏi: ' + data.error + ' (Category: ' + formData.category + ')', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi thêm câu hỏi:', error);
            showNotification('Không thể thêm câu hỏi', 'error');
        });
    });
    
    // Nhập câu hỏi từ file
    importQuestionsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files[0];
        
        if (!file) {
            showNotification('Vui lòng chọn file', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('csvFile', file);
        
        fetch('/admin/api/questions/import', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`Đã nhập ${data.count} câu hỏi thành công`);
                importQuestionsForm.reset();
                fetchQuestions();
            } else {
                showNotification('Không thể nhập câu hỏi: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi nhập câu hỏi:', error);
            showNotification('Không thể nhập câu hỏi', 'error');
        });
    });
    
    // Mở modal chỉnh sửa câu hỏi
    function openEditModal(questionId) {
        const question = questions.find(q => q.id == questionId);
        
        if (!question) {
            showNotification('Không tìm thấy câu hỏi', 'error');
            return;
        }
        
        document.getElementById('edit-question-id').value = question.id;
        document.getElementById('edit-question-text').value = question.text;
        document.getElementById('edit-question-answer').value = question.answer;
        document.getElementById('edit-question-category').value = categoryDisplayNames[question.category] || 'Khởi Động';
        // Render accepted answers list
        const list = document.getElementById('accepted-answers-list');
        if (list) {
            list.innerHTML = '';
            const items = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
            items.forEach((ans, idx) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.border = '1px solid #eee';
                item.style.borderRadius = '6px';
                item.style.padding = '6px 8px';
                item.style.marginBottom = '6px';
                const text = typeof ans === 'string' ? ans : (ans && ans.answer ? ans.answer : '');
                const idAttr = typeof ans === 'object' && ans && ans.id ? `data-answer-id="${ans.id}"` : '';
                item.innerHTML = `
                    <span>${text}</span>
                    <button type="button" class="btn btn-danger btn-sm btn-remove-accepted" ${idAttr} data-index="${idx}">Xóa</button>
                `;
                list.appendChild(item);
            });
            // Attach remove handlers (immediate delete via API if id exists)
            list.querySelectorAll('button.btn-remove-accepted').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const answerId = this.getAttribute('data-answer-id');
                    if (answerId) {
                        try {
                            const resp = await fetch(`/admin/api/answers/${answerId}`, { method: 'DELETE' });
                            const data = await resp.json();
                            if (!resp.ok || !data.success) throw new Error(data.error || 'Xóa thất bại');
                            showNotification('Đã xóa đáp án bổ sung');
                            // Refresh list
                            await fetchQuestions();
                            openEditModal(questionId);
                        } catch (err) {
                            console.error('Xóa đáp án lỗi:', err);
                            showNotification('Không thể xóa đáp án', 'error');
                        }
                    } else {
                        // Local-only fallback
                        const index = parseInt(this.getAttribute('data-index'));
                        items.splice(index, 1);
                        question.acceptedAnswers = items;
                        openEditModal(questionId);
                    }
                });
            });
        }
        
        editModal.style.display = 'block';
    }
    
    // Đóng modal
    closeModalBtn.addEventListener('click', function() {
        editModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === editModal) {
            editModal.style.display = 'none';
        }
    });
    
    // Cập nhật câu hỏi
    editQuestionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const questionId = document.getElementById('edit-question-id').value;
        
        const formData = {
            text: document.getElementById('edit-question-text').value.trim(),
            answer: document.getElementById('edit-question-answer').value.trim(),
            category: categoryKeys[document.getElementById('edit-question-category').value] || 'khoidong',
            acceptedAnswers: (questions.find(q => q.id == questionId)?.acceptedAnswers) || []
        };
        
        if (!formData.text || !formData.answer) {
            showNotification('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }
        
        fetch(`/admin/api/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Cập nhật câu hỏi thành công');
                editModal.style.display = 'none';
                fetchQuestions();
            } else {
                showNotification('Không thể cập nhật câu hỏi: ' + data.error + ' (Category: ' + formData.category + ')', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi cập nhật câu hỏi:', error);
            showNotification('Không thể cập nhật câu hỏi', 'error');
        });
    });

    // Add accepted answer button in modal
    document.addEventListener('click', async function(e) {
        const target = e.target;
        if (target && target.id === 'add-accepted-answer') {
            const input = document.getElementById('new-accepted-answer');
            const val = (input.value || '').trim();
            if (!val) return;
            const qid = document.getElementById('edit-question-id').value;
            try {
                const resp = await fetch(`/admin/api/questions/${qid}/answers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answer: val })
                });
                const data = await resp.json();
                if (!resp.ok || !data.success) throw new Error(data.error || 'Không thể thêm đáp án');
                showNotification('Đã thêm đáp án bổ sung');
                input.value = '';
                await fetchQuestions();
                openEditModal(qid);
            } catch (err) {
                console.error('Thêm đáp án lỗi:', err);
                showNotification('Không thể thêm đáp án', 'error');
            }
        }
    });
    
    // Xóa câu hỏi
    function deleteQuestion(questionId) {
        fetch(`/admin/api/questions/${questionId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Xóa câu hỏi thành công');
                fetchQuestions();
            } else {
                showNotification('Không thể xóa câu hỏi: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi xóa câu hỏi:', error);
            showNotification('Không thể xóa câu hỏi', 'error');
        });
    }
    
    // Hiển thị thông báo
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    

    

    
    // Bulk delete functions
    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.question-checkbox');
        const selectedCheckboxes = document.querySelectorAll('.question-checkbox:checked');
        
        // Nếu đang trong trạng thái "select all", hiển thị tổng số câu hỏi
        if (window.selectAllQuestionsSelected) {
            const totalCount = questions.length;
            selectedCountSpan.textContent = totalCount;
            bulkSelectedCountSpan.textContent = totalCount;
            deleteSelectedBtn.style.display = 'inline-block';
            bulkCategoryBtn.style.display = 'inline-block';
            
            // Update select all checkbox state
            if (selectAllCheckbox) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            }
            return;
        }
        
        // Logic bình thường khi không phải "select all"
        const count = selectedCheckboxes.length;
        selectedCountSpan.textContent = count;
        bulkSelectedCountSpan.textContent = count;
        
        if (count > 0) {
            deleteSelectedBtn.style.display = 'inline-block';
            bulkCategoryBtn.style.display = 'inline-block';
        } else {
            deleteSelectedBtn.style.display = 'none';
            bulkCategoryBtn.style.display = 'none';
        }
        
        // Update select all checkbox state
        if (selectAllCheckbox) {
            if (count === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (count === checkboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
                selectAllCheckbox.checked = false;
            }
        }
    }
    
    function getSelectedQuestionIds() {
        const selectedCheckboxes = document.querySelectorAll('.question-checkbox:checked');
        return Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-id'));
    }
    
    // Chọn toàn bộ câu hỏi ở tất cả các trang
    function selectAllQuestions() {
        console.log('🔍 selectAllQuestions() được gọi');
        console.log('🔍 questions array:', questions);
        console.log('🔍 questions.length:', questions.length);
        
        if (questions.length === 0) {
            showNotification('Không có câu hỏi nào để chọn', 'warning');
            return;
        }
        
        console.log(`✅ Bắt đầu chọn toàn bộ ${questions.length} câu hỏi...`);
        
        // Đánh dấu trạng thái "select all" để khi chuyển trang vẫn giữ được
        window.selectAllQuestionsSelected = true;
        
        // Select tất cả checkboxes trên trang hiện tại
        const currentPageCheckboxes = document.querySelectorAll('.question-checkbox');
        currentPageCheckboxes.forEach((checkbox, index) => {
            checkbox.checked = true;
            console.log(`✅ Checked checkbox ${index + 1} trên trang hiện tại:`, checkbox);
        });
        
        // Update UI để hiển thị nút "Xóa đã chọn"
        updateSelectedCount();
        
        // Hiển thị nút delete selected
        if (deleteSelectedBtn) {
            deleteSelectedBtn.style.display = 'inline-block';
            // Update text để hiển thị số lượng đã chọn
            const selectedCountEl = document.getElementById('selected-count');
            if (selectedCountEl) {
                selectedCountEl.textContent = questions.length;
            }
        }
        
        // Update select all checkbox
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = true;
        }
        
        showNotification(`✅ Đã chọn toàn bộ ${questions.length} câu hỏi trên tất cả các trang. Bạn có thể bấm "Xóa đã chọn" để xóa.`, 'success');
        
        console.log('🔍 Checkboxes đã select trên trang hiện tại:', currentPageCheckboxes.length);
        console.log('🔍 Questions array length (tổng số câu hỏi):', questions.length);
        console.log('🔍 Nút "Xóa đã chọn" đã hiển thị');
        console.log('🔍 Trạng thái selectAllQuestionsSelected:', window.selectAllQuestionsSelected);
    }

    function deleteSelectedQuestions() {
        let selectedIds = getSelectedQuestionIds();
        
        // Nếu đang trong trạng thái "select all", lấy tất cả IDs từ questions array
        if (window.selectAllQuestionsSelected) {
            selectedIds = questions.map(q => q.id);
            console.log(`🗑️ Select all mode: sẽ xóa ${selectedIds.length} câu hỏi từ tất cả các trang`);
        }
        
        if (selectedIds.length === 0) {
            showNotification('Vui lòng chọn ít nhất một câu hỏi để xóa', 'error');
            return;
        }
        
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} câu hỏi đã chọn không?`)) {
            return;
        }
        
        // Xóa từng câu hỏi
        let deleteCount = 0;
        let errorCount = 0;
        let processedCount = 0;
        const totalCount = selectedIds.length;
        
        const deletePromises = selectedIds.map((id, index) => {
            return fetch(`/admin/api/questions/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                processedCount++;
                if (data.success) {
                    deleteCount++;
                    console.log(`✅ Xóa thành công câu hỏi ${id} (${processedCount}/${totalCount})`);
                } else {
                    errorCount++;
                    console.error(`❌ Lỗi xóa câu hỏi ${id}:`, data.error);
                }
            })
            .catch(error => {
                processedCount++;
                errorCount++;
                console.error(`❌ Lỗi khi xóa câu hỏi ${id}:`, error);
            });
        });
        
        Promise.all(deletePromises).then(() => {
            if (deleteCount > 0) {
                showNotification(`✅ Đã xóa thành công ${deleteCount}/${totalCount} câu hỏi`, 'success');
                
                // Reset trạng thái select all
                resetSelectAllState();
                
                // Reload danh sách
                fetchQuestions();
            }
            
            if (errorCount > 0) {
                showNotification(`⚠️ Có ${errorCount} câu hỏi không thể xóa`, 'warning');
            }
        });
    }
    
    // Bulk category change functions
    function openBulkCategoryModal() {
        let selectedIds = getSelectedQuestionIds();
        
        // Nếu đang trong trạng thái "select all", lấy tất cả IDs từ questions array
        if (window.selectAllQuestionsSelected) {
            selectedIds = questions.map(q => q.id);
        }
        
        if (selectedIds.length === 0) {
            showNotification('Vui lòng chọn ít nhất một câu hỏi để đổi danh mục', 'error');
            return;
        }
        
        document.getElementById('bulk-change-count').textContent = selectedIds.length;
        document.getElementById('bulk-new-category').value = '';
        bulkCategoryModal.style.display = 'block';
    }
    
    function closeBulkCategoryModal() {
        bulkCategoryModal.style.display = 'none';
    }
    
    function bulkChangeCategoryQuestions() {
        let selectedIds = getSelectedQuestionIds();
        
        // Nếu đang trong trạng thái "select all", lấy tất cả IDs từ questions array
        if (window.selectAllQuestionsSelected) {
            selectedIds = questions.map(q => q.id);
        }
        
        if (selectedIds.length === 0) {
            showNotification('Vui lòng chọn ít nhất một câu hỏi để đổi danh mục', 'error');
            return;
        }
        
        const newCategoryDisplay = document.getElementById('bulk-new-category').value;
        const newCategory = categoryKeys[newCategoryDisplay] || 'khoidong';
        if (!newCategoryDisplay) {
            showNotification('Vui lòng chọn danh mục mới', 'error');
            return;
        }
        
        // Kiểm tra xem có câu hỏi nào đang ở danh mục hiện tại không
        const questionsInCurrentCategory = selectedIds.filter(id => {
            const question = questions.find(q => q.id == id);
            return question && question.category === newCategory;
        });
        
        let confirmMessage = `Bạn có chắc chắn muốn đổi danh mục cho ${selectedIds.length} câu hỏi đã chọn thành "${newCategoryDisplay}" không?`;
        
        if (questionsInCurrentCategory.length > 0) {
            confirmMessage += `\n\nLưu ý: ${questionsInCurrentCategory.length} câu hỏi đã ở danh mục "${newCategoryDisplay}" sẽ được cập nhật lại (không gây lỗi).`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Sử dụng API bulk category change
        fetch('/api/admin/questions/bulk-category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questionIds: selectedIds,
                category: newCategory
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`✅ ${data.message}`, 'success');
                
                // Reset trạng thái select all
                resetSelectAllState();
                closeBulkCategoryModal();
                
                // Refresh danh sách câu hỏi
                fetchQuestions();
            } else {
                showNotification(`❌ Lỗi: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            console.error('❌ Lỗi khi cập nhật danh mục hàng loạt:', error);
            showNotification('❌ Không thể cập nhật danh mục hàng loạt', 'error');
        });
    }
    
    // Event listeners cho bulk operations
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.question-checkbox');
            
            // Nếu bỏ chọn select all checkbox, reset trạng thái "select all"
            if (!this.checked) {
                window.selectAllQuestionsSelected = false;
            }
            
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
            });
            updateSelectedCount();
        });
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedQuestions);
    }
    
    if (bulkCategoryBtn) {
        bulkCategoryBtn.addEventListener('click', openBulkCategoryModal);
    }
    
    if (closeBulkModalBtn) {
        closeBulkModalBtn.addEventListener('click', closeBulkCategoryModal);
    }
    
    if (cancelBulkChangeBtn) {
        cancelBulkChangeBtn.addEventListener('click', closeBulkCategoryModal);
    }
    
    if (bulkCategoryForm) {
        bulkCategoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            bulkChangeCategoryQuestions();
        });
    }
    
    // Close modal khi click outside
    window.addEventListener('click', function(event) {
        if (event.target === bulkCategoryModal) {
            closeBulkCategoryModal();
        }
    });

    if (selectAllBtn) {
        console.log('🔍 Gắn event listener cho selectAllBtn');
        selectAllBtn.addEventListener('click', selectAllQuestions);
    } else {
        console.error('❌ Không tìm thấy selectAllBtn!');
    }

    // Khởi tạo
    fetchQuestions();
    
    // EXPOSE FUNCTIONS VÀ BIẾN RA GLOBAL SCOPE
    window.questions = questions;
    window.currentPage = currentPage;
    window.questionsPerPage = questionsPerPage;
    window.selectAllQuestions = selectAllQuestions;
    window.updateSelectedCount = updateSelectedCount;
    window.deleteSelectedQuestions = deleteSelectedQuestions;
    window.resetSelectAllState = resetSelectAllState;
    window.fetchQuestions = fetchQuestions;
    window.renderQuestions = renderQuestions;
    window.renderPagination = renderPagination;
    window.getFilteredQuestions = getFilteredQuestions;
    window.openBulkCategoryModal = openBulkCategoryModal;
    window.bulkChangeCategoryQuestions = bulkChangeCategoryQuestions;
    
    console.log('✅ Functions và biến đã được expose ra global scope');
    console.log('🔍 Có thể gọi: selectAllQuestions(), updateSelectedCount(), deleteSelectedQuestions()');
    console.log('🔍 Có thể truy cập: window.questions, window.currentPage');
});