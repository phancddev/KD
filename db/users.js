import { pool } from './index.js';
import { hashPassword, verifyPassword } from './password-utils.js';

// Tạo người dùng mới
async function createUser(username, password, email = null, fullName = null, isAdmin = false) {
  try {
    const hashedPassword = hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, email, full_name, is_admin) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, email, fullName, isAdmin]
    );
    return { id: result.insertId, username, email, fullName, isAdmin };
  } catch (error) {
    console.error('Lỗi khi tạo người dùng mới:', error);
    throw error;
  }
}

// Tìm người dùng theo username
async function findUserByUsername(username) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Lỗi khi tìm người dùng:', error);
    throw error;
  }
}

// Xác thực người dùng
async function authenticateUser(username, password, ip = null) {
  try {
    const user = await findUserByUsername(username);
    if (!user) return null;
    
    const isValid = verifyPassword(password, user.password);
    if (!isValid) return null;
    
    // Cập nhật thời gian đăng nhập và IP
    if (ip) {
      await updateLastLogin(user.id, ip);
    }
    
    // Không trả về mật khẩu
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Lỗi khi xác thực người dùng:', error);
    throw error;
  }
}

// Cập nhật thời gian đăng nhập và IP
async function updateLastLogin(userId, ip) {
  try {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?',
      [ip, userId]
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi cập nhật thời gian đăng nhập:', error);
    return false;
  }
}

// Lấy danh sách người dùng
async function getAllUsers() {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, full_name, is_admin, is_active, created_at, last_login, last_ip FROM users'
    );
    return rows;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    throw error;
  }
}

// Cập nhật quyền admin cho người dùng
async function setAdminStatus(userId, isAdmin) {
  try {
    await pool.query(
      'UPDATE users SET is_admin = ? WHERE id = ?',
      [isAdmin, userId]
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi cập nhật quyền admin:', error);
    throw error;
  }
}

// Kiểm tra người dùng có phải là admin không
async function isUserAdmin(userId) {
  try {
    const [rows] = await pool.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows.length === 0) return false;
    return rows[0].is_admin === 1;
  } catch (error) {
    console.error('Lỗi khi kiểm tra quyền admin:', error);
    return false;
  }
}

// Reset mật khẩu người dùng
async function resetUserPassword(userId, newPassword) {
  try {
    const hashedPassword = hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi reset mật khẩu:', error);
    throw error;
  }
}

// Xóa người dùng
async function deleteUser(userId) {
  try {
    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Lỗi khi xóa người dùng:', error);
    throw error;
  }
}

// Tìm người dùng theo ID
async function findUserById(userId) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Lỗi khi tìm người dùng theo ID:', error);
    throw error;
  }
}

// Cập nhật thông tin người dùng
async function updateUser(userId, userData) {
  try {
    const { username, email, fullName, isActive } = userData;
    
    const [result] = await pool.query(
      'UPDATE users SET username = ?, email = ?, full_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username, email, fullName, isActive, userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin người dùng:', error);
    throw error;
  }
}

export { 
  createUser, 
  findUserByUsername,
  findUserById,
  authenticateUser, 
  getAllUsers,
  setAdminStatus,
  isUserAdmin,
  resetUserPassword,
  deleteUser,
  updateLastLogin,
  updateUser
};