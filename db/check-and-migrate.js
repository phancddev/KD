/**
 * Check database schema and run migrations safely (IDEMPOTENT)
 *
 * Logic:
 * 1. IF column exists -> SKIP migration
 * 2. IF column NOT exists -> RUN migration
 * 3. IF storage_folder IS NULL -> UPDATE with generated value
 * 4. IF storage_folder HAS value -> SKIP update
 *
 * Safe to run multiple times - no data loss
 */

import { pool } from '../db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if column exists in table
 */
async function columnExists(tableName, columnName) {
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, columnName]);

  return columns.length > 0;
}

/**
 * Check if index exists in table
 */
async function indexExists(tableName, indexName) {
  const [indexes] = await pool.query(`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
  `, [tableName, indexName]);

  return indexes.length > 0;
}

/**
 * Add storage_folder column if not exists
 */
async function addStorageFolderColumn() {
  const hasColumn = await columnExists('matches', 'storage_folder');

  if (hasColumn) {
    console.log('   ✅ Column storage_folder already exists - SKIP');
    return false;
  }

  console.log('   ⚠️  Column storage_folder NOT exists - ADDING...');

  await pool.query(`
    ALTER TABLE matches
    ADD COLUMN storage_folder VARCHAR(255) NULL
    COMMENT 'Tên folder lưu trữ trên Data Node (format: YYYYMMDD_CODE_TenTran)'
    AFTER data_node_id
  `);

  console.log('   ✅ Column added successfully');
  return true;
}

/**
 * Add index on storage_folder if not exists
 */
async function addStorageFolderIndex() {
  const hasIndex = await indexExists('matches', 'idx_storage_folder');

  if (hasIndex) {
    console.log('   ✅ Index idx_storage_folder already exists - SKIP');
    return false;
  }

  console.log('   ⚠️  Index idx_storage_folder NOT exists - ADDING...');

  await pool.query(`
    CREATE INDEX idx_storage_folder ON matches(storage_folder)
  `);

  console.log('   ✅ Index added successfully');
  return true;
}

/**
 * Add media_type column to match_questions if not exists
 */
async function addMediaTypeColumn() {
  const hasColumn = await columnExists('match_questions', 'media_type');

  if (hasColumn) {
    console.log('   ✅ Column media_type already exists - SKIP');
    return false;
  }

  console.log('   ⚠️  Column media_type NOT exists - ADDING...');

  await pool.query(`
    ALTER TABLE match_questions
    ADD COLUMN media_type VARCHAR(50) NULL
    COMMENT 'Loại media (image/jpeg, video/mp4, etc)'
    AFTER media_url
  `);

  console.log('   ✅ Column added successfully');
  return true;
}

/**
 * Add game_mode column to game_sessions if not exists
 */
async function addGameModeColumn() {
  const hasColumn = await columnExists('game_sessions', 'game_mode');

  if (hasColumn) {
    console.log('   ✅ Column game_mode already exists - SKIP');
    return false;
  }

  console.log('   ⚠️  Column game_mode NOT exists - ADDING...');

  await pool.query(`
    ALTER TABLE game_sessions
    ADD COLUMN game_mode ENUM('khoidong', 'tangtoc') DEFAULT 'khoidong'
    COMMENT 'Chế độ chơi: khoidong hoặc tangtoc'
    AFTER is_solo
  `);

  console.log('   ✅ Column added successfully');
  return true;
}

/**
 * Add index on game_mode if not exists
 */
async function addGameModeIndex() {
  const hasIndex = await indexExists('game_sessions', 'idx_game_sessions_game_mode');

  if (hasIndex) {
    console.log('   ✅ Index idx_game_sessions_game_mode already exists - SKIP');
    return false;
  }

  console.log('   ⚠️  Index idx_game_sessions_game_mode NOT exists - ADDING...');

  await pool.query(`
    CREATE INDEX idx_game_sessions_game_mode ON game_sessions(game_mode)
  `);

  console.log('   ✅ Index added successfully');
  return true;
}

/**
 * Update existing game_sessions records with NULL game_mode
 */
