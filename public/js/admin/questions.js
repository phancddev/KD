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
    
    // Hiển thị phân trang
    function renderPagination(filteredQuestions = null) {
        const displayQuestions = filteredQuestions || questions;
        const totalPages = Math.ceil(displayQuestions.length / questionsPerPage);
        
        questionsPagination.innerHTML = '';
        
        if (totalPages <= 1) {
            return;
        }
        
        // Nút Previous
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Trước';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderQuestions(filteredQuestions);
                renderPagination(filteredQuestions);
            }
        });
        questionsPagination.appendChild(prevButton);
        
        // Các nút số trang
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.toggle('active', i === currentPage);
            pageButton.addEventListener('click', function() {
                currentPage = i;
                renderQuestions(filteredQuestions);
                renderPagination(filteredQuestions);
            });
            questionsPagination.appendChild(pageButton);
        }
        
        // Nút Next
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Sau';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                renderQuestions(filteredQuestions);
                renderPagination(filteredQuestions);
            }
        });
        questionsPagination.appendChild(nextButton);
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

    // Khởi tạo
    fetchQuestions();
});