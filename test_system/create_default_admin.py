#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import mysql.connector
from mysql.connector import Error

# Import utility chung
sys.path.append(os.path.dirname(__file__))
from password_utils import hash_password, verify_password

def create_default_admin(conn):
    """Tạo tài khoản admin mặc định"""
    try:
        cursor = conn.cursor()
        
        # Thông tin tài khoản admin mặc định
        username = "admin"
        password = "admin123"
        email = "admin@example.com"
        full_name = "Administrator"
        
        # Kiểm tra xem admin đã tồn tại chưa
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            print(f"Tài khoản admin đã tồn tại! Đang cập nhật mật khẩu...")
            
            # Cập nhật mật khẩu
            hashed_password = hash_password(password)
            cursor.execute("UPDATE users SET password = %s WHERE username = %s", 
                          (hashed_password, username))
            conn.commit()
            
            print(f"Đã cập nhật mật khẩu cho tài khoản admin!")
        else:
            # Hash mật khẩu
            hashed_password = hash_password(password)
            
            # Thêm người dùng admin
            query = """
            INSERT INTO users (username, password, email, full_name, is_admin) 
            VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (username, hashed_password, email, full_name, True))
            conn.commit()
            
            print(f"Đã tạo tài khoản admin mặc định!")
        
        print(f"Username: {username}")
        print(f"Password: {password}")
        
        return True
        
    except Error as e:
        print(f"Lỗi khi tạo tài khoản admin: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def main():
    # Lấy thông tin kết nối từ biến môi trường hoặc sử dụng giá trị mặc định
    config = {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'port': int(os.environ.get('DB_PORT', 3306)),
        'user': os.environ.get('DB_USER', 'nqd_user'),
        'password': os.environ.get('DB_PASSWORD', 'nqd_password'),
        'database': os.environ.get('DB_NAME', 'nqd_database')
    }
    
    try:
        print(f"Đang kết nối đến MariaDB tại {config['host']}:{config['port']}...")
        conn = mysql.connector.connect(**config)
        
        if conn.is_connected():
            print("Kết nối thành công!")
            
            # Tạo tài khoản admin mặc định
            create_default_admin(conn)
                
    except Error as e:
        print(f"Lỗi khi kết nối đến MariaDB: {e}")
        return 1
    finally:
        if 'conn' in locals() and conn.is_connected():
            conn.close()
            print("Đã đóng kết nối đến MariaDB.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())