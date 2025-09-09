// Admin TangToc Questions Management JavaScript
class TangTocQuestionsAdmin {
    constructor() {
        this.questions = [];
        this.filteredQuestions = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {
            questionNumber: '',
            hasImage: '',
            search: ''
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadQuestions();
        this.loadStatistics();
    }

    initializeElements() {
        this.elements = {
            uploadForm: document.getElementById('upload-tangtoc-form'),
            fileInput: document.getElementById('tangtoc-file'),
            uploadMode: document.getElementById('upload-mode'),
            questionNumberFilter: document.getElementById('question-number-filter'),
            hasImageFilter: document.getElementById('has-image-filter'),
            searchFilter: document.getElementById('search-filter'),
            applyFilterBtn: document.getElementById('apply-filter-btn'),
            clearFilterBtn: document.getElementById('clear-filter-btn'),
            questionsContainer: document.getElementById('questions-container'),
            totalQuestions: document.getElementById('total-questions'),
            imageQuestions: document.getElementById('image-questions'),
            question1Count: document.getElementById('question-1-count'),
            question2Count: document.getElementById('question-2-count'),
            question3Count: document.getElementById('question-3-count'),
            question4Count: document.getElementById('question-4-count'),
            editModal: document.getElementById('edit-modal'),
            editForm: document.getElementById('edit-question-form'),
            editQuestionId: document.getElementById('edit-question-id'),
            editQuestionNumber: document.getElementById('edit-question-number'),
            editQuestionText: document.getElementById('edit-question-text'),
            editQuestionAnswer: document.getElementById('edit-question-answer')
        };
    }

    bindEvents() {
        // File upload form
        this.elements.uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadQuestions();
        });

        // Filter events
        this.elements.applyFilterBtn.addEventListener('click', () => {
            this.applyFilters();
        });

        this.elements.clearFilterBtn.addEventListener('click', () => {
            this.clearFilters();
        });

