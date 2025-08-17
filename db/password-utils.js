import crypto from 'crypto';

// Hàm mã hóa mật khẩu - Lưu trực tiếp không hash
export function hashPassword(password) {
  return password; // Trả về mật khẩu gốc
}

// Hàm kiểm tra mật khẩu - So sánh trực tiếp
export function verifyPassword(password, storedPassword) {
  try {
    return password === storedPassword; // So sánh trực tiếp
  } catch (error) {
    console.error('Lỗi khi kiểm tra mật khẩu:', error);
    return false;
  }
}

// Hàm tạo hash với salt cố định (để test) - Không cần thiết nữa
export function hashPasswordWithSalt(password, salt) {
  return password; // Trả về mật khẩu gốc
} 