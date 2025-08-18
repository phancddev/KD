import { pool } from './index.js';

// Tạo phiên chơi mới
async function createGameSession(userId, roomId = null, isSolo = false, totalQuestions = 12) {
  try {
    const [result] = await pool.query(
      'INSERT INTO game_sessions (user_id, room_id, is_solo, total_questions) VALUES (?, ?, ?, ?)',
      [userId, roomId, isSolo, totalQuestions]
    );
    
    return {
      id: result.insertId,
      userId,
      roomId,
      isSolo,
      totalQuestions,
      score: 0,
      startedAt: new Date()
    };
  } catch (error) {
    console.error('Lỗi khi tạo phiên chơi mới:', error);
    throw error;
  }
}

// Kết thúc phiên chơi
async function finishGameSession(sessionId, score, correctAnswers) {
  try {
    await pool.query(
      'UPDATE game_sessions SET score = ?, correct_answers = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
      [score, correctAnswers, sessionId]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi kết thúc phiên chơi:', error);
    throw error;
  }
}

// Lưu câu trả lời của người dùng
async function saveUserAnswer(sessionId, questionId, userAnswer, isCorrect, answerTime) {
  try {
    await pool.query(
      'INSERT INTO user_answers (session_id, question_id, user_answer, is_correct, answer_time) VALUES (?, ?, ?, ?, ?)',
      [sessionId, questionId, userAnswer || 'none', isCorrect, answerTime]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi lưu câu trả lời:', error);
    throw error;
  }
}

// Lấy lịch sử phiên chơi của người dùng
async function getUserGameHistory(userId, limit = 10) {
  try {
    const [rows] = await pool.query(
      `SELECT gs.*, r.name as room_name, r.code as room_code
       FROM game_sessions gs
       LEFT JOIN rooms r ON gs.room_id = r.id
       WHERE gs.user_id = ?
       ORDER BY gs.started_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    
    return rows.map(row => ({
      id: row.id,
      isSolo: row.is_solo === 1,
      score: row.score,
      totalQuestions: row.total_questions,
      roomName: row.room_name,
      roomCode: row.room_code,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    }));
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử phiên chơi:', error);
    throw error;
  }
}

// Lấy chi tiết phiên chơi
async function getGameSessionDetails(sessionId) {
  try {
    // Lấy thông tin phiên chơi
    const [sessionRows] = await pool.query(
      `SELECT gs.*, u.username, r.name as room_name, r.code as room_code
       FROM game_sessions gs
       JOIN users u ON gs.user_id = u.id
       LEFT JOIN rooms r ON gs.room_id = r.id
       WHERE gs.id = ?`,
      [sessionId]
    );
    
    if (sessionRows.length === 0) {
      return null;
    }
    
    const session = sessionRows[0];
    
    // Lấy chi tiết các câu trả lời
    const [answerRows] = await pool.query(
      `SELECT ua.*, q.text as question_text, q.answer
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       WHERE ua.session_id = ?
       ORDER BY ua.answered_at`,
      [sessionId]
    );
    
    const answers = answerRows.map(row => {
      return {
        questionId: row.question_id,
        questionText: row.question_text,
        userAnswer: row.user_answer === 'none' ? null : row.user_answer,
        correctAnswer: row.answer,
        isCorrect: row.is_correct === 1,
        answerTime: row.answer_time,
        answeredAt: row.answered_at
      };
    });
    
    return {
      id: session.id,
      userId: session.user_id,
      username: session.username,
      isSolo: session.is_solo === 1,
      roomId: session.room_id,
      roomName: session.room_name,
      roomCode: session.room_code,
      score: session.score,
      totalQuestions: session.total_questions,
      startedAt: session.started_at,
      finishedAt: session.finished_at,
      answers
    };
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết phiên chơi:', error);
    throw error;
  }
}

// Lấy lịch sử trận đấu của người dùng theo tháng
async function getUserGameHistoryByMonth(userId, year, month) {
  try {
    // Tạo ngày đầu tháng và cuối tháng
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Ngày cuối của tháng
    
    const [rows] = await pool.query(
      `SELECT gs.*, r.name as room_name, r.code as room_code
       FROM game_sessions gs
       LEFT JOIN rooms r ON gs.room_id = r.id
       WHERE gs.user_id = ? 
       AND gs.started_at >= ? 
       AND gs.started_at <= ?
       ORDER BY gs.started_at DESC`,
      [userId, startDate, endDate]
    );
    
    return rows.map(row => ({
      id: row.id,
      isSolo: row.is_solo === 1,
      score: row.score,
      correctAnswers: row.correct_answers,
      totalQuestions: row.total_questions,
      roomName: row.room_name,
      roomCode: row.room_code,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    }));
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử trận đấu theo tháng:', error);
    throw error;
  }
}

// Lấy xếp hạng người chơi theo số trận đấu trong tháng
async function getPlayerRankingByMonth(year, month, limit = 100) {
  try {
    // Tạo ngày đầu tháng và cuối tháng
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Ngày cuối của tháng
    
    const [rows] = await pool.query(
      `SELECT 
         u.id, 
         u.username, 
         u.full_name,
         COUNT(gs.id) as total_games,
         SUM(gs.score) as total_score,
         SUM(gs.correct_answers) as total_correct_answers
       FROM users u
       JOIN game_sessions gs ON u.id = gs.user_id
       WHERE gs.started_at >= ? 
       AND gs.started_at <= ?
       AND gs.finished_at IS NOT NULL
       GROUP BY u.id
       ORDER BY total_games DESC, total_score DESC
       LIMIT ?`,
      [startDate, endDate, limit]
    );
    
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      fullName: row.full_name,
      totalGames: row.total_games,
      totalScore: row.total_score,
      totalCorrectAnswers: row.total_correct_answers
    }));
  } catch (error) {
    console.error('Lỗi khi lấy xếp hạng người chơi theo tháng:', error);
    throw error;
  }
}

// Lấy thống kê trận đấu của người dùng
async function getUserGameStats(userId) {
  try {
    const [rows] = await pool.query(
      `SELECT 
         COUNT(id) as total_games,
         SUM(score) as total_score,
         SUM(correct_answers) as total_correct_answers,
         SUM(total_questions) as total_questions,
         AVG(score) as avg_score,
         MAX(score) as highest_score
       FROM game_sessions
       WHERE user_id = ? AND finished_at IS NOT NULL`,
      [userId]
    );
    
    if (rows.length === 0) {
      return {
        totalGames: 0,
        totalScore: 0,
        totalCorrectAnswers: 0,
        totalQuestions: 0,
        avgScore: 0,
        highestScore: 0
      };
    }
    
    return {
      totalGames: rows[0].total_games || 0,
      totalScore: rows[0].total_score || 0,
      totalCorrectAnswers: rows[0].total_correct_answers || 0,
      totalQuestions: rows[0].total_questions || 0,
      avgScore: rows[0].avg_score || 0,
      highestScore: rows[0].highest_score || 0
    };
  } catch (error) {
    console.error('Lỗi khi lấy thống kê trận đấu của người dùng:', error);
    throw error;
  }
}

export {
  createGameSession,
  finishGameSession,
  saveUserAnswer,
  getUserGameHistory,
  getUserGameHistoryByMonth,
  getGameSessionDetails,
  getPlayerRankingByMonth,
  getUserGameStats
};

// Các hàm cho admin: lấy lịch sử tất cả trận đấu với lọc/phân trang
async function getGameHistory({ userId = null, isSolo = null, from = null, to = null, offset = 0, limit = 10 }) {
  try {
    const conditions = [];
    const params = [];
    
    if (userId) {
      conditions.push('gs.user_id = ?');
      params.push(userId);
    }
    if (isSolo !== null && isSolo !== undefined) {
      conditions.push('gs.is_solo = ?');
      params.push(isSolo ? 1 : 0);
    }
    if (from) {
      conditions.push('gs.started_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('gs.started_at <= ?');
      params.push(to);
    }
    
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const [rows] = await pool.query(
      `SELECT 
         gs.id,
         gs.user_id,
         u.username,
         u.full_name,
         gs.is_solo,
         gs.score,
         gs.correct_answers,
         gs.total_questions,
         gs.room_id,
         r.name AS room_name,
         r.code AS room_code,
         gs.started_at,
         gs.finished_at
       FROM game_sessions gs
       JOIN users u ON u.id = gs.user_id
       LEFT JOIN rooms r ON r.id = gs.room_id
       ${whereClause}
       ORDER BY gs.started_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      isSolo: row.is_solo === 1,
      score: row.score,
      correctAnswers: row.correct_answers,
      totalQuestions: row.total_questions,
      roomId: row.room_id,
      roomName: row.room_name,
      roomCode: row.room_code,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    }));
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử tất cả trận đấu:', error);
    throw error;
  }
}

async function countGameHistory({ userId = null, isSolo = null, from = null, to = null }) {
  try {
    const conditions = [];
    const params = [];
    
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (isSolo !== null && isSolo !== undefined) {
      conditions.push('is_solo = ?');
      params.push(isSolo ? 1 : 0);
    }
    if (from) {
      conditions.push('started_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('started_at <= ?');
      params.push(to);
    }
    
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM game_sessions ${whereClause}`, params);
    return rows[0]?.total || 0;
  } catch (error) {
    console.error('Lỗi khi đếm lịch sử tất cả trận đấu:', error);
    throw error;
  }
}

export { getGameHistory, countGameHistory };