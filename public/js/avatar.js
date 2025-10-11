/**
 * Avatar Module - Quản lý hiển thị avatar trong toàn bộ hệ thống
 * Sử dụng: import hoặc include script này vào các trang cần hiển thị avatar
 */

const AvatarModule = (function() {
    'use strict';

    /**
     * Tạo HTML cho avatar
     * @param {Object} options - Tùy chọn cho avatar
     * @param {string} options.avatar - URL của avatar (có thể null)
     * @param {string} options.username - Tên người dùng (để lấy chữ cái đầu)
     * @param {string} options.fullName - Tên đầy đủ (ưu tiên hơn username)
     * @param {number} options.size - Kích thước avatar (px), mặc định 40
     * @param {string} options.className - Class CSS thêm vào
     * @param {boolean} options.withBorder - Có border hay không, mặc định true
     * @returns {string} HTML string của avatar
     */
    function createAvatarHTML(options = {}) {
        const {
            avatar = null,
            username = 'U',
            fullName = null,
            size = 40,
            className = '',
            withBorder = true
        } = options;

        const displayName = (fullName && fullName.trim()) || username;
        const initial = displayName.charAt(0).toUpperCase();
        const timestamp = Date.now();
        const borderStyle = withBorder ? `border: 2px solid rgba(220, 38, 127, 0.3);` : '';

        if (avatar) {
            return `
                <div class="avatar-container ${className}" style="width: ${size}px; height: ${size}px; border-radius: 50%; overflow: hidden; ${borderStyle}">
                    <img src="${avatar}?t=${timestamp}" 
                         alt="${displayName}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#dc2626,#ef4444);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;\\'>${initial}</div>'">
                </div>
            `;
        } else {
            return `
                <div class="avatar-container ${className}" style="width: ${size}px; height: ${size}px; border-radius: 50%; background: linear-gradient(135deg, #dc2626, #ef4444); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                    ${initial}
                </div>
            `;
        }
    }

    /**
     * Render avatar vào một element
     * @param {HTMLElement|string} target - Element hoặc selector để render avatar
     * @param {Object} options - Tùy chọn cho avatar (giống createAvatarHTML)
     */
    function renderAvatar(target, options = {}) {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) {
            console.warn('Avatar target element not found:', target);
            return;
        }

        element.innerHTML = createAvatarHTML(options);
    }

    /**
     * Cập nhật avatar trong header
     * @param {Object} userData - Dữ liệu user từ API
     */
    function updateHeaderAvatar(userData) {
        const headerAvatar = document.getElementById('avatar');
        if (!headerAvatar) {
            console.warn('⚠️ Header avatar element not found');
            return;
        }

        console.log('🔄 Updating header avatar...');
        if (userData.avatar) {
            console.log('✅ Setting avatar image:', userData.avatar);
            headerAvatar.innerHTML = `<img src="${userData.avatar}?t=${Date.now()}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            const initial = (userData.username || 'U').charAt(0).toUpperCase();
            console.log('✅ Setting avatar initial:', initial);
            headerAvatar.innerHTML = `<span id="avatar-text">${initial}</span>`;
        }
    }

    /**
     * Tạo participant card với avatar cho phòng chờ
     * @param {Object} participant - Thông tin participant
     * @returns {HTMLElement} Div element của participant card
     */
    function createParticipantCard(participant) {
        console.log('🎴 Creating participant card for:', participant);

        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-item';
        participantDiv.style.cssText = `
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(220, 38, 127, 0.2);
            border-radius: 12px;
            padding: 1rem;
            text-align: center;
            transition: all 0.3s ease;
        `;

        // Ưu tiên fullName, fallback sang username
        const displayName = (participant.fullName && String(participant.fullName).trim()) ||
                           (participant.username && String(participant.username).trim()) ||
                           'Unknown';

        console.log('  Display name:', displayName);
        console.log('  Avatar:', participant.avatar);

        const avatarHTML = createAvatarHTML({
            avatar: participant.avatar || null,
            username: participant.username || 'U',
            fullName: participant.fullName || participant.username,
            size: 40,
            withBorder: true
        });

        participantDiv.innerHTML = `
            <div style="margin: 0 auto 0.5rem; display: flex; justify-content: center;">
                ${avatarHTML}
            </div>
            <div class="participant-name" style="font-weight: 600; color: #374151;">${displayName}</div>
            <div style="font-size: 0.8rem; color: #6b7280;">${participant.isCreator || participant.isHost ? 'Chủ phòng' : 'Thành viên'}</div>
        `;

        return participantDiv;
    }

    /**
     * Render danh sách participants vào container
     * @param {HTMLElement|string} container - Container element hoặc selector
     * @param {Array} participants - Mảng participants
     */
    function renderParticipantsList(container, participants) {
        console.log('👥 Rendering participants list:', participants);
        const element = typeof container === 'string' ? document.querySelector(container) : container;
        if (!element) {
            console.warn('⚠️ Participants container not found:', container);
            return;
        }

        element.innerHTML = '';
        participants.forEach((participant, index) => {
            console.log(`  ${index + 1}. ${participant.username} - Avatar: ${participant.avatar || 'none'}`);
            const card = createParticipantCard(participant);
            element.appendChild(card);
        });
        console.log('✅ Rendered', participants.length, 'participants');
    }

    /**
     * Tạo avatar cho ranking/leaderboard
     * @param {Object} player - Thông tin player
     * @param {number} rank - Thứ hạng
     * @returns {string} HTML string
     */
    function createRankingAvatar(player, rank) {
        const size = rank === 1 ? 60 : rank <= 3 ? 50 : 40;
        return createAvatarHTML({
            avatar: player.avatar,
            username: player.username,
            fullName: player.fullName,
            size: size,
            withBorder: true
        });
    }

    /**
     * Fetch user data và update avatar
     * @param {string} apiEndpoint - API endpoint để lấy user data
     * @param {Function} callback - Callback function nhận userData
     */
    async function fetchAndUpdateAvatar(apiEndpoint = '/api/user/profile', callback = null) {
        try {
            console.log('📡 Fetching user data from:', apiEndpoint);
            const response = await fetch(apiEndpoint, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('❌ API response not OK:', response.status);
                throw new Error('Failed to fetch user data');
            }

            const userData = await response.json();
            console.log('✅ User data received:', userData);
            console.log('🖼️ Avatar URL:', userData.avatar);

            // Update header avatar
            updateHeaderAvatar(userData);

            // Call callback if provided
            if (callback && typeof callback === 'function') {
                callback(userData);
            }

            return userData;
        } catch (error) {
            console.error('❌ Error fetching user data:', error);
            return null;
        }
    }

    /**
     * Initialize avatar module - tự động load avatar cho header
     */
    function init() {
        console.log('🎨 AvatarModule initialized');
        // Auto-load header avatar if element exists
        const avatarElement = document.getElementById('avatar');
        if (avatarElement) {
            console.log('✅ Found avatar element, fetching user data...');
            fetchAndUpdateAvatar();
        } else {
            console.log('⚠️ Avatar element not found');
        }
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        createAvatarHTML,
        renderAvatar,
        updateHeaderAvatar,
        createParticipantCard,
        renderParticipantsList,
        createRankingAvatar,
        fetchAndUpdateAvatar,
        init
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarModule;
}

