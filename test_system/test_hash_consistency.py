#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import mysql.connector
from mysql.connector import Error

# Import utility chung
sys.path.append(os.path.dirname(__file__))
from password_utils import hash_password, verify_password

def test_hash_consistency():
    """Kiểm tra tính nhất quán của thuật toán hash"""
    print("===== KIỂM TRA TÍNH NHẤT QUÁN CỦA THUẬT TOÁN HASH =====")
    
    # Test với mật khẩu đơn giản
    test_password = "admin123"
    print(f"Test mật khẩu: {test_password}")
    
    # Tạo hash
    hashed = hash_password(test_password)
    print(f"Hash tạo ra: {hashed}")
    
    # Kiểm tra verify
    is_valid = verify_password(test_password, hashed)
    print(f"Verify mật khẩu: {'Thành công' if is_valid else 'Thất bại'}")
    
    # Test với mật khẩu khác
    wrong_password = "wrong123"
    is_valid_wrong = verify_password(wrong_password, hashed)
    print(f"Verify mật khẩu sai: {'Thành công (LỖI!)' if is_valid_wrong else 'Thất bại (ĐÚNG)'}")
    
    # Test với salt cố định
    print("\n--- Test với salt cố định ---")
    fixed_salt = "1234567890abcdef"
    from password_utils import hash_password_with_salt
    fixed_hash = hash_password_with_salt(test_password, fixed_salt)
    print(f"Hash với salt cố định: {fixed_hash}")
    
    # Verify với salt cố định
    is_valid_fixed = verify_password(test_password, fixed_hash)
    print(f"Verify với salt cố định: {'Thành công' if is_valid_fixed else 'Thất bại'}")
    
    print("\n===== KẾT QUẢ =====")
    if is_valid and not is_valid_wrong and is_valid_fixed:
        print("✅ Thuật toán hash hoạt động nhất quán!")
        return True
    else:
        print("❌ Có vấn đề với thuật toán hash!")
        return False

def test_database_connection():
    """Kiểm tra kết nối database"""
    try:
        config = {
            'host': os.environ.get('DB_HOST', 'mariadb'),
            'port': int(os.environ.get('DB_PORT', 3306)),
            'user': os.environ.get('DB_USER', 'nqd_user'),
            'password': os.environ.get('DB_PASSWORD', 'nqd_password'),
            'database': os.environ.get('DB_NAME', 'nqd_database')
        }
        
        print(f"Đang kết nối đến MariaDB tại {config['host']}:{config['port']}...")
        conn = mysql.connector.connect(**config)
        
        if conn.is_connected():
            print("✅ Kết nối database thành công!")
            
            # Test tạo user mới
            cursor = conn.cursor()
            
            # Tạo user test
            test_username = "test_hash_user"
            test_password = "test123"
            
            # Kiểm tra user đã tồn tại chưa
            cursor.execute("SELECT id FROM users WHERE username = %s", (test_username,))
            if cursor.fetchone():
                print(f"User {test_username} đã tồn tại, xóa để test lại...")
                cursor.execute("DELETE FROM users WHERE username = %s", (test_username,))
                conn.commit()
            
            # Tạo user mới với hash
            hashed_password = hash_password(test_password)
            cursor.execute("""
                INSERT INTO users (username, password, email, full_name, is_admin) 
                VALUES (%s, %s, %s, %s, %s)
            """, (test_username, hashed_password, "test@test.com", "Test User", False))
            conn.commit()
            
            print(f"✅ Đã tạo user {test_username} với hash: {hashed_password}")
            
            # Test verify từ database
            cursor.execute("SELECT password FROM users WHERE username = %s", (test_username,))
            result = cursor.fetchone()
            if result:
                stored_hash = result[0]
                print(f"Hash từ database: {stored_hash}")
                
                # Verify mật khẩu
                is_valid = verify_password(test_password, stored_hash)
                print(f"Verify mật khẩu từ database: {'Thành công' if is_valid else 'Thất bại'}")
                
                if is_valid:
                    print("✅ Hash và verify hoạt động hoàn hảo với database!")
                else:
                    print("❌ Có vấn đề với hash/verify trong database!")
            
            cursor.close()
            conn.close()
            return True
            
    except Error as e:
        print(f"❌ Lỗi kết nối database: {e}")
        return False

def main():
    print("Bắt đầu kiểm tra tính nhất quán của thuật toán hash...")
    
    # Test 1: Kiểm tra thuật toán hash
    hash_test = test_hash_consistency()
    
    # Test 2: Kiểm tra với database
    db_test = test_database_connection()
    
    print("\n===== TỔNG KẾT =====")
    if hash_test and db_test:
        print("🎉 Tất cả test đều thành công! Thuật toán hash hoạt động nhất quán.")
    else:
        print("⚠️ Có vấn đề cần khắc phục!")

if __name__ == "__main__":
    main() 