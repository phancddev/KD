document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    
    // Check for error parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        errorMessage.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng.';
    }
    
    // Form validation
    loginForm.addEventListener('submit', function(e) {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            e.preventDefault();
            errorMessage.textContent = 'Vui lòng nhập đầy đủ thông tin.';
        }
    });
});