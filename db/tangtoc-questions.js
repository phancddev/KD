import { pool } from './index.js';

// =============================================
// CÂU HỎI TĂNG TỐC - HOÀN TOÀN RIÊNG BIỆT
// Tham khảo cách database khởi động xử lý nhiều đáp án
// =============================================

export async function createTangTocQuestion(questionData) {
  const { question_number, text, answer, accepted_answers, image_url, time_limit, created_by } = questionData;
  
  const [result] = await pool.query(
    `INSERT INTO tangtoc_questions (question_number, text, answer, image_url, time_limit, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      question_number,
      text,
      answer,
      image_url || null,
      time_limit,
      created_by || null
    ]
  );
  
  const questionId = result.insertId;
  
  // Thêm các đáp án chấp nhận nếu có (giống cách khởi động)
  if (accepted_answers && accepted_answers.length > 0) {
    for (const answerText of accepted_answers) {
      await pool.query(
        'INSERT INTO tangtoc_answers (question_id, answer) VALUES (?, ?)',
        [questionId, answerText]
      );
    }
  }
  
  return { id: questionId };
}

export async function getAllTangTocQuestions() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        q.*,
        u.username as created_by_username
      FROM tangtoc_questions q
      LEFT JOIN users u ON q.created_by = u.id
      ORDER BY q.question_number, q.created_at DESC
    `);
    
    // Lấy accepted answers cho tất cả câu hỏi (giống cách khởi động)
    const ids = rows.map(q => q.id);
    let answersMap = new Map();
    if (ids.length > 0) {
      const [ans] = await pool.query(`SELECT id, question_id, answer FROM tangtoc_answers WHERE question_id IN (${ids.map(() => '?').join(',')})`, ids);
      for (const r of ans) {
        if (!answersMap.has(r.question_id)) answersMap.set(r.question_id, []);
        answersMap.get(r.question_id).push({ id: r.id, answer: r.answer });
      }
    }
    
    return rows.map(question => ({
      id: question.id,
      question_number: question.question_number,
      text: question.text,
      answer: question.answer,
      image_url: question.image_url,
      time_limit: question.time_limit,
      created_by: question.created_by,
      created_by_username: question.created_by_username,
      created_at: question.created_at,
      updated_at: question.updated_at,
      accepted_answers: answersMap.get(question.id) || []
    }));
  } catch (error) {
    console.error('Lỗi khi lấy danh sách câu hỏi Tăng Tốc:', error);
    throw error;
  }
}

export async function getTangTocQuestionById(id) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        q.*,
        u.username as created_by_username
      FROM tangtoc_questions q
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const question = rows[0];
    
    // Lấy các đáp án chấp nhận (giống cách khởi động)
    const [answers] = await pool.query(
      'SELECT id, answer FROM tangtoc_answers WHERE question_id = ? ORDER BY created_at',
      [question.id]
    );
    
    return {
      id: question.id,
      question_number: question.question_number,
      text: question.text,
      answer: question.answer,
      image_url: question.image_url,
      time_limit: question.time_limit,
      created_by: question.created_by,
      created_by_username: question.created_by_username,
      created_at: question.created_at,
      updated_at: question.updated_at,
      accepted_answers: answers
    };
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi Tăng Tốc:', error);
    throw error;
  }
}

export async function getRandomTangTocQuestions(limit = 4) {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM tangtoc_questions
      WHERE question_number IN (1, 2, 3, 4)
      ORDER BY RAND()
      LIMIT ?
    `, [limit]);
    
    // Lấy accepted answers cho những câu hỏi này (giống cách khởi động)
    const ids = rows.map(q => q.id);
    let answersMap = new Map();
    if (ids.length > 0) {
      const [ans] = await pool.query(`SELECT id, question_id, answer FROM tangtoc_answers WHERE question_id IN (${ids.map(() => '?').join(',')})`, ids);
      for (const r of ans) {
        if (!answersMap.has(r.question_id)) answersMap.set(r.question_id, []);
        answersMap.get(r.question_id).push({ id: r.id, answer: r.answer });
      }
    }
    
    return rows.map(question => ({
      id: question.id,
      question_number: question.question_number,
      text: question.text,
      answer: question.answer,
      image_url: question.image_url,
      time_limit: question.time_limit,
      acceptedAnswers: answersMap.get(question.id) || []
    }));
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi Tăng Tốc ngẫu nhiên:', error);
    return [];
  }
}

export async function updateTangTocQuestion(id, questionData) {
  const { question_number, text, answer, accepted_answers, image_url, time_limit } = questionData;
  
  const [result] = await pool.query(
    `UPDATE tangtoc_questions 
     SET question_number = ?, text = ?, answer = ?, image_url = ?, time_limit = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      question_number,
      text,
      answer,
      image_url || null,
      time_limit,
      id
    ]
  );
  
  if (result.affectedRows > 0) {
    // Xóa các đáp án cũ
    await pool.query('DELETE FROM tangtoc_answers WHERE question_id = ?', [id]);
    
    // Thêm các đáp án mới
    if (accepted_answers && accepted_answers.length > 0) {
      for (const answerText of accepted_answers) {
        await pool.query(
          'INSERT INTO tangtoc_answers (question_id, answer) VALUES (?, ?)',
          [id, answerText]
        );
      }
    }
  }
  
  return result.affectedRows > 0;
}

