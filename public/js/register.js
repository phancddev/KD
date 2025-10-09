document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('email-error');

    // Hàm hiển thị thông báo lỗi
    function showError(message) {
        errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
        errorMessage.classList.add('show');
        successMessage.classList.remove('show');
    }

    // Hàm hiển thị thông báo thành công
    function showSuccess(message) {
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
        successMessage.classList.add('show');
        errorMessage.classList.remove('show');
    }

    // Email validation function
    function validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    // Real-time email validation
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();

        // Clear previous error states
        this.classList.remove('error', 'valid');
        emailError.classList.remove('show');

        if (email === '') {
            return; // Don't show error for empty field during typing
        }

        if (!validateEmail(email)) {
            this.classList.add('error');
            emailError.textContent = 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.';
            emailError.classList.add('show');
        } else {
            this.classList.add('valid');
        }
    });

    // Email validation on blur (when user leaves the field)
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();

        if (email === '') {
            this.classList.remove('error', 'valid');
            emailError.classList.remove('show');
            return;
        }

        if (!validateEmail(email)) {
            this.classList.add('error');
            emailError.textContent = 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.';
            emailError.classList.add('show');
        } else {
            this.classList.add('valid');
        }
    });

    // Check for error parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        const errorCode = urlParams.get('error');
        let errorMsg = '';

        switch (errorCode) {
            case '1':
                errorMsg = 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.';
                break;
            case '2':
                errorMsg = 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.';
                break;
            case '3':
                errorMsg = 'Email đã được sử dụng. Vui lòng sử dụng email khác.';
                break;
            case '4':
                errorMsg = 'Vui lòng nhập đầy đủ thông tin bắt buộc.';
                break;
            case '5':
                errorMsg = 'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại sau.';
                break;
            default:
                errorMsg = 'Đăng ký thất bại. Vui lòng thử lại.';
        }

        showError(errorMsg);
    }

    // Form validation
    registerForm.addEventListener('submit', function(e) {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const fullName = document.getElementById('fullName').value.trim();
        const button = this.querySelector('.btn-primary');

        // Clear previous error messages
        errorMessage.classList.remove('show');
        successMessage.classList.remove('show');
        emailError.classList.remove('show');

        // Reset input styles
        document.querySelectorAll('input').forEach(input => {
            input.classList.remove('error');
        });

        let hasError = false;

        // Validate required fields
        if (!username || !email || !password || !confirmPassword || !fullName) {
            showError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
            hasError = true;
        }

        // Validate username length
        if (username && username.length < 3) {
            showError('Tên đăng nhập phải có ít nhất 3 ký tự.');
            document.getElementById('username').classList.add('error');
            hasError = true;
        }

        // Validate email format
        if (email && !validateEmail(email)) {
            emailInput.classList.add('error');
            emailError.textContent = 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.';
            emailError.classList.add('show');
            hasError = true;
        }

        // Validate password length
        if (password && password.length < 6) {
            showError('Mật khẩu phải có ít nhất 6 ký tự.');
            document.getElementById('password').classList.add('error');
            hasError = true;
        }

        // Validate password match
        if (password && confirmPassword && password !== confirmPassword) {
            showError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
            document.getElementById('confirmPassword').classList.add('error');
            hasError = true;
        }

        if (hasError) {
            e.preventDefault();
            return;
        }

        // Show loading state
        button.classList.add('loading');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    });

    // Clear error messages when user starts typing
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function() {
            if (this.id !== 'email') {
                errorMessage.classList.remove('show');
                successMessage.classList.remove('show');
            }
            this.classList.remove('error');
        });

        input.addEventListener('focus', function() {
            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
        });
    });
});