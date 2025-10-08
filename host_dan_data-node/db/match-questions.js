/**
 * Database functions cho quản lý Match Questions
 */

import { pool } from '../../db/index.js';

/**
 * Thêm câu hỏi vào trận đấu
 */
export async function addMatchQuestion(matchId, questionData) {
  try {
    const {
      section,
      questionOrder,
      playerIndex = null,
      questionType,
      questionText = null,
      mediaUrl = null,
      mediaType = null,
      answerText = null,
      answerOptions = null,
      points = 10,
      timeLimit = null
    } = questionData;
    
    const [result] = await pool.query(
      `INSERT INTO match_questions 
       (match_id, section, question_order, player_index, question_type, 
        question_text, media_url, media_type, answer_text, answer_options, 
        points, time_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId, section, questionOrder, playerIndex, questionType,
        questionText, mediaUrl, mediaType, answerText,
        answerOptions ? JSON.stringify(answerOptions) : null,
        points, timeLimit
      ]
    );
    
    return {
      id: result.insertId,
      match_id: matchId,
      ...questionData
    };
  } catch (error) {
    console.error('Error adding match question:', error);
    throw error;
  }
}

/**
 * Thêm nhiều câu hỏi cùng lúc
 */
export async function addMultipleQuestions(matchId, questions) {
  try {
    const results = [];
    for (const question of questions) {
      const result = await addMatchQuestion(matchId, question);
      results.push(result);
    }
    return results;
  } catch (error) {
    console.error('Error adding multiple questions:', error);
    throw error;
  }
}

/**
 * Lấy câu hỏi theo ID
 */
export async function getQuestionById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM match_questions WHERE id = ?',
      [id]
    );
    
    if (rows[0] && rows[0].answer_options) {
      rows[0].answer_options = JSON.parse(rows[0].answer_options);
    }
    
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting question:', error);
    throw error;
  }
}

/**
 * Lấy tất cả câu hỏi của trận đấu
 */
export async function getMatchQuestions(matchId, section = null) {
  try {
    let query = 'SELECT * FROM match_questions WHERE match_id = ?';
    const params = [matchId];
    
    if (section) {
      query += ' AND section = ?';
      params.push(section);
    }
    
    query += ' ORDER BY section, question_order ASC';
    
    const [rows] = await pool.query(query, params);
    
    // Parse JSON fields
    rows.forEach(row => {
      if (row.answer_options) {
        row.answer_options = JSON.parse(row.answer_options);
      }
    });
    
    return rows;
  } catch (error) {
    console.error('Error getting match questions:', error);
    throw error;
  }
}

/**
 * Lấy câu hỏi theo phần thi và người chơi
 */
export async function getQuestionsBySection(matchId, section, playerIndex = null) {
  try {
    let query = 'SELECT * FROM match_questions WHERE match_id = ? AND section = ?';
    const params = [matchId, section];
    
    if (playerIndex !== null) {
      query += ' AND player_index = ?';
      params.push(playerIndex);
    }
    
    query += ' ORDER BY question_order ASC';
    
    const [rows] = await pool.query(query, params);
    
    rows.forEach(row => {
      if (row.answer_options) {
        row.answer_options = JSON.parse(row.answer_options);
      }
    });
    
    return rows;
  } catch (error) {
    console.error('Error getting questions by section:', error);
    throw error;
  }
}

/**
 * Cập nhật câu hỏi
 */
export async function updateQuestion(id, updates) {
  try {
    const allowedFields = [
      'question_text', 'media_url', 'media_type', 'answer_text',
      'answer_options', 'points', 'time_limit'
    ];
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'answer_options' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    await pool.query(
      `UPDATE match_questions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await getQuestionById(id);
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
}

/**
 * Xóa câu hỏi
 */
export async function deleteQuestion(id) {
  try {
    await pool.query('DELETE FROM match_questions WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
}

/**
 * Xóa tất cả câu hỏi của một phần thi
 */
export async function deleteQuestionsBySection(matchId, section) {
  try {
    await pool.query(
      'DELETE FROM match_questions WHERE match_id = ? AND section = ?',
      [matchId, section]
    );
    return true;
  } catch (error) {
    console.error('Error deleting questions by section:', error);
    throw error;
  }
}

/**
 * Đếm số câu hỏi theo phần thi
 */
export async function countQuestionsBySection(matchId, section) {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM match_questions WHERE match_id = ? AND section = ?',
      [matchId, section]
    );
    return rows[0].count;
  } catch (error) {
    console.error('Error counting questions:', error);
    throw error;
  }
}

/**
 * Kiểm tra cấu trúc câu hỏi có đầy đủ không
 */
export async function validateMatchStructure(matchId) {
  try {
    const structure = {
      khoi_dong_rieng: { required: 24, current: 0 }, // 6 câu x 4 người
      khoi_dong_chung: { required: 12, current: 0 },
      vcnv: { required: 6, current: 0 }, // 5 câu + 1 ảnh
      tang_toc: { required: 4, current: 0 }, // 3 ảnh + 1 video hoặc 2 ảnh + 2 video
      ve_dich: { required: 12, current: 0 } // 3 câu x 4 người
    };
    
    for (const section of Object.keys(structure)) {
      const count = await countQuestionsBySection(matchId, section);
      structure[section].current = count;
    }
    
    const isValid = Object.values(structure).every(s => s.current >= s.required);
    
    return {
      isValid,
      structure
    };
  } catch (error) {
    console.error('Error validating match structure:', error);
    throw error;
  }
}

