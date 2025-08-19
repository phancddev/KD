import { getUsersForDeletion } from './db/users.js';

async function testSimplePreview() {
  try {
    console.log('🧪 Test preview đơn giản...\n');

    // Test 1: Không có điều kiện nào
    console.log('1️⃣ Test không có điều kiện nào:');
    try {
      const preview1 = await getUsersForDeletion({});
      console.log(`   ✅ Thành công: ${preview1.length} người dùng`);
    } catch (error) {
      console.error('   ❌ Lỗi:', error.message);
      console.error('   Stack:', error.stack);
    }

    // Test 2: Chỉ có fromHour và toHour
    console.log('\n2️⃣ Test chỉ có fromHour và toHour:');
    try {
      const preview2 = await getUsersForDeletion({
        fromHour: 9,
        toHour: 12
      });
      console.log(`   ✅ Thành công: ${preview2.length} người dùng`);
    } catch (error) {
      console.error('   ❌ Lỗi:', error.message);
      console.error('   Stack:', error.stack);
    }

    // Test 3: Chỉ có fromDate và toDate
    console.log('\n3️⃣ Test chỉ có fromDate và toDate:');
    try {
      const preview3 = await getUsersForDeletion({
        fromDate: '2025-08-17',
        toDate: '2025-08-17'
      });
      console.log(`   ✅ Thành công: ${preview3.length} người dùng`);
    } catch (error) {
      console.error('   ❌ Lỗi:', error.message);
      console.error('   Stack:', error.stack);
    }

    console.log('\n✅ Test hoàn tất!');

  } catch (error) {
    console.error('❌ Lỗi test:', error);
  }
}

// Chạy test
testSimplePreview(); 