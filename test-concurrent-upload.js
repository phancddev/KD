/**
 * Test Concurrent Upload - Kiểm tra race condition
 * 
 * Test scenario:
 * 1. Upload đồng thời 3 câu hỏi cho cùng 1 thí sinh
 * 2. Verify tất cả 3 câu đều được lưu vào match.json
 * 3. Verify không bị mất dữ liệu do race condition
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const KD_SERVER = 'http://localhost:3000';
const TEST_MATCH_ID = process.argv[2]; // Truyền matchId qua command line

if (!TEST_MATCH_ID) {
  console.error('❌ Usage: node test-concurrent-upload.js <matchId>');
  console.error('   Example: node test-concurrent-upload.js match_ABC123_test');
  process.exit(1);
}

/**
 * Upload 1 câu hỏi
 */
async function uploadQuestion(matchId, section, playerIndex, questionOrder, questionText, answerText) {
  const formData = new FormData();
  formData.append('section', section);
  formData.append('playerIndex', playerIndex.toString());
  formData.append('questionOrder', questionOrder.toString());
  formData.append('questionType', 'text');
  formData.append('questionText', questionText);
  formData.append('answerText', answerText);
  formData.append('points', '10');
  formData.append('timeLimit', '10');

  const response = await fetch(`${KD_SERVER}/api/matches/${matchId}/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Cookie': 'connect.sid=test-session' // Mock session
    }
  });

  const result = await response.json();
  return result;
}

/**
 * Lấy match.json từ server
 */
async function getMatch(matchId) {
  const response = await fetch(`${KD_SERVER}/api/matches/${matchId}`, {
    headers: {
      'Cookie': 'connect.sid=test-session'
    }
  });

  const result = await response.json();
  return result.data;
}

/**
 * Test 1: Upload tuần tự (baseline)
 */
async function testSequentialUpload() {
  console.log('\n📝 Test 1: Upload Tuần Tự (Baseline)');
  console.log('='.repeat(60));

  const questions = [
    { order: 0, text: 'Câu hỏi 1 - Sequential', answer: 'Đáp án 1' },
    { order: 1, text: 'Câu hỏi 2 - Sequential', answer: 'Đáp án 2' },
    { order: 2, text: 'Câu hỏi 3 - Sequential', answer: 'Đáp án 3' }
  ];

  const startTime = Date.now();

  for (const q of questions) {
    console.log(`   Uploading question ${q.order}...`);
    const result = await uploadQuestion(
      TEST_MATCH_ID,
      'khoi_dong_rieng',
      0, // Player 1
      q.order,
      q.text,
      q.answer
    );

    if (result.success) {
      console.log(`   ✅ Question ${q.order} uploaded`);
    } else {
      console.error(`   ❌ Question ${q.order} failed:`, result.error);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`\n⏱️  Duration: ${duration}ms`);

  // Verify
  const match = await getMatch(TEST_MATCH_ID);
  const player = match.sections.khoi_dong_rieng.players.find(p => p.player_index === 0);
  const uploadedCount = player?.questions?.length || 0;

  console.log(`\n📊 Verification:`);
  console.log(`   Expected: 3 questions`);
  console.log(`   Actual: ${uploadedCount} questions`);
  console.log(`   Result: ${uploadedCount === 3 ? '✅ PASS' : '❌ FAIL'}`);

  return uploadedCount === 3;
}

/**
 * Test 2: Upload đồng thời (concurrent)
 */
async function testConcurrentUpload() {
  console.log('\n📝 Test 2: Upload Đồng Thời (Concurrent)');
  console.log('='.repeat(60));

  const questions = [
    { order: 3, text: 'Câu hỏi 4 - Concurrent', answer: 'Đáp án 4' },
    { order: 4, text: 'Câu hỏi 5 - Concurrent', answer: 'Đáp án 5' },
    { order: 5, text: 'Câu hỏi 6 - Concurrent', answer: 'Đáp án 6' }
  ];

  const startTime = Date.now();

  // Upload đồng thời bằng Promise.all
  console.log(`   Uploading 3 questions concurrently...`);
  const promises = questions.map(q => 
    uploadQuestion(
      TEST_MATCH_ID,
      'khoi_dong_rieng',
      0, // Player 1
      q.order,
      q.text,
      q.answer
    )
  );

  const results = await Promise.all(promises);

  const duration = Date.now() - startTime;
  console.log(`\n⏱️  Duration: ${duration}ms`);

  // Check results
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`   ✅ Question ${questions[index].order} uploaded`);
    } else {
      console.error(`   ❌ Question ${questions[index].order} failed:`, result.error);
    }
  });

  // Verify
  const match = await getMatch(TEST_MATCH_ID);
  const player = match.sections.khoi_dong_rieng.players.find(p => p.player_index === 0);
  const uploadedCount = player?.questions?.length || 0;

  console.log(`\n📊 Verification:`);
  console.log(`   Expected: 6 questions (3 from test 1 + 3 from test 2)`);
  console.log(`   Actual: ${uploadedCount} questions`);
  console.log(`   Result: ${uploadedCount === 6 ? '✅ PASS' : '❌ FAIL'}`);

  // Verify orders
  const orders = player?.questions?.map(q => q.order).sort((a, b) => a - b) || [];
  const expectedOrders = [0, 1, 2, 3, 4, 5];
  const ordersMatch = JSON.stringify(orders) === JSON.stringify(expectedOrders);

  console.log(`\n📊 Order Verification:`);
  console.log(`   Expected orders: ${expectedOrders.join(', ')}`);
  console.log(`   Actual orders: ${orders.join(', ')}`);
  console.log(`   Result: ${ordersMatch ? '✅ PASS' : '❌ FAIL'}`);

  return uploadedCount === 6 && ordersMatch;
}

/**
 * Test 3: Upload quá giới hạn (validation test)
 */
async function testValidation() {
  console.log('\n📝 Test 3: Validation - Upload Quá 6 Câu');
  console.log('='.repeat(60));

  console.log(`   Trying to upload 7th question...`);
  const result = await uploadQuestion(
    TEST_MATCH_ID,
    'khoi_dong_rieng',
    0, // Player 1
    6, // Order 6 (câu thứ 7)
    'Câu hỏi 7 - Should Fail',
    'Đáp án 7'
  );

  console.log(`\n📊 Verification:`);
  if (!result.success && result.error.includes('đã đủ')) {
    console.log(`   ✅ PASS - Validation works correctly`);
    console.log(`   Error message: "${result.error}"`);
    return true;
  } else {
    console.log(`   ❌ FAIL - Validation did not work`);
    console.log(`   Result:`, result);
    return false;
  }
}

/**
 * Test 4: Upload với order trùng (duplicate order test)
 */
async function testDuplicateOrder() {
  console.log('\n📝 Test 4: Validation - Upload Order Trùng');
  console.log('='.repeat(60));

  console.log(`   Trying to upload question with duplicate order 0...`);
  const result = await uploadQuestion(
    TEST_MATCH_ID,
    'khoi_dong_rieng',
    0, // Player 1
    0, // Order 0 (đã tồn tại)
    'Câu hỏi trùng - Should Fail',
    'Đáp án trùng'
  );

  console.log(`\n📊 Verification:`);
  if (!result.success && result.error.includes('đã tồn tại')) {
    console.log(`   ✅ PASS - Duplicate order validation works`);
    console.log(`   Error message: "${result.error}"`);
    return true;
  } else {
    console.log(`   ❌ FAIL - Duplicate order validation did not work`);
    console.log(`   Result:`, result);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🧪 CONCURRENT UPLOAD TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Match ID: ${TEST_MATCH_ID}`);
  console.log(`KD Server: ${KD_SERVER}`);

  const results = {
    sequential: false,
    concurrent: false,
    validation: false,
    duplicateOrder: false
  };

  try {
    // Test 1: Sequential upload
    results.sequential = await testSequentialUpload();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s

    // Test 2: Concurrent upload
    results.concurrent = await testConcurrentUpload();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s

    // Test 3: Validation
    results.validation = await testValidation();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s

    // Test 4: Duplicate order
    results.duplicateOrder = await testDuplicateOrder();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Test 1 - Sequential Upload:     ${results.sequential ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 - Concurrent Upload:     ${results.concurrent ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 - Validation (Max 6):    ${results.validation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 - Duplicate Order:       ${results.duplicateOrder ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r === true);
    console.log('\n' + '='.repeat(60));
    console.log(allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
    console.log('='.repeat(60));

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

