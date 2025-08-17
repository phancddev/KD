#!/usr/bin/env python3
# -*- coding: utf-8 -*-

def hash_password(password):
    """
    Lưu mật khẩu trực tiếp không hash
    """
    return password

def verify_password(password, stored_password):
    """
    Kiểm tra mật khẩu - So sánh trực tiếp
    """
    try:
        return password == stored_password
    except Exception as e:
        print(f"Lỗi khi kiểm tra mật khẩu: {e}")
        return False

def hash_password_with_salt(password, salt):
    """
    Lưu mật khẩu trực tiếp không hash (không cần thiết nữa)
    """
    return password 