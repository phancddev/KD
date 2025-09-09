import { pool } from './index.js';

export async function createTangTocQuestionReport({ 
  userId, 
  sessionId = null, 
  roomId = null, 
  mode, 
  questionId = null, 
  questionText, 
  correctAnswer, 
  userAnswer = null, 
  reportText, 
  questionNumber = null,
  imageUrl = null,
  timeLimit = null
}) {
  const [result] = await pool.query(
    `INSERT INTO tangtoc_question_reports (user_id, session_id, room_id, mode, question_id, question_text, correct_answer, user_answer, report_text, question_number, image_url, time_limit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId || null, 
      sessionId || null, 
      roomId || null, 
      mode, 
      questionId || null, 
      questionText, 
      correctAnswer, 
      userAnswer, 
      reportText, 
      questionNumber || null,
      imageUrl || null,
      timeLimit || null
    ]
  );
  return { id: result.insertId };
}

export async function listTangTocQuestionReports({ page = 1, limit = 20, status = null }) {
  const offset = (page - 1) * limit;
  let whereClause = '';
  let params = [];

  if (status) {
    whereClause = 'WHERE status = ?';
    params.push(status);
  }

  // Lấy danh sách reports với thông tin user
  const [reports] = await pool.query(`
    SELECT 
      r.*,
      u.username,
      u.full_name,
      q.question_number,
      q.image_url,
      q.time_limit
    FROM tangtoc_question_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN tangtoc_questions q ON r.question_id = q.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  // Đếm tổng số records
  const [countResult] = await pool.query(`
    SELECT COUNT(*) as total
    FROM tangtoc_question_reports r
    ${whereClause}
  `, params);

  const total = countResult[0].total;
  const pages = Math.ceil(total / limit);

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      pages
    }
  };
}

export async function getTangTocQuestionReportById(id) {
  const [rows] = await pool.query(`
    SELECT 
      r.*,
      u.username,
      u.full_name,
      q.question_number,
      q.image_url,
      q.time_limit
    FROM tangtoc_question_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN tangtoc_questions q ON r.question_id = q.id
    WHERE r.id = ?
  `, [id]);

  if (rows.length === 0) {
    return null;
  }

  const report = rows[0];

  // Lấy các suggestions
  const [suggestions] = await pool.query(`
    SELECT * FROM tangtoc_answer_suggestions
    WHERE report_id = ?
    ORDER BY created_at ASC
  `, [id]);

  report.suggestions = suggestions;
  return report;
}

export async function updateTangTocQuestionReportStatus(id, status) {
  const resolvedAt = status === 'resolved' ? new Date() : null;
  
  await pool.query(`
    UPDATE tangtoc_question_reports 
    SET status = ?, resolved_at = ?
    WHERE id = ?
  `, [status, resolvedAt, id]);
}

export async function addTangTocAnswerSuggestion({ reportId, questionId = null, userId, suggestedAnswer }) {
  const [result] = await pool.query(
    `INSERT INTO tangtoc_answer_suggestions (report_id, question_id, user_id, suggested_answer)
     VALUES (?, ?, ?, ?)`,
    [reportId, questionId, userId, suggestedAnswer]
  );
  return { id: result.insertId };
}

export async function updateTangTocAnswerSuggestion(suggestionId, newAnswer) {
  await pool.query(`
    UPDATE tangtoc_answer_suggestions 
    SET suggested_answer = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newAnswer, suggestionId]);
}

export async function approveTangTocAnswerSuggestions(suggestionIds, adminId, note = '') {
  // Cập nhật status của suggestions
  await pool.query(`
    UPDATE tangtoc_answer_suggestions 
    SET status = 'approved', updated_at = CURRENT_TIMESTAMP
    WHERE id IN (${suggestionIds.map(() => '?').join(',')})
  `, suggestionIds);

  // Lấy thông tin report để thêm vào database
  const [suggestions] = await pool.query(`
    SELECT s.*, r.question_id, r.question_text, r.correct_answer, r.accepted_answers, r.question_number, r.image_url, r.time_limit
    FROM tangtoc_answer_suggestions s
    JOIN tangtoc_question_reports r ON s.report_id = r.id
    WHERE s.id IN (${suggestionIds.map(() => '?').join(',')})
  `, suggestionIds);

  if (suggestions.length === 0) {
    throw new Error('Không tìm thấy suggestions');
  }

  const report = suggestions[0];
  const questionId = report.question_id;

  if (questionId) {
    // Cập nhật câu hỏi hiện có
    const approvedAnswers = suggestions.map(s => s.suggested_answer);
    const currentAcceptedAnswers = report.accepted_answers ? JSON.parse(report.accepted_answers) : [];
    const newAcceptedAnswers = [...currentAcceptedAnswers, ...approvedAnswers];

    await pool.query(`
      UPDATE tangtoc_questions 
      SET accepted_answers = ?
      WHERE id = ?
    `, [JSON.stringify(newAcceptedAnswers), questionId]);
  } else {
    // Tạo câu hỏi mới
    const [result] = await pool.query(`
      INSERT INTO tangtoc_questions (question_number, text, answer, image_url, time_limit, accepted_answers, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      report.question_number,
      report.question_text,
      report.correct_answer,
      report.image_url,
      report.time_limit,
      JSON.stringify(approvedAnswers),
      adminId
    ]);

    const newQuestionId = result.insertId;

    // Cập nhật report với question_id mới
    await pool.query(`
      UPDATE tangtoc_question_reports 
      SET question_id = ?
      WHERE id = ?
    `, [newQuestionId, report.report_id]);
  }

  // Log hành động
  for (const suggestion of suggestions) {
    await pool.query(`
      INSERT INTO tangtoc_answer_suggestion_logs (suggestion_id, admin_id, action, new_value, note)
      VALUES (?, ?, 'approve', ?, ?)
    `, [suggestion.id, adminId, suggestion.suggested_answer, note]);
  }

  return { success: true };
}

export async function deleteTangTocQuestionReport(id) {
  await pool.query(`DELETE FROM tangtoc_question_reports WHERE id = ?`, [id]);
}