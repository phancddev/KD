/**
 * Heartbeat mechanism để duy trì trạng thái online của người dùng
 * Gửi heartbeat mỗi 2 phút để server biết người dùng vẫn đang hoạt động
 */

(function() {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    function isUserLoggedIn() {
        // Kiểm tra bằng cách gọi API hoặc kiểm tra session
        // Ở đây ta giả định nếu không ở trang login thì đã đăng nhập
        return !window.location.pathname.includes('/login');
    }

    // Gửi heartbeat đến server
    async function sendHeartbeat() {
        if (!isUserLoggedIn()) {
            return;
        }

        try {
            const response = await fetch('/api/heartbeat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Để gửi cookie session
            });

            if (response.ok) {
                console.log('💓 Heartbeat sent successfully');
            } else {
                console.warn('⚠️ Heartbeat failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error sending heartbeat:', error);
        }
    }

    // Khởi tạo heartbeat khi trang load
    if (isUserLoggedIn()) {
        console.log('💓 Heartbeat mechanism initialized');
        
        // Gửi heartbeat ngay lập tức
        sendHeartbeat();
        
        // Gửi heartbeat mỗi 2 phút (120000ms)
        // Vì server check mỗi 1 phút và timeout là 5 phút,
        // nên gửi mỗi 2 phút là đủ an toàn
        setInterval(sendHeartbeat, 2 * 60 * 1000);
        
        // Gửi heartbeat khi có hoạt động của người dùng
        let lastActivityTime = Date.now();
        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        activityEvents.forEach(eventType => {
            document.addEventListener(eventType, function() {
                const now = Date.now();
                // Chỉ gửi heartbeat nếu đã qua 30 giây kể từ lần cuối
                if (now - lastActivityTime > 30 * 1000) {
                    lastActivityTime = now;
                    sendHeartbeat();
                }
            }, { passive: true });
        });
    }
})();

