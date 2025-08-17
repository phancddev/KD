#!/usr/bin/env node

import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { testConnection } from './db/index.js';
import { createUser, findUserByUsername, setAdminStatus, getAllUsers, resetUserPassword, deleteUser } from './db/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tạo interface đọc input từ command line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hàm hiển thị menu
function showMenu() {
  console.log('\n===== QUẢN LÝ HỆ THỐNG =====');
  console.log('1. Tạo người dùng mới');
  console.log('2. Tạo người dùng admin mới');
  console.log('3. Cấp quyền admin cho người dùng');
  console.log('4. Thu hồi quyền admin của người dùng');
  console.log('5. Liệt kê tất cả người dùng');
  console.log('6. Đặt lại mật khẩu người dùng');
  console.log('7. Xóa người dùng');
  console.log('8. Kiểm tra kết nối database');
  console.log('0. Thoát');
  console.log('===========================');
  
  rl.question('Chọn chức năng: ', async (choice) => {
    switch (choice) {
      case '1':
        await createNewUser(false);
        break;
      case '2':
        await createNewUser(true);
        break;
      case '3':
        await changeAdminStatus(true);
        break;
      case '4':
        await changeAdminStatus(false);
        break;
      case '5':
        await listAllUsers();
        break;
      case '6':
        await resetPassword();
        break;
      case '7':
        await removeUser();
        break;
      case '8':
        await checkDatabaseConnection();
        break;
      case '0':
        console.log('Tạm biệt!');
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Lựa chọn không hợp lệ. Vui lòng chọn lại.');
        showMenu();
        break;
    }
  });
}

// Hàm tạo người dùng mới
async function createNewUser(isAdmin = false) {
  try {
    const username = await question('Nhập tên đăng nhập: ');
    
    // Kiểm tra tên đăng nhập đã tồn tại chưa
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      console.log('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
      return showMenu();
    }
    
    const password = await question('Nhập mật khẩu: ');
    const email = await question('Nhập email (có thể bỏ trống): ');
    
    let fullName = '';
    while (!fullName.trim()) {
      fullName = await question('Nhập họ tên đầy đủ (bắt buộc): ');
      if (!fullName.trim()) {
        console.log('Họ tên đầy đủ là bắt buộc. Vui lòng nhập lại.');
      }
    }
    
    // Tạo người dùng mới
    const user = await createUser(
      username, 
      password, 
      email || null, 
      fullName || null, 
      isAdmin
    );
    
    console.log(`Đã tạo ${isAdmin ? 'admin' : 'người dùng'} mới thành công!`);
    console.log(`ID: ${user.id}, Username: ${user.username}, Admin: ${isAdmin ? 'Có' : 'Không'}`);
    
    showMenu();
  } catch (error) {
    console.error('Lỗi khi tạo người dùng:', error);
    showMenu();
  }
}

// Hàm thay đổi quyền admin
async function changeAdminStatus(grantAdmin = true) {
  try {
    const username = await question('Nhập tên đăng nhập cần thay đổi quyền: ');
    
    // Kiểm tra người dùng có tồn tại không
    const user = await findUserByUsername(username);
    if (!user) {
      console.log('Không tìm thấy người dùng với tên đăng nhập này.');
      return showMenu();
    }
    
    // Thay đổi quyền admin
    await setAdminStatus(user.id, grantAdmin);
    
    console.log(`Đã ${grantAdmin ? 'cấp' : 'thu hồi'} quyền admin cho người dùng ${username} thành công!`);
    
    showMenu();
  } catch (error) {
    console.error('Lỗi khi thay đổi quyền admin:', error);
    showMenu();
  }
}

// Hàm liệt kê tất cả người dùng
async function listAllUsers() {
  try {
    const users = await getAllUsers();
    
    console.log('\n===== DANH SÁCH NGƯỜI DÙNG =====');
    console.log('ID\tTên đăng nhập\tEmail\t\t\tHọ tên\t\tAdmin\tNgày tạo');
    console.log('---------------------------------------------------------------------------------');
    
    users.forEach(user => {
      console.log(`${user.id}\t${user.username}\t${user.email || 'N/A'}\t\t${user.full_name || 'N/A'}\t\t${user.is_admin ? 'Có' : 'Không'}\t${formatDate(user.created_at)}`);
    });
    
    showMenu();
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    showMenu();
  }
}

// Hàm đặt lại mật khẩu người dùng
async function resetPassword() {
  try {
    const username = await question('Nhập tên đăng nhập cần đặt lại mật khẩu: ');
    
    // Kiểm tra người dùng có tồn tại không
    const user = await findUserByUsername(username);
    if (!user) {
      console.log('Không tìm thấy người dùng với tên đăng nhập này.');
      return showMenu();
    }
    
    const newPassword = await question('Nhập mật khẩu mới: ');
    const confirmPassword = await question('Xác nhận mật khẩu mới: ');
    
    if (newPassword !== confirmPassword) {
      console.log('Mật khẩu xác nhận không khớp. Vui lòng thử lại.');
      return showMenu();
    }
    
    // Đặt lại mật khẩu
    await resetUserPassword(user.id, newPassword);
    
    console.log(`Đã đặt lại mật khẩu cho người dùng ${username} thành công!`);
    
    showMenu();
  } catch (error) {
    console.error('Lỗi khi đặt lại mật khẩu:', error);
    showMenu();
  }
}

// Hàm xóa người dùng
async function removeUser() {
  try {
    const username = await question('Nhập tên đăng nhập cần xóa: ');
    
    // Kiểm tra người dùng có tồn tại không
    const user = await findUserByUsername(username);
    if (!user) {
      console.log('Không tìm thấy người dùng với tên đăng nhập này.');
      return showMenu();
    }
    
    // Xác nhận xóa người dùng
    const confirmation = await question(`Bạn có chắc chắn muốn xóa người dùng ${username}? (y/n): `);
    
    if (confirmation.toLowerCase() !== 'y') {
      console.log('Đã hủy thao tác xóa người dùng.');
      return showMenu();
    }
    
    // Xóa người dùng
    const success = await deleteUser(user.id);
    
    if (success) {
      console.log(`Đã xóa người dùng ${username} thành công!`);
    } else {
      console.log(`Không thể xóa người dùng ${username}.`);
    }
    
    showMenu();
  } catch (error) {
    console.error('Lỗi khi xóa người dùng:', error);
    showMenu();
  }
}

// Hàm kiểm tra kết nối database
async function checkDatabaseConnection() {
  try {
    const connected = await testConnection();
    
    if (connected) {
      console.log('Kết nối đến database thành công!');
    } else {
      console.log('Không thể kết nối đến database. Vui lòng kiểm tra cấu hình.');
    }
    
    showMenu();
  } catch (error) {
    console.error('Lỗi khi kiểm tra kết nối database:', error);
    showMenu();
  }
}

// Hàm trợ giúp để sử dụng Promise với readline
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

// Hàm định dạng ngày tháng
function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// Bắt đầu chương trình
console.log('Chào mừng đến với công cụ quản lý hệ thống!');

// Kiểm tra kết nối database trước khi hiển thị menu
checkDatabaseConnection();