/**
 * Database functions cho quản lý Data Nodes
 */

import { pool } from '../../db/index.js';

/**
 * Tạo data node mới
 */
export async function createDataNode(name, host, port) {
  try {
    const [result] = await pool.query(
      'INSERT INTO data_nodes (name, host, port, status) VALUES (?, ?, ?, ?)',
      [name, host, port, 'offline']
    );
    
    return {
      id: result.insertId,
      name,
      host,
      port,
      status: 'offline'
    };
  } catch (error) {
    console.error('Error creating data node:', error);
    throw error;
  }
}

/**
 * Lấy tất cả data nodes
 */
export async function getAllDataNodes() {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data_nodes ORDER BY created_at DESC'
    );
    return rows;
  } catch (error) {
    console.error('Error getting data nodes:', error);
    throw error;
  }
}

/**
 * Lấy data node theo ID
 */
export async function getDataNodeById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data_nodes WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting data node:', error);
    throw error;
  }
}

/**
 * Lấy data node theo port
 */
export async function getDataNodeByPort(port) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data_nodes WHERE port = ?',
      [port]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting data node by port:', error);
    throw error;
  }
}

/**
 * Cập nhật data node
 */
export async function updateDataNode(id, updates) {
  try {
    const allowedFields = ['name', 'host', 'port', 'status', 'storage_used', 'storage_total', 'last_ping'];
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    await pool.query(
      `UPDATE data_nodes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await getDataNodeById(id);
  } catch (error) {
    console.error('Error updating data node:', error);
    throw error;
  }
}

/**
 * Xóa data node
 */
export async function deleteDataNode(id) {
  try {
    await pool.query('DELETE FROM data_nodes WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting data node:', error);
    throw error;
  }
}

/**
 * Cập nhật trạng thái kết nối
 */
export async function updateDataNodeStatus(id, status) {
  try {
    await pool.query(
      'UPDATE data_nodes SET status = ?, last_ping = NOW() WHERE id = ?',
      [status, id]
    );
    return true;
  } catch (error) {
    console.error('Error updating data node status:', error);
    throw error;
  }
}

/**
 * Cập nhật storage info
 */
export async function updateDataNodeStorage(id, storageUsed, storageTotal) {
  try {
    await pool.query(
      'UPDATE data_nodes SET storage_used = ?, storage_total = ?, last_ping = NOW() WHERE id = ?',
      [storageUsed, storageTotal, id]
    );
    return true;
  } catch (error) {
    console.error('Error updating data node storage:', error);
    throw error;
  }
}

/**
 * Lấy data nodes online
 */
export async function getOnlineDataNodes() {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data_nodes WHERE status = ? ORDER BY storage_used ASC',
      ['online']
    );
    return rows;
  } catch (error) {
    console.error('Error getting online data nodes:', error);
    throw error;
  }
}

/**
 * Tìm data node có dung lượng trống nhất
 */
export async function findBestDataNode() {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM data_nodes 
       WHERE status = 'online' 
       ORDER BY (storage_used / NULLIF(storage_total, 0)) ASC 
       LIMIT 1`
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error finding best data node:', error);
    throw error;
  }
}

