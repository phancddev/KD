/**
 * Database functions cho Login Logs
 * Quản lý việc lưu trữ và truy xuất thông tin đăng nhập chi tiết
 */

import { pool } from './index.js';

// Lưu login log mới
async function saveLoginLog(logData) {
  try {
    const {
      userId,
      username,
      ipAddress,
      userAgent,
      deviceType,
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceModel,
      country,
      city,
      timezone,
      loginStatus,
      loginMethod,
      sessionId,
      isSuspicious,
      suspiciousReason
    } = logData;

    const [result] = await pool.query(
      `INSERT INTO login_logs (
        user_id, username, ip_address, user_agent, device_type,
        browser_name, browser_version, os_name, os_version, device_model,
        country, city, timezone, login_status, login_method,
        session_id, is_suspicious, suspicious_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, username, ipAddress, userAgent, deviceType,
        browserName, browserVersion, osName, osVersion, deviceModel,
        country, city, timezone, loginStatus, loginMethod,
        sessionId, isSuspicious, suspiciousReason
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error('Lỗi khi lưu login log:', error);
    throw error;
  }
}

// Cập nhật logout time và session duration
async function updateLogoutLog(logId, logoutTime, sessionDuration) {
  try {
    await pool.query(
      'UPDATE login_logs SET logout_at = ?, session_duration = ? WHERE id = ?',
      [logoutTime, sessionDuration, logId]
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi cập nhật logout log:', error);
    throw error;
  }
}

// Lấy lịch sử đăng nhập của người dùng
async function getUserLoginHistory(userId, limit = 50, offset = 0) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id, username, ip_address, user_agent, device_type,
        browser_name, browser_version, os_name, os_version, device_model,
        country, city, timezone, login_status, login_method,
        session_id, login_at, logout_at, session_duration,
        is_suspicious, suspicious_reason, created_at
       FROM login_logs 
       WHERE user_id = ? 
       ORDER BY login_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows.map(row => ({
      id: row.id,
      username: row.username,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceType: row.device_type,
      browser: `${row.browser_name} ${row.browser_version}`,
      os: `${row.os_name} ${row.os_version}`,
      deviceModel: row.device_model,
      location: `${row.city}, ${row.country}`,
      timezone: row.timezone,
      loginStatus: row.login_status,
      loginMethod: row.login_method,
      sessionId: row.session_id,
      loginAt: row.login_at,
      logoutAt: row.logout_at,
      sessionDuration: row.session_duration,
      isSuspicious: row.is_suspicious,
      suspiciousReason: row.suspicious_reason,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử đăng nhập:', error);
    throw error;
  }
}

// Lấy tất cả login logs với phân trang và lọc
async function getAllLoginLogs(filters = {}, limit = 50, offset = 0) {
  try {
    const conditions = [];
    const params = [];

    if (filters.userId) {
      conditions.push('l.user_id = ?');
      params.push(filters.userId);
    }

    if (filters.username) {
      conditions.push('l.username LIKE ?');
      params.push(`%${filters.username}%`);
    }

    if (filters.ipAddress) {
      conditions.push('l.ip_address LIKE ?');
      params.push(`%${filters.ipAddress}%`);
    }

    if (filters.deviceType) {
      conditions.push('l.device_type = ?');
      params.push(filters.deviceType);
    }

    if (filters.loginStatus) {
      conditions.push('l.login_status = ?');
      params.push(filters.loginStatus);
    }

    // Xử lý filter theo ngày/giờ tương tự countLoginLogs để đồng nhất kết quả
    if (filters.fromDate && filters.toDate && filters.fromHour !== null && filters.toHour !== null) {
      conditions.push(`
        CONVERT_TZ(l.login_at, 'UTC', 'Asia/Ho_Chi_Minh') BETWEEN 
        CONCAT(?, ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(?, ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(filters.fromDate, filters.fromHour, filters.toDate, filters.toHour);
    } else if (filters.fromDate && filters.toDate) {
      conditions.push('l.login_at BETWEEN ? AND ?');
      params.push(`${filters.fromDate} 00:00:00`, `${filters.toDate} 23:59:59`);
    } else if (filters.fromHour !== null && filters.toHour !== null) {
      conditions.push(`
        CONVERT_TZ(l.login_at, 'UTC', 'Asia/Ho_Chi_Minh') BETWEEN 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(filters.fromHour, filters.toHour);
    }

    if (filters.isSuspicious !== undefined && filters.isSuspicious !== null) {
      conditions.push('l.is_suspicious = ?');
      params.push(filters.isSuspicious);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT 
        l.id, l.user_id, l.username, l.ip_address, l.user_agent, l.device_type,
        l.browser_name, l.browser_version, l.os_name, l.os_version, l.device_model,
        l.country, l.city, l.timezone, l.login_status, l.login_method,
        l.session_id, l.login_at, l.logout_at, l.session_duration,
        l.is_suspicious, l.suspicious_reason, l.created_at,
        u.full_name, u.email
       FROM login_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${whereClause}
       ORDER BY l.login_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      email: row.email,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceType: row.device_type,
      browser: `${row.browser_name} ${row.browser_version}`,
      os: `${row.os_name} ${row.os_version}`,
      deviceModel: row.device_model,
      location: `${row.city}, ${row.country}`,
      timezone: row.timezone,
      loginStatus: row.login_status,
      loginMethod: row.login_method,
      sessionId: row.session_id,
      loginAt: row.login_at,
      logoutAt: row.logout_at,
      sessionDuration: row.session_duration,
      isSuspicious: row.is_suspicious,
      suspiciousReason: row.suspicious_reason,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Lỗi khi lấy tất cả login logs:', error);
    throw error;
  }
}

// Đếm tổng số login logs
async function countLoginLogs(filters = {}) {
  try {
    const conditions = [];
    const params = [];

    if (filters.userId) {
      conditions.push('user_id = ?');
      params.push(filters.userId);
    }

    if (filters.username) {
      conditions.push('username LIKE ?');
      params.push(`%${filters.username}%`);
    }

    if (filters.ipAddress) {
      conditions.push('ip_address LIKE ?');
      params.push(`%${filters.ipAddress}%`);
    }

    if (filters.deviceType) {
      conditions.push('device_type = ?');
      params.push(filters.deviceType);
    }

    if (filters.loginStatus) {
      conditions.push('login_status = ?');
      params.push(filters.loginStatus);
    }

    if (filters.fromDate && filters.toDate && filters.fromHour !== null && filters.toHour !== null) {
      // Filter theo ngày và giờ cụ thể với múi giờ Việt Nam
      conditions.push(`
        CONVERT_TZ(login_at, 'UTC', 'Asia/Ho_Chi_Minh') BETWEEN 
        CONCAT(?, ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(?, ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(filters.fromDate, filters.fromHour, filters.toDate, filters.toHour);
    } else if (filters.fromDate && filters.toDate) {
      // Filter theo ngày (giữ nguyên logic cũ)
      conditions.push('login_at >= ?');
      params.push(filters.fromDate);
      conditions.push('login_at <= ?');
      params.push(filters.toDate);
    } else if (filters.fromHour !== null && filters.toHour !== null) {
      // Filter theo giờ trong ngày hôm nay (múi giờ Việt Nam)
      conditions.push(`
        CONVERT_TZ(login_at, 'UTC', 'Asia/Ho_Chi_Minh') BETWEEN 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(filters.fromHour, filters.toHour);
    }

    if (filters.isSuspicious !== undefined && filters.isSuspicious !== null) {
      conditions.push('is_suspicious = ?');
      params.push(filters.isSuspicious);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT COUNT(*) as total FROM login_logs ${whereClause}`,
      params
    );

    return rows[0].total;
  } catch (error) {
    console.error('Lỗi khi đếm login logs:', error);
    throw error;
  }
}

// Lấy thống kê đăng nhập
async function getLoginStats(filters = {}) {
  try {
    const conditions = [];
    const params = [];

    if (filters.fromDate && filters.toDate && filters.fromHour !== null && filters.toHour !== null) {
      // Filter theo ngày và giờ cụ thể với múi giờ Việt Nam
      conditions.push(`
        CONVERT_TZ(login_at, 'UTC', 'Asia/Ho_Chi_Minh') BETWEEN 
        CONCAT(?, ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(?, ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(filters.fromDate, filters.fromHour, filters.toDate, filters.toHour);
    } else if (filters.fromDate && filters.toDate) {
      // Filter theo ngày (giữ nguyên logic cũ)
      conditions.push('login_at >= ?');
      params.push(filters.fromDate);
      conditions.push('login_at <= ?');
      params.push(filters.toDate);
    } else if (filters.fromHour !== null && filters.toHour !== null) {
      // Filter theo giờ trong ngày hôm nay (múi giờ Việt Nam)
      conditions.push(`
        CONVERT_TZ(login_at, 'UTC', 'Asia/Ho_Chi_Minh') BETWEEN 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':00:00') AND 
        CONCAT(CURDATE(), ' ', LPAD(?, 2, '0'), ':59:59')
      `);
      params.push(filters.fromHour, filters.toHour);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Thống kê theo thiết bị
    const [deviceStats] = await pool.query(
      `SELECT device_type, COUNT(*) as count 
       FROM login_logs ${whereClause}
       GROUP BY device_type`,
      params
    );

    // Thống kê theo trình duyệt
    const [browserStats] = await pool.query(
      `SELECT browser_name, COUNT(*) as count 
       FROM login_logs ${whereClause}
       GROUP BY browser_name 
       ORDER BY count DESC 
       LIMIT 10`,
      params
    );

    // Thống kê theo hệ điều hành
    const [osStats] = await pool.query(
      `SELECT os_name, COUNT(*) as count 
       FROM login_logs ${whereClause}
       GROUP BY os_name 
       ORDER BY count DESC`,
      params
    );

    // Thống kê theo quốc gia
    const [countryStats] = await pool.query(
      `SELECT country, COUNT(*) as count 
       FROM login_logs ${whereClause}
       GROUP BY country 
       ORDER BY count DESC 
       LIMIT 10`,
      params
    );

    // Thống kê theo giờ trong ngày
    const [hourStats] = await pool.query(
      `SELECT HOUR(login_at) as hour, COUNT(*) as count 
       FROM login_logs ${whereClause}
       GROUP BY HOUR(login_at) 
       ORDER BY hour`,
      params
    );

    // Thống kê đăng nhập đáng ngờ
    const [suspiciousStats] = await pool.query(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN is_suspicious = 1 THEN 1 ELSE 0 END) as suspicious
       FROM login_logs ${whereClause}`,
      params
    );

    return {
      deviceStats,
      browserStats,
      osStats,
      countryStats,
      hourStats,
      suspiciousStats: suspiciousStats[0]
    };
  } catch (error) {
    console.error('Lỗi khi lấy thống kê đăng nhập:', error);
    throw error;
  }
}

// Lưu thông tin IP geolocation
async function saveIpGeolocation(ipInfo) {
  try {
    const {
      ipAddress,
      country,
      countryCode,
      region,
      city,
      latitude,
      longitude,
      timezone,
      isp,
      org
    } = ipInfo;

    await pool.query(
      `INSERT INTO ip_geolocation (
        ip_address, country, country_code, region, city,
        latitude, longitude, timezone, isp, org
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        last_seen = CURRENT_TIMESTAMP,
        lookup_count = lookup_count + 1`,
      [ipAddress, country, countryCode, region, city, latitude, longitude, timezone, isp, org]
    );

    return true;
  } catch (error) {
    console.error('Lỗi khi lưu thông tin IP geolocation:', error);
    throw error;
  }
}

// Lấy thông tin IP geolocation
async function getIpGeolocation(ipAddress) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM ip_geolocation WHERE ip_address = ?',
      [ipAddress]
    );

    return rows[0] || null;
  } catch (error) {
    console.error('Lỗi khi lấy thông tin IP geolocation:', error);
    throw error;
  }
}

export {
  saveLoginLog,
  updateLogoutLog,
  getUserLoginHistory,
  getAllLoginLogs,
  countLoginLogs,
  getLoginStats,
  saveIpGeolocation,
  getIpGeolocation
}; 