/**
 * Script to drop match_questions table
 * Run: node scripts/drop-match-questions-table.js
 */

import { pool } from '../db/index.js';

async function dropMatchQuestionsTable() {
  try {
    console.log('🗑️  Bắt đầu xóa bảng match_questions...');

    // Backup table trước khi xóa
    console.log('📦 Tạo backup: match_questions_backup...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_questions_backup AS 
      SELECT * FROM match_questions
    `);
    console.log('✅ Đã tạo backup');

    // Đếm số rows trong backup
    const [backupRows] = await pool.query('SELECT COUNT(*) as count FROM match_questions_backup');
    console.log(`   Backup có ${backupRows[0].count} rows`);

    // Xóa bảng match_questions
    console.log('🗑️  Đang xóa bảng match_questions...');
    await pool.query('DROP TABLE IF EXISTS match_questions');
    console.log('✅ Đã xóa bảng match_questions');

    // Verify
    const [tables] = await pool.query("SHOW TABLES LIKE 'match_questions'");
    if (tables.length === 0) {
      console.log('✅ Xác nhận: Bảng match_questions đã bị xóa');
    } else {
      console.error('❌ Lỗi: Bảng match_questions vẫn còn tồn tại');
    }

    console.log('\n🎉 HOÀN THÀNH!');
    console.log('   - Bảng match_questions đã bị xóa');
    console.log('   - Backup lưu tại: match_questions_backup');
    console.log('   - Tất cả dữ liệu giờ lưu trong match.json trên data node');

  } catch (error) {
    console.error('❌ Lỗi khi xóa bảng:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

dropMatchQuestionsTable();

