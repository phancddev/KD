#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import mysql.connector
from mysql.connector import Error
import getpass

# Import utility chung
sys.path.append(os.path.dirname(__file__))
from password_utils import hash_password, verify_password

def check_user_in_db(conn, username):
    """Kiểm tra người dùng trong cơ sở dữ liệu"""
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if user:
            print(f"Tìm thấy người dùng: {username}")
            print(f"ID: {user['id']}")
            print(f"Email: {user['email']}")
            print(f"Họ tên: {user['full_name']}")
            print(f"Admin: {'Có' if user['is_admin'] else 'Không'}")
            print(f"Mật khẩu (đã hash): {user['password']}")
            return user
        else:
            print(f"Không tìm thấy người dùng: {username}")
            return None
    except Error as e:
        print(f"Lỗi khi tìm người dùng: {e}")
        return None
    finally:
        if cursor:
            cursor.close()

def test_password(user, password):
    """Kiểm tra mật khẩu của người dùng"""
    if not user:
        return False
    
    try:
        hashed_password = user['password']
        is_valid = verify_password(password, hashed_password)
        
        if is_valid:
            print("Mật khẩu hợp lệ!")
        else:
            print("Mật khẩu không hợp lệ!")
            
        return is_valid
    except Exception as e:
        print(f"Lỗi khi kiểm tra mật khẩu: {e}")
        return False

def create_admin_user(conn):
    """Tạo người dùng admin mới với mật khẩu đơn giản"""
    try:
        cursor = conn.cursor()
        
        # Tạo admin mới với mật khẩu đơn giản
        username = "admin"
        password = "admin123"
        email = "admin@example.com"
        full_name = "Administrator"
        
        # Kiểm tra xem admin đã tồn tại chưa
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            print(f"Tài khoản admin đã tồn tại!")
            return
        
        # Hash mật khẩu
        hashed_password = hash_password(password)
        
        # Thêm người dùng admin
        query = """
        INSERT INTO users (username, password, email, full_name, is_admin) 
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (username, hashed_password, email, full_name, True))
        conn.commit()
        
        print(f"Đã tạo tài khoản admin mới!")
        print(f"Username: {username}")
        print(f"Password: {password}")
        
    except Error as e:
        print(f"Lỗi khi tạo tài khoản admin: {e}")
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
            
            while True:
                print("\n===== KIỂM TRA ĐĂNG NHẬP =====")
                print("1. Kiểm tra người dùng trong DB")
                print("2. Kiểm tra đăng nhập")
                print("3. Tạo tài khoản admin mới")
                print("4. Liệt kê tất cả người dùng")
                print("0. Thoát")
                print("=============================")
                
                choice = input("Chọn chức năng: ")
                
                if choice == '1':
                    username = input("Nhập tên đăng nhập cần kiểm tra: ")
                    check_user_in_db(conn, username)
                elif choice == '2':
                    username = input("Nhập tên đăng nhập: ")
                    password = getpass.getpass("Nhập mật khẩu: ")
                    user = check_user_in_db(conn, username)
                    if user:
                        test_password(user, password)
                elif choice == '3':
                    create_admin_user(conn)
                elif choice == '4':
                    list_all_users(conn)
                elif choice == '0':
                    print("Tạm biệt!")
                    break
                else:
                    print("Lựa chọn không hợp lệ. Vui lòng chọn lại.")
                
    except Error as e:
        print(f"Lỗi khi kết nối đến MariaDB: {e}")
        return 1
    finally:
        if 'conn' in locals() and conn.is_connected():
            conn.close()
            print("Đã đóng kết nối đến MariaDB.")
    
    return 0

def list_all_users(conn):
    """Liệt kê tất cả người dùng"""
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, username, email, full_name, is_admin, created_at FROM users")
        users = cursor.fetchall()
        
        print('\n===== DANH SÁCH NGƯỜI DÙNG =====')
        print('ID\tTên đăng nhập\tEmail\t\t\tHọ tên\t\tAdmin')
        print('---------------------------------------------------------------------------------')
        
        for user in users:
            print(f"{user['id']}\t{user['username']}\t{user['email'] or 'N/A'}\t\t{user['full_name'] or 'N/A'}\t\t{'Có' if user['is_admin'] else 'Không'}")
        
    except Error as e:
        print(f"Lỗi khi lấy danh sách người dùng: {e}")
    finally:
        if cursor:
            cursor.close()

if __name__ == "__main__":
    sys.exit(main())