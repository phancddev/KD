/**
 * Run migration to add storage_folder column
 */

import { pool } from './db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Running migration: add_storage_folder_to_matches.sql');
    
    const migrationPath = path.join(__dirname, 'db', 'migrations', 'add_storage_folder_to_matches.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 100) + '...');
        await pool.query(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Update existing matches with storage_folder
    console.log('\n🔄 Updating existing matches with storage_folder...');
    
    const [matches] = await pool.query('SELECT id, code, name FROM matches WHERE storage_folder IS NULL');
    
    if (matches.length > 0) {
      console.log(`Found ${matches.length} matches without storage_folder`);
      
      for (const match of matches) {
        // Generate storage folder name
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // Remove Vietnamese tones
        let cleanName = match.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        cleanName = cleanName.replace(/đ/g, 'd').replace(/Đ/g, 'D');
        cleanName = cleanName.replace(/[^a-zA-Z0-9]/g, '');
        
        const storageFolder = `${dateStr}_${match.code}_${cleanName}`;
        
        await pool.query(
          'UPDATE matches SET storage_folder = ? WHERE id = ?',
          [storageFolder, match.id]
        );
        
        console.log(`  ✅ Updated match ${match.id}: ${storageFolder}`);
      }
    } else {
      console.log('No matches to update');
    }
    
    console.log('\n✅ All done!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

