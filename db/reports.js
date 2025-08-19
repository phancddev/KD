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
  return rows[0] || null;
}

export async function updateReportStatus(id, status) {
  const resolvedAt = status === 'resolved' ? new Date() : null;
  await pool.query(
    `UPDATE question_reports SET status = ?, resolved_at = ? WHERE id = ?`,
    [status, resolvedAt, id]
  );
  return true;
}

