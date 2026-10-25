import re
from contextlib import contextmanager
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from smtp_sink import SMTPSink
from users.models import FarmerProfile, CustomerProfile, EmailOTP

User = get_user_model()

# Local SMTP sink: every test below asserts on messages that Python's smtplib
# really delivered over a socket, instead of mocking the network away.
sink = None


def setUpModule():
    global sink
    sink = SMTPSink().start()


def tearDownModule():
    if sink is not None:
        sink.stop()


@contextmanager
def smtp_delivery():
    """Point the email service at the local SMTP sink for the wrapped block."""
    sink.clear()
    with override_settings(
        SMTP_SERVER='127.0.0.1',
        SMTP_PORT=sink.bound_port,
        SMTP_USERNAME='',
        SMTP_PASSWORD='',
        SMTP_USE_TLS=False,
        DEFAULT_FROM_EMAIL='no-reply@farmconnect.test',
    ):
        yield sink


def extract_code(message):
    """Pull the 6-digit code out of a delivered OTP email."""
    match = re.search(r'Your Farm Fresh Hub code:\s*(\d{6})', message)
    return match.group(1) if match else None

class UserProfileAPITests(APITestCase):
    def setUp(self):
        self.farmer_user = User.objects.create_user(
            email='farmer@test.com',
            username='farmer',
            password='password123',
            user_type='farmer'
        )
        self.customer_user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='password123',
            user_type='customer'
        )
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            username='admin',
            password='password123',
            user_type='admin',
            is_staff=True
        )
        
        # Access token for authentication
        self.client.force_authenticate(user=self.farmer_user)

    def test_get_user_profile(self):
        url = reverse('users:profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'farmer@test.com')

    def test_update_farmer_profile(self):
        url = reverse('users:update-profile')
        data = {
            'username': 'new_farmer_name',
            'farmer_profile': {
                'farm_name': 'Sunny Farm',
                'location': 'Nakuru',
                'description': 'Best organic vegetables'
            }
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'new_farmer_name')
        self.assertEqual(response.data['user']['farmer_profile']['farm_name'], 'Sunny Farm')
        
        # Verify in DB
        profile = FarmerProfile.objects.get(user=self.farmer_user)
        self.assertEqual(profile.farm_name, 'Sunny Farm')

    def test_update_customer_profile(self):
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('users:update-profile')
        data = {
            'customer_profile': {
                'address': '123 Garden St',
                'city': 'Nairobi'
            }
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['customer_profile']['city'], 'Nairobi')

    def test_admin_user_management_access(self):
        # Farmer should not access admin list
        url = reverse('users:admin-user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin should access admin list
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 3)

    def test_rbac_product_creation(self):
        url = reverse('product-list-create')
        data = {
            'name': 'New Tomato',
            'description': 'Red tomatoes',
            'price': '1.50',
            'stock': 100,
            # 'category': 1 
        }
        
        # Farmer can attempt (might fail on category but check 403)
        self.client.force_authenticate(user=self.farmer_user)
        response = self.client.post(url, data)
        # We check that it's NOT a 403.
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Customer cannot create
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_password_reset_request_sends_email_over_smtp(self):
        url = reverse('users:password-reset-request')
        data = {'email': 'farmer@test.com'}

        with smtp_delivery() as mail_sink:
            response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail_sink.messages), 1)
        message = mail_sink.last_message
        self.assertIn('Password Reset Request', message)
        self.assertIn('/password_reset/', message)

    def test_password_reset_request_for_unknown_email_sends_nothing(self):
        url = reverse('users:password-reset-request')

        with smtp_delivery() as mail_sink:
            response = self.client.post(url, {'email': 'nobody@test.com'})

        # Same 200 as an existing account, so the endpoint can't enumerate users.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(mail_sink.messages, [])


