#!/usr/bin/env python
"""
Test script for email configuration
"""
import os
import django
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from backend.email_service import email_service

def test_email():
    """Test email sending functionality"""
    print("Testing email configuration...")
    
    # Test with a simple email
    result = email_service.send_email(
        to_email="nicolemutorey@gmail.com",  # Test with your own email
        subject="Test Email from Farm Fresh Hub",
        html_content="<h1>Test Email</h1><p>This is a test email from Farm Fresh Hub.</p>",
        text_content="Test Email\n\nThis is a test email from Farm Fresh Hub.",
        use_resend=False  # Use SMTP for testing
    )
    
    if result['success']:
        print("Email sent successfully!")
        print(f"Message: {result['message']}")
    else:
        print("Email failed to send!")
        print(f"Error: {result['message']}")
        
        # Check configuration
        print("\nChecking configuration:")
        print(f"SMTP_USERNAME: {os.environ.get('SMTP_USERNAME')}")
        print(f"SMTP_PASSWORD: {'***' if os.environ.get('SMTP_PASSWORD') else 'Not set'}")
        print(f"EMAIL_HOST_USER: {os.environ.get('EMAIL_HOST_USER')}")
        print(f"EMAIL_HOST_PASSWORD: {'***' if os.environ.get('EMAIL_HOST_PASSWORD') else 'Not set'}")

if __name__ == "__main__":
    test_email()
