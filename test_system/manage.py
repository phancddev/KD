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

def find_user_by_username(conn, username):
    """Tìm người dùng theo tên đăng nhập"""
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        return user
    except Error as e:
        print(f"Lỗi khi tìm người dùng: {e}")
        return None
    finally:
        if cursor:
            cursor.close()

def set_admin_status(conn, user_id, is_admin):
    """Thay đổi quyền admin của người dùng"""
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_admin = %s WHERE id = %s", (is_admin, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except Error as e:
        print(f"Lỗi khi thay đổi quyền admin: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def get_all_users(conn):
    """Lấy danh sách tất cả người dùng"""
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, username, email, full_name, is_admin, created_at FROM users")
        users = cursor.fetchall()
        return users
    except Error as e:
        print(f"Lỗi khi lấy danh sách người dùng: {e}")
        return []
    finally:
        if cursor:
            cursor.close()

def reset_user_password(conn, user_id, new_password):
    """Đặt lại mật khẩu người dùng"""
    try:
        cursor = conn.cursor()
        hashed_password = hash_password(new_password)
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_password, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except Error as e:
        print(f"Lỗi khi đặt lại mật khẩu: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def delete_user(conn, user_id):
    """Xóa người dùng"""
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Error as e:
        print(f"Lỗi khi xóa người dùng: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def format_date(date):
    """Định dạng ngày tháng"""
    if not date:
        return "N/A"
    return date.strftime("%Y-%m-%d %H:%M:%S")

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
        print("\n===== QUẢN LÝ HỆ THỐNG =====")
        print("1. Tạo người dùng mới")
        print("2. Tạo người dùng admin mới")
        print("3. Cấp quyền admin cho người dùng")
        print("4. Thu hồi quyền admin của người dùng")
        print("5. Liệt kê tất cả người dùng")
        print("6. Đặt lại mật khẩu người dùng")
        print("7. Xóa người dùng")
        print("8. Kiểm tra kết nối database")
        print("0. Thoát")
        print("===========================")
        
        choice = input("Chọn chức năng: ")
        
        if choice == '1':
            create_new_user(conn, False)
        elif choice == '2':
            create_new_user(conn, True)
        elif choice == '3':
            change_admin_status(conn, True)
        elif choice == '4':
            change_admin_status(conn, False)
        elif choice == '5':
            list_all_users(conn)
        elif choice == '6':
            reset_password(conn)
        elif choice == '7':
            remove_user(conn)
        elif choice == '8':
            check_database_connection(conn)
        elif choice == '0':
            print("Tạm biệt!")
            break
        else:
            print("Lựa chọn không hợp lệ. Vui lòng chọn lại.")

def create_new_user(conn, is_admin=False):
    """Tạo người dùng mới"""
    try:
        username = input("Nhập tên đăng nhập: ")
        
        # Kiểm tra tên đăng nhập đã tồn tại chưa
        existing_user = find_user_by_username(conn, username)
        if existing_user:
            print("Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.")
            return
        
        password = input("Nhập mật khẩu: ")
        email = input("Nhập email (có thể bỏ trống): ")
        
        full_name = ""
        while not full_name.strip():
            full_name = input("Nhập họ tên đầy đủ (bắt buộc): ")
            if not full_name.strip():
                print("Họ tên đầy đủ là bắt buộc. Vui lòng nhập lại.")
        
        # Tạo người dùng mới
        create_user(conn, username, password, email or None, full_name, is_admin)
        
    except Exception as e:
        print(f"Lỗi khi tạo người dùng: {e}")

def change_admin_status(conn, grant_admin=True):
    """Thay đổi quyền admin"""
    try:
        username = input("Nhập tên đăng nhập cần thay đổi quyền: ")
        
        # Kiểm tra người dùng có tồn tại không
        user = find_user_by_username(conn, username)
        if not user:
            print("Không tìm thấy người dùng với tên đăng nhập này.")
            return
        
        # Thay đổi quyền admin
        success = set_admin_status(conn, user['id'], grant_admin)
        
        if success:
            print(f"Đã {'cấp' if grant_admin else 'thu hồi'} quyền admin cho người dùng {username} thành công!")
        else:
            print("Không thể thay đổi quyền admin.")
        
    except Exception as e:
        print(f"Lỗi khi thay đổi quyền admin: {e}")

def list_all_users(conn):
    """Liệt kê tất cả người dùng"""
    try:
        users = get_all_users(conn)
        
        print('\n===== DANH SÁCH NGƯỜI DÙNG =====')
        print('ID\tTên đăng nhập\tEmail\t\t\tHọ tên\t\tAdmin\tNgày tạo')
        print('---------------------------------------------------------------------------------')
        
        for user in users:
            print(f"{user['id']}\t{user['username']}\t{user['email'] or 'N/A'}\t\t{user['full_name'] or 'N/A'}\t\t{'Có' if user['is_admin'] else 'Không'}\t{format_date(user['created_at'])}")
        
    except Exception as e:
        print(f"Lỗi khi lấy danh sách người dùng: {e}")

def reset_password(conn):
    """Đặt lại mật khẩu người dùng"""
    try:
        username = input("Nhập tên đăng nhập cần đặt lại mật khẩu: ")
        
        # Kiểm tra người dùng có tồn tại không
        user = find_user_by_username(conn, username)
        if not user:
            print("Không tìm thấy người dùng với tên đăng nhập này.")
            return
        
        new_password = input("Nhập mật khẩu mới: ")
        confirm_password = input("Xác nhận mật khẩu mới: ")
        
        if new_password != confirm_password:
            print("Mật khẩu xác nhận không khớp. Vui lòng thử lại.")
            return
        
        # Đặt lại mật khẩu
        success = reset_user_password(conn, user['id'], new_password)
        
        if success:
            print(f"Đã đặt lại mật khẩu cho người dùng {username} thành công!")
        else:
            print("Không thể đặt lại mật khẩu.")
        
    except Exception as e:
        print(f"Lỗi khi đặt lại mật khẩu: {e}")

def remove_user(conn):
    """Xóa người dùng"""
    try:
        username = input("Nhập tên đăng nhập cần xóa: ")
        
        # Kiểm tra người dùng có tồn tại không
        user = find_user_by_username(conn, username)
        if not user:
            print("Không tìm thấy người dùng với tên đăng nhập này.")
            return
        
        confirm = input(f"Bạn có chắc chắn muốn xóa người dùng {username}? (y/n): ")
        if confirm.lower() != 'y':
            print("Đã hủy xóa người dùng.")
            return
        
        # Xóa người dùng
        success = delete_user(conn, user['id'])
        
        if success:
            print(f"Đã xóa người dùng {username} thành công!")
        else:
            print("Không thể xóa người dùng.")
        
    except Exception as e:
        print(f"Lỗi khi xóa người dùng: {e}")

def check_database_connection(conn):
    """Kiểm tra kết nối đến database"""
    try:
        if conn.is_connected():
            db_info = conn.get_server_info()
            print(f"Kết nối thành công! Phiên bản MariaDB: {db_info}")
            
            cursor = conn.cursor()
            cursor.execute("SELECT DATABASE()")
            database = cursor.fetchone()
            print(f"Đang sử dụng database: {database[0]}")
            cursor.close()
        else:
            print("Không thể kết nối đến database.")
    except Error as e:
        print(f"Lỗi khi kiểm tra kết nối: {e}")

if __name__ == "__main__":
    sys.exit(main())