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
import requests
from pathlib import Path

logger = logging.getLogger(__name__)


class EmailService:
    """Service class for handling email notifications"""

    def _get_smtp_config(self):
        host = (getattr(settings, 'EMAIL_HOST', '') or '').strip()
        port = getattr(settings, 'EMAIL_PORT', None)
        username = getattr(settings, 'EMAIL_HOST_USER', None)
        password = getattr(settings, 'EMAIL_HOST_PASSWORD', None)
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or username
        use_tls = bool(getattr(settings, 'EMAIL_USE_TLS', False))
        use_ssl = bool(getattr(settings, 'EMAIL_USE_SSL', False))
        timeout = int(getattr(settings, 'EMAIL_TIMEOUT', 15) or 15)
        return {
            'host': host,
            'port': port,
            'username': username,
            'password': password,
            'from_email': from_email,
            'use_tls': use_tls,
            'use_ssl': use_ssl,
            'timeout': timeout,
        }

    def send_email_smtp(self, to_email, subject, html_content=None, text_content=None, attachments=None):
        """
        Send email using SMTP with STARTTLS (e.g. port 587) or implicit TLS/SSL (e.g. port 465).
        """
        try:
            cfg = self._get_smtp_config()
            if not cfg['host'] or not cfg['port'] or not cfg['username'] or not cfg['password']:
                logger.error("SMTP configuration is incomplete")
                return {'success': False, 'message': 'SMTP configuration is incomplete'}

            if cfg['use_tls'] and cfg['use_ssl']:
                logger.error("SMTP TLS and SSL cannot both be enabled")
                return {'success': False, 'message': 'Conflicting SMTP TLS/SSL settings'}

            if not cfg['use_tls'] and not cfg['use_ssl']:
                logger.error("SMTP TLS or SSL encryption must be enabled")
                return {'success': False, 'message': 'SMTP encryption mode is not configured'}

            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = cfg['from_email']
            message["To"] = to_email

            if text_content:
                message.attach(MIMEText(text_content, "plain"))

            if html_content:
                message.attach(MIMEText(html_content, "html"))

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

            context = ssl.create_default_context()
            if cfg['use_ssl']:
                with smtplib.SMTP_SSL(
                    cfg['host'],
                    int(cfg['port']),
                    timeout=cfg['timeout'],
                    context=context,
                ) as server:
                    server.ehlo()
                    server.login(cfg['username'], cfg['password'])
                    server.sendmail(cfg['from_email'], to_email, message.as_string())
            else:
                with smtplib.SMTP(
                    cfg['host'],
                    int(cfg['port']),
                    timeout=cfg['timeout'],
                ) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(cfg['username'], cfg['password'])
                    server.sendmail(cfg['from_email'], to_email, message.as_string())

            logger.info("Email sent successfully via SMTP")
            return {'success': True, 'message': 'Email sent successfully'}

        except Exception:
            logger.error("Failed to send email via SMTP")
            return {'success': False, 'message': 'Failed to send email via SMTP'}
    
    def send_email_resend(self, to_email, subject, html_content=None, text_content=None):
        """
        Send email using Resend API directly
        """
        try:
            api_key = os.environ.get('RESEND_API_KEY')
            if not api_key:
                logger.error("Resend API key not configured")
                return {'success': False, 'message': 'Resend API key not configured'}
            
            payload = {
                "from": getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev'),
                "to": [to_email],
                "subject": subject,
            }
            
            if html_content:
                payload["html"] = html_content
            if text_content:
                payload["text"] = text_content

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            response = requests.post(
                "https://api.resend.com/emails",
                json=payload,
                headers=headers
            )

            if response.status_code in [200, 201]:
                logger.info(f"Email sent successfully via Resend to {to_email}")
                return {'success': True, 'message': 'Email sent successfully'}
            else:
                error_data = response.json()
                logger.error(f"Resend API error: {error_data}")
                return {'success': False, 'message': f"Resend API error: {error_data.get('message', 'Unknown error')}"}
            
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {str(e)}")
            return {'success': False, 'message': f'Failed to send email: {str(e)}'}
    
    def send_email(self, to_email, subject, html_content=None, text_content=None, attachments=None, use_resend=None):
        """
        Send email using configured provider ('smtp' or 'resend').
        """
        if use_resend is None:
            provider = getattr(settings, 'PASSWORD_RESET_EMAIL_PROVIDER', 'resend')
            use_resend = provider != 'smtp'
        if use_resend:
            return self.send_email_resend(to_email, subject, html_content, text_content)
        return self.send_email_smtp(to_email, subject, html_content, text_content, attachments)
    
    def send_welcome_email(self, user_email, user_name):
        """Send welcome email to new user"""
        subject = "Welcome to FarmConnect!"
        
        html_content = f"""
        <html>
        <body>
            <h2>Welcome to FarmConnect, {user_name}!</h2>
            <p>Thank you for joining our community of fresh produce enthusiasts.</p>
            <p>Start exploring our wide selection of fresh fruits, vegetables, and farm products.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <br>
            <p>Happy shopping!</p>
            <p>The FarmConnect Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to FarmConnect, {user_name}!
        
        Thank you for joining our community of fresh produce enthusiasts.
        Start exploring our wide selection of fresh fruits, vegetables, and farm products.
        If you have any questions, feel free to contact our support team.
        
        Happy shopping!
        The FarmConnect Team
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
            <p>The FarmConnect Team</p>
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
        The FarmConnect Team
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
            <p>The FarmConnect Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Order Update #{order_id}
        
        Dear {user_name},
        
        {message}
        
        You can track your order status in your account dashboard.
        The FarmConnect Team
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
            <p>We received a request to reset your password for your FarmConnect account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_link}">Reset Password</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>The FarmConnect Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Dear {user_name},
        
        We received a request to reset your password for your FarmConnect account.
        
        Click the link below to reset your password:
        {reset_link}
        
        This link will expire in 24 hours.
        
        If you didn't request this, please ignore this email.
        The FarmConnect Team
        """

        if settings.DEBUG and settings.PASSWORD_RESET_EMAIL_PROVIDER == 'django':
            try:
                sent_count = send_mail(
                    subject,
                    text_content,
                    settings.DEFAULT_FROM_EMAIL,
                    [user_email],
                    html_message=html_content,
                    fail_silently=False,
                )
            except Exception:
                logger.error("Failed to send password reset email via Django email backend")
                return {'success': False, 'message': 'Failed to send email'}

            if sent_count == 1:
                logger.info("Password reset email sent via Django email backend")
                return {'success': True, 'message': 'Email sent successfully'}

            logger.error("Django email backend did not send the password reset email")
            return {'success': False, 'message': 'Failed to send email'}

        if settings.PASSWORD_RESET_EMAIL_PROVIDER == 'smtp':
            return self.send_email_smtp(user_email, subject, html_content, text_content)

        return self.send_email_resend(user_email, subject, html_content, text_content)


# Global email service instance
email_service = EmailService()
