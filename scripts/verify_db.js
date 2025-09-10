import mysql from 'mysql2/promise';
import config from '../config.js';

async function main() {
  const expected = {
    tables: {
      users: [],
      questions: ['id','question_number','text','answer','image_url','category','difficulty','time_limit','created_by','created_at'],
      answers: ['id','question_id','answer','created_at'],
      rooms: [],
      room_participants: [],
      game_sessions: [],
      user_answers: [],
      login_logs: [],
      ip_geolocation: [],
      question_reports: ['id','user_id','session_id','room_id','mode','question_id','question_text','correct_answer','user_answer','report_text','accepted_answers','status','created_at','resolved_at'],
      answer_suggestions: ['id','report_id','question_id','user_id','suggested_answer','status','created_at','updated_at'],
      answer_suggestion_logs: ['id','suggestion_id','admin_id','action','old_value','new_value','note','created_at'],
      question_deletion_logs: ['id','question_id','question_text','question_answer','question_category','question_difficulty','question_created_by','question_created_at','deleted_by','deleted_at','deletion_reason','report_id','can_restore','restored_at','restored_by'],
      deleted_question_answers: ['id','log_id','answer_text','created_at']
    },
    indexes: {
      questions: ['idx_questions_category','idx_questions_tangtoc','idx_questions_difficulty']
    }
  };

  const pool = await mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });

  const db = config.db.database;

  function pad(str, len) { return (str + '').padEnd(len, ' '); }

  const results = { missingTables: [], missingColumns: {}, missingIndexes: {} };

  // Fetch all tables
  const [tables] = await pool.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',[db]
  );
  const tableSet = new Set(tables.map(r => r.table_name));

  // Check tables and columns
  for (const [table, cols] of Object.entries(expected.tables)) {
    if (!tableSet.has(table)) {
      results.missingTables.push(table);
      continue;
    }
    if (cols.length === 0) continue; // skip column-level check for unspecified tables
    const [columns] = await pool.query(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position',
      [db, table]
    );
    const colSet = new Set(columns.map(r => r.column_name));
    const missing = cols.filter(c => !colSet.has(c));
    if (missing.length) results.missingColumns[table] = missing;
  }

  // Check indexes
  for (const [table, idxList] of Object.entries(expected.indexes)) {
    if (!tableSet.has(table)) {
      results.missingIndexes[table] = idxList; // table itself missing will be reported above too
      continue;
    }
    const [idxRows] = await pool.query(
      'SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = ? AND table_name = ?',
      [db, table]
    );
    const idxSet = new Set(idxRows.map(r => r.index_name));
    const missingIdx = idxList.filter(i => !idxSet.has(i));
    if (missingIdx.length) results.missingIndexes[table] = missingIdx;
  }

  // Print report
  console.log('=== Database Schema Verification ===');
  console.log('Database:', db);

  if (results.missingTables.length === 0 &&
      Object.keys(results.missingColumns).length === 0 &&
      Object.keys(results.missingIndexes).length === 0) {
    console.log('✅ Schema đầy đủ, khớp với yêu cầu (Tăng Tốc).');
  } else {
    if (results.missingTables.length) {
      console.log('\nThiếu bảng:');
      for (const t of results.missingTables) console.log(' -', t);
    }
    if (Object.keys(results.missingColumns).length) {
      console.log('\nThiếu cột:');
      for (const [t, cols] of Object.entries(results.missingColumns)) {
        console.log(' -', t, '=>', cols.join(', '));
      }
    }
    if (Object.keys(results.missingIndexes).length) {
      console.log('\nThiếu index:');
      for (const [t, idxs] of Object.entries(results.missingIndexes)) {
        console.log(' -', t, '=>', idxs.join(', '));
      }
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error('Lỗi verify DB:', err);
  process.exit(1);
});


