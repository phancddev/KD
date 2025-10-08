/**
 * Script để chạy migration sang kiến trúc v2.0
 * CẢNH BÁO: Script này sẽ DROP bảng matches, match_participants, match_questions cũ!
 */

import { pool } from './db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔄 Bắt đầu migration sang kiến trúc v2.0...\n');
  
  try {
    // Đọc file migration SQL
    const migrationPath = path.join(__dirname, 'db/init/05-matches-metadata.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    console.log('📄 Đọc file migration: 05-matches-metadata.sql');
    
    // Backup dữ liệu cũ (nếu có)
    console.log('\n📦 Backup dữ liệu cũ...');
    
    try {
      const [oldMatches] = await pool.query('SELECT * FROM matches');
      console.log(`   Tìm thấy ${oldMatches.length} trận đấu cũ`);
      
      if (oldMatches.length > 0) {
        const backupPath = path.join(__dirname, `backup_matches_${Date.now()}.json`);
        await fs.writeFile(backupPath, JSON.stringify(oldMatches, null, 2));
        console.log(`   ✅ Đã backup vào: ${backupPath}`);
      }
    } catch (error) {
      console.log('   ℹ️  Không có dữ liệu cũ để backup');
    }
    
    // Chạy migration
    console.log('\n🔨 Chạy migration SQL...');
    
    // Split SQL thành các statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        await pool.query(statement);
      }
    }
    
    console.log('   ✅ Migration SQL hoàn tất');
    
    // Verify bảng mới
    console.log('\n🔍 Verify bảng mới...');
    
    const [tables] = await pool.query(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'matches'
    `);
    
    if (tables.length > 0) {
      console.log('   ✅ Bảng matches đã được tạo');
      console.log(`   Comment: ${tables[0].TABLE_COMMENT}`);
    } else {
      throw new Error('Bảng matches không được tạo!');
    }
    
    // Kiểm tra columns
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'matches'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📋 Cấu trúc bảng matches:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
      if (col.COLUMN_COMMENT) {
        console.log(`     ${col.COLUMN_COMMENT}`);
      }
    });
    
    console.log('\n✅ Migration hoàn tất thành công!');
    console.log('\n📝 Tiếp theo:');
    console.log('   1. Restart KD Server: npm run dev');
    console.log('   2. Test tạo trận đấu mới');
    console.log('   3. Kiểm tra folder được tạo trên Data Node');
    
  } catch (error) {
    console.error('\n❌ Migration thất bại:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();

