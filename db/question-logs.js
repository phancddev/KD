import { pool } from './index.js';

// Ghi log khi xóa câu hỏi
export async function logQuestionDeletion({
  questionId,
  questionText,
  questionAnswer,
  questionCategory,
  questionDifficulty,
  questionCreatedBy,
  questionCreatedAt,
  deletedBy,
  deletionReason,
  reportId
}) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Ghi log chính
      const [logResult] = await connection.query(`
        INSERT INTO question_deletion_logs (
          question_id, question_text, question_answer, question_category, 
          question_difficulty, question_created_by, question_created_at,
          deleted_by, deletion_reason, report_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        questionId, questionText, questionAnswer, questionCategory,
        questionDifficulty, questionCreatedBy, questionCreatedAt,
        deletedBy, deletionReason, reportId
      ]);
      
      const logId = logResult.insertId;
      
      // Lưu các đáp án bổ sung nếu có
      const [answers] = await connection.query(
        'SELECT answer, created_at FROM answers WHERE question_id = ?',
        [questionId]
      );
      
      if (answers.length > 0) {
        for (const answer of answers) {
          await connection.query(`
            INSERT INTO deleted_question_answers (log_id, answer_text, created_at)
            VALUES (?, ?, ?)
          `, [logId, answer.answer, answer.created_at]);
        }
      }
      
      await connection.commit();
      return { success: true, logId };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Lỗi khi ghi log xóa câu hỏi:', error);
    throw error;
  }
}

// Lấy danh sách logs xóa câu hỏi
export async function getQuestionDeletionLogs({ page = 1, limit = 20, canRestore = null }) {
  try {
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (canRestore !== null) {
      whereClause = 'WHERE can_restore = ?';
      params.push(canRestore);
    }
    
    const [logs] = await pool.query(`
      SELECT 
        qdl.*,
        u1.username as deleted_by_username,
        u2.username as restored_by_username,
        u3.username as question_creator_username
      FROM question_deletion_logs qdl
      LEFT JOIN users u1 ON qdl.deleted_by = u1.id
      LEFT JOIN users u2 ON qdl.restored_by = u2.id
      LEFT JOIN users u3 ON qdl.question_created_by = u3.id
      ${whereClause}
      ORDER BY qdl.deleted_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM question_deletion_logs ${whereClause}
    `, params);
    
    const total = countResult[0].total;
    
    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
  } catch (error) {
    console.error('Lỗi khi lấy logs xóa câu hỏi:', error);
    throw error;
  }
}

// Lấy chi tiết log xóa câu hỏi
export async function getQuestionDeletionLog(logId) {
  try {
    const [logs] = await pool.query(`
      SELECT 
        qdl.*,
        u1.username as deleted_by_username,
        u2.username as restored_by_username,
        u3.username as question_creator_username
      FROM question_deletion_logs qdl
      LEFT JOIN users u1 ON qdl.deleted_by = u1.id
      LEFT JOIN users u2 ON qdl.restored_by = u2.id
      LEFT JOIN users u3 ON qdl.question_created_by = u3.id
      WHERE qdl.id = ?
    `, [logId]);
    
    if (logs.length === 0) {
      return null;
    }
    
    const log = logs[0];
    
    // Lấy các đáp án bổ sung đã bị xóa
    const [answers] = await pool.query(`
      SELECT answer_text, created_at FROM deleted_question_answers 
      WHERE log_id = ?
    `, [logId]);
    
    log.deleted_answers = answers;
    
    return log;
    
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết log xóa câu hỏi:', error);
    throw error;
  }
}

// Khôi phục câu hỏi từ log
export async function restoreQuestionFromLog(logId, restoredBy) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Lấy thông tin log
      const [logs] = await connection.query(
        'SELECT * FROM question_deletion_logs WHERE id = ? AND can_restore = TRUE',
        [logId]
      );
      
      if (logs.length === 0) {
        throw new Error('Log không tồn tại hoặc không thể khôi phục');
      }
      
      const log = logs[0];
      
      // Kiểm tra xem câu hỏi đã tồn tại chưa
      const [existingQuestions] = await connection.query(
        'SELECT id FROM questions WHERE id = ?',
        [log.question_id]
      );
      
      if (existingQuestions.length > 0) {
        throw new Error('Câu hỏi đã tồn tại trong database');
      }
      
      // Khôi phục câu hỏi
      const [questionResult] = await connection.query(`
        INSERT INTO questions (
          id, text, answer, category, difficulty, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        log.question_id, log.question_text, log.question_answer,
        log.question_category, log.question_difficulty,
        log.question_created_by, log.question_created_at
      ]);
      
      // Khôi phục các đáp án bổ sung
      const [deletedAnswers] = await connection.query(`
        SELECT answer_text, created_at FROM deleted_question_answers 
        WHERE log_id = ?
      `, [logId]);
      
      for (const answer of deletedAnswers) {
        await connection.query(`
          INSERT INTO answers (question_id, answer_text, created_at)
          VALUES (?, ?, ?)
        `, [log.question_id, answer.answer_text, answer.created_at]);
      }
      
      // Cập nhật trạng thái log
      await connection.query(`
        UPDATE question_deletion_logs 
        SET can_restore = FALSE, restored_at = NOW(), restored_by = ?
        WHERE id = ?
      `, [restoredBy, logId]);
      
      await connection.commit();
      return { success: true, questionId: log.question_id };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Lỗi khi khôi phục câu hỏi:', error);
    throw error;
  }
}

// Xóa vĩnh viễn log (không thể khôi phục)
export async function permanentlyDeleteLog(logId) {
  try {
    const [result] = await pool.query(`
      UPDATE question_deletion_logs 
      SET can_restore = FALSE 
      WHERE id = ?
    `, [logId]);
    
    return result.affectedRows > 0;
    
  } catch (error) {
    console.error('Lỗi khi xóa vĩnh viễn log:', error);
    throw error;
  }
}
