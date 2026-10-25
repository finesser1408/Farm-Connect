# Email Notification Setup Guide

This guide explains how to configure email notifications for Farm Fresh Hub using Python SMTP and/or Resend API.

## Configuration Options

### Option 1: SMTP Configuration (Recommended for production)

1. **Create a `.env` file** in the backend directory:
```bash
cp .env.example .env
```

2. **Configure SMTP settings** in your `.env` file:
```env
# Email Configuration for SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# SMTP Configuration for custom email service
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=True

# Default from email (shown in the From: header of every message)
DEFAULT_FROM_EMAIL=Farm Fresh Hub <your-email@gmail.com>

# Public frontend origin used to build password reset links
FRONTEND_URL=https://farmconnect.zchpc.ac.zw
```

3. **For Gmail users:**
   - Enable 2-factor authentication
   - Generate an App Password: https://myaccount.google.com/apppasswords
   - Put that App Password in `SMTP_PASSWORD` (and `EMAIL_HOST_PASSWORD` if you also use Django's own mail)

> **Which variables does the app read?** `backend/settings.py` exposes two sets.
> The Farm Connect email service (`backend/email_service.py` — welcome, order,
> status, password reset and **OTP** emails) reads `SMTP_SERVER`, `SMTP_PORT`,
> `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS` and `DEFAULT_FROM_EMAIL`.
> The `EMAIL_*` block is Django's built-in mail backend, used by
> `django.contrib.auth` (e.g. the admin site's own password reset). Setting both
> to the same mailbox keeps everything consistent.

### Option 2: Resend API Configuration (Alternative)

1. **Sign up for Resend**: https://resend.com
2. **Get your API key** from the Resend dashboard
3. **Configure in `.env`**:
```env
RESEND_API_KEY=re_your_api_key_here
DEFAULT_FROM_EMAIL=onboarding@resend.dev
```

## Email Features Implemented

### 1. User Registration Emails
- Welcome emails sent automatically when users register
- Personalized with user's name
- Includes introduction to platform features

### 2. Order Notifications
- **Order Confirmation**: Sent when order is created
- **Order Status Updates**: Sent when order status changes (processing, shipped, delivered, cancelled)
- **Order Cancellation**: Sent when user cancels an order

### 3. Password Reset Emails
- Secure password reset links
- Set `FRONTEND_URL` to the public origin where the React app is hosted
- Expiration timing (24 hours)
- Security warnings and best practices

### 4. Email Verification (OTP) Emails
- 6-digit one-time codes for email verification, sent on request
- Codes are stored **hashed** in the database, single-use, and expire after 10 minutes
- Resending is rate limited to once per 60 seconds
- Sent by `POST /api/v1/auth/otp/send/` and checked by `POST /api/v1/auth/otp/verify/`

## Email Templates

Emails are composed inline in `backend/email_service.py` (HTML plus a plain-text
alternative) and sent through `smtplib`. The `.html` files under
`backend/templates/emails/` are **not referenced** by the service and are kept
only as historical reference.

## Email Service Usage

The email service can be used directly in your code:

```python
from backend.email_service import email_service

# Send welcome email
result = email_service.send_welcome_email(
    user_email="user@example.com",
    user_name="John Doe"
)

# Send order confirmation
result = email_service.send_order_confirmation(
    user_email="user@example.com",
    user_name="John Doe",
    order_id=123,
    order_items=[...],
    total_amount=99.99
)

# Send custom email
result = email_service.send_email(
    to_email="user@example.com",
    subject="Custom Subject",
    html_content="<h1>Custom HTML</h1>",
    text_content="Plain text version",
    use_resend=False  # Use SMTP instead of Resend
)
```

## API Endpoints

### Order Management with Email Notifications

- `POST /api/v1/cart/orders/create/` - Create order (sends confirmation email)
- `PATCH /api/v1/cart/orders/{order_id}/status/` - Update order status (sends status update email)
- `POST /api/v1/cart/orders/{order_id}/cancel/` - Cancel order (sends cancellation email)

### User Management with Email Notifications

- `POST /api/v1/auth/register/` - User registration (sends welcome email)
- `POST /api/v1/auth/password-reset/` - Password reset request (sends reset email)
- `POST /api/v1/auth/otp/send/` - Request an email verification code (sends OTP email)
- `POST /api/v1/auth/otp/verify/` - Verify a code

## Testing Email Configuration

1. **Create a test script**:
```python
# test_email.py
from backend.email_service import email_service

result = email_service.send_email(
    to_email="test@example.com",
    subject="Test Email",
    html_content="<h1>Test</h1>",
    text_content="Test email"
)

print(result)
```

2. **Run the test**:
```bash
python manage.py shell
>>> exec(open('test_email.py').read())
```

## Troubleshooting

### Common Issues

1. **SMTP Authentication Error**:
   - Check your email/password credentials
   - For Gmail, use an App Password, not your regular password
   - Ensure 2-factor authentication is enabled

2. **Connection Timeout**:
   - Check firewall settings
   - Verify SMTP server and port
   - Ensure TLS/SSL settings are correct

3. **Email Not Sending**:
   - Check logs for error messages
   - Verify environment variables are loaded
   - Test with both SMTP and Resend options

### Debug Logging

Enable debug logging in settings:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'backend.email_service': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use App Passwords** for Gmail instead of regular passwords
3. **Implement rate limiting** for email sending endpoints
4. **Validate email addresses** before sending
5. **Use HTTPS** for all password reset links

## Production Deployment

1. **Use environment variables** for all email configuration
2. **Set up email monitoring** and alerting
3. **Configure bounce handling** and unsubscribe options
4. **Test deliverability** with major email providers
5. **Set up DKIM/SPF records** for better deliverability

## Dependencies

The email service requires these additional packages:
- `python-dotenv` - For environment variable management
- Built-in `smtplib` and `email` modules - For SMTP functionality
- Django's built-in email backend - For Resend integration

All dependencies are already included in `requirements.txt`.
