#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import mysql.connector
from mysql.connector import Error
import argparse

# Import utility chung
sys.path.append(os.path.dirname(__file__))
from password_utils import hash_password, verify_password

def create_user(conn, username, password, email, full_name, is_admin=False):
    """Tạo người dùng mới trong cơ sở dữ liệu"""
    try:
        cursor = conn.cursor()
        
        # Kiểm tra username đã tồn tại chưa
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            print(f"Lỗi: Tên đăng nhập '{username}' đã tồn tại!")
            return False
        
        # Hash mật khẩu
        hashed_password = hash_password(password)
        
        # Thêm người dùng mới
        query = """
        INSERT INTO users (username, password, email, full_name, is_admin) 
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (username, hashed_password, email, full_name, is_admin))
        conn.commit()
        
        user_id = cursor.lastrowid
        print(f"Đã tạo {'admin' if is_admin else 'người dùng'} mới thành công!")
        print(f"ID: {user_id}, Username: {username}, Admin: {'Có' if is_admin else 'Không'}")
        
        return True
        
    except Error as e:
        print(f"Lỗi khi tạo người dùng: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def main():
    parser = argparse.ArgumentParser(description='Tạo tài khoản người dùng cho hệ thống')
    parser.add_argument('--admin', action='store_true', help='Tạo tài khoản admin')
    parser.add_argument('--user', action='store_true', help='Tạo tài khoản người dùng thường')
    parser.add_argument('--batch', action='store_true', help='Tạo nhiều tài khoản cùng lúc')
    args = parser.parse_args()

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
            
            if args.batch:
                # Tạo nhiều tài khoản cùng lúc
                create_batch_accounts(conn)
            elif args.admin:
                # Tạo tài khoản admin
                create_admin_account(conn)
            elif args.user:
                # Tạo tài khoản người dùng thường
                create_user_account(conn)
            else:
                # Hiển thị menu
                show_menu(conn)
                
    except Error as e:
        print(f"Lỗi khi kết nối đến MariaDB: {e}")
        return 1
    finally:
        if 'conn' in locals() and conn.is_connected():
            conn.close()
            print("Đã đóng kết nối đến MariaDB.")
    
    return 0

def show_menu(conn):
    """Hiển thị menu tương tác"""
    while True:
        print("\n===== TẠO TÀI KHOẢN =====")
        print("1. Tạo tài khoản admin")
        print("2. Tạo tài khoản người dùng")
        print("3. Tạo nhiều tài khoản cùng lúc")
        print("0. Thoát")
        print("=========================")
        
        choice = input("Chọn chức năng: ")
        
        if choice == '1':
            create_admin_account(conn)
        elif choice == '2':
            create_user_account(conn)
        elif choice == '3':
            create_batch_accounts(conn)
        elif choice == '0':
            print("Tạm biệt!")
            break
        else:
            print("Lựa chọn không hợp lệ. Vui lòng chọn lại.")

def create_admin_account(conn):
    """Tạo tài khoản admin"""
    print("\n----- Tạo tài khoản admin -----")
    username = input("Nhập tên đăng nhập: ")
    password = input("Nhập mật khẩu: ")
    email = input("Nhập email (có thể bỏ trống): ")
    
    full_name = ""
    while not full_name.strip():
        full_name = input("Nhập họ tên đầy đủ (bắt buộc): ")
        if not full_name.strip():
            print("Họ tên đầy đủ là bắt buộc. Vui lòng nhập lại.")
    
    create_user(conn, username, password, email, full_name, True)

def create_user_account(conn):
    """Tạo tài khoản người dùng thường"""
    print("\n----- Tạo tài khoản người dùng -----")
    username = input("Nhập tên đăng nhập: ")
    password = input("Nhập mật khẩu: ")
    email = input("Nhập email (có thể bỏ trống): ")
    
    full_name = ""
    while not full_name.strip():
        full_name = input("Nhập họ tên đầy đủ (bắt buộc): ")
        if not full_name.strip():
            print("Họ tên đầy đủ là bắt buộc. Vui lòng nhập lại.")
    
    create_user(conn, username, password, email, full_name, False)

def create_batch_accounts(conn):
    """Tạo nhiều tài khoản cùng lúc"""
    print("\n----- Tạo nhiều tài khoản cùng lúc -----")
    
    # Tạo tài khoản admin mẫu
    print("\nTạo tài khoản admin mẫu:")
    create_user(conn, "testadmin", "admin123", "testadmin@example.com", "Admin Test", True)
    
    # Tạo tài khoản người dùng mẫu
    print("\nTạo tài khoản người dùng mẫu:")
    create_user(conn, "testuser", "user123", "testuser@example.com", "User Test", False)
    
    # Tạo thêm một số tài khoản người dùng
    print("\nTạo thêm các tài khoản người dùng:")
    for i in range(1, 4):
        create_user(conn, f"user{i}", f"pass{i}", f"user{i}@example.com", f"User {i}", False)

if __name__ == "__main__":
    sys.exit(main())