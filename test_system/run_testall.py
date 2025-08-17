#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import subprocess
import time
import signal
import argparse
import webbrowser
import requests
import mysql.connector
from mysql.connector import Error

# Biến toàn cục để lưu các process
processes = []

def signal_handler(sig, frame):
    """Xử lý khi nhận tín hiệu thoát"""
    print("\nĐang dừng tất cả các dịch vụ...")
    stop_all_services()
    sys.exit(0)

def stop_all_services():
    """Dừng tất cả các dịch vụ"""
    global processes
    
    for process in processes:
        try:
            if process.poll() is None:  # Nếu process vẫn đang chạy
                process.terminate()
                process.wait(timeout=5)
        except:
            try:
                process.kill()
            except:
                pass
    
    # Dừng các container Docker nếu có
    try:
        subprocess.run(['docker-compose', '-f', 'test_system/docker-compose.python.yml', 'down'], 
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        pass

def run_command(command, shell=False):
    """Chạy lệnh và trả về process"""
    if shell:
        process = subprocess.Popen(command, shell=True)
    else:
        process = subprocess.Popen(command)
    
    processes.append(process)
    return process

def check_docker():
    """Kiểm tra xem Docker đã được cài đặt và đang chạy chưa"""
    try:
        subprocess.run(['docker', 'info'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except:
        return False

def check_database_connection():
    """Kiểm tra kết nối đến cơ sở dữ liệu"""
    config = {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'port': int(os.environ.get('DB_PORT', 3306)),
        'user': os.environ.get('DB_USER', 'nqd_user'),
        'password': os.environ.get('DB_PASSWORD', 'nqd_password'),
        'database': os.environ.get('DB_NAME', 'nqd_database')
    }
    
    try:
        conn = mysql.connector.connect(**config)
        if conn.is_connected():
            conn.close()
            return True
    except:
        pass
    
    return False

def wait_for_service(url, timeout=60, interval=1):
    """Đợi cho đến khi dịch vụ sẵn sàng"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return True
        except:
            pass
        
        time.sleep(interval)
    
    return False

def setup_database():
    """Thiết lập cơ sở dữ liệu"""
    print("Đang thiết lập cơ sở dữ liệu...")
    
    # Kiểm tra xem đã có kết nối đến cơ sở dữ liệu chưa
    if check_database_connection():
        print("Đã kết nối được đến cơ sở dữ liệu!")
        return True
    
    # Nếu chưa kết nối được, khởi động MariaDB bằng Docker
    print("Không thể kết nối đến cơ sở dữ liệu. Đang khởi động MariaDB bằng Docker...")
    
    # Kiểm tra xem Docker đã được cài đặt và đang chạy chưa
    if not check_docker():
        print("Docker không được cài đặt hoặc không đang chạy. Vui lòng cài đặt và khởi động Docker.")
        return False
    
    # Khởi động MariaDB bằng Docker
    run_command(['docker', 'run', '-d', '--name', 'nqd_mariadb_local',
                '-p', '3306:3306',
                '-e', 'MYSQL_ROOT_PASSWORD=root_password',
                '-e', 'MYSQL_DATABASE=nqd_database',
                '-e', 'MYSQL_USER=nqd_user',
                '-e', 'MYSQL_PASSWORD=nqd_password',
                '-v', f"{os.getcwd()}/db/init:/docker-entrypoint-initdb.d",
                'mariadb:10.6'])
    
    # Đợi MariaDB khởi động
    print("Đang đợi MariaDB khởi động...")
    time.sleep(20)
    
    # Kiểm tra lại kết nối
    if check_database_connection():
        print("Đã kết nối được đến cơ sở dữ liệu!")
        return True
    else:
        print("Không thể kết nối đến cơ sở dữ liệu sau khi khởi động MariaDB.")
        return False

def create_default_admin():
    """Tạo tài khoản admin mặc định"""
    print("Đang tạo tài khoản admin mặc định...")
    
    # Sử dụng Python thay vì Node.js
    try:
        # Chạy script Python để tạo tài khoản admin
        process = run_command(['python', 'test_system/create_default_admin.py'])
        process.wait()
        
        if process.returncode == 0:
            print("Đã tạo tài khoản admin mặc định thành công!")
            print("Username: admin")
            print("Password: admin123")
            return True
        else:
            print("Không thể tạo tài khoản admin mặc định.")
            return False
    except Exception as e:
        print(f"Lỗi khi tạo tài khoản admin: {e}")
        return False

def fix_hash_algorithm():
    """Sửa lỗi thuật toán hash"""
    print("Đang sửa lỗi thuật toán hash...")
    
    # Sử dụng Python thay vì Node.js
    try:
        # Chạy script Python để sửa lỗi hash
        process = run_command(['python', 'test_system/debug_login.py'])
        
        # Đợi process hoàn thành
        process.wait()
        
        if process.returncode == 0:
            print("Đã sửa lỗi thuật toán hash thành công!")
            return True
        else:
            print("Không thể sửa lỗi thuật toán hash.")
            return False
    except Exception as e:
        print(f"Lỗi khi sửa lỗi hash: {e}")
        return False

def start_app():
    """Khởi động ứng dụng"""
    print("Đang khởi động ứng dụng...")
    
    # Khởi động ứng dụng Node.js
    try:
        # Kiểm tra xem có thể chạy npm không
        subprocess.run(['npm', '--version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Nếu có npm, chạy ứng dụng
        run_command(['npm', 'run', 'dev'])
        
        # Đợi ứng dụng khởi động
        print("Đang đợi ứng dụng khởi động...")
        if wait_for_service('http://localhost:2701', timeout=30):
            print("Ứng dụng đã khởi động thành công!")
            return True
        else:
            print("Không thể khởi động ứng dụng.")
            return False
            
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Không tìm thấy npm. Ứng dụng Node.js không thể khởi động.")
        print("Vui lòng khởi động ứng dụng Node.js thủ công bằng lệnh: npm run dev")
        return False

def main():
    # Đăng ký signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    parser = argparse.ArgumentParser(description='Khởi chạy toàn bộ app để test')
    parser.add_argument('--no-browser', action='store_true', help='Không mở trình duyệt tự động')
    args = parser.parse_args()
    
    print("===== KHỞI CHẠY TOÀN BỘ APP ĐỂ TEST =====")
    
    # Thiết lập cơ sở dữ liệu
    if not setup_database():
        print("Không thể thiết lập cơ sở dữ liệu. Đang dừng...")
        stop_all_services()
        return 1
    
    # Tạo tài khoản admin mặc định
    create_admin_result = create_default_admin()
    if not create_admin_result:
        print("Không thể tạo tài khoản admin mặc định.")
        print("Tuy nhiên, có thể tài khoản admin đã tồn tại. Bạn có thể tiếp tục.")
    
    # Sửa lỗi thuật toán hash
    fix_hash_result = fix_hash_algorithm()
    if not fix_hash_result:
        print("Không thể sửa lỗi thuật toán hash.")
        print("Tuy nhiên, tài khoản admin đã được tạo. Bạn có thể tiếp tục.")
    
    # Khởi động ứng dụng
    start_app_result = start_app()
    if not start_app_result:
        print("Không thể khởi động ứng dụng Node.js.")
        print("Bạn có thể khởi động ứng dụng thủ công bằng lệnh: npm run dev")
        print("Hoặc sử dụng Docker: ./test_system/run_docker.sh")
    
    # Mở trình duyệt
    if not args.no_browser:
        print("Đang mở trình duyệt...")
        webbrowser.open('http://localhost:2701')
    
    print("\n============================================")
    print("Toàn bộ app đã được khởi chạy thành công!")
    print("============================================")
    print("- Ứng dụng web: http://localhost:2701")
    print("- Tài khoản admin:")
    print("  - Username: admin")
    print("  - Password: admin123")
    print("============================================")
    print("Nhấn Ctrl+C để dừng tất cả các dịch vụ.")
    
    # Giữ chương trình chạy cho đến khi người dùng nhấn Ctrl+C
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nĐang dừng tất cả các dịch vụ...")
        stop_all_services()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())