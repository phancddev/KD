#!/usr/bin/env node

import { hashPassword, verifyPassword, hashPasswordWithSalt } from '../db/password-utils.js';
import { pool } from '../db/index.js';

async function testHashConsistency() {
  console.log("===== KIỂM TRA TÍNH NHẤT QUÁN CỦA THUẬT TOÁN HASH (Node.js) =====");
  
  // Test với mật khẩu đơn giản
  const testPassword = "admin123";
  console.log(`Test mật khẩu: ${testPassword}`);
  
  // Tạo hash
  const hashed = hashPassword(testPassword);
  console.log(`Hash tạo ra: ${hashed}`);
  
  // Kiểm tra verify
  const isValid = verifyPassword(testPassword, hashed);
  console.log(`Verify mật khẩu: ${isValid ? 'Thành công' : 'Thất bại'}`);
  
  // Test với mật khẩu khác
  const wrongPassword = "wrong123";
  const isValidWrong = verifyPassword(wrongPassword, hashed);
  console.log(`Verify mật khẩu sai: ${isValidWrong ? 'Thành công (LỖI!)' : 'Thất bại (ĐÚNG)'}`);
  
  // Test với salt cố định
  console.log("\n--- Test với salt cố định ---");
  const fixedSalt = "1234567890abcdef";
  const fixedHash = hashPasswordWithSalt(testPassword, fixedSalt);
  console.log(`Hash với salt cố định: ${fixedHash}`);
  
  // Verify với salt cố định
  const isValidFixed = verifyPassword(testPassword, fixedHash);
  console.log(`Verify với salt cố định: ${isValidFixed ? 'Thành công' : 'Thất bại'}`);
  
  console.log("\n===== KẾT QUẢ =====");
  if (isValid && !isValidWrong && isValidFixed) {
    console.log("✅ Thuật toán hash hoạt động nhất quán!");
    return true;
  } else {
    console.log("❌ Có vấn đề với thuật toán hash!");
    return false;
  }
}

async function main() {
  try {
    console.log("Bắt đầu kiểm tra tính nhất quán của thuật toán hash...");
    
    // Test 1: Kiểm tra thuật toán hash
    const hashTest = await testHashConsistency();
    
    console.log("\n===== TỔNG KẾT =====");
    if (hashTest) {
      console.log("🎉 Test thuật toán hash thành công!");
    } else {
      console.log("⚠️ Có vấn đề với thuật toán hash!");
    }
    
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

main(); 