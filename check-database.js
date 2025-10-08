/**
 * Script kiểm tra và tạo tất cả bảng database cần thiết
 * Chạy: node check-database.js
 */

import { pool } from './db/index.js';

const REQUIRED_TABLES = [
  // Bảng cơ bản
  'users',
  'questions',
  'game_history',
  'reports',
  'login_logs',
  'question_logs',
  
  // Bảng Tăng Tốc
  'tangtoc_questions',
  'tangtoc_game_history',
  'tangtoc_reports',
  'tangtoc_question_logs',
  'tangtoc_question_deletion_logs',
  
  // Bảng Data Nodes & Matches
  'data_nodes',
  'matches',
  'match_questions',
  'match_participants',
  'match_players',
  'match_answers',
  'match_results',
  'match_events',
  'match_upload_logs'
];

async function checkDatabase() {
  console.log('🔍 Đang kiểm tra database...\n');
  
  try {
    // Lấy danh sách tất cả bảng
    const [tables] = await pool.query('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0]);
    
    console.log(`📊 Tổng số bảng hiện có: ${existingTables.length}`);
    console.log(`📋 Tổng số bảng cần thiết: ${REQUIRED_TABLES.length}\n`);
    
    // Kiểm tra từng bảng
    const missingTables = [];
    const existingRequiredTables = [];
    
    for (const tableName of REQUIRED_TABLES) {
      if (existingTables.includes(tableName)) {
        console.log(`✅ ${tableName}`);
        existingRequiredTables.push(tableName);
      } else {
        console.log(`❌ ${tableName} - THIẾU!`);
        missingTables.push(tableName);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 KẾT QUẢ KIỂM TRA');
    console.log('='.repeat(50));
    console.log(`✅ Bảng đã có: ${existingRequiredTables.length}/${REQUIRED_TABLES.length}`);
    console.log(`❌ Bảng thiếu: ${missingTables.length}/${REQUIRED_TABLES.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  CÁC BẢNG THIẾU:');
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      
      console.log('\n💡 CÁCH FIX:');
      console.log('   1. Restart server: cd KD && npm start');
      console.log('   2. Hoặc chạy migration thủ công:');
      console.log('      mysql -u nqd_user -pnqd_password nqd_database < db/init/04-host-dan-data-node-migration.sql');
      
      process.exit(1);
    } else {
      console.log('\n🎉 TẤT CẢ BẢNG ĐÃ SẴN SÀNG!');
      
      // Kiểm tra cấu trúc bảng match_participants
      console.log('\n🔍 Kiểm tra cấu trúc bảng match_participants...');
      const [columns] = await pool.query('DESCRIBE match_participants');
      console.log('\n📋 Cột trong bảng match_participants:');
      columns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
      
      // Kiểm tra số lượng data nodes
      const [nodes] = await pool.query('SELECT COUNT(*) as count FROM data_nodes');
      console.log(`\n📊 Số data nodes: ${nodes[0].count}`);
      
      // Kiểm tra số lượng matches
      const [matches] = await pool.query('SELECT COUNT(*) as count FROM matches');
      console.log(`📊 Số matches: ${matches[0].count}`);
      
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra database:', error);
    process.exit(1);
  }
}

// Chạy kiểm tra
checkDatabase();

