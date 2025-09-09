#!/usr/bin/env node

// Script để fix database hiện tại - thêm các cột cần thiết cho Tăng Tốc
import mysql from 'mysql2/promise';
import config from './config.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function fixDatabase() {
  try {
    console.log('🔧 Đang fix database...');
    
    // Kiểm tra và thêm các cột cần thiết
    const columns = [
      {
        name: 'question_number',
        definition: 'ADD COLUMN question_number INT NULL AFTER id'
      },
      {
        name: 'image_url', 
        definition: 'ADD COLUMN image_url TEXT NULL AFTER answer'
      },
      {
        name: 'time_limit',
        definition: 'ADD COLUMN time_limit INT NULL AFTER difficulty'
      }
    ];
    
    for (const column of columns) {
      try {
        // Kiểm tra xem cột đã tồn tại chưa
        const [rows] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = ?`,
          [config.db.database, column.name]
        );
        
        const exists = rows && rows[0] && Number(rows[0].cnt) > 0;
        
        if (!exists) {
          console.log(`➕ Thêm cột ${column.name}...`);
          await pool.query(`ALTER TABLE questions ${column.definition}`);
          console.log(`✅ Đã thêm cột ${column.name}`);
        } else {
          console.log(`ℹ️  Cột ${column.name} đã tồn tại`);
        }
      } catch (error) {
        console.error(`❌ Lỗi khi thêm cột ${column.name}:`, error.message);
      }
    }
    
    // Tạo index nếu chưa có
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category)',
      'CREATE INDEX IF NOT EXISTS idx_questions_tangtoc ON questions(category, question_number)',
      'CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await pool.query(indexSql);
        console.log('✅ Đã tạo index');
      } catch (error) {
        console.log('ℹ️  Index đã tồn tại hoặc có lỗi:', error.message);
      }
    }
    
    // Kiểm tra cấu trúc bảng sau khi fix
    console.log('\n📋 Cấu trúc bảng questions sau khi fix:');
    const [columns] = await pool.query('DESCRIBE questions');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n✅ Fix database hoàn tất! Bây giờ có thể upload câu hỏi Tăng Tốc.');
    
  } catch (error) {
    console.error('❌ Lỗi khi fix database:', error);
  } finally {
    await pool.end();
  }
}

// Chạy script
fixDatabase();
