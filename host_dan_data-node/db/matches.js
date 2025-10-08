/**
 * Database functions cho bảng matches
 * Lưu metadata mapping: match_id → data_node_id
 * Version: 2.0.0
 */

import { pool } from '../../db/index.js';

/**
 * Tạo mã trận đấu ngẫu nhiên
 */
export function generateMatchCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Chuyển tên có dấu thành không dấu
 */
function removeVietnameseTones(str) {
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return str;
}

/**
 * Tạo match_id từ code và name
 * Format: YYYYMMDD_CODE_TenTran
 * Example: 20251008_ABC123_TranDau1
 */
export function generateMatchId(matchCode, matchName) {
  // Get current date in YYYYMMDD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Remove Vietnamese tones and special characters from match name
  let cleanName = removeVietnameseTones(matchName);
  cleanName = cleanName.replace(/[^a-zA-Z0-9]/g, ''); // Remove all non-alphanumeric
  cleanName = cleanName.substring(0, 30); // Limit length

  // Format: YYYYMMDD_CODE_TenTran
  return `${dateStr}_${matchCode}_${cleanName}`;
}

/**
 * Alias cho backward compatibility
 */
export function generateMatchFolderName(matchCode, matchName) {
  return generateMatchId(matchCode, matchName);
}

/**
 * Tạo trận đấu mới trong database
 */
export async function createMatch(matchData) {
  const {
    matchId,
    matchCode,
    matchName,
    dataNodeId,
    storageFolder,
    status = 'draft',
    createdBy = 'admin'
  } = matchData;

  const [result] = await pool.query(
    `INSERT INTO matches
     (match_id, match_code, match_name, data_node_id, storage_folder, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [matchId, matchCode, matchName, dataNodeId, storageFolder, status, createdBy]
  );

  return {
    id: result.insertId,
    match_id: matchId,
    match_code: matchCode,
    match_name: matchName,
    data_node_id: dataNodeId,
    storage_folder: storageFolder,
    status,
    created_by: createdBy
  };
}

/**
 * Lấy match theo match_id
 */
export async function getMatchById(matchId) {
  const [rows] = await pool.query(
    `SELECT m.*, dn.name as data_node_name, dn.status as data_node_status
     FROM matches m
     LEFT JOIN data_nodes dn ON m.data_node_id = dn.id
     WHERE m.match_id = ?`,
    [matchId]
  );

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Lấy match theo database ID (internal)
 */
export async function getMatchByInternalId(id) {
  const [rows] = await pool.query(
    `SELECT m.*, dn.name as data_node_name, dn.status as data_node_status
     FROM matches m
     LEFT JOIN data_nodes dn ON m.data_node_id = dn.id
     WHERE m.id = ?`,
    [id]
  );

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Lấy match theo code
 */
export async function getMatchByCode(code) {
  const [rows] = await pool.query(
    `SELECT m.*, dn.name as data_node_name, dn.status as data_node_status
     FROM matches m
     LEFT JOIN data_nodes dn ON m.data_node_id = dn.id
     WHERE m.match_code = ?`,
    [code]
  );

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Lấy tất cả matches
 */
export async function getAllMatches(options = {}) {
  const { status, dataNodeId, limit, offset } = options;

  let query = `
    SELECT m.*, dn.name as data_node_name, dn.status as data_node_status
    FROM matches m
    LEFT JOIN data_nodes dn ON m.data_node_id = dn.id
    WHERE 1=1
  `;

  const params = [];

  if (status) {
    query += ` AND m.status = ?`;
    params.push(status);
  }

  if (dataNodeId) {
    query += ` AND m.data_node_id = ?`;
    params.push(dataNodeId);
  }

  query += ` ORDER BY m.created_at DESC`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);

    if (offset) {
      query += ` OFFSET ?`;
      params.push(offset);
    }
  }

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Lấy matches theo Data Node
 */
export async function getMatchesByDataNode(dataNodeId) {
  const [rows] = await pool.query(
    `SELECT m.*, dn.name as data_node_name
     FROM matches m
     LEFT JOIN data_nodes dn ON m.data_node_id = dn.id
     WHERE m.data_node_id = ?
     ORDER BY m.created_at DESC`,
    [dataNodeId]
  );

  return rows;
}

/**
 * Cập nhật trạng thái match
 */
export async function updateMatchStatus(matchId, status) {
  const [result] = await pool.query(
    `UPDATE matches
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE match_id = ?`,
    [status, matchId]
  );

  return result.affectedRows > 0;
}

/**
 * Cập nhật thông tin match
 */
export async function updateMatch(matchId, updates) {
  const allowedFields = ['match_name', 'status'];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(matchId);

  const [result] = await pool.query(
    `UPDATE matches
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE match_id = ?`,
    values
  );

  return result.affectedRows > 0;
}

/**
 * Xóa match
 */
export async function deleteMatch(matchId) {
  const [result] = await pool.query(
    `DELETE FROM matches WHERE match_id = ?`,
    [matchId]
  );

  return result.affectedRows > 0;
}

/**
 * Kiểm tra match có tồn tại không
 */
export async function matchExists(matchId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM matches WHERE match_id = ? LIMIT 1`,
    [matchId]
  );

  return rows.length > 0;
}

/**
 * Đếm số lượng matches
 */
export async function countMatches(options = {}) {
  const { status, dataNodeId } = options;

  let query = `SELECT COUNT(*) as total FROM matches WHERE 1=1`;
  const params = [];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (dataNodeId) {
    query += ` AND data_node_id = ?`;
    params.push(dataNodeId);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
}

/**
 * Lấy matches với pagination
 */
export async function getMatchesPaginated(page = 1, pageSize = 20, options = {}) {
  const offset = (page - 1) * pageSize;

  const matches = await getAllMatches({
    ...options,
    limit: pageSize,
    offset
  });

  const total = await countMatches(options);

  return {
    matches,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

