/**
 * API Routes cho quản lý Data Nodes
 */

import express from 'express';
import {
  createDataNode,
  getAllDataNodes,
  getDataNodeById,
  updateDataNode,
  deleteDataNode,
  getOnlineDataNodes
} from '../db/data-nodes.js';
import {
  getConnectedDataNodes,
  isDataNodeOnline,
  getStorageInfo
} from '../socket/data-node-server.js';

const router = express.Router();

/**
 * Middleware kiểm tra admin
 */
function requireAdmin(req, res, next) {
  console.log('🔍 requireAdmin - Session user:', req.session.user);

  if (!req.session.user) {
    console.log('❌ requireAdmin - Không có user trong session');
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  // Kiểm tra cả is_admin và isAdmin để tương thích
  const isAdmin = req.session.user.is_admin === 1 || req.session.user.is_admin === true || req.session.user.isAdmin === true;

  if (!isAdmin) {
    console.log('❌ requireAdmin - User không có quyền admin');
    return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
  }

  console.log('✅ requireAdmin - User có quyền admin');
  next();
}

/**
 * GET /api/data-nodes
 * Lấy danh sách tất cả data nodes
 */
router.get('/data-nodes', requireAdmin, async (req, res) => {
  try {
    const nodes = await getAllDataNodes();
    
    // Thêm thông tin kết nối real-time
    const connectedNodes = getConnectedDataNodes();
    const nodesWithStatus = nodes.map(node => ({
      ...node,
      isConnected: isDataNodeOnline(node.id),
      connectionInfo: connectedNodes.find(cn => cn.nodeId === node.id) || null
    }));
    
    res.json({
      success: true,
      data: nodesWithStatus
    });
  } catch (error) {
    console.error('Error getting data nodes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data-nodes/:id
 * Lấy thông tin chi tiết data node
 */
router.get('/data-nodes/:id', requireAdmin, async (req, res) => {
  try {
    const node = await getDataNodeById(req.params.id);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Data node không tồn tại'
      });
    }
    
    // Thêm thông tin kết nối
    node.isConnected = isDataNodeOnline(node.id);
    
    res.json({
      success: true,
      data: node
    });
  } catch (error) {
    console.error('Error getting data node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/data-nodes
 * Tạo data node mới
 */
router.post('/data-nodes', requireAdmin, async (req, res) => {
  try {
    const { name, host, port } = req.body;
    
    // Validate
    if (!name || !host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin bắt buộc (name, host, port)'
      });
    }
    
    if (port < 1024 || port > 65535) {
      return res.status(400).json({
        success: false,
        error: 'Port phải trong khoảng 1024-65535'
      });
    }
    
    const node = await createDataNode(name, host, port);
    
    res.json({
      success: true,
      data: node,
      message: 'Đã tạo data node thành công'
    });
  } catch (error) {
    console.error('Error creating data node:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Port này đã được sử dụng'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/data-nodes/:id
 * Cập nhật data node
 */
router.put('/data-nodes/:id', requireAdmin, async (req, res) => {
  try {
    const { name, host, port } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (host) updates.host = host;
    if (port) {
      if (port < 1024 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: 'Port phải trong khoảng 1024-65535'
        });
      }
      updates.port = port;
    }
    
    const node = await updateDataNode(req.params.id, updates);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Data node không tồn tại'
      });
    }
    
    res.json({
      success: true,
      data: node,
      message: 'Đã cập nhật data node thành công'
    });
  } catch (error) {
    console.error('Error updating data node:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Port này đã được sử dụng'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/data-nodes/:id
 * Xóa data node
 */
router.delete('/data-nodes/:id', requireAdmin, async (req, res) => {
  try {
    await deleteDataNode(req.params.id);
    
    res.json({
      success: true,
      message: 'Đã xóa data node thành công'
    });
  } catch (error) {
    console.error('Error deleting data node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data-nodes/:id/storage
 * Lấy thông tin storage của data node
 */
router.get('/data-nodes/:id/storage', requireAdmin, async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    
    if (!isDataNodeOnline(nodeId)) {
      return res.status(503).json({
        success: false,
        error: 'Data node đang offline'
      });
    }
    
    const storageInfo = await getStorageInfo(nodeId);
    
    res.json({
      success: true,
      data: storageInfo
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data-nodes/online
 * Lấy danh sách data nodes đang online
 */
router.get('/data-nodes-online', requireAdmin, async (req, res) => {
  try {
    const nodes = await getOnlineDataNodes();
    
    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    console.error('Error getting online nodes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

