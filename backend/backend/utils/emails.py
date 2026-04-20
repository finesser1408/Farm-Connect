import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_resend_email(to_email, subject, html_content):
    """
    Sends an email using Resend API via requests.
    """
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY == 're_your_api_key_here':
        logger.error("Resend API key is not configured.")
        return False

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Resend Response: {e.response.text}")
        return False
