#!/usr/bin/env node

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  let connection;
  
  try {
    // Kết nối database
    connection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nqd_database',
      multipleStatements: true
    });

    console.log('🔗 Đã kết nối database thành công');

    // Đọc file migration
    const migrationPath = join(__dirname, 'db', 'init', '02-tangtoc-reports-migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Đã đọc file migration');

    // Chạy migration
    await connection.execute(migrationSQL);
    
    console.log('✅ Migration hoàn tất thành công!');
    console.log('📋 Các bảng đã được tạo:');
    console.log('   - tangtoc_question_reports');
    console.log('   - tangtoc_answer_suggestions');
    console.log('   - tangtoc_answer_suggestion_logs');
    console.log('   - Cột accepted_answers đã được thêm vào bảng questions');

  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Đã đóng kết nối database');
    }
  }
}

// Chạy migration
runMigration();
