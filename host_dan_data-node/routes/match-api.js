/**
 * API Routes cho quản lý Matches - Version 2.1
 *
 * NGUYÊN TẮC THIẾT KẾ:
 * - KD Server: CHỈ lưu metadata mapping (match_id → data_node_id) trong bảng matches
 * - Data Node: Lưu TẤT CẢ dữ liệu trận đấu (match.json + media files)
 * - KD Server: CHỈ đọc và stream từ Data Node, KHÔNG lưu questions/participants/results
 *
 * LƯU Ý:
 * - Khi Data Node offline → Không thể truy cập dữ liệu trận đấu (ĐÚNG theo thiết kế)
 * - Tất cả operations (thêm/sửa/xóa câu hỏi) đều gọi trực tiếp tới Data Node
 * - KD Server chỉ là proxy/coordinator, KHÔNG lưu trữ dữ liệu game
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import {
  createMatch,
  getMatchById,
  getAllMatches,
  updateMatchStatus,
  deleteMatch,
  generateMatchCode,
  generateMatchId
} from '../db/matches.js';
import { getOnlineDataNodes } from '../db/data-nodes.js';
import { sendFileToDataNode } from '../socket/data-node-server.js';
import {
  createMatchOnDataNode,
  getMatchFromDataNode,
  addQuestionToDataNode,
  deleteQuestionFromDataNode,
  deleteMatchFromDataNode,
  assignPlayerToQuestion
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
 * Handler function cho tạo trận đấu
 */
async function handleCreateMatch(req, res) {
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

    // Kiểm tra có Data Node online không
    const onlineNodes = await getOnlineDataNodes();

    console.log(`📊 Số Data Nodes online: ${onlineNodes.length}`);
    if (onlineNodes.length > 0) {
      console.log(`   Online nodes:`, onlineNodes.map(n => `${n.name} (ID: ${n.id})`));
    }

    if (onlineNodes.length === 0) {
      console.error('❌ KHÔNG THỂ TẠO TRẬN ĐẤU: Không có Data Node nào online!');
      return res.status(400).json({
        success: false,
        error: 'Không thể tạo trận đấu: Không có Data Node nào đang online. Vui lòng khởi động ít nhất 1 Data Node trước.'
      });
    }

    const selectedNode = onlineNodes.find(node => node.id === parseInt(dataNodeId));

    if (!selectedNode) {
      console.error(`❌ Data Node ID ${dataNodeId} không tồn tại hoặc đang offline`);
      return res.status(400).json({
        success: false,
        error: `Data Node không tồn tại hoặc đang offline. Vui lòng chọn một trong ${onlineNodes.length} node(s) đang online.`
      });
    }

    console.log(`✅ Data Node được chọn: ${selectedNode.name} (ID: ${selectedNode.id}, Host: ${selectedNode.host}:${selectedNode.port})`)

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
}

/**
 * POST /api/matches
 * Tạo trận đấu mới (RESTful endpoint)
 */
router.post('/matches', requireAdmin, handleCreateMatch);

/**
 * POST /api/matches/create
 * Tạo trận đấu mới (legacy endpoint)
 */