class PasswordResetSMTPFlowTests(APITestCase):
    """Request -> email over SMTP -> follow the link -> new password works."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='reset@test.com',
            username='resetuser',
            password='OldPassw0rd!xyz',
            user_type='customer',
        )
        self.request_url = reverse('users:password-reset-request')

    def test_password_reset_link_from_email_resets_password(self):
        with smtp_delivery() as mail_sink:
            response = self.client.post(self.request_url, {'email': 'reset@test.com'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail_sink.messages), 1)

        link = re.search(r'/password_reset/([A-Za-z0-9_-]+)/([A-Za-z0-9_-]+)', mail_sink.last_message)
        self.assertIsNotNone(link, 'reset link missing from the delivered email')
        uid, token = link.group(1), link.group(2)

        new_password = 'N3wPassw0rd!xyz'
        confirm_url = reverse('users:password-reset-confirm', args=[uid, token])
        confirm = self.client.post(
            confirm_url,
            {'new_password': new_password, 'new_password_confirm': new_password},
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))


class EmailOTPSMTPTests(APITestCase):
    """Email one-time codes are delivered and validated over the SMTP transport."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='otp@test.com',
            username='otpuser',
            password='password123',
            user_type='customer',
        )
        self.send_url = reverse('users:otp-send')
        self.verify_url = reverse('users:otp-verify')

    def request_code(self):
        """Ask for a code through the API and return the code from the sent email."""
        with smtp_delivery() as mail_sink:
            response = self.client.post(self.send_url, {'email': 'otp@test.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail_sink.messages), 1)
        code = extract_code(mail_sink.last_message)
        self.assertIsNotNone(code, 'OTP code missing from the delivered email')
        return code

    def test_send_otp_delivers_code_over_smtp(self):
        code = self.request_code()
        self.assertEqual(len(code), 6)
        self.assertTrue(code.isdigit())

        otp = EmailOTP.objects.get(user=self.user, purpose='verification')
        self.assertTrue(otp.is_valid)
        # The database only ever holds a hash of the code.
        self.assertNotEqual(otp.code, code)
        self.assertFalse(otp.check_code('000000' if code != '000000' else '111111'))

    def test_send_otp_does_not_reveal_whether_the_account_exists(self):
        with smtp_delivery() as mail_sink:
            response = self.client.post(self.send_url, {'email': 'nobody@test.com'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(mail_sink.messages, [])
        self.assertEqual(EmailOTP.objects.count(), 0)

    def test_send_otp_is_rate_limited(self):
        with smtp_delivery() as mail_sink:
            first = self.client.post(self.send_url, {'email': 'otp@test.com'})
            second = self.client.post(self.send_url, {'email': 'otp@test.com'})

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(len(mail_sink.messages), 1)

    def test_send_otp_rejects_invalid_payload(self):
        with smtp_delivery() as mail_sink:
            bad_email = self.client.post(self.send_url, {'email': 'not-an-email'})
            bad_purpose = self.client.post(
                self.send_url, {'email': 'otp@test.com', 'purpose': 'nonsense'}
            )

        self.assertEqual(bad_email.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(bad_purpose.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(mail_sink.messages, [])

    def test_verify_otp_marks_email_verified_and_code_is_single_use(self):
        code = self.request_code()

        response = self.client.post(self.verify_url, {'email': 'otp@test.com', 'code': code})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['verified'])

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

        otp = EmailOTP.objects.get(user=self.user, purpose='verification')
        self.assertTrue(otp.is_used)

        replay = self.client.post(self.verify_url, {'email': 'otp@test.com', 'code': code})
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_rejects_wrong_code(self):
        self.request_code()

        response = self.client.post(
            self.verify_url, {'email': 'otp@test.com', 'code': '999999'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_verified)

    def test_verify_rejects_expired_code(self):
        otp, code = EmailOTP.issue(self.user)
        EmailOTP.objects.filter(pk=otp.pk).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )

        response = self.client.post(self.verify_url, {'email': 'otp@test.com', 'code': code})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        otp.refresh_from_db()
        self.assertFalse(otp.is_used)

    def test_verify_rejects_unknown_account(self):
        response = self.client.post(
            self.verify_url, {'email': 'nobody@test.com', 'code': '123456'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
