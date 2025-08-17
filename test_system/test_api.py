#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import requests
import json
import time

def test_api():
    """Kiểm tra các API của ứng dụng"""
    
    # Lấy URL của ứng dụng từ biến môi trường hoặc sử dụng giá trị mặc định
    app_url = os.environ.get('APP_URL', 'http://localhost:2701')
    
    print(f"Đang kiểm tra API tại {app_url}...")
    
    # Kiểm tra API trạng thái
    try:
        # Kiểm tra trang chủ
        response = requests.get(f"{app_url}/")
        print(f"Trang chủ: {response.status_code} - {'OK' if response.status_code == 200 else 'Lỗi'}")
        
        # Kiểm tra trang đăng nhập
        response = requests.get(f"{app_url}/login")
        print(f"Trang đăng nhập: {response.status_code} - {'OK' if response.status_code == 200 else 'Lỗi'}")
        
        # Đăng nhập với tài khoản admin
        session = requests.Session()
        login_data = {
            'username': 'admin',
            'password': 'admin123'
        }
        response = session.post(f"{app_url}/login", data=login_data)
        if response.status_code == 200 or response.status_code == 302:
            print("Đăng nhập thành công!")
            
            # Kiểm tra API lấy thông tin người dùng
            response = session.get(f"{app_url}/api/user")
            if response.status_code == 200:
                user_data = response.json()
                print(f"Thông tin người dùng: {json.dumps(user_data, indent=2, ensure_ascii=False)}")
            else:
                print(f"Không thể lấy thông tin người dùng: {response.status_code}")
            
            # Kiểm tra API lấy danh sách câu hỏi
            response = session.get(f"{app_url}/api/questions")
            if response.status_code == 200:
                questions_data = response.json()
                print(f"Số lượng câu hỏi: {len(questions_data)}")
                if len(questions_data) > 0:
                    print(f"Câu hỏi đầu tiên: {json.dumps(questions_data[0], indent=2, ensure_ascii=False)}")
            else:
                print(f"Không thể lấy danh sách câu hỏi: {response.status_code}")
            
            # Đăng xuất
            response = session.get(f"{app_url}/logout")
            print(f"Đăng xuất: {response.status_code} - {'OK' if response.status_code == 200 or response.status_code == 302 else 'Lỗi'}")
            
        else:
            print(f"Đăng nhập thất bại: {response.status_code}")
            return False
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"Lỗi khi kiểm tra API: {e}")
        return False

if __name__ == "__main__":
    # Đợi 5 giây để đảm bảo ứng dụng đã khởi động
    print("Đợi 5 giây để ứng dụng khởi động...")
    time.sleep(5)
    
    success = test_api()
    sys.exit(0 if success else 1)