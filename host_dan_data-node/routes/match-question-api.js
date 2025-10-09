/**
 * API routes cho quản lý câu hỏi trận đấu
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../db/index.js';
import { uploadFileToDataNode } from '../socket/data-node-server.js';
import {
  getMatchFromDataNode,
  addQuestionToDataNode,
  deleteQuestionFromDataNode,
  updateQuestionInDataNode
} from '../match-reader.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh hoặc video!'));
    }
  }
});

/**
 * Middleware kiểm tra quyền admin
 */
function requireAdmin(req, res, next) {
  // Temporary: Skip auth check for testing
  // TODO: Re-enable auth after testing
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const isAdmin = req.session.user.is_admin === 1 ||
                  req.session.user.is_admin === true ||
                  req.session.user.isAdmin === true;

  if (!isAdmin) {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
  }

  next();
}

/**
 * POST /api/matches/upload
 * Upload file (ảnh/video) lên data node
 */
router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { matchId, questionId } = req.body;
    const file = req.file;

    console.log('📤 [UPLOAD] Nhận request upload file:');
    console.log(`   matchId: ${matchId}`);
    console.log(`   fileName: ${file?.originalname}`);
    console.log(`   fileSize: ${file?.size} bytes`);

    if (!file) {
      return res.status(400).json({ error: 'Không có file được upload' });
    }

    if (!matchId) {
      return res.status(400).json({ error: 'Thiếu matchId' });
    }

    // Lấy thông tin match - Hỗ trợ cả INT id và VARCHAR match_id
    let query, params;
    if (typeof matchId === 'string' && matchId.includes('_')) {
      // matchId là VARCHAR (format: YYYYMMDD_CODE_Name)
      query = 'SELECT * FROM matches WHERE match_id = ?';
      params = [matchId];
      console.log(`   Query by match_id (VARCHAR): ${matchId}`);
    } else {
      // matchId là INT
      query = 'SELECT * FROM matches WHERE id = ?';
      params = [matchId];
      console.log(`   Query by id (INT): ${matchId}`);
    }

    const result = await pool.query(query, params);
    console.log(`   Query result:`, result);

    if (!result || !result[0] || result[0].length === 0) {
      console.error(`❌ [UPLOAD] Match not found: ${matchId}`);
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy trận đấu',
        details: `matchId: ${matchId}, query: ${query}`
      });
    }

    const matches = result[0];
    const match = matches[0];
    console.log(`   Found match: ${match.match_id} (DB ID: ${match.id})`);

    if (!match.data_node_id) {
      return res.status(400).json({ error: 'Trận đấu chưa có data node' });
    }

    if (!match.storage_folder) {
      return res.status(400).json({ error: 'Trận đấu chưa có storage folder' });
    }

    console.log(`   Uploading to Data Node ${match.data_node_id}, folder: ${match.storage_folder}`);

    // Upload file lên data node với storage_folder
    const uploadResult = await uploadFileToDataNode(
      match.data_node_id,
      file.buffer,
      file.originalname,
      file.mimetype,
      match.storage_folder // Use storage_folder instead of match_X
    );

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload thất bại');
    }

    console.log(`   Upload success: ${uploadResult.streamUrl}`);

    // Log upload - Sử dụng match.id (INT) cho foreign key
    try {
      await pool.query(
        `INSERT INTO match_upload_logs
         (match_id, data_node_id, file_name, file_type, file_size, storage_path, stream_url, upload_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'success')`,
        [
          match.id,  // Sử dụng INT id cho foreign key
          match.data_node_id,
          file.originalname,
          file.mimetype,
          file.size,
          uploadResult.storagePath,
          uploadResult.streamUrl
        ]
      );
    } catch (logError) {
      // Không fail upload nếu log thất bại
      console.warn(`⚠️  [UPLOAD] Không thể log upload (bỏ qua):`, logError.message);
    }

    console.log(`✅ [UPLOAD] Hoàn thành upload file: ${file.originalname}`);

    res.json({
      success: true,
      url: uploadResult.streamUrl,
      storagePath: uploadResult.storagePath,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype
    });

  } catch (error) {
    console.error('❌ [UPLOAD] Lỗi upload file:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/matches/questions/bulk
 * Lưu nhiều câu hỏi cùng lúc
 * ✅ GỬI TỚI DATA NODE (không lưu database)
 */
router.post('/questions/bulk', requireAdmin, async (req, res) => {
  try {
    const { matchId, questions } = req.body;

    console.log('📦 [BULK_ADD] Nhận request bulk add câu hỏi:');
    console.log(`   matchId: ${matchId}`);
    console.log(`   Số câu hỏi: ${questions?.length || 0}`);

    if (!matchId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }

    // Lấy metadata từ database để biết node nào
    const [matchRows] = await pool.query(
      'SELECT data_node_id, match_id, match_name FROM matches WHERE match_id = ?',
      [matchId]
    );

    if (matchRows.length === 0) {
      console.error(`❌ [BULK_ADD] Match not found: ${matchId}`);
      return res.status(404).json({
        error: `Trận đấu không tồn tại: ${matchId}`
      });
    }

    const matchRecord = matchRows[0];
    const dataNodeId = matchRecord.data_node_id;

    console.log(`   Match: ${matchRecord.match_name}`);
    console.log(`   Data Node ID: ${dataNodeId}`);

    // Gửi từng câu hỏi tới data node
    try {
      console.log(`📡 Đang gửi ${questions.length} câu hỏi tới Data Node ${dataNodeId}...`);

      let successCount = 0;
      const errors = [];

      for (const question of questions) {
        try {
          await addQuestionToDataNode(dataNodeId, matchId, {
            section: question.section,
            playerIndex: question.player_index !== null && question.player_index !== undefined
              ? parseInt(question.player_index)
              : null,
            order: parseInt(question.question_order),
            type: question.question_type || 'text',
            questionText: question.question_text || null,
            mediaFile: question.media_file || null,
            mediaSize: question.media_size || null,
            answer: question.answer_text,
            points: question.points || 10,
            timeLimit: question.time_limit || null
          });
          successCount++;
        } catch (err) {
          errors.push({
            question: question.question_order,
            error: err.message
          });
        }
      }

      console.log(`✅ [BULK_ADD] Đã thêm ${successCount}/${questions.length} câu hỏi vào match.json`);

      // Cập nhật status match
      await pool.query(
        'UPDATE matches SET status = ? WHERE match_id = ?',
        ['ready', matchId]
      );

      res.json({
        success: true,
        count: successCount,
        total: questions.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Đã lưu ${successCount}/${questions.length} câu hỏi vào match.json`,
        _source: 'data node'
      });

    } catch (dataNodeError) {
      console.error(`❌ [BULK_ADD] Không thể gửi tới Data Node:`, dataNodeError.message);

      return res.status(503).json({
        success: false,
        error: 'Không thể thêm câu hỏi',
        details: 'Data Node đang offline hoặc không phản hồi',
        node_id: dataNodeId,
        suggestion: 'Vui lòng kiểm tra Data Node và thử lại'
      });
    }

  } catch (error) {
    console.error('❌ [BULK_ADD] Lỗi lưu câu hỏi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/matches/questions
 * Tạo câu hỏi mới (add từng câu)
 * ✅ GỬI TỚI DATA NODE (không lưu database)
 */
router.post('/questions', requireAdmin, async (req, res) => {
  try {
    const questionData = req.body;

    console.log('📝 [ADD_QUESTION] Nhận request thêm câu hỏi:');
    console.log(`   match_id: ${questionData.match_id}`);
    console.log(`   section: ${questionData.section}`);
    console.log(`   question_order: ${questionData.question_order}`);
    console.log(`   question_type: ${questionData.question_type}`);
    console.log(`   question_text: ${questionData.question_text}`);
    console.log(`   answer_text: ${questionData.answer_text}`);

    // Lấy metadata từ database để biết node nào
    const [matchRows] = await pool.query(
      'SELECT data_node_id, match_id, match_name FROM matches WHERE match_id = ?',
      [questionData.match_id]
    );

    if (matchRows.length === 0) {
      console.error(`❌ [ADD_QUESTION] Match not found: ${questionData.match_id}`);
      return res.status(404).json({
        error: `Trận đấu không tồn tại: ${questionData.match_id}`
      });
    }

    const matchRecord = matchRows[0];
    const dataNodeId = matchRecord.data_node_id;
    const matchId = matchRecord.match_id;

    console.log(`   Match: ${matchRecord.match_name}`);
    console.log(`   Data Node ID: ${dataNodeId}`);

    // Gửi tới data node để lưu vào match.json
    try {
      console.log(`📡 Đang gửi câu hỏi tới Data Node ${dataNodeId}...`);

      const question = await addQuestionToDataNode(dataNodeId, matchId, {
        section: questionData.section,
        playerIndex: questionData.player_index !== null && questionData.player_index !== undefined
          ? parseInt(questionData.player_index)
          : null,
        order: parseInt(questionData.question_order),
        type: questionData.question_type || 'text',
        questionText: questionData.question_text || null,
        mediaFile: questionData.media_file || null,
        mediaSize: questionData.media_size || null,
        answer: questionData.answer_text,
        acceptedAnswers: questionData.accepted_answers || null, // Thêm accepted_answers
        points: questionData.points || 10,
        timeLimit: questionData.time_limit || null
      });

      console.log(`✅ [ADD_QUESTION] Đã thêm câu hỏi vào match.json thành công`);

      res.json({
        success: true,
        question: question,
        message: 'Đã thêm câu hỏi vào match.json',
        _source: 'data node'
      });

    } catch (dataNodeError) {
      console.error(`❌ [ADD_QUESTION] Không thể gửi tới Data Node:`, dataNodeError.message);

      return res.status(503).json({
        success: false,
        error: 'Không thể thêm câu hỏi',
        details: 'Data Node đang offline hoặc không phản hồi',
        node_id: dataNodeId,
        suggestion: 'Vui lòng kiểm tra Data Node và thử lại'
      });
    }

  } catch (error) {
    console.error('❌ [ADD_QUESTION] Lỗi tạo câu hỏi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Convert direct data node URL to proxy URL
 * Example: http://127.0.0.1:1024/stream/match_1/file.mp4
 *       -> /stream/1/match_1/file.mp4
 */
function convertToProxyUrl(directUrl, dataNodeId, matchId) {
  if (!directUrl) return null;

  try {
    // Parse URL để lấy path
    const url = new URL(directUrl);
    const pathParts = url.pathname.split('/').filter(p => p);

    // Format: /stream/matchId/fileName
    // Convert to: /stream/:nodeId/:matchFolder/:fileName
    if (pathParts[0] === 'stream' && pathParts.length >= 3) {
      const matchFolder = pathParts[1];
      const fileName = pathParts.slice(2).join('/');
      return `/stream/${dataNodeId}/${matchFolder}/${fileName}`;
    }

    // Nếu không match pattern, return original
    return directUrl;
  } catch (error) {
    console.error('Error converting URL:', error);
    return directUrl;
  }
}

/**
 * GET /api/matches/:matchId/questions
 * Lấy danh sách câu hỏi của trận đấu
 * ✅ ĐỌC TỪ match.json TRÊN DATA NODE (không dùng database)
 * ✅ CONVERT media_url từ direct URL sang proxy URL
 */
router.get('/:matchId/questions', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;

    console.log(`📖 [GET_QUESTIONS] Lấy danh sách câu hỏi cho match: ${matchId}`);

    // Lấy metadata từ database để biết node nào
    const [matchRows] = await pool.query(
      'SELECT data_node_id, match_id, match_name FROM matches WHERE match_id = ?',
      [matchId]
    );

    if (matchRows.length === 0) {
      console.error(`❌ [GET_QUESTIONS] Match not found: ${matchId}`);
      return res.status(404).json({
        error: `Trận đấu không tồn tại: ${matchId}`
      });
    }

    const matchRecord = matchRows[0];
    const dataNodeId = matchRecord.data_node_id;

    console.log(`   Match: ${matchRecord.match_name}`);
    console.log(`   Data Node ID: ${dataNodeId}`);

    // Đọc match.json từ data node
    try {
      console.log(`📡 Đang đọc match.json từ Data Node ${dataNodeId}...`);
      const matchData = await getMatchFromDataNode(dataNodeId, matchId);

      // Parse questions từ match.json
      const questions = [];

      for (const [sectionName, section] of Object.entries(matchData.sections)) {
        // Sections không có player_index (khoi_dong_chung, vcnv, tang_toc)
        if (section.questions && Array.isArray(section.questions)) {
          section.questions.forEach(q => {
            questions.push({
              section: sectionName,
              player_index: null,
              order: q.order,
              type: q.type,
              question_text: q.question_text,
              media_file: q.media_file || null,
              media_url: convertToProxyUrl(q.media_url, dataNodeId, matchId),
              media_size: q.media_size || null,
              answer: q.answer,
              points: q.points,
              time_limit: q.time_limit
            });
          });
        }

        // Sections có player_index (khoi_dong_rieng, ve_dich)
        if (section.players && Array.isArray(section.players)) {
          section.players.forEach(player => {
            if (player.questions && Array.isArray(player.questions)) {
              player.questions.forEach(q => {
                questions.push({
                  section: sectionName,
                  player_index: player.player_index,
                  order: q.order,
                  type: q.type,
                  question_text: q.question_text,
                  media_file: q.media_file || null,
                  media_url: convertToProxyUrl(q.media_url, dataNodeId, matchId),
                  media_size: q.media_size || null,
                  answer: q.answer,
                  points: q.points,
                  time_limit: q.time_limit
                });
              });
            }
          });
        }
      }

      console.log(`✅ [GET_QUESTIONS] Tìm thấy ${questions.length} câu hỏi từ match.json`);

      res.json({
        success: true,
        questions: questions,
        _source: 'match.json on data node'
      });

    } catch (dataNodeError) {
      console.error(`❌ [GET_QUESTIONS] Không thể đọc từ Data Node:`, dataNodeError.message);

      // Graceful degradation: Trả về error rõ ràng
      return res.status(503).json({
        success: false,
        error: 'Không thể truy cập dữ liệu câu hỏi',
        details: 'Data Node đang offline hoặc không phản hồi',
        node_id: dataNodeId,
        suggestion: 'Vui lòng kiểm tra Data Node và thử lại'
      });
    }

  } catch (error) {
    console.error('❌ [GET_QUESTIONS] Lỗi lấy câu hỏi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/matches/questions/:questionId
 * Lấy 1 câu hỏi
 */
router.get('/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;

    const [questions] = await pool.query(
      'SELECT * FROM match_questions WHERE id = ?',
      [questionId]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
    }

    res.json({
      success: true,
      question: questions[0]
    });

  } catch (error) {
    console.error('Lỗi lấy câu hỏi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/matches/:matchId/questions/update
 * Cập nhật câu hỏi trong match.json (qua Data Node)
 */
router.put('/:matchId/questions/update', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { section, playerIndex, order, questionData } = req.body;

    console.log('📝 [UPDATE_QUESTION] Nhận request cập nhật câu hỏi:');
    console.log(`   match_id: ${matchId}`);
    console.log(`   section: ${section}`);
    console.log(`   player_index: ${playerIndex}`);
    console.log(`   order: ${order}`);
    console.log(`   questionData:`, questionData);

    // Lấy metadata từ database
    const [matchRows] = await pool.query(
      'SELECT data_node_id, match_id, match_name FROM matches WHERE match_id = ?',
      [matchId]
    );

    if (matchRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Trận đấu không tồn tại'
      });
    }

    const match = matchRows[0];
    const dataNodeId = match.data_node_id;

    console.log(`   Data Node ID: ${dataNodeId}`);

    // Gọi Data Node để update question trong match.json
    await updateQuestionInDataNode(dataNodeId, matchId, {
      section,
      playerIndex: playerIndex !== null && playerIndex !== undefined ? parseInt(playerIndex) : null,
      order: parseInt(order),
      questionData: {
        type: questionData.type || 'text',
        question_text: questionData.question_text || null,
        answer: questionData.answer,
        accepted_answers: questionData.accepted_answers || null, // Thêm accepted_answers
        points: questionData.points || 10,
        time_limit: questionData.time_limit || null
      }
    });

    console.log('✅ Đã cập nhật câu hỏi trong match.json');

    res.json({
      success: true,
      message: 'Đã cập nhật câu hỏi trong match.json'
    });

  } catch (error) {
    console.error('❌ Lỗi cập nhật câu hỏi:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/matches/questions/:questionId
 * Cập nhật câu hỏi (legacy - update database)
 */
router.put('/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const questionData = req.body;

    await pool.query(
      `UPDATE match_questions
       SET question_type = ?, question_text = ?, media_url = ?,
           media_type = ?, answer_text = ?, points = ?, time_limit = ?
       WHERE id = ?`,
      [
        questionData.question_type,
        questionData.question_text,
        questionData.media_url,
        questionData.media_type,
        questionData.answer_text,
        questionData.points || 10,
        questionData.time_limit,
        questionId
      ]
    );

    res.json({
      success: true,
      message: 'Đã cập nhật câu hỏi'
    });

  } catch (error) {
    console.error('Lỗi cập nhật câu hỏi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/matches/:matchId/questions/:questionId
 * Xóa 1 câu hỏi
 */
router.delete('/:matchId/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { matchId, questionId } = req.params;

    console.log(`🗑️  [DELETE_QUESTION] Xóa câu hỏi ${questionId} từ match ${matchId}`);

    // Convert match_id (VARCHAR) sang matches.id (INT) nếu cần
    let matchDbId = matchId;

    if (typeof matchId === 'string' && matchId.includes('_')) {
      const [matchRows] = await pool.query(
        'SELECT id FROM matches WHERE match_id = ?',
        [matchId]
      );

      if (matchRows.length === 0) {
        console.error(`❌ [DELETE_QUESTION] Match not found: ${matchId}`);
        return res.status(404).json({
          error: `Trận đấu không tồn tại: ${matchId}`
        });
      }

      matchDbId = matchRows[0].id;
      console.log(`   Converted: "${matchId}" → ID ${matchDbId}`);
    }

    // Lấy thông tin câu hỏi
    const [questions] = await pool.query(
      'SELECT * FROM match_questions WHERE id = ? AND match_id = ?',
      [questionId, matchDbId]
    );

    if (questions.length === 0) {
      console.error(`❌ [DELETE_QUESTION] Question not found: ${questionId}`);
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
    }

    const question = questions[0];

    // Xóa file trên data node nếu có
    if (question.media_url) {
      console.log(`   TODO: Delete media file: ${question.media_url}`);
      // TODO: Implement delete file from data node
    }

    // Xóa câu hỏi
    await pool.query('DELETE FROM match_questions WHERE id = ?', [questionId]);

    console.log(`✅ [DELETE_QUESTION] Đã xóa câu hỏi ${questionId}`);

    res.json({
      success: true,
      message: 'Đã xóa câu hỏi'
    });

  } catch (error) {
    console.error('❌ [DELETE_QUESTION] Lỗi xóa câu hỏi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/matches/:matchId/summary
 * Lấy tóm tắt số lượng câu hỏi theo từng phần
 */
router.get('/:matchId/summary', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;

    console.log(`📊 [GET_SUMMARY] Lấy summary cho match: ${matchId}`);

    // Convert match_id (VARCHAR) sang matches.id (INT) nếu cần
    let matchDbId = matchId;

    if (typeof matchId === 'string' && matchId.includes('_')) {
      const [matchRows] = await pool.query(
        'SELECT id FROM matches WHERE match_id = ?',
        [matchId]
      );

      if (matchRows.length === 0) {
        console.error(`❌ [GET_SUMMARY] Match not found: ${matchId}`);
        return res.status(404).json({
          error: `Trận đấu không tồn tại: ${matchId}`
        });
      }

      matchDbId = matchRows[0].id;
      console.log(`   Converted: "${matchId}" → ID ${matchDbId}`);
    }

    const [summary] = await pool.query(
      `SELECT
         section,
         COUNT(*) as total,
         SUM(CASE WHEN question_type = 'text' THEN 1 ELSE 0 END) as text_count,
         SUM(CASE WHEN question_type = 'image' THEN 1 ELSE 0 END) as image_count,
         SUM(CASE WHEN question_type = 'video' THEN 1 ELSE 0 END) as video_count
       FROM match_questions
       WHERE match_id = ?
       GROUP BY section`,
      [matchDbId]
    );

    console.log(`✅ [GET_SUMMARY] Summary: ${summary.length} sections`);

    res.json({
      success: true,
      summary: summary
    });

  } catch (error) {
    console.error('❌ [GET_SUMMARY] Lỗi lấy summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

