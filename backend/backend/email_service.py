"""
Email service for sending notifications using SMTP and Resend
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import send_mail
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class EmailService:
    """Service class for handling email notifications"""
    
    def __init__(self):
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.smtp_username = os.environ.get('SMTP_USERNAME')
        self.smtp_password = os.environ.get('SMTP_PASSWORD')
        self.from_email = settings.DEFAULT_FROM_EMAIL
        self.use_tls = os.environ.get('SMTP_USE_TLS', 'True').lower() == 'true'
        
    def send_email_smtp(self, to_email, subject, html_content=None, text_content=None, attachments=None):
        """
        Send email using SMTP
        
        Args:
            to_email (str): Recipient email address
            subject (str): Email subject
            html_content (str): HTML email content (optional)
            text_content (str): Plain text email content (optional)
            attachments (list): List of file paths to attach (optional)
            
        Returns:
            dict: Success status and message
        """
        try:
            if not self.smtp_username or not self.smtp_password:
                logger.error("SMTP credentials not configured")
                return {'success': False, 'message': 'SMTP credentials not configured'}
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = to_email
            
            # Add text content
            if text_content:
                message.attach(MIMEText(text_content, "plain"))
            
            # Add HTML content
            if html_content:
                message.attach(MIMEText(html_content, "html"))
            
            # Add attachments
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, "rb") as attachment:
                            part = MIMEBase("application", "octet-stream")
                            part.set_payload(attachment.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                "Content-Disposition",
                                f"attachment; filename= {os.path.basename(file_path)}"
                            )
                            message.attach(part)
            
            # Create SMTP session
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.sendmail(self.from_email, to_email, message.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return {'success': True, 'message': 'Email sent successfully'}
            
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {str(e)}")
            return {'success': False, 'message': f'Failed to send email: {str(e)}'}
    
    def send_email_resend(self, to_email, subject, html_content=None, text_content=None):
        """
        Send email using Resend API
        
        Args:
            to_email (str): Recipient email address
            subject (str): Email subject
            html_content (str): HTML email content (optional)
            text_content (str): Plain text email content (optional)
            
        Returns:
            dict: Success status and message
        """
        try:
            if not settings.RESEND_API_KEY:
                logger.error("Resend API key not configured")
                return {'success': False, 'message': 'Resend API key not configured'}
            
            # Use Django's send_mail which can be configured to use Resend
            send_mail(
                subject=subject,
                message=text_content or '',
                from_email=self.from_email,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False,
            )
            
            logger.info(f"Email sent successfully via Resend to {to_email}")
            return {'success': True, 'message': 'Email sent successfully'}
            
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {str(e)}")
            return {'success': False, 'message': f'Failed to send email: {str(e)}'}
    
    def send_email(self, to_email, subject, html_content=None, text_content=None, attachments=None, use_resend=True):
        """
        Send email using preferred method
        
        Args:
            to_email (str): Recipient email address
            subject (str): Email subject
            html_content (str): HTML email content (optional)
            text_content (str): Plain text email content (optional)
            attachments (list): List of file paths to attach (optional)
            use_resend (bool): Whether to use Resend (default) or SMTP
            
        Returns:
            dict: Success status and message
        """
        if use_resend:
            return self.send_email_resend(to_email, subject, html_content, text_content)
        else:
            return self.send_email_smtp(to_email, subject, html_content, text_content, attachments)
    
    def send_welcome_email(self, user_email, user_name):
        """Send welcome email to new user"""
        subject = "Welcome to Farm Fresh Hub!"
        
        html_content = f"""
        <html>
        <body>
            <h2>Welcome to Farm Fresh Hub, {user_name}!</h2>
            <p>Thank you for joining our community of fresh produce enthusiasts.</p>
            <p>Start exploring our wide selection of fresh fruits, vegetables, and farm products.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <br>
            <p>Happy shopping!</p>
            <p>The Farm Fresh Hub Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to Farm Fresh Hub, {user_name}!
        
        Thank you for joining our community of fresh produce enthusiasts.
        Start exploring our wide selection of fresh fruits, vegetables, and farm products.
        If you have any questions, feel free to contact our support team.
        
        Happy shopping!
        The Farm Fresh Hub Team
        """
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_order_confirmation(self, user_email, user_name, order_id, order_items, total_amount):
        """Send order confirmation email"""
        subject = f"Order Confirmation #{order_id}"
        
        items_html = ""
        for item in order_items:
            items_html += f"<tr><td>{item.get('name', 'Product')}</td><td>{item.get('quantity', 0)}</td><td>${item.get('price', 0):.2f}</td></tr>"
        
        html_content = f"""
        <html>
        <body>
            <h2>Order Confirmation #{order_id}</h2>
            <p>Dear {user_name},</p>
            <p>Thank you for your order! We're preparing your fresh items for delivery.</p>
            
            <h3>Order Details:</h3>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <tr><th>Product</th><th>Quantity</th><th>Price</th></tr>
                {items_html}
                <tr><td colspan="2"><strong>Total</strong></td><td><strong>${total_amount:.2f}</strong></td></tr>
            </table>
            
            <p>We'll notify you when your order is on its way!</p>
            <p>The Farm Fresh Hub Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Order Confirmation #{order_id}
        
        Dear {user_name},
        
        Thank you for your order! We're preparing your fresh items for delivery.
        
        Order Details:
        {chr(10).join([f"- {item.get('name', 'Product')}: {item.get('quantity', 0)} x ${item.get('price', 0):.2f}" for item in order_items])}
        
        Total: ${total_amount:.2f}
        
        We'll notify you when your order is on its way!
        The Farm Fresh Hub Team
        """
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_order_status_update(self, user_email, user_name, order_id, status):
        """Send order status update email"""
        status_messages = {
            'processing': 'Your order is being prepared',
            'shipped': 'Your order has been shipped!',
            'delivered': 'Your order has been delivered',
            'cancelled': 'Your order has been cancelled'
        }
        
        subject = f"Order Update #{order_id}"
        message = status_messages.get(status, 'Your order status has been updated')
        
        html_content = f"""
        <html>
        <body>
            <h2>Order Update #{order_id}</h2>
            <p>Dear {user_name},</p>
            <p>{message}</p>
            <p>You can track your order status in your account dashboard.</p>
            <p>The Farm Fresh Hub Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Order Update #{order_id}
        
        Dear {user_name},
        
        {message}
        
        You can track your order status in your account dashboard.
        The Farm Fresh Hub Team
        """
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_password_reset(self, user_email, user_name, reset_link):
        """Send password reset email"""
        subject = "Password Reset Request"
        
        html_content = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Dear {user_name},</p>
            <p>We received a request to reset your password for your Farm Fresh Hub account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_link}">Reset Password</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>The Farm Fresh Hub Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Dear {user_name},
        
        We received a request to reset your password for your Farm Fresh Hub account.
        
        Click the link below to reset your password:
        {reset_link}
        
        This link will expire in 24 hours.
        
        If you didn't request this, please ignore this email.
        The Farm Fresh Hub Team
        """
        
        return self.send_email(user_email, subject, html_content, text_content)


# Global email service instance
email_service = EmailService()
