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
            editQuestionAnswer: document.getElementById('edit-question-answer'),
            acceptedAnswersList: document.getElementById('accepted-answers-list'),
            newAcceptedAnswer: document.getElementById('new-accepted-answer'),
            addAcceptedAnswer: document.getElementById('add-accepted-answer')
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

        // Close modal when clicking close button
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

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

        // Add accepted answer
        this.elements.addAcceptedAnswer.addEventListener('click', (e) => {
            e.preventDefault();
            this.addAcceptedAnswer();
        });

        // Add accepted answer on Enter key
        this.elements.newAcceptedAnswer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addAcceptedAnswer();
            }
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
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                console.warn('[TangToc Admin] App is not served over HTTPS. External images may fail due to mixed content.');
            }
            console.log('Loading questions...');
            const response = await fetch('/api/admin/tangtoc/questions', {
                credentials: 'include'
            });

            if (response.ok) {
                this.questions = await response.json();
                console.log('Loaded questions:', this.questions.length);
                
                // Load accepted answers for each question
                await this.loadAcceptedAnswers();
                
                this.applyFilters();
            } else {
                console.error('Failed to load questions, status:', response.status);
                this.showMessage('error', 'Không thể tải danh sách câu hỏi');
            }
        } catch (error) {
            console.error('Load questions error:', error);
            this.showMessage('error', 'Có lỗi xảy ra khi tải câu hỏi');
        }
    }

    async loadAcceptedAnswers() {
        try {
            for (let question of this.questions) {
                const response = await fetch(`/api/admin/tangtoc/questions/${question.id}/answers`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const answers = await response.json();
                    question.acceptedAnswers = answers || [];
                } else {
                    question.acceptedAnswers = [];
                }
            }
        } catch (error) {
            console.error('Error loading accepted answers:', error);
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
            const hasImage = TangTocQuestionsAdmin.extractMediaUrlFromText(question.text) || question.imageUrl;
            if (this.filters.hasImage === 'yes' && !hasImage) {
                return false;
            }
            if (this.filters.hasImage === 'no' && hasImage) {
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

    // Static method to extract media URL from text (same as solo battle)
    static extractMediaUrlFromText(text) {
        if (!text) return null;
        // Case 1: full pattern with data tail
        const m = text.match(/@?(https:\/\/[^\s]+?\/revision\/latest\?cb=[^&]+&path-prefix=vi)\s+data:image\/[^^\s]+/);
        if (m && m[1]) return decodeURIComponent(m[1]);
        // Case 2: plain https URL (image or mp4) without data tail
        const m2 = text.match(/@?(https:\/\/[^\s]+?(?:\.png|\.jpe?g|\.webp|\.gif|\.mp4)\/[\w\-\/]+\?[^\s]+|https:\/\/[^\s]+?\.(?:png|jpe?g|webp|gif|mp4)(?:\?[^\s]+)?)/i);
        if (m2 && m2[1]) return m2[1];
        // Fallback: any https URL
        const m3 = text.match(/@?(https:\/\/[^\s]+)/);
        return m3 && m3[1] ? m3[1] : null;
    }

    renderQuestions() {
        console.log('renderQuestions called, filteredQuestions length:', this.filteredQuestions.length);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageQuestions = this.filteredQuestions.slice(startIndex, endIndex);
        console.log('pageQuestions length:', pageQuestions.length);

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
            
            // Extract image URL using the same method as solo battle
            const imageUrl = TangTocQuestionsAdmin.extractMediaUrlFromText(question.text) || question.imageUrl;
            
            const imageHtml = imageUrl ? 
                `<a href="${imageUrl}" class="mw-file-description image" target="_blank">
                    <img src="${imageUrl}" 
                         class="question-image mw-file-element"
                         alt="Hình ảnh câu hỏi"
                         loading="lazy"
                         referrerpolicy="no-referrer"
                         crossorigin="anonymous"
                         style="max-width: 120px; max-height: 90px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 6px;"/>
                </a>` : 
                '<span style="color: #9ca3af;">Không có</span>';
            
            if (imageUrl) {
                console.log('Generated image HTML for question', question.id, ':', imageHtml);
            }
            
            html += `
                <tr>
                    <td class="question-stt">
                        <span class="question-stt-badge">${stt}</span>
                    </td>
                    <td class="question-number">
                        <span class="question-number-badge">Câu ${question.question_number}</span>
                    </td>
                    <td class="question-text">
                        ${question.text.length > 100 ? question.text.substring(0, 100) + '...' : question.text}
                    </td>
                    <td class="question-image">
                        ${imageHtml}
                    </td>
                    <td class="question-answer">
                        ${question.answer}
                        ${question.acceptedAnswers && question.acceptedAnswers.length > 0 ? 
                            `<br><small style="color: #6b7280;">(+${question.acceptedAnswers.length} đáp án phụ)</small>` : 
                            ''
                        }
                    </td>
                    <td class="question-time">
                        <span class="time-limit-badge">${question.time_limit}s</span>
                    </td>
                    <td class="question-actions">
                        <div class="action-buttons">
                            <button class="btn btn-small btn-outline" onclick="editQuestion(${question.id})">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="btn btn-small btn-danger" onclick="deleteQuestion(${question.id})">
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

        // Page jump input
        html += `
            <div class="page-jump">
                <label for="page-input" style="color:#6b7280; font-size: 0.9rem;">Tới trang:</label>
                <input id="page-input" type="number" min="1" max="${totalPages}" value="${this.currentPage}" onkeydown="if(event.key==='Enter'){jumpToPage(this.value)}">
                <button onclick="jumpToPage(document.getElementById('page-input').value)">Go</button>
            </div>
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

    editQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        this.elements.editQuestionId.value = question.id;
        this.elements.editQuestionNumber.value = question.question_number;
        this.elements.editQuestionText.value = question.text;
        this.elements.editQuestionAnswer.value = question.answer;

        // Render accepted answers
        this.renderAcceptedAnswers(question.acceptedAnswers || []);

        // Extract image URL using the same method as solo battle
        const imageUrl = TangTocQuestionsAdmin.extractMediaUrlFromText(question.text) || question.imageUrl;

        // Hiển thị media (img) nếu có
        const imagePreview = document.getElementById('edit-image-preview');
        const noImageDiv = document.getElementById('edit-no-image');

        if (imageUrl) {
            const imgHtml = `
                <img id="edit-image-display"
                     src="${imageUrl}"
                     alt="Hình ảnh câu hỏi"
                     style="width: 70%; height: 50vh; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 6px;"
                     crossorigin="anonymous"
                     referrerpolicy="no-referrer" />`;
            imagePreview.innerHTML = imgHtml;
            imagePreview.style.display = 'block';
            noImageDiv.style.display = 'none';
        } else {
            imagePreview.innerHTML = '';
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

        if (!questionNumber || questionNumber < 1 || questionNumber > 4) {
            this.showMessage('error', 'Số câu hỏi phải từ 1 đến 4');
            return;
        }

        if (!text || !answer) {
            this.showMessage('error', 'Vui lòng nhập đầy đủ câu hỏi và đáp án');
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
                this.showMessage('error', result.error || 'Có lỗi xảy ra khi cập nhật câu hỏi');
            }
        } catch (error) {
            console.error('Update question error:', error);
            this.showMessage('error', 'Có lỗi xảy ra khi cập nhật câu hỏi');
        }
    }

    closeEditModal() {
        this.elements.editModal.style.display = 'none';
        this.elements.editForm.reset();
        this.clearAcceptedAnswers();
    }

    // Accepted answers management
    addAcceptedAnswer() {
        const answer = this.elements.newAcceptedAnswer.value.trim();
        if (!answer) return;

        const questionId = this.elements.editQuestionId.value;
        if (!questionId) return;

        // Add to server
        this.addAcceptedAnswerToServer(questionId, answer);
        
        // Clear input
        this.elements.newAcceptedAnswer.value = '';
    }

    async addAcceptedAnswerToServer(questionId, answer) {
        try {
            const response = await fetch(`/api/admin/tangtoc/questions/${questionId}/answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ answer })
            });

            const result = await response.json();
            if (result.success) {
                // Reload question data and refresh modal
                await this.loadQuestions();
                this.editQuestion(questionId);
            } else {
                alert('Lỗi khi thêm đáp án: ' + result.error);
            }
        } catch (error) {
            console.error('Error adding accepted answer:', error);
            alert('Lỗi khi thêm đáp án');
        }
    }

    async removeAcceptedAnswer(answerId) {
        try {
            const response = await fetch(`/api/admin/tangtoc/answers/${answerId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                // Reload question data and refresh modal
                const questionId = this.elements.editQuestionId.value;
                await this.loadQuestions();
                this.editQuestion(questionId);
            } else {
                alert('Lỗi khi xóa đáp án: ' + result.error);
            }
        } catch (error) {
            console.error('Error removing accepted answer:', error);
            alert('Lỗi khi xóa đáp án');
        }
    }

    renderAcceptedAnswers(acceptedAnswers) {
        if (!this.elements.acceptedAnswersList) return;
        
        this.elements.acceptedAnswersList.innerHTML = '';
        
        if (!acceptedAnswers || acceptedAnswers.length === 0) {
            this.elements.acceptedAnswersList.innerHTML = '<div style="color: #9ca3af; font-style: italic; padding: 0.5rem;">Chưa có đáp án bổ sung</div>';
            return;
        }

        acceptedAnswers.forEach((answer, index) => {
            const answerText = typeof answer === 'string' ? answer : (answer.answer || '');
            const answerId = typeof answer === 'object' && answer.id ? answer.id : null;
            
            const answerDiv = document.createElement('div');
            answerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border: 1px solid #eee; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px;';
            
            answerDiv.innerHTML = `
                <span>${answerText}</span>
                <button type="button" class="btn btn-danger btn-sm" onclick="window.tangTocAdmin.removeAcceptedAnswer(${answerId || 'null'})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            `;
            
            this.elements.acceptedAnswersList.appendChild(answerDiv);
        });
    }

    clearAcceptedAnswers() {
        if (this.elements.acceptedAnswersList) {
            this.elements.acceptedAnswersList.innerHTML = '';
        }
    }

    updateImagePreview(text) {
        const imagePreview = document.getElementById('edit-image-preview');
        const noImageDiv = document.getElementById('edit-no-image');

        // Extract image URL using the same method as solo battle
        const imageUrl = TangTocQuestionsAdmin.extractMediaUrlFromText(text);
        
        if (imageUrl) {
            
            // Create or get the image element
            let imageDisplay = document.getElementById('edit-image-display');
            if (!imageDisplay) {
                imageDisplay = document.createElement('img');
                imageDisplay.id = 'edit-image-display';
                imageDisplay.alt = 'Hình ảnh câu hỏi';
                imageDisplay.style.width = '70%';
                imageDisplay.style.height = '50vh';
                imageDisplay.style.objectFit = 'contain';
                imageDisplay.style.border = '1px solid #e5e7eb';
                imageDisplay.style.borderRadius = '6px';
                imagePreview.appendChild(imageDisplay);
            }
            
            imageDisplay.src = imageUrl;
            imageDisplay.setAttribute('decoding', 'async');
            imageDisplay.setAttribute('loading', 'lazy');
            imageDisplay.setAttribute('crossorigin', 'anonymous');
            imageDisplay.setAttribute('referrerpolicy', 'no-referrer');
            imagePreview.style.display = 'block';
            noImageDiv.style.display = 'none';
        } else {
            imagePreview.style.display = 'none';
            noImageDiv.style.display = 'block';
        }
    }
}

// Global functions for pagination and actions
function changePage(page) {
    if (window.tangTocAdmin) {
        window.tangTocAdmin.currentPage = page;
        window.tangTocAdmin.renderQuestions();
    }
}

function jumpToPage(value) {
    const page = parseInt(value, 10);
    if (Number.isNaN(page)) return;
    if (page < 1) return changePage(1);
    const totalPages = Math.ceil(window.tangTocAdmin.filteredQuestions.length / window.tangTocAdmin.itemsPerPage);
    if (page > totalPages) return changePage(totalPages);
    changePage(page);
}

function editQuestion(questionId) {
    window.tangTocAdmin.editQuestion(questionId);
}

function closeEditModal() {
    window.tangTocAdmin.closeEditModal();
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
}

// Initialize admin when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tangTocAdmin = new TangTocQuestionsAdmin();
});
