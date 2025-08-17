document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo biến
    let questions = [];
    let currentPage = 1;
    const questionsPerPage = 10;
    
    // Các phần tử DOM
    const questionsList = document.getElementById('questions-list');
    const questionsPagination = document.getElementById('questions-pagination');
    const searchInput = document.getElementById('search-questions');
    const addQuestionForm = document.getElementById('add-question-form');
    const importQuestionsForm = document.getElementById('import-questions-form');
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.querySelector('#edit-modal .close');
    const editQuestionForm = document.getElementById('edit-question-form');
    const selectAllCheckbox = document.getElementById('select-all');
    const deleteSelectedBtn = document.getElementById('delete-selected');
    const selectAllBtn = document.getElementById('select-all-questions');
    const selectedCountSpan = document.getElementById('selected-count');
    
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
                showNotification('Không thể lấy danh sách câu hỏi', 'error');
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
            
            // Format thời gian
            const createdAt = new Date(question.createdAt).toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="question-checkbox" data-id="${question.id}">
                </td>
                <td>${sequenceNumber}</td>
                <td title="${question.text}">${truncatedText}</td>
                <td title="${question.answer}">${truncatedAnswer}</td>
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
            checkbox.addEventListener('change', updateSelectedCount);
        });
        
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
    
    // Tìm kiếm câu hỏi
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            currentPage = 1;
            renderQuestions();
            renderPagination();
            return;
        }
        
        const filteredQuestions = questions.filter(question => {
            return (
                question.text.toLowerCase().includes(searchTerm) ||
                question.answer.toLowerCase().includes(searchTerm)
            );
        });
        
        currentPage = 1;
        renderQuestions(filteredQuestions);
        renderPagination(filteredQuestions);
    });
    
    // Thêm câu hỏi mới
    addQuestionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            text: document.getElementById('question-text').value.trim(),
            answer: document.getElementById('question-answer').value.trim()
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
                showNotification('Không thể thêm câu hỏi: ' + data.error, 'error');
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
            answer: document.getElementById('edit-question-answer').value.trim()
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
                showNotification('Không thể cập nhật câu hỏi: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi cập nhật câu hỏi:', error);
            showNotification('Không thể cập nhật câu hỏi', 'error');
        });
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
        const count = selectedCheckboxes.length;
        
        selectedCountSpan.textContent = count;
        
        if (count > 0) {
            deleteSelectedBtn.style.display = 'block';
        } else {
            deleteSelectedBtn.style.display = 'none';
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
        if (questions.length === 0) {
            showNotification('Không có câu hỏi nào để chọn', 'warning');
            return;
        }
        
        console.log(`✅ Bắt đầu chọn toàn bộ ${questions.length} câu hỏi...`);
        
        // Tự động select tất cả câu hỏi
        const allCheckboxes = document.querySelectorAll('.question-checkbox');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // Update UI để hiển thị nút "Xóa đã chọn"
        updateSelectedCount();
        
        // Hiển thị nút delete selected
        if (deleteSelectedBtn) {
            deleteSelectedBtn.style.display = 'inline-block';
        }
        
        // Update select all checkbox
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = true;
        }
        
        showNotification(`✅ Đã chọn toàn bộ ${questions.length} câu hỏi. Bạn có thể bấm "Xóa đã chọn" để xóa.`, 'success');
    }

    function deleteSelectedQuestions() {
        const selectedIds = getSelectedQuestionIds();
        
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
        
        const deletePromises = selectedIds.map(id => {
            return fetch(`/admin/api/questions/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    deleteCount++;
                } else {
                    errorCount++;
                }
            })
            .catch(error => {
                console.error(`Lỗi khi xóa câu hỏi ${id}:`, error);
                errorCount++;
            });
        });
        
        Promise.all(deletePromises).then(() => {
            if (deleteCount > 0) {
                showNotification(`Đã xóa thành công ${deleteCount} câu hỏi`);
                fetchQuestions(); // Reload danh sách
            }
            
            if (errorCount > 0) {
                showNotification(`Có ${errorCount} câu hỏi không thể xóa`, 'error');
            }
        });
    }
    
    // Event listeners cho bulk operations
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.question-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
            });
            updateSelectedCount();
        });
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedQuestions);
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllQuestions);
    }

    // Khởi tạo
    fetchQuestions();
});