import express from 'express';
import { getUsersForDeletion } from './db/users.js';

const app = express();
const PORT = 3001;

// Test route đơn giản
app.get('/test-preview', async (req, res) => {
  try {
    console.log('🧪 Test preview function...');
    
    const users = await getUsersForDeletion({
      fromHour: 9,
      toHour: 12
    });
    
    console.log('✅ Preview thành công:', users.length, 'users');
    res.json({ 
      success: true, 
      count: users.length,
      users: users.slice(0, 3) // Chỉ trả về 3 user đầu tiên
    });
    
  } catch (error) {
    console.error('❌ Preview lỗi:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Test server chạy tại http://localhost:${PORT}`);
  console.log('🧪 Test: http://localhost:3001/test-preview');
}); 