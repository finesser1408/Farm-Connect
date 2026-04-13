#!/usr/bin/env python
"""
Simple test script to verify API endpoints
"""
import os
import sys
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# API base URL
BASE_URL = 'http://localhost:8000/api/auth'

def test_registration():
    """Test user registration endpoint"""
    print("Testing Registration API...")
    
    # Test customer registration
    customer_data = {
        'email': 'customer@example.com',
        'username': 'customer_user',
        'password': 'password123',
        'password_confirm': 'password123',
        'phone': '+263771234567',
        'user_type': 'customer'
    }
    
    try:
        response = requests.post(f'{BASE_URL}/register/', json=customer_data)
        print(f"Customer Registration Status: {response.status_code}")
        if response.status_code == 201:
            print("✅ Customer registration successful!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Customer registration failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

def test_farmer_registration():
    """Test farmer registration endpoint"""
    print("Testing Farmer Registration...")
    
    farmer_data = {
        'email': 'farmer@example.com',
        'username': 'farmer_user',
        'password': 'password123',
        'password_confirm': 'password123',
        'phone': '+263777654321',
        'user_type': 'farmer',
        'farm_name': 'Test Farm',
        'location': 'Harare, Zimbabwe',
        'bio': 'Test farm for API testing'
    }
    
    try:
        response = requests.post(f'{BASE_URL}/register/', json=farmer_data)
        print(f"Farmer Registration Status: {response.status_code}")
        if response.status_code == 201:
            print("✅ Farmer registration successful!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Farmer registration failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

def test_login():
    """Test login endpoint"""
    print("Testing Login API...")
    
    login_data = {
        'email': 'customer@example.com',
        'password': 'password123'
    }
    
    try:
        response = requests.post(f'{BASE_URL}/login/', json=login_data)
        print(f"Login Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Login successful!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Login failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

if __name__ == '__main__':
    print("🧪 Farm Connect API Test Script")
    print("=" * 40)
    
    test_registration()
    test_farmer_registration()
    test_login()
    
    print("🎉 API testing completed!")
    print("Note: Make sure Django server is running on http://localhost:8000")
