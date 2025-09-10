import express from 'express';
import { pool } from '../db/index.js';
import { isUserAdmin } from '../db/users.js';

console.log('🚀 Loading tangtoc-admin-api.js routes...');

const router = express.Router();

// Middleware kiểm tra quyền admin
async function checkAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!req.session.user.id || isNaN(req.session.user.id)) {
    return res.status(401).json({ error: 'Invalid user ID in session' });
  }
  
  try {
    const isAdmin = await isUserAdmin(req.session.user.id);
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ===== TANGTOC QUESTION REPORTING ROUTES (Public) =====

// Test route
router.get('/tangtoc-test', (req, res) => {
  res.json({ message: 'TangToc API is working!' });
});

// Report tangtoc question (public route, no admin check)
router.post('/tangtoc-report-question', async (req, res) => {
  console.log('🔍 TangToc report route called!');
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Session user:', req.session?.user);
  
  if (!pool) {
    console.error('❌ Pool is not defined!');
    return res.status(500).json({ error: 'Database connection not available' });
  }
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      mode, 
      questionId, 
      questionText, 
      correctAnswer, 
      userAnswer, 
      sessionId, 
      roomId, 
      reportText, 
      suggestions = [] 
    } = req.body;
    
    // Validate required fields
    if (!mode || !questionText || !correctAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if there's either reportText or suggestions
    if (!reportText && (!suggestions || suggestions.length === 0)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get user ID from session (optional)
    const userId = req.session?.user?.id || null;
    
    // Insert report
    const insertReportQuery = `
      INSERT INTO tangtoc_question_reports 
      (user_id, session_id, room_id, mode, question_id, question_text, image_url, correct_answer, user_answer, report_text, accepted_answers, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `;
    
    // Extract image URL from question text if exists
    const imageUrlMatch = questionText.match(/<img[^>]+src="([^"]+)"/);
    const questionImageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
    const cleanQuestionText = questionText.replace(/<img[^>]*>/g, '').trim();
    
    // Prepare accepted answers as JSON
    const acceptedAnswers = suggestions.length > 0 ? JSON.stringify(suggestions) : null;
    
    // If no reportText but has suggestions, create a default reportText
    const finalReportText = reportText || (suggestions.length > 0 ? `Đề xuất đáp án: ${suggestions.join(' | ')}` : '');
    
    const [result] = await connection.execute(insertReportQuery, [
      userId || null,
      sessionId || null,
      roomId || null,
      mode,
      questionId || null,
      cleanQuestionText,
      questionImageUrl || null,
      correctAnswer,
      userAnswer || null,
      finalReportText,
      acceptedAnswers || null
    ]);
    
    const reportId = result.insertId;
    
    // Insert answer suggestions if any
    if (suggestions.length > 0) {
      for (const suggestion of suggestions) {
        await connection.execute(
          'INSERT INTO tangtoc_answer_suggestions (report_id, question_id, user_id, suggested_answer) VALUES (?, ?, ?, ?)',
          [reportId, questionId || null, userId || null, suggestion]
        );
      }
    }
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Đã gửi báo lỗi câu hỏi Tăng Tốc thành công',
      reportId 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error reporting tangtoc question:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Áp dụng middleware admin CHỈ cho các nhóm route quản trị, tránh chặn toàn bộ /api
router.use('/tangtoc-reports', checkAdmin);
router.use('/tangtoc-reports/:id', checkAdmin);
router.use('/tangtoc-reports/:id/approve', checkAdmin);
router.use('/tangtoc-reports/:id/reject', checkAdmin);
router.use('/tangtoc-suggestions', checkAdmin);
router.use('/tangtoc-suggestions/:id', checkAdmin);
router.use('/tangtoc-question-logs', checkAdmin);
router.use('/tangtoc-question-logs/:id', checkAdmin);
router.use('/tangtoc-question-logs/:id/restore', checkAdmin);
router.use('/tangtoc-question-logs/:id/permanently-delete', checkAdmin);

// ===== TANGTOC QUESTION REPORTS ROUTES =====

// Get all tangtoc question reports with pagination
router.get('/tangtoc-reports', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (status) {
      whereClause = 'WHERE tr.status = ?';
      params.push(status);
    }
    
    // Get reports with user info
    const reportsQuery = `
      SELECT tr.*, u.username as user_username
      FROM tangtoc_question_reports tr
      LEFT JOIN users u ON tr.user_id = u.id
      ${whereClause}
      ORDER BY tr.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    
    const [reports] = await pool.execute(reportsQuery, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tangtoc_question_reports tr
      ${whereClause}
    `;
    
    const countParams = status ? [status] : [];
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tangtoc reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single tangtoc question report with suggestions
router.get('/tangtoc-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get report with user info
    const reportQuery = `
      SELECT tr.*, u.username as user_username
      FROM tangtoc_question_reports tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.id = ?
    `;
    
    const [reports] = await pool.execute(reportQuery, [id]);
    
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const report = reports[0];
    
    // Get suggestions for this report
    const suggestionsQuery = `
      SELECT tas.*, u.username as user_username
      FROM tangtoc_answer_suggestions tas
      LEFT JOIN users u ON tas.user_id = u.id
      WHERE tas.report_id = ?
      ORDER BY tas.created_at DESC
    `;
    
    const [suggestions] = await pool.execute(suggestionsQuery, [id]);
    report.suggestions = suggestions;
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching tangtoc report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve tangtoc report and add question to database
router.post('/tangtoc-reports/:id/approve', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Get report details
    const [reports] = await connection.execute(
      'SELECT * FROM tangtoc_question_reports WHERE id = ?',
      [id]
    );
    
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const report = reports[0];
    
    // Add question to tangtoc questions table
    const insertQuestionQuery = `
      INSERT INTO questions (question_number, text, answer, image_url, category, difficulty, time_limit, created_by)
      VALUES (?, ?, ?, ?, 'tangtoc', 'medium', ?, ?)
    `;
    
    const timeLimit = report.question_number == 1 ? 10 : 
                     report.question_number == 2 ? 20 : 
                     report.question_number == 3 ? 30 : 
                     report.question_number == 4 ? 40 : 30;
    
    const [result] = await connection.execute(insertQuestionQuery, [
      report.question_number || null,
      report.question_text,
      report.correct_answer,
      report.image_url || null,
      timeLimit,
      req.session.user.id
    ]);
    
    const questionId = result.insertId;
    
    // Add accepted answers if any
    if (report.accepted_answers) {
      const acceptedAnswers = JSON.parse(report.accepted_answers);
        for (const answer of acceptedAnswers) {
          await connection.execute(
            'INSERT INTO tangtoc_answers (question_id, answer) VALUES (?, ?)',
            [questionId, answer]
          );
      }
    }
    
    // Update report status
    await connection.execute(
      'UPDATE tangtoc_question_reports SET status = "resolved", resolved_at = NOW() WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Đã duyệt báo lỗi và thêm câu hỏi vào database Tăng Tốc',
      questionId 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving tangtoc report:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Reject tangtoc report
router.post('/tangtoc-reports/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute(
      'UPDATE tangtoc_question_reports SET status = "resolved", resolved_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: 'Đã từ chối báo lỗi' });
  } catch (error) {
    console.error('Error rejecting tangtoc report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TANGTOC ANSWER SUGGESTIONS ROUTES =====

// Approve tangtoc answer suggestion
router.post('/tangtoc-suggestions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update suggestion status
    await pool.execute(
      'UPDATE tangtoc_answer_suggestions SET status = "approved", updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: 'Đã duyệt đề xuất đáp án' });
  } catch (error) {
    console.error('Error approving tangtoc suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject tangtoc answer suggestion
router.post('/tangtoc-suggestions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update suggestion status
    await pool.execute(
      'UPDATE tangtoc_answer_suggestions SET status = "rejected", updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: 'Đã từ chối đề xuất đáp án' });
  } catch (error) {
    console.error('Error rejecting tangtoc suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TANGTOC QUESTION ACCEPTED ANSWERS ROUTES =====

// Get accepted answers for a tangtoc question
router.get('/tangtoc/questions/:id/answers', async (req, res) => {
  try {
    const { id } = req.params;
    
      const [answers] = await pool.execute(
        'SELECT * FROM tangtoc_answers WHERE question_id = ? ORDER BY id ASC',
        [id]
      );
    
    res.json(answers);
  } catch (error) {
    console.error('Error fetching tangtoc question answers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add accepted answer for a tangtoc question
router.post('/tangtoc/questions/:id/answers', async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    
    if (!answer || answer.trim() === '') {
      return res.status(400).json({ error: 'Answer is required' });
    }
    
    // Check if question exists and is tangtoc category
    const [questions] = await pool.execute(
      'SELECT id FROM questions WHERE id = ? AND category = "tangtoc"',
      [id]
    );
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Tangtoc question not found' });
    }
    
      // Add answer
      await pool.execute(
        'INSERT INTO tangtoc_answers (question_id, answer) VALUES (?, ?)',
        [id, answer.trim()]
      );
    
    res.json({ success: true, message: 'Đã thêm đáp án phụ thành công' });
  } catch (error) {
    console.error('Error adding tangtoc question answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete accepted answer for a tangtoc question
router.delete('/tangtoc/questions/:questionId/answers/:answerId', async (req, res) => {
  try {
    const { questionId, answerId } = req.params;
    
    // Check if question exists and is tangtoc category
    const [questions] = await pool.execute(
      'SELECT id FROM questions WHERE id = ? AND category = "tangtoc"',
      [questionId]
    );
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Tangtoc question not found' });
    }
    
      // Delete answer
      const [result] = await pool.execute(
        'DELETE FROM tangtoc_answers WHERE id = ? AND question_id = ?',
        [answerId, questionId]
      );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    res.json({ success: true, message: 'Đã xóa đáp án phụ thành công' });
  } catch (error) {
    console.error('Error deleting tangtoc question answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TANGTOC QUESTION DELETION LOGS ROUTES =====

// Get all tangtoc question deletion logs with pagination
router.get('/tangtoc-question-logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, canRestore = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (canRestore !== '') {
      whereClause = 'WHERE tqdl.can_restore = ?';
      params.push(canRestore === 'true');
    }
    
    // Get logs with user info
    const logsQuery = `
      SELECT tqdl.*, 
             u1.username as deleted_by_username,
             u2.username as restored_by_username,
             u3.username as question_creator_username
      FROM tangtoc_question_deletion_logs tqdl
      LEFT JOIN users u1 ON tqdl.deleted_by = u1.id
      LEFT JOIN users u2 ON tqdl.restored_by = u2.id
      LEFT JOIN users u3 ON tqdl.question_created_by = u3.id
      ${whereClause}
      ORDER BY tqdl.deleted_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    
    const [logs] = await pool.execute(logsQuery, params);
    
    // Get deleted answers for each log
    for (let log of logs) {
      const [answers] = await pool.execute(
        'SELECT * FROM deleted_tangtoc_question_answers WHERE log_id = ?',
        [log.id]
      );
      log.deleted_answers = answers;
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tangtoc_question_deletion_logs tqdl
      ${whereClause}
    `;
    
    const countParams = canRestore !== '' ? [canRestore === 'true'] : [];
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tangtoc question logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single tangtoc question deletion log
router.get('/tangtoc-question-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get log with user info
    const logQuery = `
      SELECT tqdl.*, 
             u1.username as deleted_by_username,
             u2.username as restored_by_username,
             u3.username as question_creator_username
      FROM tangtoc_question_deletion_logs tqdl
      LEFT JOIN users u1 ON tqdl.deleted_by = u1.id
      LEFT JOIN users u2 ON tqdl.restored_by = u2.id
      LEFT JOIN users u3 ON tqdl.question_created_by = u3.id
      WHERE tqdl.id = ?
    `;
    
    const [logs] = await pool.execute(logQuery, [id]);
    
    if (logs.length === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }
    
    const log = logs[0];
    
    // Get deleted answers
    const [answers] = await pool.execute(
      'SELECT * FROM deleted_tangtoc_question_answers WHERE log_id = ?',
      [id]
    );
    log.deleted_answers = answers;
    
    res.json(log);
  } catch (error) {
    console.error('Error fetching tangtoc question log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore tangtoc question from log
router.post('/tangtoc-question-logs/:id/restore', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Get log details
    const [logs] = await connection.execute(
      'SELECT * FROM tangtoc_question_deletion_logs WHERE id = ? AND can_restore = 1',
      [id]
    );
    
    if (logs.length === 0) {
      return res.status(404).json({ error: 'Log not found or cannot be restored' });
    }
    
    const log = logs[0];
    
    // Restore question
    const insertQuestionQuery = `
      INSERT INTO questions (question_number, text, answer, image_url, category, difficulty, time_limit, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const timeLimit = log.question_number == 1 ? 10 : 
                     log.question_number == 2 ? 20 : 
                     log.question_number == 3 ? 30 : 
                     log.question_number == 4 ? 40 : 30;
    
    const [result] = await connection.execute(insertQuestionQuery, [
      log.question_number,
      log.question_text,
      log.question_answer,
      log.question_image_url,
      log.question_category || 'tangtoc',
      log.question_difficulty || 'medium',
      timeLimit,
      log.question_created_by
    ]);
    
    const questionId = result.insertId;
    
    // Restore accepted answers
    const [deletedAnswers] = await connection.execute(
      'SELECT * FROM deleted_tangtoc_question_answers WHERE log_id = ?',
      [id]
    );
    
    for (const answer of deletedAnswers) {
      await connection.execute(
        'INSERT INTO answers (question_id, answer) VALUES (?, ?)',
        [questionId, answer.answer_text]
      );
    }
    
    // Update log status
    await connection.execute(
      'UPDATE tangtoc_question_deletion_logs SET can_restore = 0, restored_at = NOW(), restored_by = ? WHERE id = ?',
      [req.session.user.id, id]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Đã khôi phục câu hỏi Tăng Tốc thành công',
      questionId 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error restoring tangtoc question:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Permanently delete tangtoc question log
router.post('/tangtoc-question-logs/:id/permanently-delete', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Delete deleted answers first
    await connection.execute(
      'DELETE FROM deleted_tangtoc_question_answers WHERE log_id = ?',
      [id]
    );
    
    // Delete log
    await connection.execute(
      'DELETE FROM tangtoc_question_deletion_logs WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({ success: true, message: 'Đã xóa vĩnh viễn log thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Error permanently deleting tangtoc question log:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

export default router;