        this.elements.searchFilter.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });

        // Edit modal events
        this.elements.editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateQuestion();
        });

        // Close modal events
        const closeBtn = this.elements.editModal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            this.closeEditModal();
        });

        // Close modal when clicking outside
        this.elements.editModal.addEventListener('click', (e) => {
            if (e.target === this.elements.editModal) {
                this.closeEditModal();
            }
        });

        // Update image preview when text changes
        this.elements.editQuestionText.addEventListener('input', (e) => {
            this.updateImagePreview(e.target.value);
        });
    }

    async uploadQuestions() {
        const file = this.elements.fileInput.files[0];
        if (!file) {
            alert('Vui lòng chọn file để upload');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', this.elements.uploadMode.value);

        try {
            const submitBtn = this.elements.uploadForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang upload...';

            const response = await fetch('/api/admin/tangtoc/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                let message = `Upload thành công! Đã thêm ${result.count} câu hỏi.`;
                
                if (result.stats) {
                    message += `\n\nThống kê:\n`;
                    message += `- Câu 1 (10s): ${result.stats.question_1 || 0}\n`;
                    message += `- Câu 2 (20s): ${result.stats.question_2 || 0}\n`;
                    message += `- Câu 3 (30s): ${result.stats.question_3 || 0}\n`;
                    message += `- Câu 4 (40s): ${result.stats.question_4 || 0}\n`;
                    message += `- Có ảnh: ${result.stats.with_images || 0}\n`;
                    message += `- Dòng bị bỏ qua: ${result.stats.skipped_count || 0}`;
                }
                
                if (result.skippedRows && result.skippedRows.length > 0) {
                    message += `\n\nCác dòng bị bỏ qua:\n`;
                    result.skippedRows.slice(0, 5).forEach(row => {
                        message += `- Dòng ${row.row}: ${row.reason}\n`;
                    });
                }
                
                this.showMessage('success', message);
                this.loadQuestions();
                this.loadStatistics();
                this.elements.uploadForm.reset();
            } else {
                this.showMessage('error', `Lỗi upload: ${result.error}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('error', 'Có lỗi xảy ra khi upload file');
        } finally {
            const submitBtn = this.elements.uploadForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload câu hỏi';
        }
    }

    async loadQuestions() {
        try {
            const response = await fetch('/api/admin/tangtoc/questions', {
                credentials: 'include'
            });

            if (response.ok) {
                this.questions = await response.json();
                this.applyFilters();
            } else {
                this.showMessage('error', 'Không thể tải danh sách câu hỏi');
            }
        } catch (error) {
            console.error('Load questions error:', error);
            this.showMessage('error', 'Có lỗi xảy ra khi tải câu hỏi');
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/admin/tangtoc/statistics', {
                credentials: 'include'
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateStatistics(stats);
            }
        } catch (error) {
            console.error('Load statistics error:', error);
        }
    }

    updateStatistics(stats) {
        this.elements.totalQuestions.textContent = stats.totalQuestions || 0;
        this.elements.imageQuestions.textContent = stats.imageQuestions || 0;
        this.elements.question1Count.textContent = stats.question1Count || 0;
        this.elements.question2Count.textContent = stats.question2Count || 0;
        this.elements.question3Count.textContent = stats.question3Count || 0;
        this.elements.question4Count.textContent = stats.question4Count || 0;
    }

    applyFilters() {
        this.filters.questionNumber = this.elements.questionNumberFilter.value;
        this.filters.hasImage = this.elements.hasImageFilter.value;
        this.filters.search = this.elements.searchFilter.value.toLowerCase();

        this.filteredQuestions = this.questions.filter(question => {
            // Filter by question number
            if (this.filters.questionNumber && question.questionNumber != this.filters.questionNumber) {
                return false;
            }

            // Filter by has image
            if (this.filters.hasImage === 'yes' && !question.imageUrl) {
                return false;
            }
            if (this.filters.hasImage === 'no' && question.imageUrl) {
                return false;
            }

            // Filter by search text
            if (this.filters.search) {
                const searchText = question.text.toLowerCase();
                if (!searchText.includes(this.filters.search)) {
                    return false;
                }
            }

            return true;
        });

        this.currentPage = 1;
        this.renderQuestions();
    }

    clearFilters() {
        this.elements.questionNumberFilter.value = '';
        this.elements.hasImageFilter.value = '';
        this.elements.searchFilter.value = '';
        this.filters = {
            questionNumber: '',
            hasImage: '',
            search: ''
        };
        this.applyFilters();
    }

    renderQuestions() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageQuestions = this.filteredQuestions.slice(startIndex, endIndex);

        if (pageQuestions.length === 0) {
            this.elements.questionsContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-info-circle"></i> Không có câu hỏi nào
                </div>
            `;
            return;
        }

        let html = `
            <table class="questions-table">
                <thead>
                    <tr>
                        <th class="question-stt">STT</th>
                        <th class="question-number">Số câu</th>
                        <th class="question-text">Câu hỏi</th>
                        <th class="question-image">Hình ảnh</th>
                        <th class="question-answer">Đáp án</th>
                        <th class="question-time">Thời gian</th>
                        <th class="question-actions">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pageQuestions.forEach((question, index) => {
            const stt = startIndex + index + 1;
            const imageHtml = question.image_url ? 
                `<img src="${question.image_url}" alt="Hình ảnh câu hỏi" onclick="window.open('${question.image_url}', '_blank')">` : 
                '<span style="color: #9ca3af;">Không có</span>';

            html += `
                <tr>
                    <td class="question-stt">
                        <span class="question-stt-badge">${stt}</span>
                    </td>
                    <td class="question-number">
                        <span class="question-number-badge">Câu ${question.question_number}</span>
                    </td>
                    <td class="question-text">
                        ${question.text.length > 80 ? question.text.substring(0, 80) + '...' : question.text}
                    </td>
                    <td class="question-image">
                        ${imageHtml}
                    </td>
                    <td class="question-answer">${question.answer}</td>
                    <td class="question-time">
                        <span class="time-limit">${question.time_limit}s</span>
                    </td>
                    <td class="question-actions">
                        <div class="action-buttons">
                            <button class="btn-small btn-outline" onclick="editQuestion(${question.id})">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="btn-small btn-danger" onclick="deleteQuestion(${question.id})">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        // Add pagination
        const totalPages = Math.ceil(this.filteredQuestions.length / this.itemsPerPage);
        if (totalPages > 1) {
            html += this.renderPagination(totalPages);
        }

        this.elements.questionsContainer.innerHTML = html;
    }

    renderPagination(totalPages) {
        let html = '<div class="pagination">';
        
        // Previous button
        html += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <button class="${i === this.currentPage ? 'active' : ''}" onclick="changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span>...</span>';
            }
        }

        // Next button
        html += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        html += '</div>';
        return html;
    }

    showMessage(type, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'error' ? 'error' : 'success';
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
            ${message}
        `;

        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error, .success');
        existingMessages.forEach(msg => msg.remove());

        // Insert new message
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(messageDiv, mainContent.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Global functions for pagination and actions
function changePage(page) {
    if (window.tangTocAdmin) {
        window.tangTocAdmin.currentPage = page;
        window.tangTocAdmin.renderQuestions();
    }
}


async function deleteQuestion(questionId) {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/tangtoc/questions/${questionId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            window.tangTocAdmin.showMessage('success', 'Xóa câu hỏi thành công');
            window.tangTocAdmin.loadQuestions();
            window.tangTocAdmin.loadStatistics();
        } else {
            window.tangTocAdmin.showMessage('error', `Lỗi xóa câu hỏi: ${result.error}`);
        }
    } catch (error) {
        console.error('Delete question error:', error);
        window.tangTocAdmin.showMessage('error', 'Có lỗi xảy ra khi xóa câu hỏi');
    }

    // Edit question methods
    editQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        this.elements.editQuestionId.value = question.id;
        this.elements.editQuestionNumber.value = question.question_number;
        this.elements.editQuestionText.value = question.text;
        this.elements.editQuestionAnswer.value = question.answer;

        // Hiển thị hình ảnh nếu có
        const imagePreview = document.getElementById('edit-image-preview');
        const noImageDiv = document.getElementById('edit-no-image');
        const imageDisplay = document.getElementById('edit-image-display');

        if (question.image_url) {
            imageDisplay.src = question.image_url;
            imagePreview.style.display = 'block';
            noImageDiv.style.display = 'none';
        } else {
            imagePreview.style.display = 'none';
            noImageDiv.style.display = 'block';
        }

        this.elements.editModal.style.display = 'block';
    }

    async updateQuestion() {
        const questionId = this.elements.editQuestionId.value;
        const questionNumber = parseInt(this.elements.editQuestionNumber.value);
        const text = this.elements.editQuestionText.value.trim();
        const answer = this.elements.editQuestionAnswer.value.trim();

        if (!text || !answer) {
            this.showMessage('error', 'Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            const response = await fetch(`/api/admin/tangtoc/questions/${questionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    question_number: questionNumber,
                    text: text,
                    answer: answer
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('success', 'Cập nhật câu hỏi thành công');
                this.closeEditModal();
                this.loadQuestions();
                this.loadStatistics();
            } else {
                this.showMessage('error', result.error || 'Có lỗi xảy ra khi cập nhật');
            }
        } catch (error) {
            console.error('Error updating question:', error);
            this.showMessage('error', 'Không thể cập nhật câu hỏi');
        }
    }

    closeEditModal() {
        this.elements.editModal.style.display = 'none';
        this.elements.editForm.reset();
    }

    updateImagePreview(text) {
        const imagePreview = document.getElementById('edit-image-preview');
        const noImageDiv = document.getElementById('edit-no-image');
        const imageDisplay = document.getElementById('edit-image-display');

        // Extract image URL from text
        const imageMatch = text.match(/@(https:\/\/[^\s]+)\s+data:image\/[^\s]+/);
        
        if (imageMatch && imageMatch[1]) {
            imageDisplay.src = imageMatch[1];
            imagePreview.style.display = 'block';
            noImageDiv.style.display = 'none';
        } else {
            imagePreview.style.display = 'none';
            noImageDiv.style.display = 'block';
        }
    }
}

// Global functions for HTML onclick
function editQuestion(questionId) {
    window.tangTocAdmin.editQuestion(questionId);
}

function closeEditModal() {
    window.tangTocAdmin.closeEditModal();
}

// Initialize admin when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tangTocAdmin = new TangTocQuestionsAdmin();
});