router.post('/matches/create', requireAdmin, handleCreateMatch);

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

    // Chuẩn hóa response: chuyển snake_case sang camelCase cho frontend
    const normalizedMatches = matches.map(match => ({
      id: match.id,
      code: match.match_code,
      name: match.match_name,
      host_username: match.created_by,
      data_node_name: match.data_node_name,
      data_node_status: match.data_node_status,
      status: match.status,
      created_at: match.created_at,
      updated_at: match.updated_at,
      // Giữ nguyên các field gốc để backward compatible
      match_id: match.match_id,
      match_code: match.match_code,
      match_name: match.match_name,
      data_node_id: match.data_node_id,
      storage_folder: match.storage_folder
    }));

    res.json({
      success: true,
      data: normalizedMatches
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

    console.log(`📖 Đang lấy thông tin trận đấu: ${matchId}`);

    // Lấy metadata từ database
    const matchRecord = await getMatchById(matchId);

    if (!matchRecord) {
      console.error(`❌ Trận đấu không tồn tại trong database: ${matchId}`);
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }

    console.log(`✅ Tìm thấy metadata trong database:`);
    console.log(`   Match ID: ${matchRecord.match_id}`);
    console.log(`   Match Code: ${matchRecord.match_code}`);
    console.log(`   Match Name: ${matchRecord.match_name}`);
    console.log(`   Data Node ID: ${matchRecord.data_node_id}`);
    console.log(`   Data Node Name: ${matchRecord.data_node_name || 'N/A'}`);
    console.log(`   Storage Folder: ${matchRecord.storage_folder}`);
    console.log(`   Status: ${matchRecord.status}`);

    // Lấy match.json từ Data Node
    try {
      console.log(`📡 Đang đọc match.json từ Data Node ${matchRecord.data_node_id}...`);
      const matchData = await getMatchFromDataNode(matchRecord.data_node_id, matchId);

      console.log(`✅ Đã đọc match.json thành công từ Data Node ${matchRecord.data_node_id}`);
      console.log(`   Total questions: ${matchData.statistics?.total_questions || 0}`);
      console.log(`   Total media files: ${matchData.statistics?.total_media_files || 0}`);

      res.json({
        success: true,
        data: {
          ...matchRecord,
          ...matchData,
          _node_info: {
            node_id: matchRecord.data_node_id,
            node_name: matchRecord.data_node_name,
            storage_folder: matchRecord.storage_folder
          }
        }
      });

    } catch (dataNodeError) {
      console.error(`❌ Lỗi khi đọc match.json từ Data Node ${matchRecord.data_node_id}:`, dataNodeError.message);

      // Trả về ít nhất metadata từ database
      res.json({
        success: true,
        data: {
          ...matchRecord,
          _node_info: {
            node_id: matchRecord.data_node_id,
            node_name: matchRecord.data_node_name,
            storage_folder: matchRecord.storage_folder,
            error: 'Không thể đọc match.json từ Data Node'
          }
        },
        warning: 'Không thể đọc match.json từ Data Node. Data Node có thể đang offline.'
      });
    }

  } catch (error) {
    console.error('❌ Error getting match:', error);
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
      console.log(`📤 Uploading file to Data Node: ${req.file.originalname} (${req.file.size} bytes)`);
      console.log(`   Temp file: ${req.file.path}`);

      try {
        // Đọc file từ temp
        const fileBuffer = await fs.readFile(req.file.path);
        const fileBase64 = fileBuffer.toString('base64');

        console.log(`   Converted to base64: ${fileBase64.length} chars`);

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

        console.log(`✅ File uploaded to Data Node successfully`);
        console.log(`   Stream URL: ${uploadResult.streamUrl}`);

        // Extract filename from stream URL
        const urlParts = uploadResult.streamUrl.split('/');
        mediaFile = urlParts[urlParts.length - 1];
        mediaSize = req.file.size;

      } finally {
        // QUAN TRỌNG: Luôn xóa file tạm, kể cả khi có lỗi
        try {
          await fs.unlink(req.file.path);
          console.log(`🗑️  Deleted temp file: ${req.file.path}`);
        } catch (unlinkError) {
          console.error(`⚠️  Could not delete temp file ${req.file.path}:`, unlinkError.message);
        }
      }
    }
    
    // Parse playerIndex correctly (handle "0" as valid value)
    let parsedPlayerIndex = null;
    if (playerIndex !== undefined && playerIndex !== null && playerIndex !== '') {
      parsedPlayerIndex = parseInt(playerIndex);
    }

    console.log(`📝 Question data:`, {
      section,
      playerIndex: parsedPlayerIndex,
      questionOrder: parseInt(questionOrder),
      questionText,
      answerText
    });

    // ✅ VALIDATION: Kiểm tra số lượng câu hỏi hiện tại
    try {
      const matchData = await getMatchFromDataNode(matchRecord.data_node_id, matchId);

      // Cấu hình giới hạn cho từng section
      const SECTION_LIMITS = {
        'khoi_dong_rieng': { questionsPerPlayer: 6, hasPlayers: true },
        've_dich': { questionsPerPlayer: 3, hasPlayers: true },
        'khoi_dong_chung': { totalQuestions: 12, hasPlayers: false },
        'vcnv': { totalQuestions: 6, hasPlayers: false },
        'tang_toc': { totalQuestions: 4, hasPlayers: false }
      };

      const limit = SECTION_LIMITS[section];

      if (!limit) {
        return res.status(400).json({
          success: false,
          error: `Section không hợp lệ: ${section}`
        });
      }

      // Kiểm tra cho sections có players (Khởi Động Riêng, Về Đích)
      if (limit.hasPlayers) {
        if (parsedPlayerIndex === null || parsedPlayerIndex === undefined) {
          return res.status(400).json({
            success: false,
            error: `Section ${section} yêu cầu playerIndex`
          });
        }

        const player = matchData.sections[section]?.players?.find(
          p => p.player_index === parsedPlayerIndex
        );

        const currentCount = player?.questions?.length || 0;

        if (currentCount >= limit.questionsPerPlayer) {
          return res.status(400).json({
            success: false,
            error: `Thí sinh ${parsedPlayerIndex + 1} đã đủ ${limit.questionsPerPlayer} câu hỏi rồi! Không thể thêm nữa.`,
            currentCount,
            maxCount: limit.questionsPerPlayer
          });
        }

        // ✅ VALIDATION: Kiểm tra order không trùng
        const existingOrders = player?.questions?.map(q => q.order) || [];
        if (existingOrders.includes(parseInt(questionOrder))) {
          return res.status(400).json({
            success: false,
            error: `Câu hỏi order ${questionOrder} đã tồn tại cho thí sinh ${parsedPlayerIndex + 1}. Vui lòng chọn order khác.`,
            existingOrders
          });
        }

        console.log(`✅ Validation passed: Player ${parsedPlayerIndex} has ${currentCount}/${limit.questionsPerPlayer} questions`);

      } else {
        // Kiểm tra cho sections không có players
        const currentCount = matchData.sections[section]?.questions?.length || 0;

        if (currentCount >= limit.totalQuestions) {
          return res.status(400).json({
            success: false,
            error: `Section ${section} đã đủ ${limit.totalQuestions} câu hỏi rồi! Không thể thêm nữa.`,
            currentCount,
            maxCount: limit.totalQuestions
          });
        }

        // ✅ VALIDATION: Kiểm tra order không trùng
        const existingOrders = matchData.sections[section]?.questions?.map(q => q.order) || [];
        if (existingOrders.includes(parseInt(questionOrder))) {
          return res.status(400).json({
            success: false,
            error: `Câu hỏi order ${questionOrder} đã tồn tại trong section ${section}. Vui lòng chọn order khác.`,
            existingOrders
          });
        }

        console.log(`✅ Validation passed: Section ${section} has ${currentCount}/${limit.totalQuestions} questions`);
      }

    } catch (validationError) {
      console.error('⚠️  Validation error:', validationError.message);
      // Nếu không đọc được match.json, vẫn cho phép upload (Data Node có thể đang khởi tạo)
      console.warn('⚠️  Skipping validation due to error reading match.json');
    }

    // Thêm câu hỏi vào match.json
    const question = await addQuestionToDataNode(matchRecord.data_node_id, matchId, {
      section,
      playerIndex: parsedPlayerIndex,
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
 * PUT /api/matches/:matchId/questions/assign-player
 * Gán câu hỏi cho thí sinh khác
 */
router.put('/matches/:matchId/questions/assign-player', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { section, currentPlayerIndex, questionOrder, newPlayerIndex } = req.body;

    if (!section || questionOrder === undefined || newPlayerIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin section, questionOrder hoặc newPlayerIndex'
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

    // Parse indices
    const parsedCurrentPlayerIndex = currentPlayerIndex !== undefined && currentPlayerIndex !== null && currentPlayerIndex !== ''
      ? parseInt(currentPlayerIndex)
      : null;
    const parsedNewPlayerIndex = parseInt(newPlayerIndex);
    const parsedQuestionOrder = parseInt(questionOrder);

    console.log(`🔄 Assigning question:`, {
      section,
      currentPlayerIndex: parsedCurrentPlayerIndex,
      questionOrder: parsedQuestionOrder,
      newPlayerIndex: parsedNewPlayerIndex
    });

    // Gọi Data Node để update
    const question = await assignPlayerToQuestion(
      matchRecord.data_node_id,
      matchId,
      section,
      parsedCurrentPlayerIndex,
      parsedQuestionOrder,
      parsedNewPlayerIndex
    );

    res.json({
      success: true,
      data: question,
      message: 'Đã gán câu hỏi cho thí sinh mới'
    });

  } catch (error) {
    console.error('Error assigning player:', error);
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

    // Parse playerIndex correctly (handle "0" as valid value)
    let parsedPlayerIndex = null;
    if (playerIndex !== undefined && playerIndex !== null && playerIndex !== '') {
      parsedPlayerIndex = parseInt(playerIndex);
    }

    console.log(`🗑️  Deleting question:`, {
      section,
      playerIndex: parsedPlayerIndex,
      order: parseInt(order)
    });

    // Xóa câu hỏi từ match.json
    await deleteQuestionFromDataNode(
      matchRecord.data_node_id,
      matchId,
      section,
      parsedPlayerIndex,
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

