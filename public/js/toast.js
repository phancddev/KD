/**
 * Toast Notification System
 * Hiển thị thông báo dạng toast ở góc phải màn hình
 */

class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Tạo container cho toast nếu chưa có
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    /**
     * Hiển thị toast notification
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại toast: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Thời gian hiển thị (ms), mặc định 4000ms
     */
    show(message, type = 'success', duration = 4000) {
        // Tạo toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Icon cho từng loại toast
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        // Nội dung toast
        toast.innerHTML = `
            <div class="toast-icon">
                ${icons[type] || icons.info}
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Đóng">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Thêm toast vào container
        this.container.appendChild(toast);

        // Animation hiển thị
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Xử lý nút đóng
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.hide(toast);
        });

        // Tự động ẩn sau duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Ẩn toast
     * @param {HTMLElement} toast - Toast element cần ẩn
     */
    hide(toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        
        // Xóa toast sau khi animation kết thúc
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Hiển thị toast thành công
     * @param {string} message - Nội dung thông báo
     * @param {number} duration - Thời gian hiển thị
     */
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Hiển thị toast lỗi
     * @param {string} message - Nội dung thông báo
     * @param {number} duration - Thời gian hiển thị
     */
    error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Hiển thị toast cảnh báo
     * @param {string} message - Nội dung thông báo
     * @param {number} duration - Thời gian hiển thị
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Hiển thị toast thông tin
     * @param {string} message - Nội dung thông báo
     * @param {number} duration - Thời gian hiển thị
     */
    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Xóa tất cả toast
     */
    clearAll() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.hide(toast));
    }
}

// Tạo instance global
window.Toast = new ToastNotification();

// Export cho module nếu cần
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastNotification;
}

