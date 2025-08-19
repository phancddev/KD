import { deleteUsersByHour, deleteUsersByHourInDay, getUsersForDeletion } from './db/users.js';

async function testDeleteByHour() {
  try {
    console.log('🧪 Test chức năng xóa theo giờ...\n');

    // Test 1: Xem trước người dùng tạo từ 9h-12h hôm nay
    console.log('1️⃣ Xem trước người dùng tạo từ 9h-12h hôm nay:');
    try {
      const preview1 = await getUsersForDeletion({
        fromHour: 9,
        toHour: 12
      });
      console.log(`   📊 Tìm thấy ${preview1.length} người dùng`);
      if (preview1.length > 0) {
        console.log('   👥 Danh sách:');
        preview1.slice(0, 3).forEach(user => {
          console.log(`      - ${user.username} (${user.localCreatedAt})`);
        });
        if (preview1.length > 3) {
          console.log(`      ... và ${preview1.length - 3} người dùng khác`);
        }
      }
    } catch (error) {
      console.error('   ❌ Lỗi:', error.message);
    }

    // Test 2: Xem trước người dùng tạo từ 14h-18h ngày cụ thể
    console.log('\n2️⃣ Xem trước người dùng tạo từ 14h-18h ngày 2025-08-17:');
    try {
      const preview2 = await getUsersForDeletion({
        fromDate: '2025-08-17',
        toDate: '2025-08-17',
        fromHour: 14,
        toHour: 18
      });
      console.log(`   📊 Tìm thấy ${preview2.length} người dùng`);
      if (preview2.length > 0) {
        console.log('   👥 Danh sách:');
        preview2.slice(0, 3).forEach(user => {
          console.log(`      - ${user.username} (${user.localCreatedAt})`);
        });
        if (preview2.length > 3) {
          console.log(`      ... và ${preview2.length - 3} người dùng khác`);
        }
      }
    } catch (error) {
      console.error('   ❌ Lỗi:', error.message);
    }

    // Test 3: Xem trước người dùng tạo từ 0h-6h (đêm khuya)
    console.log('\n3️⃣ Xem trước người dùng tạo từ 0h-6h (đêm khuya):');
    try {
      const preview3 = await getUsersForDeletion({
        fromHour: 0,
        toHour: 6
      });
      console.log(`   📊 Tìm thấy ${preview3.length} người dùng`);
      if (preview3.length > 0) {
        console.log('   👥 Danh sách:');
        preview3.slice(0, 3).forEach(user => {
          console.log(`      - ${user.username} (${user.localCreatedAt})`);
        });
        if (preview3.length > 3) {
          console.log(`      ... và ${preview3.length - 3} người dùng khác`);
        }
      }
    } catch (error) {
      console.error('   ❌ Lỗi:', error.message);
    }

    console.log('\n✅ Test hoàn tất!');
    console.log('\n💡 Cách sử dụng:');
    console.log('   - Xóa theo giờ hôm nay: deleteUsersByHour({ fromHour: 9, toHour: 12 })');
    console.log('   - Xóa theo giờ ngày cụ thể: deleteUsersByHourInDay({ date: "2025-08-17", fromHour: 14, toHour: 18 })');
    console.log('   - Xem trước: getUsersForDeletion({ fromHour: 9, toHour: 12 })');

  } catch (error) {
    console.error('❌ Lỗi test:', error);
  }
}

// Chạy test
testDeleteByHour(); 