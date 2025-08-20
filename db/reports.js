import { pool } from './index.js';

export async function createQuestionReport({ userId, sessionId = null, roomId = null, mode, questionId = null, questionText, correctAnswer, userAnswer = null, reportText }) {
  const [result] = await pool.query(
    `INSERT INTO question_reports (user_id, session_id, room_id, mode, question_id, question_text, correct_answer, user_answer, report_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, sessionId || null, roomId || null, mode, questionId || null, questionText, correctAnswer, userAnswer, reportText]
  );
  return { id: result.insertId };
}

export async function listQuestionReports({ page = 1, limit = 20, status = null }) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT qr.*, u.username
     FROM question_reports qr
     LEFT JOIN users u ON qr.user_id = u.id
     ${whereSql}
     ORDER BY qr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM question_reports ${whereSql}`, params);
  return { rows, total };
}

export async function getQuestionReport(id) {
  const [rows] = await pool.query(
    `SELECT qr.*, u.username
     FROM question_reports qr
     LEFT JOIN users u ON qr.user_id = u.id
     WHERE qr.id = ?`,
    [id]
  );
  const report = rows[0] || null;
  if (!report) return null;
  // Lấy các đề xuất đáp án liên quan
  const [sugs] = await pool.query(
    `SELECT s.* FROM answer_suggestions s WHERE s.report_id = ? ORDER BY s.created_at ASC`,
    [id]
  );
  report.suggestions = sugs || [];
  return report;
}

export async function updateReportStatus(id, status) {
  const resolvedAt = status === 'resolved' ? new Date() : null;
  await pool.query(
    `UPDATE question_reports SET status = ?, resolved_at = ? WHERE id = ?`,
    [status, resolvedAt, id]
  );
  return true;
}

// Thêm đề xuất đáp án
export async function addAnswerSuggestion({ reportId, questionId = null, userId = null, suggestedAnswer }) {
  const [res] = await pool.query(
    `INSERT INTO answer_suggestions (report_id, question_id, user_id, suggested_answer) VALUES (?, ?, ?, ?)`,
    [reportId, questionId, userId, suggestedAnswer]
  );
  return { id: res.insertId };
}

// Cập nhật đề xuất (cho admin chỉnh sửa nội dung trước khi duyệt)
export async function updateAnswerSuggestion({ suggestionId, newAnswer, adminId = null, note = null }) {
  const [[row]] = await pool.query(`SELECT suggested_answer FROM answer_suggestions WHERE id = ?`, [suggestionId]);
  const oldValue = row ? row.suggested_answer : null;
  await pool.query(
    `UPDATE answer_suggestions SET suggested_answer = ? WHERE id = ?`,
    [newAnswer, suggestionId]
  );
  await pool.query(
    `INSERT INTO answer_suggestion_logs (suggestion_id, admin_id, action, old_value, new_value, note) VALUES (?, ?, 'update', ?, ?, ?)`,
    [suggestionId, adminId, oldValue, newAnswer, note]
  );
  return true;
}

// Duyệt đề xuất -> đẩy vào bảng answers và cập nhật trạng thái
export async function approveAnswerSuggestions({ suggestionIds, adminId = null, note = null }) {
  if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) return { inserted: 0 };
  // Lấy chi tiết
  const [rows] = await pool.query(
    `SELECT s.id, s.question_id, s.suggested_answer FROM answer_suggestions s WHERE s.id IN (${suggestionIds.map(()=>'?').join(',')})`,
    suggestionIds
  );
  let inserted = 0;
  for (const s of rows) {
    if (!s || !s.question_id || !s.suggested_answer) continue;
    await pool.query(`INSERT INTO answers (question_id, answer) VALUES (?, ?)`, [s.question_id, s.suggested_answer.toString().trim()]);
    await pool.query(`UPDATE answer_suggestions SET status = 'approved' WHERE id = ?`, [s.id]);
    await pool.query(
      `INSERT INTO answer_suggestion_logs (suggestion_id, admin_id, action, old_value, new_value, note) VALUES (?, ?, 'approve', NULL, ?, ?)`,
      [s.id, adminId, s.suggested_answer, note]
    );
    inserted++;
  }
  return { inserted };
}

// Từ chối đề xuất
export async function rejectAnswerSuggestion({ suggestionId, adminId = null, note = null }) {
  await pool.query(`UPDATE answer_suggestions SET status = 'rejected' WHERE id = ?`, [suggestionId]);
  await pool.query(
    `INSERT INTO answer_suggestion_logs (suggestion_id, admin_id, action, note) VALUES (?, ?, 'reject', ?)`,
    [suggestionId, adminId, note]
  );
  return true;
}

