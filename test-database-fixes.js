#!/usr/bin/env node

/**
 * Test Database Fixes
 * Verify that all database schema issues are resolved
 */

import { pool } from './db/index.js';

console.log('🧪 TESTING DATABASE FIXES\n');
console.log('='.repeat(60));

const tests = [];
let passed = 0;
let failed = 0;

/**
 * Test helper
 */
function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * Run all tests
 */
async function runTests() {
  for (const { name, fn } of tests) {
    try {
      console.log(`\n🧪 ${name}`);
      await fn();
      console.log(`   ✅ PASSED`);
      passed++;
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      failed++;
    }
  }
}

/**
 * Define tests
 */

test('Table match_questions exists', async () => {
  const [tables] = await pool.query(`SHOW TABLES LIKE 'match_questions'`);
  if (tables.length === 0) {
    throw new Error('Table does not exist');
  }
});

test('Column answer_text exists', async () => {
  const [cols] = await pool.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'match_questions'
       AND COLUMN_NAME = 'answer_text'`
  );
  if (cols[0].count === 0) {
    throw new Error('Column answer_text does not exist');
  }
});

test('Column answer does NOT exist', async () => {
  const [cols] = await pool.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'match_questions'
       AND COLUMN_NAME = 'answer'`
  );
  if (cols[0].count > 0) {
    throw new Error('Old column "answer" still exists - should be removed');
  }
});

test('Column answer_text is nullable', async () => {
  const [cols] = await pool.query(
    `SELECT IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'match_questions'
       AND COLUMN_NAME = 'answer_text'`
  );
  if (cols[0].IS_NULLABLE !== 'YES') {
    throw new Error('Column answer_text should be nullable');
  }
});

test('Column media_type exists', async () => {
  const [cols] = await pool.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'match_questions'
       AND COLUMN_NAME = 'media_type'`
  );
  if (cols[0].count === 0) {
    throw new Error('Column media_type does not exist');
  }
});

test('Column answer_options exists', async () => {
  const [cols] = await pool.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'match_questions'
       AND COLUMN_NAME = 'answer_options'`
  );
  if (cols[0].count === 0) {
    throw new Error('Column answer_options does not exist');
  }
});

test('Column answer_options is JSON type', async () => {
  const [cols] = await pool.query(
    `SELECT COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'match_questions'
       AND COLUMN_NAME = 'answer_options'`
  );
  if (!cols[0].COLUMN_TYPE.toLowerCase().includes('json')) {
    throw new Error('Column answer_options should be JSON type');
  }
});

test('Can insert question with answer_text', async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Create test match first
    const [matchResult] = await connection.query(
      `INSERT INTO matches (code, name, host_user_id, status)
       VALUES ('TEST001', 'Test Match', 1, 'draft')`
    );
    const matchId = matchResult.insertId;

    // Insert test question
    await connection.query(
      `INSERT INTO match_questions
       (match_id, section, question_order, question_type, question_text, answer_text, points)
       VALUES (?, 'khoi_dong_rieng', 1, 'text', 'Test question?', 'Test answer', 10)`,
      [matchId]
    );

    await connection.rollback(); // Don't save test data
  } finally {
    connection.release();
  }
});

test('Can insert question with NULL answer_text', async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Create test match
    const [matchResult] = await connection.query(
      `INSERT INTO matches (code, name, host_user_id, status)
       VALUES ('TEST002', 'Test Match 2', 1, 'draft')`
    );
    const matchId = matchResult.insertId;

    // Insert question with NULL answer_text (for image/video questions)
    await connection.query(
      `INSERT INTO match_questions
       (match_id, section, question_order, question_type, media_url, answer_text)
       VALUES (?, 'tang_toc', 1, 'image', 'http://example.com/image.jpg', NULL)`,
      [matchId]
    );

    await connection.rollback();
  } finally {
    connection.release();
  }
});

test('Table matches has storage_folder column', async () => {
  const [cols] = await pool.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'matches'
       AND COLUMN_NAME = 'storage_folder'`
  );
  if (cols[0].count === 0) {
    throw new Error('Column storage_folder does not exist in matches table');
  }
});

test('All required tables exist', async () => {
  const requiredTables = [
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

  for (const tableName of requiredTables) {
    const [tables] = await pool.query(`SHOW TABLES LIKE ?`, [tableName]);
    if (tables.length === 0) {
      throw new Error(`Required table "${tableName}" does not exist`);
    }
  }
});

/**
 * Main
 */
async function main() {
  try {
    await runTests();

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 TEST RESULTS: ${passed} passed, ${failed} failed\n`);

    if (failed === 0) {
      console.log('✅ ALL TESTS PASSED!\n');
      console.log('🎉 Database schema is correct and ready to use.\n');
    } else {
      console.log('❌ SOME TESTS FAILED!\n');
      console.log('Please run: node fix-database-schema.js\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

