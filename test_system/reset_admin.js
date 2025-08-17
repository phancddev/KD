#!/usr/bin/env node

import { findUserByUsername, resetUserPassword } from '../db/users.js';
import { testConnection } from '../db/index.js';
import crypto from 'crypto';

// Hàm mã hóa mật khẩu
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Hàm reset mật khẩu admin
async function resetAdminPassword() {
  try {
    console.log("===== RESET MẬT KHẨU ADMIN =====");
    
    // Kiểm tra kết nối đến database
    console.log("Đang kiểm tra kết nối đến database...");
    const connected = await testConnection();
    
    if (!connected) {
      console.error("Không thể kết nối đến database. Vui lòng kiểm tra cấu hình.");
      return false;
    }
    
    console.log("Kết nối đến database thành công!");
    
    // Tìm tài khoản admin
    const username = 'admin';
    console.log(`Đang tìm tài khoản admin (${username})...`);
    const user = await findUserByUsername(username);
    
    if (!user) {
      console.error(`Không tìm thấy tài khoản admin với tên đăng nhập: ${username}`);
      return false;
    }
    
    console.log(`Tìm thấy tài khoản admin: ${username} (ID: ${user.id})`);
    
    // Reset mật khẩu
    const newPassword = 'admin123';
    console.log(`Đang đặt lại mật khẩu thành: ${newPassword}`);
    
    // Sử dụng hàm resetUserPassword
    const success = await resetUserPassword(user.id, newPassword);
    
    if (success) {
      console.log("Đặt lại mật khẩu thành công!");
      console.log(`Tài khoản admin: ${username}`);
      console.log(`Mật khẩu mới: ${newPassword}`);
      return true;
    } else {
      console.error("Không thể đặt lại mật khẩu.");
      return false;
    }
    
  } catch (error) {
    console.error("Lỗi khi reset mật khẩu admin:", error);
    return false;
  }
}

// Hàm chính
async function main() {
  try {
    const success = await resetAdminPassword();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("Lỗi:", error);
    process.exit(1);
  }
}

main();