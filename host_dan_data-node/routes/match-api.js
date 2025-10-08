/**
 * API Routes cho quản lý Matches - Version 2.0
 * Kiến trúc phân tán: Metadata trong KD database, Questions trong match.json trên Data Nodes
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import {
  createMatch,
  getMatchById,
  getMatchByCode,
  getAllMatches,
  updateMatch,
  updateMatchStatus,
  deleteMatch,
  matchExists,
  generateMatchCode,
  generateMatchId
} from '../db/matches.js';
import { getOnlineDataNodes } from '../db/data-nodes.js';
import { sendFileToDataNode, createFolderOnDataNode } from '../socket/data-node-server.js';
import {
  createMatchOnDataNode,
  getMatchFromDataNode,
  addQuestionToDataNode,
  deleteQuestionFromDataNode,
  deleteMatchFromDataNode,
  findMatchById
} from '../match-reader.js';

const router = express.Router();

// Cấu hình multer để upload file tạm
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

/**
 * Middleware kiểm tra admin
 */
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const isAdmin = req.session.user.is_admin === 1 || req.session.user.is_admin === true || req.session.user.isAdmin === true;

  if (!isAdmin) {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
  }

  next();
}

/**
 * POST /api/matches/create
 * Tạo trận đấu mới
 */
router.post('/matches/create', requireAdmin, async (req, res) => {
  let matchCreatedInDb = false;
  let matchId = null;
  
  try {
    const { name, dataNodeId } = req.body;
    
    // Validate input
    if (!name || !dataNodeId) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin: name và dataNodeId là bắt buộc'
      });
    }
    
    // Kiểm tra Data Node có online không
    const onlineNodes = await getOnlineDataNodes();
    const selectedNode = onlineNodes.find(node => node.id === parseInt(dataNodeId));
    
    if (!selectedNode) {
      return res.status(400).json({
        success: false,
        error: 'Data Node không tồn tại hoặc đang offline'
      });
    }
    
    // Generate match code và match_id
    const matchCode = generateMatchCode();
    matchId = generateMatchId(matchCode, name);
    const storageFolder = matchId; // Giống nhau
    
    console.log(`🎮 Tạo trận đấu: ${matchId}`);
    
    // Bước 1: Tạo record trong database
    const matchRecord = await createMatch({
      matchId,
      matchCode,
      matchName: name,
      dataNodeId: parseInt(dataNodeId),
      storageFolder,
      status: 'draft',
      createdBy: req.session.user.username || 'admin'
    });
    
    matchCreatedInDb = true;
    console.log(`✅ Đã tạo record trong database: ${matchId}`);
    
    // Bước 2: Tạo folder + match.json trên Data Node
    try {
      const matchData = await createMatchOnDataNode(parseInt(dataNodeId), {
        matchId,
        code: matchCode,
        name,
        dataNodeId: parseInt(dataNodeId),
        dataNodeName: selectedNode.name,
        createdBy: req.session.user.username || 'admin'
      });
      
      console.log(`✅ Đã tạo folder + match.json trên Data Node`);
      
      res.json({
        success: true,
        data: {
          ...matchRecord,
          data_node_name: selectedNode.name,
          match_data: matchData
        },
        message: `Đã tạo trận đấu ${matchCode} thành công`
      });
      
    } catch (dataNodeError) {
      console.error(`❌ Lỗi khi tạo folder trên Data Node:`, dataNodeError);
      
      // Rollback: Xóa record trong database
      await deleteMatch(matchId);
      console.log(`🔄 Đã rollback: xóa record trong database`);
      
      throw new Error(`Không thể tạo folder trên Data Node: ${dataNodeError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating match:', error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/matches
 * Lấy danh sách trận đấu
 */
router.get('/matches', requireAdmin, async (req, res) => {
  try {
    const options = {};
    
    if (req.query.status) {
      options.status = req.query.status;
    }
    
    if (req.query.dataNodeId) {
      options.dataNodeId = parseInt(req.query.dataNodeId);
    }
    
    const matches = await getAllMatches(options);
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/matches/:matchId
 * Lấy chi tiết trận đấu
 */
router.get('/matches/:matchId', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Lấy metadata từ database
    const matchRecord = await getMatchById(matchId);
    
    if (!matchRecord) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }
    
    // Lấy match.json từ Data Node
    try {
      const matchData = await getMatchFromDataNode(matchRecord.data_node_id, matchId);
      
      res.json({
        success: true,
        data: {
          ...matchRecord,
          ...matchData
        }
      });
      
    } catch (dataNodeError) {
      console.error(`❌ Lỗi khi đọc match.json:`, dataNodeError);
      
      // Trả về ít nhất metadata từ database
      res.json({
        success: true,
        data: matchRecord,
        warning: 'Không thể đọc match.json từ Data Node'
      });
    }
    
  } catch (error) {
    console.error('Error getting match:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/matches/:matchId/upload
 * Upload câu hỏi (file + metadata)
 */
router.post('/matches/:matchId/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { matchId } = req.params;
    const { section, questionOrder, playerIndex, questionType, answerText, points, timeLimit, questionText } = req.body;
    
    // Validate
    if (!section || questionOrder === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin section hoặc questionOrder'
      });
    }
    
    // Lấy match từ database
    const matchRecord = await getMatchById(matchId);
    
    if (!matchRecord) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }
    
    let mediaFile = null;
    let mediaSize = 0;
    
    // Nếu có file, upload lên Data Node
    if (req.file) {
      // Đọc file
      const fileBuffer = await fs.readFile(req.file.path);
      const fileBase64 = fileBuffer.toString('base64');
      
      // Gửi file tới Data Node
      const uploadResult = await sendFileToDataNode(matchRecord.data_node_id, {
        matchId: matchId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        fileData: fileBase64,
        section: section,
        questionOrder: questionOrder
      });
      
      // Extract filename from stream URL
      const urlParts = uploadResult.streamUrl.split('/');
      mediaFile = urlParts[urlParts.length - 1];
      mediaSize = req.file.size;
      
      // Xóa file tạm
      await fs.unlink(req.file.path);
    }
    
    // Thêm câu hỏi vào match.json
    const question = await addQuestionToDataNode(matchRecord.data_node_id, matchId, {
      section,
      playerIndex: playerIndex ? parseInt(playerIndex) : null,
      order: parseInt(questionOrder),
      type: questionType || (req.file ? 'media' : 'text'),
      questionText: questionText || null,
      mediaFile,
      mediaSize,
      answer: answerText,
      points: points ? parseInt(points) : 10,
      timeLimit: timeLimit ? parseInt(timeLimit) : null
    });
    
    res.json({
      success: true,
      data: question,
      message: 'Đã thêm câu hỏi thành công'
    });
    
  } catch (error) {
    console.error('Error uploading question:', error);
    
    // Xóa file tạm nếu có lỗi
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/matches/:matchId
 * Xóa trận đấu
 */
router.delete('/matches/:matchId', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;

    // Lấy match từ database
    const matchRecord = await getMatchById(matchId);

    if (!matchRecord) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }

    console.log(`🗑️  Xóa trận đấu: ${matchId}`);

    // Bước 1: Xóa folder + match.json trên Data Node
    try {
      await deleteMatchFromDataNode(matchRecord.data_node_id, matchId);
      console.log(`✅ Đã xóa folder trên Data Node`);
    } catch (dataNodeError) {
      console.error(`⚠️  Lỗi khi xóa folder trên Data Node:`, dataNodeError);
      // Tiếp tục xóa database dù folder xóa thất bại
    }

    // Bước 2: Xóa record trong database
    await deleteMatch(matchId);
    console.log(`✅ Đã xóa record trong database`);

    res.json({
      success: true,
      message: `Đã xóa trận đấu ${matchId}`
    });

  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/matches/:matchId/status
 * Cập nhật trạng thái trận đấu
 */
router.put('/matches/:matchId/status', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin status'
      });
    }

    // Validate status
    const validStatuses = ['draft', 'ready', 'playing', 'finished', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status không hợp lệ. Phải là một trong: ${validStatuses.join(', ')}`
      });
    }

    // Cập nhật trong database
    const updated = await updateMatchStatus(matchId, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }

    res.json({
      success: true,
      message: `Đã cập nhật status thành ${status}`
    });

  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/matches/:matchId/questions
 * Xóa câu hỏi
 */
router.delete('/matches/:matchId/questions', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { section, playerIndex, order } = req.body;

    if (!section || order === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin section hoặc order'
      });
    }

    // Lấy match từ database
    const matchRecord = await getMatchById(matchId);

    if (!matchRecord) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }

    // Xóa câu hỏi từ match.json
    await deleteQuestionFromDataNode(
      matchRecord.data_node_id,
      matchId,
      section,
      playerIndex ? parseInt(playerIndex) : null,
      parseInt(order)
    );

    res.json({
      success: true,
      message: 'Đã xóa câu hỏi thành công'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

