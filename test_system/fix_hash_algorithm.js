#!/usr/bin/env node

import { pool } from '../db/index.js';
import crypto from 'crypto';
import readline from 'readline';

// Tạo interface đọc input từ command line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hàm để hỏi người dùng
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// Hàm mã hóa mật khẩu theo Node.js
function hashPasswordNode(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Hàm kiểm tra mật khẩu theo Node.js
function verifyPasswordNode(password, hashedPassword) {
  const [salt, hash] = hashedPassword.split(':');
  const calculatedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === calculatedHash;
}

// Hàm mã hóa mật khẩu theo Python
function hashPasswordPython(password) {
  // Giả lập thuật toán hash của Python
  // Đây là một ví dụ, thuật toán thực tế có thể khác
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Hàm lấy tất cả người dùng
async function getAllUsers() {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    throw error;
  }
}

// Hàm cập nhật mật khẩu
async function updatePassword(userId, hashedPassword) {
  try {
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi cập nhật mật khẩu:', error);
    return false;
  }
}

// Hàm kiểm tra và sửa hash
async function checkAndFixHash() {
  try {
    console.log("===== KIỂM TRA VÀ SỬA LỖI HASH MẬT KHẨU =====");
    
    // Lấy tất cả người dùng
    const users = await getAllUsers();
    console.log(`Tìm thấy ${users.length} người dùng trong cơ sở dữ liệu.`);
    
    // Kiểm tra từng người dùng
    for (const user of users) {
      console.log(`\nKiểm tra người dùng: ${user.username} (ID: ${user.id})`);
      console.log(`Mật khẩu hiện tại (đã hash): ${user.password}`);
      
      // Kiểm tra định dạng hash
      if (!user.password.includes(':')) {
        console.log("Định dạng hash không đúng. Cần cập nhật.");
        
        // Hỏi mật khẩu mới
        const newPassword = await question(`Nhập mật khẩu mới cho ${user.username}: `);
        const hashedPassword = hashPasswordNode(newPassword);
        
        // Cập nhật mật khẩu
        const success = await updatePassword(user.id, hashedPassword);
        if (success) {
          console.log(`Đã cập nhật mật khẩu cho ${user.username} thành công!`);
        } else {
          console.log(`Không thể cập nhật mật khẩu cho ${user.username}.`);
        }
        
        continue;
      }
      
      // Kiểm tra xem hash có đúng định dạng không
      const [salt, hash] = user.password.split(':');
      if (!salt || !hash) {
        console.log("Định dạng hash không đúng. Cần cập nhật.");
        
        // Hỏi mật khẩu mới
        const newPassword = await question(`Nhập mật khẩu mới cho ${user.username}: `);
        const hashedPassword = hashPasswordNode(newPassword);
        
        // Cập nhật mật khẩu
        const success = await updatePassword(user.id, hashedPassword);
        if (success) {
          console.log(`Đã cập nhật mật khẩu cho ${user.username} thành công!`);
        } else {
          console.log(`Không thể cập nhật mật khẩu cho ${user.username}.`);
        }
        
        continue;
      }
      
      console.log("Định dạng hash hợp lệ.");
      
      // Hỏi người dùng có muốn cập nhật mật khẩu không
      const shouldUpdate = await question(`Bạn có muốn cập nhật mật khẩu cho ${user.username}? (y/n): `);
      if (shouldUpdate.toLowerCase() === 'y') {
        const newPassword = await question(`Nhập mật khẩu mới cho ${user.username}: `);
        const hashedPassword = hashPasswordNode(newPassword);
        
        // Cập nhật mật khẩu
        const success = await updatePassword(user.id, hashedPassword);
        if (success) {
          console.log(`Đã cập nhật mật khẩu cho ${user.username} thành công!`);
        } else {
          console.log(`Không thể cập nhật mật khẩu cho ${user.username}.`);
        }
      }
    }
    
    console.log("\nĐã hoàn thành kiểm tra và sửa lỗi hash mật khẩu!");
    
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    rl.close();
  }
}

// Hàm đặt lại mật khẩu cho tất cả người dùng
async function resetAllPasswords() {
  try {
    console.log("===== ĐẶT LẠI MẬT KHẨU CHO TẤT CẢ NGƯỜI DÙNG =====");
    
    // Hỏi xác nhận
    const confirm = await question("Bạn có chắc chắn muốn đặt lại mật khẩu cho TẤT CẢ người dùng? (yes/no): ");
    if (confirm.toLowerCase() !== 'yes') {
      console.log("Đã hủy thao tác.");
      return;
    }
    
    // Lấy tất cả người dùng
    const users = await getAllUsers();
    console.log(`Tìm thấy ${users.length} người dùng trong cơ sở dữ liệu.`);
    
    // Đặt lại mật khẩu cho từng người dùng
    for (const user of users) {
      console.log(`\nĐang đặt lại mật khẩu cho: ${user.username} (ID: ${user.id})`);
      
      // Tạo mật khẩu mặc định dựa trên username
      const defaultPassword = user.username === 'admin' ? 'admin123' : `${user.username}123`;
      
      // Hash mật khẩu
      const hashedPassword = hashPasswordNode(defaultPassword);
      
      // Cập nhật mật khẩu
      const success = await updatePassword(user.id, hashedPassword);
      if (success) {
        console.log(`Đã đặt lại mật khẩu cho ${user.username} thành công!`);
        console.log(`Mật khẩu mới: ${defaultPassword}`);
      } else {
        console.log(`Không thể đặt lại mật khẩu cho ${user.username}.`);
      }
    }
    
    console.log("\nĐã hoàn thành đặt lại mật khẩu cho tất cả người dùng!");
    
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    rl.close();
  }
}

// Hàm chính
async function main() {
  try {
    console.log("===== CÔNG CỤ SỬA LỖI HASH MẬT KHẨU =====");
    console.log("1. Kiểm tra và sửa lỗi hash mật khẩu");
    console.log("2. Đặt lại mật khẩu cho tất cả người dùng");
    console.log("0. Thoát");
    
    const choice = await question("Chọn chức năng: ");
    
    switch (choice) {
      case '1':
        await checkAndFixHash();
        break;
      case '2':
        await resetAllPasswords();
        break;
      case '0':
        console.log("Tạm biệt!");
        break;
      default:
        console.log("Lựa chọn không hợp lệ.");
        break;
    }
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    rl.close();
  }
}

main();