#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import mysql.connector
from mysql.connector import Error

def reset_passwords_to_plain():
    """Reset tất cả mật khẩu về dạng plain text"""
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
            
            cursor = conn.cursor()
            
            # Lấy danh sách tất cả user
            cursor.execute("SELECT id, username FROM users")
            users = cursor.fetchall()
            
            print(f"Tìm thấy {len(users)} người dùng trong database.")
            
            # Reset mật khẩu về dạng plain text
            for user_id, username in users:
                # Tạo mật khẩu đơn giản dựa trên username
                if username == 'admin':
                    plain_password = 'admin123'
                elif username == 'test_hash_user':
                    plain_password = 'test123'
                else:
                    plain_password = f"{username}123"
                
                # Cập nhật mật khẩu
                cursor.execute("UPDATE users SET password = %s WHERE id = %s", (plain_password, user_id))
                print(f"✅ Đã reset mật khẩu cho {username}: {plain_password}")
            
            conn.commit()
            print("\n🎉 Đã reset tất cả mật khẩu thành công!")
            
            # Hiển thị danh sách user và mật khẩu
            print("\n===== DANH SÁCH USER VÀ MẬT KHẨU =====")
            cursor.execute("SELECT username, password FROM users")
            user_passwords = cursor.fetchall()
            
            for username, password in user_passwords:
                print(f"Username: {username:<15} | Password: {password}")
            
            cursor.close()
            conn.close()
            return True
            
    except Error as e:
        print(f"❌ Lỗi: {e}")
        return False

def main():
    print("===== RESET MẬT KHẨU VỀ DẠNG PLAIN TEXT =====")
    print("⚠️  CẢNH BÁO: Mật khẩu sẽ được lưu dưới dạng plain text!")
    
    confirm = input("Bạn có chắc chắn muốn tiếp tục? (yes/no): ")
    if confirm.lower() == 'yes':
        success = reset_passwords_to_plain()
        if success:
            print("\n✅ Hoàn thành! Bây giờ bạn có thể đăng nhập với mật khẩu plain text.")
        else:
            print("\n❌ Có lỗi xảy ra!")
    else:
        print("Đã hủy thao tác.")

if __name__ == "__main__":
    main() 