async function updateNullGameMode() {
  const [count] = await pool.query(`
    SELECT COUNT(*) as count
    FROM game_sessions
    WHERE game_mode IS NULL
  `);

  if (count[0].count === 0) {
    console.log('   ✅ All game_sessions already have game_mode - SKIP');
    return false;
  }

  console.log(`   ⚠️  Found ${count[0].count} game_sessions with NULL game_mode - UPDATING...`);

  await pool.query(`
    UPDATE game_sessions
    SET game_mode = 'khoidong'
    WHERE game_mode IS NULL
  `);

  console.log(`   ✅ Updated ${count[0].count} record(s) to default 'khoidong'`);
  return true;
}

/**
 * Fix match_questions table - add all missing columns
 * NOTE: Bảng này đã bị DROP trong v2.0 (questions lưu trong match.json trên Data Nodes)
 * Function này giữ lại để tương thích với code cũ, nhưng sẽ skip nếu bảng không tồn tại
 */
async function fixMatchQuestionsSchema() {
  console.log('   Checking match_questions columns...');

  // Kiểm tra xem bảng match_questions có tồn tại không
  const [tables] = await pool.query(`
    SELECT COUNT(*) as count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'match_questions'
  `);

  if (tables[0].count === 0) {
    console.log('   ℹ️  Bảng match_questions không tồn tại (đã chuyển sang match.json trên Data Nodes) - SKIP');
    return false;
  }

  let anyChanges = false;

  // Check and add answer_text
  if (!await columnExists('match_questions', 'answer_text')) {
    console.log('   ⚠️  Adding answer_text...');
    await pool.query(`
      ALTER TABLE match_questions
      ADD COLUMN answer_text TEXT NULL
      COMMENT 'Đáp án đúng'
      AFTER media_type
    `);
    anyChanges = true;
  }

  // Check and add answer_options
  if (!await columnExists('match_questions', 'answer_options')) {
    console.log('   ⚠️  Adding answer_options...');
    await pool.query(`
      ALTER TABLE match_questions
      ADD COLUMN answer_options JSON NULL
      COMMENT 'Các lựa chọn (nếu có)'
      AFTER answer_text
    `);
    anyChanges = true;
  }

  // Check and add points
  if (!await columnExists('match_questions', 'points')) {
    console.log('   ⚠️  Adding points...');
    await pool.query(`
      ALTER TABLE match_questions
      ADD COLUMN points INT DEFAULT 10
      COMMENT 'Điểm cho câu hỏi'
      AFTER answer_options
    `);
    anyChanges = true;
  }

  // Check and add time_limit
  if (!await columnExists('match_questions', 'time_limit')) {
    console.log('   ⚠️  Adding time_limit...');
    await pool.query(`
      ALTER TABLE match_questions
      ADD COLUMN time_limit INT NULL
      COMMENT 'Thời gian giới hạn (giây)'
      AFTER points
    `);
    anyChanges = true;
  }

  if (anyChanges) {
    console.log('   ✅ match_questions schema fixed');
  } else {
    console.log('   ✅ match_questions schema already complete - SKIP');
  }

  return anyChanges;
}

