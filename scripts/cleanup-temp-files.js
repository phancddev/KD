/**
 * Script để cleanup các file temp cũ trong uploads/temp/
 * Chạy định kỳ để xóa các file temp bị bỏ sót
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp');
const MAX_AGE_HOURS = 1; // Xóa file cũ hơn 1 giờ

async function cleanupTempFiles() {
  try {
    console.log('🧹 Starting temp files cleanup...');
    console.log(`   Temp directory: ${TEMP_DIR}`);
    
    // Kiểm tra folder có tồn tại không
    try {
      await fs.access(TEMP_DIR);
    } catch (error) {
      console.log('   Temp directory does not exist. Nothing to clean.');
      return;
    }
    
    const files = await fs.readdir(TEMP_DIR);
    console.log(`   Found ${files.length} files`);
    
    if (files.length === 0) {
      console.log('✅ No temp files to clean');
      return;
    }
    
    const now = Date.now();
    const maxAge = MAX_AGE_HOURS * 60 * 60 * 1000; // Convert to milliseconds
    
    let deletedCount = 0;
    let skippedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      
      try {
        const stats = await fs.stat(filePath);
        
        // Bỏ qua nếu là directory
        if (stats.isDirectory()) {
          skippedCount++;
          continue;
        }
        
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > maxAge) {
          await fs.unlink(filePath);
          console.log(`   🗑️  Deleted: ${file} (age: ${Math.round(fileAge / 1000 / 60)} minutes)`);
          deletedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${file}:`, error.message);
      }
    }
    
    console.log(`✅ Cleanup complete: ${deletedCount} deleted, ${skippedCount} skipped`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Chạy cleanup
cleanupTempFiles();

