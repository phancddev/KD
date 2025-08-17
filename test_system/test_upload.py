#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import requests
import json
import time
from pathlib import Path

def test_upload_questions():
    """Kiểm tra tính năng upload câu hỏi từ file CSV"""
    
    # Lấy URL của ứng dụng từ biến môi trường hoặc sử dụng giá trị mặc định
    app_url = os.environ.get('APP_URL', 'http://localhost:2701')
    
    print(f"Đang kiểm tra tính năng upload câu hỏi tại {app_url}...")
    
    # Đường dẫn đến file CSV mẫu
    csv_file = Path(__file__).parent / "sample_questions.csv"
    if not csv_file.exists():
        print(f"Không tìm thấy file {csv_file}")
        return False
    
    # Đăng nhập với tài khoản admin
    session = requests.Session()
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    try:
        # Đăng nhập
        print("Đang đăng nhập với tài khoản admin...")
        response = session.post(f"{app_url}/login", data=login_data)
        if response.status_code != 200 and response.status_code != 302:
            print(f"Đăng nhập thất bại: {response.status_code}")
            return False
        
        # Kiểm tra quyền admin
        print("Kiểm tra quyền admin...")
        response = session.get(f"{app_url}/api/user")
        if response.status_code != 200:
            print(f"Không thể lấy thông tin người dùng: {response.status_code}")
            return False
        
        user_data = response.json()
        if not user_data.get('isAdmin'):
            print("Tài khoản không có quyền admin")
            return False
        
        # Lấy số lượng câu hỏi hiện tại
        print("Lấy số lượng câu hỏi hiện tại...")
        response = session.get(f"{app_url}/api/questions")
        if response.status_code != 200:
            print(f"Không thể lấy danh sách câu hỏi: {response.status_code}")
            return False
        
        questions_before = response.json()
        count_before = len(questions_before)
        print(f"Số lượng câu hỏi hiện tại: {count_before}")
        
        # Upload file CSV
        print(f"Đang upload file {csv_file}...")
        with open(csv_file, 'rb') as f:
            files = {'file': (csv_file.name, f, 'text/csv')}
            response = session.post(f"{app_url}/api/questions/import", files=files)
        
        if response.status_code != 200:
            print(f"Upload thất bại: {response.status_code}")
            print(response.text)
            return False
        
        result = response.json()
        if not result.get('success'):
            print(f"Upload thất bại: {result.get('error')}")
            return False
        
        print(f"Upload thành công! Đã thêm {result.get('count')} câu hỏi.")
        
        # Kiểm tra số lượng câu hỏi sau khi upload
        print("Kiểm tra số lượng câu hỏi sau khi upload...")
        response = session.get(f"{app_url}/api/questions")
        if response.status_code != 200:
            print(f"Không thể lấy danh sách câu hỏi: {response.status_code}")
            return False
        
        questions_after = response.json()
        count_after = len(questions_after)
        print(f"Số lượng câu hỏi sau khi upload: {count_after}")
        
        # Kiểm tra số lượng câu hỏi đã tăng
        if count_after <= count_before:
            print("Số lượng câu hỏi không tăng sau khi upload")
            return False
        
        print(f"Đã thêm {count_after - count_before} câu hỏi mới.")
        
        # Hiển thị một số câu hỏi mới
        print("\nMột số câu hỏi mới:")
        for i in range(min(3, count_after - count_before)):
            question = questions_after[i]
            print(f"- {question['text']} => {question['answer']}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"Lỗi khi kiểm tra tính năng upload câu hỏi: {e}")
        return False

if __name__ == "__main__":
    # Đợi 5 giây để đảm bảo ứng dụng đã khởi động
    print("Đợi 5 giây để ứng dụng khởi động...")
    time.sleep(5)
    
    success = test_upload_questions()
    sys.exit(0 if success else 1)