async function checkAndMigrate() {
  try {
    console.log('🔍 Checking database schema...\n');

    let anyChanges = false;

    // ============================================
    // STEP 1: Add game_mode column to game_sessions
    // ============================================
    console.log('📝 Step 1: Check game_mode column in game_sessions');
    const gameModeAdded = await addGameModeColumn();
    anyChanges = anyChanges || gameModeAdded;

    // ============================================
    // STEP 2: Add game_mode index
    // ============================================
    console.log('\n📝 Step 2: Check game_mode index');
    const gameModeIndexAdded = await addGameModeIndex();
    anyChanges = anyChanges || gameModeIndexAdded;

    // ============================================
    // STEP 3: Update NULL game_mode values
    // ============================================
    console.log('\n📝 Step 3: Update NULL game_mode values');
    const gameModeUpdated = await updateNullGameMode();
    anyChanges = anyChanges || gameModeUpdated;

    // ============================================
    // STEP 4: Add storage_folder column if not exists
    // ============================================
    console.log('\n📝 Step 4: Check storage_folder column');
    const columnAdded = await addStorageFolderColumn();
    anyChanges = anyChanges || columnAdded;

    // ============================================
    // STEP 5: Add index if not exists
    // ============================================
    console.log('\n📝 Step 5: Check storage_folder index');
    const indexAdded = await addStorageFolderIndex();
    anyChanges = anyChanges || indexAdded;

    // ============================================
    // STEP 6: Fix match_questions schema
    // ============================================
    console.log('\n📝 Step 6: Fix match_questions schema');
    const questionsFixed = await fixMatchQuestionsSchema();
    anyChanges = anyChanges || questionsFixed;

    if (anyChanges) {
      console.log('\n✅ Migration completed!\n');
    } else {
      console.log('\n✅ Schema already up to date - no migration needed\n');
    }

    // ============================================
    // STEP 7: Check current matches state
    // ============================================
    console.log('\n📊 Step 7: Check existing matches');

    // Kiểm tra schema version (v1 có 'code', v2 có 'match_code')
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'matches'
      AND COLUMN_NAME IN ('code', 'match_code')
    `);

    const hasMatchCode = columns.some(c => c.COLUMN_NAME === 'match_code');
    const codeColumn = hasMatchCode ? 'match_code' : 'code';
    const nameColumn = hasMatchCode ? 'match_name' : 'name';

    const [matches] = await pool.query(`
      SELECT id, ${codeColumn} as code, ${nameColumn} as name, storage_folder, created_at
      FROM matches
      ORDER BY id
    `);

    if (matches.length === 0) {
      console.log('   ℹ️  No matches found in database');
    } else {
      console.log(`   Found ${matches.length} match(es)`);

      // Count matches with/without storage_folder
      const withFolder = matches.filter(m => m.storage_folder).length;
      const withoutFolder = matches.filter(m => !m.storage_folder).length;

      console.log(`   ✅ With storage_folder: ${withFolder}`);
      if (withoutFolder > 0) {
        console.log(`   ⚠️  Without storage_folder: ${withoutFolder}`);
      }
    }

    // ============================================
    // STEP 8: Update NULL storage_folder values
    // ============================================
    console.log('\n📝 Step 8: Update NULL values');

    const [count] = await pool.query(`
      SELECT COUNT(*) as count
      FROM matches
      WHERE storage_folder IS NULL
    `);

    if (count[0].count > 0) {
      console.log(`   Found ${count[0].count} match(es) with NULL storage_folder`);

      // Get matches without storage_folder
      const [nullMatches] = await pool.query(`
        SELECT id, ${codeColumn} as code, ${nameColumn} as name, created_at
        FROM matches
        WHERE storage_folder IS NULL
      `);

      // Update each match individually
      let updated = 0;
      for (const match of nullMatches) {
        try {
          // Generate date string from created_at
          const dateStr = new Date(match.created_at).toISOString().slice(0, 10).replace(/-/g, '');

          // Remove Vietnamese tones and special chars
          let cleanName = match.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          cleanName = cleanName.replace(/đ/g, 'd').replace(/Đ/g, 'D');
          cleanName = cleanName.replace(/[^a-zA-Z0-9]/g, '');

          // Generate storage folder name
          const storageFolder = `${dateStr}_${match.code}_${cleanName}`;

          // Update database
          await pool.query(
            'UPDATE matches SET storage_folder = ? WHERE id = ?',
            [storageFolder, match.id]
          );

          console.log(`   ✅ Match ${match.id}: ${storageFolder}`);
          updated++;
        } catch (error) {
          console.log(`   ❌ Match ${match.id}: Failed - ${error.message}`);
        }
      }

      console.log(`   ✅ Updated ${updated}/${nullMatches.length} match(es)`);
    } else {
      console.log('\n📝 Step 8: Update NULL values');
      console.log('   ✅ All matches already have storage_folder - SKIP');
    }

    console.log('\n========================================');
    console.log('✅ Database migration completed!');
    console.log('========================================\n');

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAndMigrate();

