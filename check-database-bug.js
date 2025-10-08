/**
 * Script kiểm tra database để phát hiện bug lưu trữ
 */

import { pool } from './db/index.js';

async function checkDatabase() {
  try {
    console.log('=== KIỂM TRA DATABASE ===\n');
    
    // 1. Kiểm tra bảng match_questions có tồn tại không
    const [tables] = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'match_questions'
    `);
    
    console.log('1. Bảng match_questions:');
    if (tables[0].count > 0) {
      console.log('   ✅ TỒN TẠI');
      
      // Đếm số records
      const [count] = await pool.query('SELECT COUNT(*) as total FROM match_questions');
      console.log(`   📊 Số records: ${count[0].total}`);
      
      // Lấy 5 records mẫu
      if (count[0].total > 0) {
        const [samples] = await pool.query('SELECT * FROM match_questions LIMIT 5');
        console.log('   📝 Mẫu dữ liệu:');
        samples.forEach((row, i) => {
          console.log(`      [${i+1}] Match ID: ${row.match_id}, Section: ${row.section}, Order: ${row.question_order}`);
        });
      }
    } else {
      console.log('   ❌ KHÔNG TỒN TẠI (đã bị xóa theo thiết kế v2.0)');
    }
    
    console.log('');
    
    // 2. Kiểm tra bảng matches
    console.log('2. Bảng matches:');
    const [matchCount] = await pool.query('SELECT COUNT(*) as total FROM matches');
    console.log(`   📊 Số records: ${matchCount[0].total}`);
    
    if (matchCount[0].total > 0) {
      const [matches] = await pool.query('SELECT * FROM matches LIMIT 5');
      console.log('   📝 Mẫu dữ liệu:');
      matches.forEach((row, i) => {
        console.log(`      [${i+1}] ID: ${row.match_id}, Name: ${row.match_name}, Node: ${row.data_node_id}, Status: ${row.status}`);
      });
    }
    
    console.log('');
    
    // 3. Kiểm tra bảng data_nodes
    console.log('3. Bảng data_nodes:');
    const [nodeCount] = await pool.query('SELECT COUNT(*) as total FROM data_nodes');
    console.log(`   📊 Số records: ${nodeCount[0].total}`);
    
    if (nodeCount[0].total > 0) {
      const [nodes] = await pool.query('SELECT * FROM data_nodes');
      console.log('   📝 Dữ liệu:');
      nodes.forEach((row, i) => {
        console.log(`      [${i+1}] ID: ${row.id}, Name: ${row.name}, Host: ${row.host}:${row.port}, Status: ${row.status}`);
      });
    }
    
    console.log('\n=== KẾT LUẬN ===\n');
    
    // Phân tích
    if (tables[0].count > 0) {
      console.log('⚠️  BUG PHÁT HIỆN:');
      console.log('   - Bảng match_questions VẪN TỒN TẠI trong database');
      console.log('   - Theo thiết kế v2.0, bảng này NÊN BỊ XÓA');
      console.log('   - Dữ liệu câu hỏi nên lưu trong match.json trên Data Node');
      console.log('   - Hiện tại có thể đang lưu TRÙNG LẶP ở 2 nơi!');
    } else {
      console.log('✅ ĐÚNG THIẾT KẾ:');
      console.log('   - Bảng match_questions đã bị xóa');
      console.log('   - Dữ liệu câu hỏi lưu trong match.json trên Data Node');
      console.log('   - Bảng matches chỉ lưu metadata mapping');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkDatabase();

