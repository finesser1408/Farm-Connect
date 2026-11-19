from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import FarmerProfile, CustomerProfile
from django.test import override_settings
from backend.email_service import EmailService

User = get_user_model()

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

    def test_superuser_is_created_with_admin_role(self):
        superuser = User.objects.create_superuser(
            username='newadmin',
            email='newadmin@test.com',
            password='password123',
        )

        self.assertEqual(superuser.user_type, 'admin')

    def test_get_user_profile(self):
        url = reverse('users:profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'farmer@test.com')

    @patch('users.api_views.email_service.send_welcome_email')
    def test_farmer_registration_creates_required_profile(self, send_email):
        send_email.return_value = {'success': True, 'message': 'sent'}
        response = self.client.post(reverse('users:register'), {
            'email': 'newfarmer@example.com',
            'username': 'newfarmer',
            'password': 'password123',
            'password_confirm': 'password123',
            'user_type': 'farmer',
            'farm_name': 'Green Acres',
            'location': '  Harare  ',
            'farm_description': 'Vegetable farm',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        profile = FarmerProfile.objects.get(user__email='newfarmer@example.com')
        self.assertEqual(profile.farm_name, 'Green Acres')
        self.assertEqual(profile.location, 'Harare')

    def test_farmer_registration_requires_farm_details(self):
        response = self.client.post(reverse('users:register'), {
            'email': 'newfarmer@example.com',
            'username': 'newfarmer',
            'password': 'password123',
            'password_confirm': 'password123',
            'user_type': 'farmer',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='newfarmer@example.com').exists())

    def test_farmer_registration_rejects_whitespace_location(self):
        response = self.client.post(reverse('users:register'), {
            'email': 'newfarmer@example.com',
            'username': 'newfarmer',
            'password': 'password123',
            'password_confirm': 'password123',
            'user_type': 'farmer',
            'farm_name': 'Green Acres',
            'location': '   ',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='newfarmer@example.com').exists())

    def test_public_registration_cannot_create_admin(self):
        response = self.client.post(reverse('users:register'), {
            'email': 'newadmin@example.com',
            'username': 'newadmin',
            'password': 'password123',
            'password_confirm': 'password123',
            'user_type': 'admin',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='newadmin@example.com').exists())

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
        self.assertEqual(profile.location, 'Nakuru')

    def test_farmer_profile_rejects_blank_location(self):
        FarmerProfile.objects.create(user=self.farmer_user, farm_name='Green Acres', location='')
        response = self.client.patch(
            reverse('users:update-profile'),
            {'farmer_profile': {'location': '   '}},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(FarmerProfile.objects.get(user=self.farmer_user).location, '')

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

    @patch('users.api_views.email_service.send_password_reset')
    def test_password_reset_request(self, send_password_reset):
        send_password_reset.return_value = {'success': True, 'message': 'sent'}
        url = reverse('users:password-reset-request')
        data = {'email': 'farmer@test.com'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['message'],
            'If an account with that email exists, password reset instructions will be sent.',
        )
        send_password_reset.assert_called_once()


class PasswordResetAPITests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='resetuser',
            email='reset@example.com',
            password='Original-password-472!',
        )
        self.request_url = reverse('users:password-reset-request')
        self.new_password = 'FarmConnect-Unique-Reset-Password-472!'

    def reset_url_parts(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        url = reverse('users:password-reset-confirm', args=[uid, token])
        return uid, token, url

    def test_existing_and_unknown_emails_receive_same_response(self):
        generic_message = (
            'If an account with that email exists, password reset instructions will be sent.'
        )
        with patch('users.api_views.email_service.send_password_reset') as send_reset:
            send_reset.return_value = {'success': True, 'message': 'sent'}
            existing = self.client.post(self.request_url, {'email': self.user.email}, format='json')
            unknown = self.client.post(
                self.request_url,
                {'email': 'unknown@example.com'},
                format='json',
            )

        self.assertEqual(existing.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(existing.data['message'], generic_message)
        self.assertEqual(unknown.data['message'], generic_message)
        send_reset.assert_called_once()
        self.assertIn('/password-reset/confirm/', send_reset.call_args.kwargs['reset_link'])

    def test_email_delivery_failure_does_not_reveal_account_existence(self):
        with patch(
            'users.api_views.email_service.send_password_reset',
            return_value={'success': False, 'message': 'mail unavailable'},
        ):
            response = self.client.post(
                self.request_url,
                {'email': self.user.email},
                format='json',
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('If an account', response.data['message'])

    def test_password_reset_changes_password_and_invalidates_used_token(self):
        uid, token, url = self.reset_url_parts()
        data = {
            'new_password': self.new_password,
            'new_password_confirm': self.new_password,
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))

        reused_response = self.client.post(url, data, format='json')
        self.assertEqual(reused_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reused_response.data['error'], 'Invalid or expired reset link.')

    def test_invalid_and_expired_reset_tokens_are_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        url = reverse('users:password-reset-confirm', args=[uid, 'invalid-token'])
        data = {
            'new_password': self.new_password,
            'new_password_confirm': self.new_password,
        }
        invalid_response = self.client.post(url, data, format='json')
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_response.data['error'], 'Invalid or expired reset link.')

        uid, token, expired_url = self.reset_url_parts()
        with override_settings(PASSWORD_RESET_TIMEOUT=-1):
            expired_response = self.client.post(expired_url, data, format='json')

        self.assertEqual(expired_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(expired_response.data['error'], 'Invalid or expired reset link.')

    def test_password_reset_uses_django_password_validators(self):
        _, _, url = self.reset_url_parts()
        response = self.client.post(url, {
            'new_password': 'password123',
            'new_password_confirm': 'password123',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Original-password-472!'))

    def test_password_reset_endpoints_are_rate_limited(self):
        responses = [
            self.client.post(
                self.request_url,
                {'email': 'unknown@example.com'},
                format='json',
            )
            for _ in range(6)
        ]

        self.assertTrue(all(
            response.status_code == status.HTTP_200_OK
            for response in responses[:5]
        ))
        self.assertEqual(responses[5].status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class PasswordResetEmailProviderTests(APITestCase):
    def setUp(self):
        self.email_service = EmailService()

    @override_settings(
        DEBUG=True,
        PASSWORD_RESET_EMAIL_PROVIDER='django',
        DEFAULT_FROM_EMAIL='dev@example.com',
    )
    @patch('backend.email_service.send_mail', return_value=1)
    def test_development_provider_uses_django_email_backend(self, send_mail):
        result = self.email_service.send_password_reset(
            'person@example.com',
            'Test User',
            'https://farmconnect.example/password-reset/confirm/uid/token/',
        )

        self.assertTrue(result['success'])
        send_mail.assert_called_once()
        args, kwargs = send_mail.call_args
        self.assertEqual(args[2], 'dev@example.com')
        self.assertEqual(args[3], ['person@example.com'])
        self.assertIn('/password-reset/confirm/uid/token/', kwargs['html_message'])
        self.assertEqual(kwargs['fail_silently'], False)

    @override_settings(
        DEBUG=False,
        PASSWORD_RESET_EMAIL_PROVIDER='resend',
    )
    @patch('backend.email_service.EmailService.send_email_resend')
    def test_production_provider_remains_resend(self, send_resend):
        send_resend.return_value = {'success': True, 'message': 'sent'}

        result = self.email_service.send_password_reset(
            'person@example.com',
            'Test User',
            'https://farmconnect.example/password-reset/confirm/uid/token/',
        )

        self.assertTrue(result['success'])
        send_resend.assert_called_once()
