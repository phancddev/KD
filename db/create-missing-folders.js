/**
 * Create missing storage folders for existing matches
 * This script will:
 * 1. Get all matches from database
 * 2. For each match with storage_folder, create folder on Data Node
 * 3. Skip if folder already exists
 */

import { pool } from '../db/index.js';
import { createFolderOnDataNode } from '../host_dan_data-node/socket/data-node-server.js';

async function createMissingFolders() {
  try {
    console.log('🔍 Checking for matches with missing folders...\n');
    
    // Get all matches with storage_folder and data_node_id
    const [matches] = await pool.query(`
      SELECT id, code, name, storage_folder, data_node_id
      FROM matches 
      WHERE storage_folder IS NOT NULL 
        AND data_node_id IS NOT NULL
      ORDER BY id
    `);
    
    if (matches.length === 0) {
      console.log('ℹ️  No matches found with storage_folder');
      process.exit(0);
    }
    
    console.log(`📊 Found ${matches.length} match(es) with storage_folder\n`);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const match of matches) {
      try {
        console.log(`📁 Match ${match.id}: ${match.storage_folder}`);
        console.log(`   Data Node ID: ${match.data_node_id}`);
        
        // Try to create folder on Data Node
        const result = await createFolderOnDataNode(match.data_node_id, match.storage_folder);
        
        if (result.success) {
          console.log(`   ✅ Folder created/verified: ${result.folderPath || match.storage_folder}`);
          created++;
        } else {
          console.log(`   ⚠️  Warning: ${result.message || 'Unknown error'}`);
          skipped++;
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failed++;
      }
      
      console.log('');
    }
    
    console.log('========================================');
    console.log('📊 Summary:');
    console.log(`   ✅ Created/Verified: ${created}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('========================================\n');
    
    if (failed > 0) {
      console.log('⚠️  Some folders failed to create.');
      console.log('   Possible reasons:');
      console.log('   - Data Node is offline');
      console.log('   - Network connection issue');
      console.log('   - Permission issue on Data Node');
      console.log('\n   Folders will be created automatically when files are uploaded.');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
createMissingFolders();

