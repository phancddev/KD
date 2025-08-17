#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import mysql.connector
from mysql.connector import Error

def test_db_connection():
    """Kiểm tra kết nối đến cơ sở dữ liệu MariaDB"""
    
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
        connection = mysql.connector.connect(**config)
        
        if connection.is_connected():
            db_info = connection.get_server_info()
            print(f"Kết nối thành công! Phiên bản MariaDB: {db_info}")
            
            # Lấy thông tin về các bảng
            cursor = connection.cursor()
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            
            print(f"\nCơ sở dữ liệu '{config['database']}' có {len(tables)} bảng:")
            for table in tables:
                print(f"- {table[0]}")
                
            # Kiểm tra dữ liệu trong bảng users
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            print(f"\nSố lượng người dùng: {user_count}")
            
            cursor.execute("SELECT COUNT(*) FROM users WHERE is_admin = TRUE")
            admin_count = cursor.fetchone()[0]
            print(f"Số lượng người dùng admin: {admin_count}")
            
            # Kiểm tra dữ liệu trong bảng questions
            cursor.execute("SELECT COUNT(*) FROM questions")
            question_count = cursor.fetchone()[0]
            print(f"Số lượng câu hỏi: {question_count}")
            
            cursor.close()
            connection.close()
            print("\nĐã đóng kết nối.")
            return True
            
    except Error as e:
        print(f"Lỗi khi kết nối đến MariaDB: {e}")
        return False

if __name__ == "__main__":
    success = test_db_connection()
    sys.exit(0 if success else 1)