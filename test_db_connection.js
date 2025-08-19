import { testConnection } from './db/index.js';

async function testDB() {
  try {
    console.log('🧪 Test kết nối database...');
    
    const result = await testConnection();
    console.log('✅ Kết nối database thành công:', result);
    
  } catch (error) {
    console.error('❌ Kết nối database lỗi:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDB(); 