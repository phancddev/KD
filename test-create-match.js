/**
 * Script test tạo match và kiểm tra upload
 */

import { pool } from './db/index.js';

async function testCreateMatch() {
  try {
    console.log('🧪 Testing match creation...\n');
    
    // 1. Kiểm tra data nodes
    const [nodes] = await pool.query('SELECT * FROM data_nodes WHERE status = "online" LIMIT 1');
    
    if (nodes.length === 0) {
      console.log('❌ Không có data node online!');
      console.log('💡 Hãy khởi động data node trước:');
      console.log('   cd dan_data-node');
      console.log('   npm start');
      process.exit(1);
    }
    
    const dataNode = nodes[0];
    console.log(`✅ Data node: ${dataNode.name} (${dataNode.host}:${dataNode.port})`);
    
    // 2. Tạo match mới
    const [result] = await pool.query(
      `INSERT INTO matches (name, data_node_id, max_players, status, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      ['Test Match - ' + Date.now(), dataNode.id, 4, 'waiting']
    );
    
    const matchId = result.insertId;
    console.log(`✅ Match created: ID = ${matchId}`);
    
    // 3. Tạo URL upload
    const uploadUrl = `http://localhost:2701/admin/match-upload?matchId=${matchId}`;
    console.log(`\n📝 URL Upload:`);
    console.log(`   ${uploadUrl}`);
    
    // 4. Kiểm tra bảng match_questions
    const [questions] = await pool.query(
      'SELECT COUNT(*) as count FROM match_questions WHERE match_id = ?',
      [matchId]
    );
    console.log(`\n📊 Số câu hỏi hiện tại: ${questions[0].count}`);
    
    // 5. Test API endpoint
    console.log(`\n🧪 Test API endpoints:`);
    console.log(`   GET  /api/matches/${matchId}`);
    console.log(`   POST /api/matches/upload`);
    console.log(`   POST /api/matches/questions/bulk`);
    
    console.log(`\n✅ Tất cả OK! Bây giờ có thể mở URL trên để upload câu hỏi.`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

testCreateMatch();

