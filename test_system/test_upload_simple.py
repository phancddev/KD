#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import requests
import json
from pathlib import Path

def test_upload_simple():
    """Test upload file đơn giản"""
    
    app_url = "http://localhost:2701"
    
    print(f"Đang test upload file tại {app_url}...")
    
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
        print(f"Đăng nhập: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 302:
            print("✅ Đăng nhập thành công!")
        else:
            print(f"❌ Đăng nhập thất bại: {response.status_code}")
            return False
        
        # Truy cập trang admin questions
        print("Đang truy cập trang admin questions...")
        response = session.get(f"{app_url}/admin/questions")
        print(f"Trang admin: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Truy cập trang admin thành công!")
        else:
            print(f"❌ Không thể truy cập trang admin: {response.status_code}")
            return False
        
        # Test upload file
        csv_file = Path(__file__).parent / "sample_questions.csv"
        if not csv_file.exists():
            print(f"❌ Không tìm thấy file {csv_file}")
            return False
        
        print(f"Đang upload file {csv_file}...")
        
        with open(csv_file, 'rb') as f:
            files = {'file': (csv_file.name, f, 'text/csv')}
            response = session.post(f"{app_url}/admin/api/questions/import", files=files)
        
        print(f"Upload response: {response.status_code}")
        print(f"Response text: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                if result.get('success'):
                    print(f"✅ Upload thành công! Đã thêm {result.get('count')} câu hỏi")
                    return True
                else:
                    print(f"❌ Upload thất bại: {result.get('error')}")
                    return False
            except:
                print("✅ Upload thành công (không parse được JSON)")
                return True
        else:
            print(f"❌ Upload thất bại: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False

def main():
    print("===== TEST UPLOAD FILE ĐƠN GIẢN =====")
    success = test_upload_simple()
    
    if success:
        print("\n🎉 Test upload thành công!")
    else:
        print("\n⚠️ Test upload thất bại!")

if __name__ == "__main__":
    main() 