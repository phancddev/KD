import express from 'express';
import { pool } from '../db/index.js';

console.log('🚀 Loading tangtoc-reports.js routes...');

const router = express.Router();

// ===== TANGTOC QUESTION REPORTING ROUTES (Public) =====

// Test route
router.get('/tangtoc-test', (req, res) => {
  console.log('🔍 TangToc test route called!');
  res.json({ message: 'TangToc Reports API is working!' });
});

// Report tangtoc question (public route, no admin check)
router.post('/tangtoc-report-question', async (req, res) => {
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
    if (!mode || !questionText || !correctAnswer || !reportText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get user ID from session (optional)
    const userId = req.session?.user?.id || null;
    
    // Insert report
    const insertReportQuery = `
      INSERT INTO tangtoc_question_reports 
      (user_id, session_id, room_id, mode, question_id, question_text, question_image_url, correct_answer, user_answer, report_text, accepted_answers, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `;
    
    // Extract image URL from question text if exists
    const imageUrlMatch = questionText.match(/<img[^>]+src="([^"]+)"/);
    const questionImageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
    const cleanQuestionText = questionText.replace(/<img[^>]*>/g, '').trim();
    
    // Prepare accepted answers as JSON
    const acceptedAnswers = suggestions.length > 0 ? JSON.stringify(suggestions) : null;
    
    const [result] = await connection.execute(insertReportQuery, [
      userId,
      sessionId,
      roomId,
      mode,
      questionId,
      cleanQuestionText,
      questionImageUrl,
      correctAnswer,
      userAnswer,
      reportText,
      acceptedAnswers
    ]);
    
    const reportId = result.insertId;
    
    // Insert answer suggestions if any
    if (suggestions.length > 0) {
      for (const suggestion of suggestions) {
        await connection.execute(
          'INSERT INTO tangtoc_answer_suggestions (report_id, question_id, user_id, suggested_answer) VALUES (?, ?, ?, ?)',
          [reportId, questionId, userId, suggestion]
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

export default router;
