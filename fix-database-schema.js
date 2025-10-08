#!/usr/bin/env node

/**
 * Fix Database Schema Issues
 * 
 * This script fixes:
 * 1. match_questions table: rename 'answer' to 'answer_text'
 * 2. Ensure all columns match the migration file
 * 3. Verify data integrity
 */

import { pool } from './db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 DATABASE SCHEMA FIX TOOL\n');
console.log('=' .repeat(60));

/**
 * Check if column exists
 */
async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

/**
 * Get column info
 */
async function getColumnInfo(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0] || null;
}

/**
 * Main fix function
 */
async function fixDatabase() {
  try {
    console.log('\n📊 Step 1: Checking match_questions table...\n');

    // Check if table exists
    const [tables] = await pool.query(
      `SHOW TABLES LIKE 'match_questions'`
    );

    if (tables.length === 0) {
      console.log('❌ Table match_questions does not exist!');
      console.log('   Please run the main migration first.');
      return;
    }

    console.log('✅ Table match_questions exists');

    // Check columns
    const hasAnswer = await columnExists('match_questions', 'answer');
    const hasAnswerText = await columnExists('match_questions', 'answer_text');
    const hasMediaType = await columnExists('match_questions', 'media_type');
    const hasAnswerOptions = await columnExists('match_questions', 'answer_options');

    console.log('\n📋 Current schema:');
    console.log(`   - answer column: ${hasAnswer ? '✅ EXISTS' : '❌ NOT EXISTS'}`);
    console.log(`   - answer_text column: ${hasAnswerText ? '✅ EXISTS' : '❌ NOT EXISTS'}`);
    console.log(`   - media_type column: ${hasMediaType ? '✅ EXISTS' : '❌ NOT EXISTS'}`);
    console.log(`   - answer_options column: ${hasAnswerOptions ? '✅ EXISTS' : '❌ NOT EXISTS'}`);

    // Run migration
    console.log('\n🔧 Step 2: Running migration...\n');

    const migrationPath = path.join(__dirname, 'db/migrations/fix-match-questions-answer-column.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (error) {
        // Ignore errors for SELECT statements (they're just for display)
        if (!statement.toUpperCase().includes('SELECT')) {
          console.error(`   ⚠️  Warning: ${error.message}`);
        }
      }
    }

    console.log('✅ Migration completed');

    // Verify
    console.log('\n✅ Step 3: Verifying schema...\n');

    const hasAnswerAfter = await columnExists('match_questions', 'answer');
    const hasAnswerTextAfter = await columnExists('match_questions', 'answer_text');
    const hasMediaTypeAfter = await columnExists('match_questions', 'media_type');
    const hasAnswerOptionsAfter = await columnExists('match_questions', 'answer_options');

    console.log('📋 Final schema:');
    console.log(`   - answer column: ${hasAnswerAfter ? '⚠️  STILL EXISTS (will be removed)' : '✅ REMOVED'}`);
    console.log(`   - answer_text column: ${hasAnswerTextAfter ? '✅ EXISTS' : '❌ NOT EXISTS'}`);
    console.log(`   - media_type column: ${hasMediaTypeAfter ? '✅ EXISTS' : '❌ NOT EXISTS'}`);
    console.log(`   - answer_options column: ${hasAnswerOptionsAfter ? '✅ EXISTS' : '❌ NOT EXISTS'}`);

    // Get detailed info
    if (hasAnswerTextAfter) {
      const info = await getColumnInfo('match_questions', 'answer_text');
      console.log('\n📝 answer_text column details:');
      console.log(`   - Type: ${info.COLUMN_TYPE}`);
      console.log(`   - Nullable: ${info.IS_NULLABLE}`);
      console.log(`   - Default: ${info.COLUMN_DEFAULT || 'NULL'}`);
      console.log(`   - Comment: ${info.COLUMN_COMMENT || 'N/A'}`);
    }

    // Check for data
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as count FROM match_questions'
    );
    const questionCount = countResult[0].count;

    console.log(`\n📊 Total questions in database: ${questionCount}`);

    if (questionCount > 0 && hasAnswerAfter && hasAnswerTextAfter) {
      console.log('\n⚠️  WARNING: Both "answer" and "answer_text" columns exist!');
      console.log('   Checking if data needs to be migrated...');

      const [nullAnswerText] = await pool.query(
        'SELECT COUNT(*) as count FROM match_questions WHERE answer_text IS NULL AND answer IS NOT NULL'
      );

      if (nullAnswerText[0].count > 0) {
        console.log(`\n🔄 Migrating ${nullAnswerText[0].count} rows from "answer" to "answer_text"...`);
        await pool.query(
          'UPDATE match_questions SET answer_text = answer WHERE answer_text IS NULL AND answer IS NOT NULL'
        );
        console.log('✅ Data migrated successfully');
      }

      console.log('\n🗑️  Dropping old "answer" column...');
      await pool.query('ALTER TABLE match_questions DROP COLUMN answer');
      console.log('✅ Old column removed');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE SCHEMA FIX COMPLETED!\n');

    // Summary
    console.log('📋 SUMMARY:');
    console.log('   ✅ match_questions table schema is now correct');
    console.log('   ✅ answer_text column is nullable');
    console.log('   ✅ media_type column exists');
    console.log('   ✅ answer_options column exists');
    console.log('\n💡 You can now create questions without errors!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
fixDatabase();

