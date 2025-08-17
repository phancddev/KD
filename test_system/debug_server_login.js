#!/usr/bin/env node

import { authenticateUser, findUserByUsername } from '../db/users.js';
import { testConnection } from '../db/index.js';
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

// Hàm kiểm tra đăng nhập
async function checkLogin(username, password) {
  console.log(`Đang kiểm tra đăng nhập với username: ${username}`);
  
  try {
    // Kiểm tra người dùng có tồn tại không
    console.log("Đang tìm người dùng trong cơ sở dữ liệu...");
    const user = await findUserByUsername(username);
    
    if (!user) {
      console.log(`Không tìm thấy người dùng với tên đăng nhập: ${username}`);
      return null;
    }
    
    console.log(`Tìm thấy người dùng: ${username}`);
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email || 'N/A'}`);
    console.log(`Họ tên: ${user.full_name || 'N/A'}`);
    console.log(`Admin: ${user.is_admin ? 'Có' : 'Không'}`);
    console.log(`Mật khẩu (đã hash): ${user.password}`);
    
    // Kiểm tra đăng nhập
    console.log("Đang xác thực mật khẩu...");
    const authenticatedUser = await authenticateUser(username, password);
    
    if (authenticatedUser) {
      console.log("Đăng nhập thành công!");
      return authenticatedUser;
    } else {
      console.log("Mật khẩu không đúng!");
      return null;
    }
    
  } catch (error) {
    console.error("Lỗi khi kiểm tra đăng nhập:", error);
    return null;
  }
}

// Hàm chính
async function main() {
  console.log("===== KIỂM TRA ĐĂNG NHẬP SERVER =====");
  
  try {
    // Kiểm tra kết nối đến database
    console.log("Đang kiểm tra kết nối đến database...");
    const connected = await testConnection();
    
    if (!connected) {
      console.error("Không thể kết nối đến database. Vui lòng kiểm tra cấu hình.");
      rl.close();
      return;
    }
    
    console.log("Kết nối đến database thành công!");
    
    while (true) {
      console.log("\n===== MENU =====");
      console.log("1. Kiểm tra đăng nhập");
      console.log("2. Tìm người dùng theo tên đăng nhập");
      console.log("0. Thoát");
      console.log("===============");
      
      const choice = await question("Chọn chức năng: ");
      
      switch (choice) {
        case '1':
          const username = await question("Nhập tên đăng nhập: ");
          const password = await question("Nhập mật khẩu: ");
          await checkLogin(username, password);
          break;
          
        case '2':
          const searchUsername = await question("Nhập tên đăng nhập cần tìm: ");
          try {
            const user = await findUserByUsername(searchUsername);
            if (user) {
              console.log(`Tìm thấy người dùng: ${searchUsername}`);
              console.log(`ID: ${user.id}`);
              console.log(`Email: ${user.email || 'N/A'}`);
              console.log(`Họ tên: ${user.full_name || 'N/A'}`);
              console.log(`Admin: ${user.is_admin ? 'Có' : 'Không'}`);
              console.log(`Mật khẩu (đã hash): ${user.password}`);
            } else {
              console.log(`Không tìm thấy người dùng với tên đăng nhập: ${searchUsername}`);
            }
          } catch (error) {
            console.error("Lỗi khi tìm người dùng:", error);
          }
          break;
          
        case '0':
          console.log("Tạm biệt!");
          rl.close();
          return;
          
        default:
          console.log("Lựa chọn không hợp lệ. Vui lòng chọn lại.");
          break;
      }
    }
    
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    rl.close();
  }
}

main();