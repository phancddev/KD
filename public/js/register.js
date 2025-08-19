document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('error-message');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('email-error');
    
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
        
        switch (errorCode) {
            case '1':
                errorMessage.textContent = 'Tên đăng nhập đã tồn tại.';
                break;
            case '2':
                errorMessage.textContent = 'Mật khẩu xác nhận không khớp.';
                break;
            case '3':
                errorMessage.textContent = 'Email đã được sử dụng.';
                break;
            default:
                errorMessage.textContent = 'Đã xảy ra lỗi. Vui lòng thử lại.';
        }
    }
    
    // Form validation
    registerForm.addEventListener('submit', function(e) {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const fullName = document.getElementById('fullName').value.trim();
        
        // Clear previous error messages
        errorMessage.classList.remove('show');
        emailError.classList.remove('show');
        
        // Reset input styles
        document.querySelectorAll('input').forEach(input => {
            input.classList.remove('error', 'valid');
        });
        
        let hasError = false;
        
        if (!username || !email || !password || !confirmPassword || !fullName) {
            errorMessage.textContent = 'Vui lòng nhập đầy đủ thông tin bắt buộc.';
            errorMessage.classList.add('show');
            hasError = true;
        }
        
        if (email && !validateEmail(email)) {
            emailInput.classList.add('error');
            emailError.textContent = 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.';
            emailError.classList.add('show');
            hasError = true;
        }
        
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Mật khẩu xác nhận không khớp.';
            errorMessage.classList.add('show');
            hasError = true;
        }
        
        if (password.length < 6) {
            errorMessage.textContent = 'Mật khẩu phải có ít nhất 6 ký tự.';
            errorMessage.classList.add('show');
            hasError = true;
        }
        
        if (hasError) {
            e.preventDefault();
        }
    });
    
    // Clear error messages when user starts typing
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function() {
            if (this.id !== 'email') {
                errorMessage.classList.remove('show');
            }
        });
    });
});