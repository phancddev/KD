/**
 * Admin Sidebar Menu - Shared across all admin pages
 * Tự động highlight menu item dựa trên URL hiện tại
 */

// Danh sách menu items
const adminMenuItems = [
  {
    href: '/admin/dashboard',
    icon: 'fas fa-tachometer-alt',
    label: 'Dashboard',
    path: '/admin/dashboard'
  },
  {
    href: '/admin/questions',
    icon: 'fas fa-question-circle',
    label: 'Quản lý câu hỏi',
    path: '/admin/questions'
  },
  {
    href: '/admin/tangtoc-questions',
    icon: 'fas fa-bolt',
    label: 'Quản lý câu hỏi Tăng Tốc',
    path: '/admin/tangtoc-questions'
  },
  {
    href: '/admin/data-nodes',
    icon: 'fas fa-server',
    label: 'Quản lý Data Nodes',
    path: '/admin/data-nodes'
  },
  {
    href: '/admin/matches',
    icon: 'fas fa-trophy',
    label: 'Quản lý Trận Đấu',
    path: '/admin/matches'
  },
  {
    href: '/admin/users',
    icon: 'fas fa-users',
    label: 'Quản lý người dùng',
    path: '/admin/users'
  },
  {
    href: '/admin/login-logs',
    icon: 'fas fa-sign-in-alt',
    label: 'Login Logs',
    path: '/admin/login-logs'
  },
  {
    href: '/admin/game-history',
    icon: 'fas fa-history',
    label: 'Lịch sử trận đấu',
    path: '/admin/game-history'
  },
  {
    href: '/admin/reports',
    icon: 'fas fa-flag',
    label: 'Báo lỗi câu hỏi',
    path: '/admin/reports'
  },
  {
    href: '/admin/tangtoc-reports',
    icon: 'fas fa-bolt',
    label: 'Báo lỗi câu hỏi Tăng Tốc',
    path: '/admin/tangtoc-reports'
  },
  {
    href: '/admin/question-logs',
    icon: 'fas fa-trash-alt',
    label: 'Logs xóa câu hỏi',
    path: '/admin/question-logs'
  },
  {
    href: '/admin/tangtoc-question-logs',
    icon: 'fas fa-trash-alt',
    label: 'Logs xóa câu hỏi Tăng Tốc',
    path: '/admin/tangtoc-question-logs'
  },
  {
    href: '/',
    icon: 'fas fa-home',
    label: 'Trang chủ',
    path: '/'
  },
  {
    href: '/logout',
    icon: 'fas fa-sign-out-alt',
    label: 'Đăng xuất',
    path: '/logout'
  }
];

/**
 * Render sidebar menu
 */
function renderAdminSidebar() {
  const currentPath = window.location.pathname;
  
  const menuHTML = adminMenuItems.map(item => {
    const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
    const activeClass = isActive ? 'class="active"' : '';
    
    return `
      <li ${activeClass}>
        <a href="${item.href}">
          <i class="${item.icon}"></i>
          <span>${item.label}</span>
        </a>
      </li>
    `;
  }).join('');
  
  return `
    <div class="sidebar-header">
      <div class="logo">
        <i class="fas fa-brain"></i>
        <span>Admin Panel</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <ul>
        ${menuHTML}
      </ul>
    </nav>
  `;
}

/**
 * Initialize sidebar khi DOM loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (sidebar && !sidebar.querySelector('.sidebar-nav')) {
    sidebar.innerHTML = renderAdminSidebar();
  }
});

/**
 * Export cho sử dụng inline
 */
if (typeof window !== 'undefined') {
  window.renderAdminSidebar = renderAdminSidebar;
  window.adminMenuItems = adminMenuItems;
}

