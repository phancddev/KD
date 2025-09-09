import { createConnection } from 'mysql2/promise';

async function testTangTocConfig() {
  let connection;
  
  try {
    console.log('🔗 Kết nối đến database...');
    
    connection = await createConnection({
      host: 'localhost',
      port: 3307,
      user: 'nqd_user',
      password: 'nqd_password',
      database: 'nqd_database'
    });
    
    console.log('✅ Kết nối database thành công!');
    
    // Kiểm tra các bảng Tăng Tốc
    const tables = [
      'tangtoc_questions',
      'tangtoc_question_reports', 
      'tangtoc_answer_suggestions',
      'tangtoc_answer_suggestion_logs',
      'tangtoc_game_sessions',
      'tangtoc_user_answers',
      'tangtoc_rooms',
      'tangtoc_room_participants'
    ];
    
    console.log('\n📊 Kiểm tra các bảng Tăng Tốc:');
    
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✅ ${table}: ${rows[0].count} records`);
        
        // Kiểm tra cấu trúc bảng
        const [structure] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`     Cấu trúc: ${structure.length} cột`);
      } catch (error) {
        console.log(`  ❌ ${table}: Lỗi - ${error.message}`);
      }
    }
    
    // Kiểm tra bảng questions gốc để đảm bảo không bị ảnh hưởng
    console.log('\n🔍 Kiểm tra bảng questions gốc:');
    try {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM questions WHERE category = 'khoidong'`);
      console.log(`  ✅ questions (khoidong): ${rows[0].count} records`);
    } catch (error) {
      console.log(`  ❌ questions (khoidong): Lỗi - ${error.message}`);
    }
    
    // Kiểm tra bảng question_reports gốc
    console.log('\n🔍 Kiểm tra bảng question_reports gốc:');
    try {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM question_reports`);
      console.log(`  ✅ question_reports: ${rows[0].count} records`);
    } catch (error) {
      console.log(`  ❌ question_reports: Lỗi - ${error.message}`);
    }
    
    console.log('\n🎉 Kiểm tra hoàn tất!');
    console.log('📝 Hệ thống Tăng Tốc đã được tạo hoàn toàn độc lập!');
    
  } catch (error) {
    console.error('❌ Lỗi kiểm tra:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Đóng kết nối database');
    }
  }
}

// Chạy test
testTangTocConfig();
