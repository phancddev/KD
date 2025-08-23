// File cấu hình để bật/tắt các chức năng
// Để tắt chức năng đăng ký, đặt enableRegistration = false

export const featuresConfig = {
  // Chức năng đăng ký
  enableRegistration: true, // true = bật, false = tắt
  
  // Chức năng đăng nhập
  enableLogin: true, // true = bật, false = tắt
  
  // Chế độ khách (nếu có)
  enableGuestMode: false, // true = bật, false = tắt
  
  // Thông báo khi chức năng bị tắt
  messages: {
    registrationDisabled: 'Chức năng đăng ký đã bị tắt. Vui lòng liên hệ quản trị viên.',
    loginDisabled: 'Chức năng đăng nhập đã bị tắt. Vui lòng liên hệ quản trị viên.'
  }
};

// Hàm kiểm tra trạng thái chức năng
export function isFeatureEnabled(featureName) {
  return featuresConfig[featureName] === true;
}

// Hàm lấy thông báo
export function getFeatureMessage(featureName) {
  return featuresConfig.messages[`${featureName}Disabled`] || 'Chức năng này đã bị tắt.';
}
