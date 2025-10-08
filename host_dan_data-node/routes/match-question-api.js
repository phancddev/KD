/**
 * API routes cho quản lý câu hỏi trận đấu
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../db/index.js';
import { uploadFileToDataNode } from '../socket/data-node-server.js';

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
    
    if (!file) {
      return res.status(400).json({ error: 'Không có file được upload' });
    }
    
    if (!matchId) {
      return res.status(400).json({ error: 'Thiếu matchId' });
    }
    
    // Lấy thông tin match
    const [matches] = await pool.query(
      'SELECT * FROM matches WHERE id = ?',
      [matchId]
    );

    if (matches.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
    }

    const match = matches[0];

    if (!match.data_node_id) {
      return res.status(400).json({ error: 'Trận đấu chưa có data node' });
    }

    if (!match.storage_folder) {
      return res.status(400).json({ error: 'Trận đấu chưa có storage folder' });
    }

    console.log(`📤 Uploading file to Data Node folder: ${match.storage_folder}`);

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
    
    // Log upload
    await pool.query(
      `INSERT INTO match_upload_logs 
       (match_id, data_node_id, file_name, file_type, file_size, storage_path, stream_url, upload_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'success')`,
      [
        matchId,
        match.data_node_id,
        file.originalname,
        file.mimetype,
        file.size,
        uploadResult.storagePath,
        uploadResult.streamUrl
      ]
    );
    
    res.json({
      success: true,
      url: uploadResult.streamUrl,
      storagePath: uploadResult.storagePath,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype
    });
    
  } catch (error) {
    console.error('Lỗi upload file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/matches/questions/bulk
 * Lưu nhiều câu hỏi cùng lúc
 */
router.post('/questions/bulk', requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { matchId, questions } = req.body;
    
    if (!matchId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }
    
    await connection.beginTransaction();
    
    // Xóa câu hỏi cũ (nếu có)
    await connection.query('DELETE FROM match_questions WHERE match_id = ?', [matchId]);
    
    // Insert câu hỏi mới
    let insertCount = 0;
    for (const question of questions) {
      await connection.query(
        `INSERT INTO match_questions 
         (match_id, section, question_order, player_index, question_type, 
          question_text, media_url, media_type, answer_text, points, time_limit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matchId,
          question.section,
          question.question_order,
          question.player_index,
          question.question_type,
          question.question_text,
          question.media_url,
          question.media_type,
          question.answer_text,
          question.points || 10,
          question.time_limit
        ]
      );
      insertCount++;
    }
    
    // Cập nhật status match
    await connection.query(
      'UPDATE matches SET status = ? WHERE id = ?',
      ['ready', matchId]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      count: insertCount,
      message: `Đã lưu ${insertCount} câu hỏi`
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi lưu câu hỏi:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/matches/questions
 * Tạo câu hỏi mới (add từng câu)
 */
router.post('/questions', requireAdmin, async (req, res) => {
  try {
    const questionData = req.body;

    const [result] = await pool.query(
      `INSERT INTO match_questions
       (match_id, section, question_order, player_index, question_type,
        question_text, media_url, media_type, answer_text, points, time_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        questionData.match_id,
        questionData.section,
        questionData.question_order,
        questionData.player_index,
        questionData.question_type,
        questionData.question_text,
        questionData.media_url,
        questionData.media_type,
        questionData.answer_text,
        questionData.points || 10,
        questionData.time_limit
      ]
    );

    res.json({
      success: true,
      questionId: result.insertId,
      message: 'Đã thêm câu hỏi'
    });

  } catch (error) {
    console.error('Lỗi tạo câu hỏi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/matches/:matchId/questions
 * Lấy danh sách câu hỏi của trận đấu
 */
router.get('/:matchId/questions', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;

    const [questions] = await pool.query(
      `SELECT * FROM match_questions
       WHERE match_id = ?
       ORDER BY section, player_index, question_order`,
      [matchId]
    );

    res.json({
      success: true,
      questions: questions
    });

  } catch (error) {
    console.error('Lỗi lấy câu hỏi:', error);
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
 * PUT /api/matches/questions/:questionId
 * Cập nhật câu hỏi
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
    
    // Lấy thông tin câu hỏi
    const [questions] = await pool.query(
      'SELECT * FROM match_questions WHERE id = ? AND match_id = ?',
      [questionId, matchId]
    );
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
    }
    
    const question = questions[0];
    
    // Xóa file trên data node nếu có
    if (question.media_url) {
      // TODO: Implement delete file from data node
    }
    
    // Xóa câu hỏi
    await pool.query('DELETE FROM match_questions WHERE id = ?', [questionId]);
    
    res.json({
      success: true,
      message: 'Đã xóa câu hỏi'
    });
    
  } catch (error) {
    console.error('Lỗi xóa câu hỏi:', error);
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
      [matchId]
    );
    
    res.json({
      success: true,
      summary: summary
    });
    
  } catch (error) {
    console.error('Lỗi lấy summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

