/**
 * API Routes cho quản lý Matches
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  createMatch,
  getMatchById,
  getMatchByCode,
  getAllMatches,
  updateMatch,
  deleteMatch,
  addParticipant,
  getMatchParticipants,
  removeParticipant,
  getParticipantCount
} from '../db/matches.js';
import { createFolderOnDataNode } from '../socket/data-node-server.js';
import {
  addMatchQuestion,
  addMultipleQuestions,
  getMatchQuestions,
  getQuestionsBySection,
  updateQuestion,
  deleteQuestion,
  deleteQuestionsBySection,
  validateMatchStructure
} from '../db/match-questions.js';
import { getOnlineDataNodes } from '../db/data-nodes.js';
import { sendFileToDataNode } from '../socket/data-node-server.js';

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
  console.log('🔍 requireAdmin (match-api) - Session user:', req.session.user);

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
 * GET /api/matches
 * Lấy danh sách trận đấu
 */
router.get('/matches', requireAdmin, async (req, res) => {
  try {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.hostUserId) {
      filters.hostUserId = req.query.hostUserId;
    }
    
    const matches = await getAllMatches(filters);
    
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
 * GET /api/matches/:id
 * Lấy chi tiết trận đấu
 */
router.get('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const match = await getMatchById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }
    
    // Lấy thêm thông tin participants và questions
    const participants = await getMatchParticipants(match.id);
    const questions = await getMatchQuestions(match.id);
    const validation = await validateMatchStructure(match.id);
    
    res.json({
      success: true,
      data: {
        ...match,
        participants,
        questions,
        validation
      }
    });
  } catch (error) {
    console.error('Error getting match:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/matches
 * Tạo trận đấu mới
 */
router.post('/matches', requireAdmin, async (req, res) => {
  try {
    const { name, dataNodeId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu tên trận đấu'
      });
    }

    // Validate Data Node is required
    if (!dataNodeId) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng chọn Data Node! Data Node là nơi lưu trữ file ảnh/video của trận đấu.'
      });
    }

    // Check if Data Node exists and is online
    const onlineNodes = await getOnlineDataNodes();
    const selectedNode = onlineNodes.find(node => node.id === parseInt(dataNodeId));

    if (!selectedNode) {
      return res.status(400).json({
        success: false,
        error: 'Data Node không tồn tại hoặc đang offline. Vui lòng chọn Data Node khác.'
      });
    }

    // Additional check: verify data node is actually connected
    if (selectedNode.status !== 'online') {
      return res.status(400).json({
        success: false,
        error: `Data Node "${selectedNode.name}" đang offline. Vui lòng đợi data node online hoặc chọn data node khác.`
      });
    }

    // Create match in database
    const match = await createMatch(name, req.session.user.id, dataNodeId);

    // Create folder on Data Node (with retry)
    let folderCreated = false;
    let folderError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📁 [Attempt ${attempt}/3] Creating folder on Data Node: ${match.storage_folder}`);
        await createFolderOnDataNode(dataNodeId, match.storage_folder);
        console.log(`✅ Folder created successfully: ${match.storage_folder}`);
        folderCreated = true;
        break;
      } catch (error) {
        folderError = error;
        console.error(`❌ [Attempt ${attempt}/3] Failed to create folder:`, error.message);

        if (attempt < 3) {
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // If folder creation failed after all retries, warn but don't fail
    if (!folderCreated) {
      console.error('⚠️ WARNING: Could not create folder after 3 attempts:', folderError?.message);
      console.error('⚠️ Folder will be created automatically when first file is uploaded');
    }

    res.json({
      success: true,
      data: match,
      folderCreated: folderCreated,
      message: `Đã tạo trận đấu thành công với Data Node: ${selectedNode.name}${!folderCreated ? ' (Folder sẽ được tạo khi upload file đầu tiên)' : ''}`
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/matches/:id
 * Cập nhật trận đấu
 */
router.put('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const { name, status, dataNodeId } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (status) updates.status = status;
    if (dataNodeId !== undefined) updates.data_node_id = dataNodeId;
    
    const match = await updateMatch(req.params.id, updates);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }
    
    res.json({
      success: true,
      data: match,
      message: 'Đã cập nhật trận đấu thành công'
    });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/matches/:id
 * Xóa trận đấu
 */
router.delete('/matches/:id', requireAdmin, async (req, res) => {
  try {
    await deleteMatch(req.params.id);
    
    res.json({
      success: true,
      message: 'Đã xóa trận đấu thành công'
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
 * POST /api/matches/:id/upload
 * Upload file (text/image/video) cho câu hỏi
 */
router.post('/matches/:id/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const matchId = req.params.id;
    const { section, questionOrder, playerIndex, questionType, answerText, points, timeLimit, dataNodeId } = req.body;
    
    // Validate
    if (!section || questionOrder === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin section hoặc questionOrder'
      });
    }
    
    let mediaUrl = null;
    let mediaType = null;
    let questionText = req.body.questionText || null;
    
    // Nếu có file, upload lên data node
    if (req.file) {
      if (!dataNodeId) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng chọn data node để upload file'
        });
      }
      
      // Đọc file
      const fileBuffer = await fs.readFile(req.file.path);
      const fileBase64 = fileBuffer.toString('base64');
      
      // Gửi file tới data node
      const uploadResult = await sendFileToDataNode(parseInt(dataNodeId), {
        matchId: matchId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        fileData: fileBase64,
        section: section,
        questionOrder: questionOrder
      });
      
      mediaUrl = uploadResult.streamUrl;
      mediaType = req.file.mimetype;
      
      // Xóa file tạm
      await fs.unlink(req.file.path);
    }
    
    // Thêm câu hỏi vào database
    const question = await addMatchQuestion(matchId, {
      section,
      questionOrder: parseInt(questionOrder),
      playerIndex: playerIndex ? parseInt(playerIndex) : null,
      questionType: questionType || 'text',
      questionText,
      mediaUrl,
      mediaType,
      answerText,
      points: points ? parseInt(points) : 10,
      timeLimit: timeLimit ? parseInt(timeLimit) : null
    });
    
    res.json({
      success: true,
      data: question,
      message: 'Đã upload câu hỏi thành công'
    });
  } catch (error) {
    console.error('Error uploading question:', error);
    
    // Xóa file tạm nếu có lỗi
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        // Ignore
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/matches/:id/questions
 * Lấy danh sách câu hỏi của trận đấu
 */
router.get('/matches/:id/questions', requireAdmin, async (req, res) => {
  try {
    const section = req.query.section || null;
    const questions = await getMatchQuestions(req.params.id, section);
    
    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/matches/:id/validate
 * Kiểm tra cấu trúc trận đấu
 */
router.get('/matches/:id/validate', requireAdmin, async (req, res) => {
  try {
    const validation = await validateMatchStructure(req.params.id);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating match:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

