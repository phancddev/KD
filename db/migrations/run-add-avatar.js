#!/usr/bin/env node

import { pool } from '../index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Bắt đầu migration: Thêm cột avatar vào bảng users...');
    
    // Đọc file SQL
    const sqlFile = path.join(__dirname, 'add_avatar_to_users.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Tách các câu lệnh SQL
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Thực thi từng câu lệnh
    for (const statement of statements) {
      if (statement.toLowerCase().includes('select')) {
        const [rows] = await pool.query(statement);
        console.log('✅', rows[0]);
      } else {
        await pool.query(statement);
        console.log('✅ Đã thực thi:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ Migration hoàn thành thành công!');
    
    // Kiểm tra cột đã được thêm
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'nqd_database' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'avatar'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Xác nhận cột avatar đã được thêm:');
      console.log(columns[0]);
    } else {
      console.log('⚠️  Cảnh báo: Không tìm thấy cột avatar');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error);
    process.exit(1);
  }
}

runMigration();

