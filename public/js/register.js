document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('error-message');
    
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
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const fullName = document.getElementById('fullName').value.trim();
        
        if (!username || !password || !confirmPassword || !fullName) {
            e.preventDefault();
            errorMessage.textContent = 'Vui lòng nhập đầy đủ thông tin bắt buộc.';
            return;
        }
        
        if (password !== confirmPassword) {
            e.preventDefault();
            errorMessage.textContent = 'Mật khẩu xác nhận không khớp.';
            return;
        }
        
        if (password.length < 6) {
            e.preventDefault();
            errorMessage.textContent = 'Mật khẩu phải có ít nhất 6 ký tự.';
            return;
        }
    });
});