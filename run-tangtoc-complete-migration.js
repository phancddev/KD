import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTangTocCompleteMigration() {
  let connection;
  
  try {
    console.log('🔗 Kết nối đến database...');
    
    // Kết nối đến database
    connection = await createConnection({
      host: 'localhost',
      port: 3307,
      user: 'nqd_user',
      password: 'nqd_password',
      database: 'nqd_database'
    });
    
    console.log('✅ Kết nối database thành công!');
    
    // Đọc file migration
    const migrationPath = path.join(__dirname, 'db', 'init', '03-tangtoc-complete-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Đọc file migration thành công!');
    
    // Chia SQL thành các câu lệnh riêng biệt
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Bắt đầu thực thi ${statements.length} câu lệnh SQL...`);
    
    // Thực thi từng câu lệnh
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          console.log(`⏳ Thực thi câu lệnh ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
          console.log(`✅ Câu lệnh ${i + 1} thành công!`);
        } catch (error) {
          console.error(`❌ Lỗi ở câu lệnh ${i + 1}:`, error.message);
          console.log(`📝 Câu lệnh: ${statement.substring(0, 100)}...`);
          // Tiếp tục với câu lệnh tiếp theo
        }
      }
    }
    
    console.log('🎉 Migration hoàn tất!');
    
    // Kiểm tra kết quả
    console.log('\n📊 Kiểm tra kết quả:');
    
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
    
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✅ ${table}: ${rows[0].count} records`);
      } catch (error) {
        console.log(`  ❌ ${table}: Lỗi - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Đóng kết nối database');
    }
  }
}

// Chạy migration
runTangTocCompleteMigration();
