#!/usr/bin/env node

/**
 * Test game_mode migration
 * 
 * This script tests:
 * 1. Check if game_mode column exists
 * 2. Check if index exists
 * 3. Check if existing records have game_mode
 */

import { pool } from './db/index.js';

async function checkColumn() {
  console.log('🔍 Checking game_mode column...\n');
  
  const [columns] = await pool.query(`
    SELECT 
      COLUMN_NAME,
      COLUMN_TYPE,
      COLUMN_DEFAULT,
      IS_NULLABLE,
      COLUMN_COMMENT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'game_sessions'
      AND COLUMN_NAME = 'game_mode'
  `);

  if (columns.length === 0) {
    console.log('❌ Column game_mode NOT exists!');
    return false;
  }

  console.log('✅ Column game_mode exists:');
  console.log('   Type:', columns[0].COLUMN_TYPE);
  console.log('   Default:', columns[0].COLUMN_DEFAULT);
  console.log('   Nullable:', columns[0].IS_NULLABLE);
  console.log('   Comment:', columns[0].COLUMN_COMMENT);
  return true;
}

async function checkIndex() {
  console.log('\n🔍 Checking game_mode index...\n');
  
  const [indexes] = await pool.query(`
    SELECT 
      INDEX_NAME,
      COLUMN_NAME,
      SEQ_IN_INDEX
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'game_sessions'
      AND INDEX_NAME = 'idx_game_sessions_game_mode'
  `);

  if (indexes.length === 0) {
    console.log('❌ Index idx_game_sessions_game_mode NOT exists!');
    return false;
  }

  console.log('✅ Index idx_game_sessions_game_mode exists:');
  indexes.forEach(idx => {
    console.log(`   Column: ${idx.COLUMN_NAME}, Position: ${idx.SEQ_IN_INDEX}`);
  });
  return true;
}

async function checkData() {
  console.log('\n🔍 Checking game_sessions data...\n');
  
  const [total] = await pool.query(`
    SELECT COUNT(*) as count FROM game_sessions
  `);

  console.log(`Total game_sessions: ${total[0].count}`);

  if (total[0].count === 0) {
    console.log('ℹ️  No game_sessions found');
    return true;
  }

  const [withGameMode] = await pool.query(`
    SELECT COUNT(*) as count FROM game_sessions WHERE game_mode IS NOT NULL
  `);

  const [withoutGameMode] = await pool.query(`
    SELECT COUNT(*) as count FROM game_sessions WHERE game_mode IS NULL
  `);

  const [byMode] = await pool.query(`
    SELECT game_mode, COUNT(*) as count
    FROM game_sessions
    GROUP BY game_mode
  `);

  console.log(`\nWith game_mode: ${withGameMode[0].count}`);
  console.log(`Without game_mode: ${withoutGameMode[0].count}`);
  
  console.log('\nBreakdown by mode:');
  byMode.forEach(row => {
    console.log(`   ${row.game_mode || 'NULL'}: ${row.count}`);
  });

  if (withoutGameMode[0].count > 0) {
    console.log('\n⚠️  Warning: Some game_sessions have NULL game_mode!');
    return false;
  }

  console.log('\n✅ All game_sessions have game_mode');
  return true;
}

async function main() {
  try {
    console.log('========================================');
    console.log('TEST GAME_MODE MIGRATION');
    console.log('========================================\n');

    const columnOk = await checkColumn();
    const indexOk = await checkIndex();
    const dataOk = await checkData();

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Column exists: ${columnOk ? '✅' : '❌'}`);
    console.log(`Index exists: ${indexOk ? '✅' : '❌'}`);
    console.log(`Data complete: ${dataOk ? '✅' : '❌'}`);

    if (columnOk && indexOk && dataOk) {
      console.log('\n✅ Migration is complete and working correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration needs to be run or has issues!');
      console.log('\nRun: node db/check-and-migrate.js');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

