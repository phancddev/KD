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

// Xóa nhiều người dùng
async function deleteUsers(userIds) {
  try {
    const placeholders = userIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `DELETE FROM users WHERE id IN (${placeholders})`,
      userIds
    );
    return { deletedCount: result.affectedRows };
  } catch (error) {
    console.error('Lỗi khi xóa nhiều người dùng:', error);
    throw error;
  }
}

// Xóa người dùng theo thời gian
async function deleteUsersByDate(options) {
  try {
    const { fromDate, toDate, onlyLocked, onlyNonAdmin, excludeUserId } = options;
    
    let conditions = ['created_at BETWEEN ? AND ?'];
    let params = [fromDate, toDate];
    
    if (onlyLocked) {
      conditions.push('is_active = 0');
    }
    
    if (onlyNonAdmin) {
      conditions.push('is_admin = 0');
    }
    
    if (excludeUserId) {
      conditions.push('id != ?');
      params.push(excludeUserId);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const [result] = await pool.query(
      `DELETE FROM users WHERE ${whereClause}`,
      params
    );
    
    return { deletedCount: result.affectedRows };
  } catch (error) {
    console.error('Lỗi khi xóa người dùng theo thời gian:', error);
    throw error;
  }
}

// Xóa người dùng theo giờ cụ thể (múi giờ Việt Nam)
async function deleteUsersByHour(options) {
  try {
    const { 
      fromHour, 
      toHour, 
      fromDate, 
      toDate, 
      onlyLocked, 
      onlyNonAdmin, 
      excludeUserId,
      timezone = 'Asia/Ho_Chi_Minh'
    } = options;
    
    let conditions = [];
    let params = [];
    
    // Xử lý ngày và giờ với múi giờ Việt Nam
    if (fromDate && toDate) {
      if (fromHour !== undefined && toHour !== undefined) {
        // Xóa theo ngày và giờ cụ thể
        conditions.push(`
          CONVERT_TZ(created_at, 'UTC', ?) BETWEEN 
          CONCAT(?, ' ', LPAD(?, 2, '0'), ':00:00') AND 
          CONCAT(?, ' ', LPAD(?, 2, '0'), ':59:59')
        `);
        params.push(timezone, fromDate, fromHour, toDate, toHour);
      } else {
        // Xóa theo ngày (giữ nguyên logic cũ)
        conditions.push('created_at BETWEEN ? AND ?');
        params.push(fromDate, toDate);
      }
    } else if (fromHour !== undefined && toHour !== undefined) {
      // Xóa theo giờ trong ngày hôm nay (múi giờ Việt Nam)
      conditions.push(`
        CONVERT_TZ(created_at, 'UTC', ?) BETWEEN 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(timezone, fromHour, toHour);
    } else {
      throw new Error('Phải cung cấp ít nhất fromDate/toDate hoặc fromHour/toHour');
    }
    
    if (onlyLocked) {
      conditions.push('is_active = 0');
    }
    
    if (onlyNonAdmin) {
      conditions.push('is_admin = 0');
    }
    
    if (excludeUserId) {
      conditions.push('id != ?');
      params.push(excludeUserId);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const [result] = await pool.query(
      `DELETE FROM users WHERE ${whereClause}`,
      params
    );
    
    return { deletedCount: result.affectedRows };
  } catch (error) {
    console.error('Lỗi khi xóa người dùng theo giờ:', error);
    throw error;
  }
}

// Xóa người dùng theo giờ trong ngày cụ thể
async function deleteUsersByHourInDay(options) {
  try {
    const { 
      date, 
      fromHour, 
      toHour, 
      onlyLocked, 
      onlyNonAdmin, 
      excludeUserId,
      timezone = 'Asia/Ho_Chi_Minh'
    } = options;
    
    if (!date || fromHour === undefined || toHour === undefined) {
      throw new Error('Phải cung cấp date, fromHour và toHour');
    }
    
    let conditions = [`
      CONVERT_TZ(created_at, 'UTC', ?) BETWEEN 
      CONCAT(?, ' ', LPAD(?, 2, '0'), ':00:00') AND 
      CONCAT(?, ' ', LPAD(?, 2, '0'), ':59:59')
    `];
    let params = [timezone, date, fromHour, date, toHour];
    
    if (onlyLocked) {
      conditions.push('is_active = 0');
    }
    
    if (onlyNonAdmin) {
      conditions.push('is_admin = 0');
    }
    
    if (excludeUserId) {
      conditions.push('id != ?');
      params.push(excludeUserId);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const [result] = await pool.query(
      `DELETE FROM users WHERE ${whereClause}`,
      params
    );
    
    return { deletedCount: result.affectedRows };
  } catch (error) {
    console.error('Lỗi khi xóa người dùng theo giờ trong ngày:', error);
    throw error;
  }
}

// Xóa người dùng không hoạt động
async function deleteInactiveUsers(options) {
  try {
    const { inactiveDays, onlyLocked, onlyNonAdmin, excludeUserId } = options;
    
    let conditions = ['last_login < DATE_SUB(NOW(), INTERVAL ? DAY) OR last_login IS NULL'];
    let params = [inactiveDays];
    
    if (onlyLocked) {
      conditions.push('is_active = 0');
    }
    
    if (onlyNonAdmin) {
      conditions.push('is_admin = 0');
    }
    
    if (excludeUserId) {
      conditions.push('id != ?');
      params.push(excludeUserId);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const [result] = await pool.query(
      `DELETE FROM users WHERE ${whereClause}`,
      params
    );
    
    return { deletedCount: result.affectedRows };
  } catch (error) {
    console.error('Lỗi khi xóa người dùng không hoạt động:', error);
    throw error;
  }
}

// Lấy danh sách người dùng để xem trước khi xóa
async function getUsersForDeletion(options) {
  try {
    const { 
      fromDate, 
      toDate, 
      fromHour, 
      toHour, 
      inactiveDays, 
      onlyLocked, 
      onlyNonAdmin, 
      excludeUserId,
      timezone = 'Asia/Ho_Chi_Minh'
    } = options;
    
    let conditions = [];
    let params = [];
    
    // Xử lý ngày và giờ với múi giờ Việt Nam
    if (fromDate && toDate) {
      if (fromHour !== undefined && toHour !== undefined && 
          !isNaN(fromHour) && !isNaN(toHour) && 
          fromHour >= 0 && fromHour <= 23 && toHour >= 0 && toHour <= 23) {
        // Xem trước theo ngày và giờ cụ thể
        conditions.push(`
          CONVERT_TZ(created_at, 'UTC', ?) BETWEEN 
          CONCAT(?, ' ', LPAD(?, 2, '0'), ':00:00') AND 
          CONCAT(?, ' ', LPAD(?, 2, '0'), ':59:59')
        `);
        params.push(timezone, fromDate, fromHour, toDate, toHour);
      } else {
        // Xem trước theo ngày (giữ nguyên logic cũ)
        conditions.push('created_at BETWEEN ? AND ?');
        params.push(fromDate, toDate);
      }
    } else if (fromHour !== undefined && toHour !== undefined && 
               !isNaN(fromHour) && !isNaN(toHour) && 
               fromHour >= 0 && fromHour <= 23 && toHour >= 0 && toHour <= 23) {
      // Xem trước theo giờ trong ngày hôm nay (múi giờ Việt Nam)
      conditions.push(`
        CONVERT_TZ(created_at, 'UTC', ?) BETWEEN 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(timezone, fromHour, toHour);
    }
    
    if (inactiveDays) {
      conditions.push('(last_login < DATE_SUB(NOW(), INTERVAL ? DAY) OR last_login IS NULL)');
      params.push(inactiveDays);
    }
    
    if (onlyLocked) {
      conditions.push('is_active = 0');
    }
    
    if (onlyNonAdmin) {
      conditions.push('is_admin = 0');
    }
    
    if (excludeUserId) {
      conditions.push('id != ?');
      params.push(excludeUserId);
    }
    
    // Nếu không có điều kiện nào, trả về tất cả người dùng
    if (conditions.length === 0) {
      const [rows] = await pool.query(
        `SELECT id, username, full_name, email, is_active, is_admin, created_at, last_login,
                CONVERT_TZ(created_at, 'UTC', ?) as local_created_at
         FROM users 
         ORDER BY created_at DESC`,
        [timezone]
      );
      
      return rows.map(row => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        email: row.email,
        isActive: row.is_active === 1,
        isAdmin: row.is_admin === 1,
        createdAt: row.created_at,
        localCreatedAt: row.local_created_at,
        lastLogin: row.last_login
      }));
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const [rows] = await pool.query(
      `SELECT id, username, full_name, email, is_active, is_admin, created_at, last_login,
              CONVERT_TZ(created_at, 'UTC', ?) as local_created_at
       FROM users ${whereClause} 
       ORDER BY created_at DESC`,
      [timezone, ...params]
    );
    
    return rows.map(row => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      email: row.email,
      isActive: row.is_active === 1,
      isAdmin: row.is_admin === 1,
      createdAt: row.created_at,
      localCreatedAt: row.local_created_at,
      lastLogin: row.last_login
    }));
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng để xóa:', error);
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
  updateUser,
  deleteUsers,
  deleteUsersByDate,
  deleteUsersByHour,
  deleteUsersByHourInDay,
  deleteInactiveUsers,
  getUsersForDeletion
};