export async function deleteTangTocQuestion(id) {
  const [result] = await pool.query('DELETE FROM tangtoc_questions WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getTangTocQuestionStatistics() {
  const [stats] = await pool.query(`
    SELECT 
      COUNT(*) as total_questions,
      COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as image_questions,
      COUNT(CASE WHEN question_number = 1 THEN 1 END) as question_1_count,
      COUNT(CASE WHEN question_number = 2 THEN 1 END) as question_2_count,
      COUNT(CASE WHEN question_number = 3 THEN 1 END) as question_3_count,
      COUNT(CASE WHEN question_number = 4 THEN 1 END) as question_4_count
    FROM tangtoc_questions
  `);
  
  return stats[0];
}

export async function importTangTocQuestionsFromCSV(questions) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    for (const question of questions) {
      await connection.query(
        `INSERT INTO tangtoc_questions (question_number, text, answer, image_url, time_limit)
         VALUES (?, ?, ?, ?, ?)`,
        [
          question.question_number,
          question.text,
          question.answer,
          question.image_url || null,
          question.time_limit
        ]
      );
    }
    
    await connection.commit();
    return { success: true, count: questions.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Thêm đáp án chấp nhận (giống cách khởi động)
export async function addTangTocAcceptedAnswer(questionId, answer) {
  const answerText = (answer || '').toString().trim();
  if (!answerText) {
    throw new Error('Answer cannot be empty');
  }
  
  const [result] = await pool.query(
    'INSERT INTO tangtoc_answers (question_id, answer) VALUES (?, ?)',
    [questionId, answerText]
  );
  
  return { id: result.insertId, questionId, answer: answerText };
}

// Xóa đáp án chấp nhận (giống cách khởi động)
export async function removeTangTocAcceptedAnswer(answerId) {
  const [result] = await pool.query('DELETE FROM tangtoc_answers WHERE id = ?', [answerId]);
  return result.affectedRows > 0;
}

// =============================================
// GAME SESSIONS TĂNG TỐC RIÊNG
// =============================================

export async function createTangTocGameSession({ userId, roomId = null, isSolo = false, totalQuestions }) {
  const [result] = await pool.query(
    `INSERT INTO tangtoc_game_sessions (user_id, room_id, is_solo, total_questions)
     VALUES (?, ?, ?, ?)`,
    [userId, roomId, isSolo, totalQuestions]
  );
  
  return { id: result.insertId };
}

export async function finishTangTocGameSession(sessionId, score, correctAnswers) {
  await pool.query(
    `UPDATE tangtoc_game_sessions 
     SET score = ?, correct_answers = ?, finished_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [score, correctAnswers, sessionId]
  );
}

export async function saveTangTocUserAnswer(sessionId, questionId, userAnswer, isCorrect, answerTime) {
  await pool.query(
    `INSERT INTO tangtoc_user_answers (session_id, question_id, user_answer, is_correct, answer_time)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, questionId, userAnswer, isCorrect, answerTime]
  );
}

export async function getTangTocUserGameHistory(userId, limit = 10) {
  const [rows] = await pool.query(`
    SELECT 
      s.*,
      r.name as room_name,
      r.code as room_code
    FROM tangtoc_game_sessions s
    LEFT JOIN tangtoc_rooms r ON s.room_id = r.id
    WHERE s.user_id = ?
    ORDER BY s.started_at DESC
    LIMIT ?
  `, [userId, limit]);
  
  return rows;
}

// =============================================
// ROOMS TĂNG TỐC RIÊNG
// =============================================

export async function createTangTocRoom({ code, name, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO tangtoc_rooms (code, name, created_by)
     VALUES (?, ?, ?)`,
    [code, name, createdBy]
  );
  
  return { id: result.insertId };
}

export async function getTangTocRoomByCode(code) {
  const [rows] = await pool.query(`
    SELECT 
      r.*,
      u.username as created_by_username
    FROM tangtoc_rooms r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.code = ?
  `, [code]);
  
  return rows[0] || null;
}

export async function updateTangTocRoomStatus(roomId, status) {
  const finishedAt = status === 'finished' ? new Date() : null;
  
  await pool.query(
    `UPDATE tangtoc_rooms 
     SET status = ?, finished_at = ?
     WHERE id = ?`,
    [status, finishedAt, roomId]
  );
}

export async function addTangTocRoomParticipant(roomId, userId) {
  await pool.query(
    `INSERT IGNORE INTO tangtoc_room_participants (room_id, user_id)
     VALUES (?, ?)`,
    [roomId, userId]
  );
}

export async function removeTangTocRoomParticipant(roomId, userId) {
  await pool.query(
    `DELETE FROM tangtoc_room_participants 
     WHERE room_id = ? AND user_id = ?`,
    [roomId, userId]
  );
}

export async function getTangTocRoomParticipants(roomId) {
  const [rows] = await pool.query(`
    SELECT 
      p.*,
      u.username,
      u.full_name
    FROM tangtoc_room_participants p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.room_id = ?
    ORDER BY p.joined_at ASC
  `, [roomId]);
  
  return rows;
}

export async function updateTangTocRoomParticipantScore(roomId, userId, score) {
  await pool.query(
    `UPDATE tangtoc_room_participants 
     SET score = ?
     WHERE room_id = ? AND user_id = ?`,
    [score, roomId, userId]
  );
}