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
            'first_name': 'Updated',
            'last_name': 'Farmer',
            'username': 'new_farmer_name',
            'farmer_profile': {
                'farm_name': 'Sunny Farm',
                'location': 'Nakuru',
                'description': 'Best organic vegetables'
            }
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['first_name'], 'Updated')
        self.assertEqual(response.data['user']['last_name'], 'Farmer')
        self.assertEqual(response.data['user']['username'], 'new_farmer_name')
        self.assertEqual(response.data['user']['farmer_profile']['farm_name'], 'Sunny Farm')
        
        # Verify in DB
        self.farmer_user.refresh_from_db()
        self.assertEqual(self.farmer_user.first_name, 'Updated')
        self.assertEqual(self.farmer_user.last_name, 'Farmer')
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
        
        # Approved farmer can attempt (might fail on category but check 403)
        FarmerProfile.objects.get_or_create(
            user=self.farmer_user,
            defaults={'farm_name': 'Test Farm', 'location': 'Harare', 'status': 'approved'},
        )
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

    @override_settings(
        DEBUG=False,
        PASSWORD_RESET_EMAIL_PROVIDER='smtp',
        EMAIL_HOST='smtp.org.example',
        EMAIL_PORT=587,
        EMAIL_USE_TLS=True,
        EMAIL_USE_SSL=False,
        EMAIL_HOST_USER='noreply@org.example',
        EMAIL_HOST_PASSWORD='secret-test-password',
        DEFAULT_FROM_EMAIL='noreply@org.example',
    )
    @patch('backend.email_service.smtplib.SMTP')
    def test_production_smtp_starttls_on_587_when_debug_false(self, mock_smtp):
        server = mock_smtp.return_value.__enter__.return_value
        result = self.email_service.send_password_reset(
            'person@example.com',
            'Test User',
            'https://farmconnect.example/password-reset/confirm/uid/token/',
        )

        self.assertTrue(result['success'])
        mock_smtp.assert_called_once()
        args, kwargs = mock_smtp.call_args
        self.assertEqual(args, ('smtp.org.example', 587))
        self.assertIn('timeout', kwargs)
        server.starttls.assert_called_once()
        server.login.assert_called_once_with('noreply@org.example', 'secret-test-password')
        server.sendmail.assert_called_once()

    @override_settings(
        DEBUG=False,
        PASSWORD_RESET_EMAIL_PROVIDER='smtp',
        EMAIL_HOST='smtp.org.example',
        EMAIL_PORT=465,
        EMAIL_USE_TLS=False,
        EMAIL_USE_SSL=True,
        EMAIL_HOST_USER='noreply@org.example',
        EMAIL_HOST_PASSWORD='secret-test-password',
        DEFAULT_FROM_EMAIL='noreply@org.example',
    )
    @patch('backend.email_service.smtplib.SMTP_SSL')
    def test_production_smtp_implicit_ssl_on_465_when_debug_false(self, mock_smtp_ssl):
        server = mock_smtp_ssl.return_value.__enter__.return_value
        result = self.email_service.send_password_reset(
            'person@example.com',
            'Test User',
            'https://farmconnect.example/password-reset/confirm/uid/token/',
        )

        self.assertTrue(result['success'])
        mock_smtp_ssl.assert_called_once()
        args, kwargs = mock_smtp_ssl.call_args
        self.assertEqual(args, ('smtp.org.example', 465))
        self.assertIn('context', kwargs)
        server.login.assert_called_once_with('noreply@org.example', 'secret-test-password')
        server.sendmail.assert_called_once()

    @override_settings(
        DEBUG=False,
        PASSWORD_RESET_EMAIL_PROVIDER='smtp',
        EMAIL_HOST='',
        EMAIL_PORT=None,
        EMAIL_USE_TLS=False,
        EMAIL_USE_SSL=False,
        EMAIL_HOST_USER='',
        EMAIL_HOST_PASSWORD='',
    )
    def test_production_smtp_rejects_incomplete_or_unencrypted_config(self):
        result = self.email_service.send_password_reset(
            'person@example.com',
            'Test User',
            'https://farmconnect.example/password-reset/confirm/uid/token/',
        )
        self.assertFalse(result['success'])

    @override_settings(
        DEBUG=False,
        PASSWORD_RESET_EMAIL_PROVIDER='smtp',
        EMAIL_HOST='smtp.org.example',
        EMAIL_PORT=587,
        EMAIL_USE_TLS=True,
        EMAIL_USE_SSL=False,
        EMAIL_HOST_USER='noreply@org.example',
        EMAIL_HOST_PASSWORD='secret-test-password',
        DEFAULT_FROM_EMAIL='noreply@org.example',
        FRONTEND_URL='https://farmconnect.hpc.ac.zw',
    )
    @patch('backend.email_service.smtplib.SMTP')
    def test_send_email_and_password_reset_endpoint_route_to_smtp(self, mock_smtp):
        server = mock_smtp.return_value.__enter__.return_value
        welcome = self.email_service.send_email(
            'person@example.com',
            'Welcome',
            text_content='Welcome to FarmConnect',
        )
        self.assertTrue(welcome['success'])

        user = User.objects.create_user(
            username='smtp_reset_user',
            email='smtp_reset_user@example.com',
            password='OldPassword123!',
            user_type='customer',
        )
        res = self.client.post(
            reverse('users:password-reset-request'),
            {'email': user.email},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_smtp.call_count, 2)
        self.assertEqual(server.starttls.call_count, 2)
        self.assertEqual(server.sendmail.call_count, 2)


class AdminRBACAndAuditTests(APITestCase):
    def setUp(self):
        from users.models import AdminAuditLog
        self.AdminAuditLog = AdminAuditLog

        self.super_admin = User.objects.create_superuser(
            username='superadmin',
            email='superadmin@example.com',
            password='SuperAdminPassword123!',
            first_name='Super',
            last_name='Admin',
        )
        self.second_super_admin = User.objects.create_superuser(
            username='superadmin2',
            email='superadmin2@example.com',
            password='SuperAdminPassword123!',
            first_name='Second',
            last_name='Super',
        )
        self.general_admin = User.objects.create_user(
            username='generaladmin',
            email='generaladmin@example.com',
            password='GeneralAdminPassword123!',
            user_type='admin',
            is_staff=True,
            is_superuser=False,
            first_name='General',
            last_name='Admin',
        )
        self.customer = User.objects.create_user(
            username='customer_rbac',
            email='customer_rbac@example.com',
            password='CustomerPassword123!',
            user_type='customer',
            first_name='Jane',
            last_name='Shopper',
        )
        self.farmer = User.objects.create_user(
            username='farmer_rbac',
            email='farmer_rbac@example.com',
            password='FarmerPassword123!',
            user_type='farmer',
            first_name='Tendai',
            last_name='Grower',
        )
        FarmerProfile.objects.create(
            user=self.farmer,
            farm_name='Mazowe Greens',
            location='Mazowe',
        )

    def test_super_admin_can_assign_and_revoke_general_admin_and_logs_audit(self):
        self.client.force_authenticate(user=self.super_admin)
        role_url = reverse('users:admin-user-role-update', args=[self.customer.pk])

        # Promote customer -> General Admin
        promote_res = self.client.patch(
            role_url,
            {'role': 'general_admin', 'reason': 'Operations onboarding'},
            format='json',
        )
        self.assertEqual(promote_res.status_code, status.HTTP_200_OK, promote_res.data)
        self.assertEqual(promote_res.data['admin_role'], 'general_admin')
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.user_type, 'admin')
        self.assertTrue(self.customer.is_staff)
        self.assertFalse(self.customer.is_superuser)

        # Revoke General Admin -> Customer
        revoke_res = self.client.patch(
            role_url,
            {'role': 'customer', 'reason': 'Rotation complete'},
            format='json',
        )
        self.assertEqual(revoke_res.status_code, status.HTTP_200_OK, revoke_res.data)
        self.assertIsNone(revoke_res.data['admin_role'])
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.user_type, 'customer')
        self.assertFalse(self.customer.is_staff)
        self.assertFalse(self.customer.is_superuser)

        # Verify immutable audit log entries exist
        actions = list(
            self.AdminAuditLog.objects.filter(target_id=str(self.customer.pk))
            .order_by('created_at')
            .values_list('action', 'actor_email')
        )
        self.assertEqual(
            actions,
            [
                ('assign_general_admin', self.super_admin.email),
                ('revoke_general_admin', self.super_admin.email),
            ],
        )

    def test_general_admin_cannot_assign_roles_or_promote_self(self):
        self.client.force_authenticate(user=self.general_admin)

        # Cannot assign General Admin to another user
        res_other = self.client.patch(
            reverse('users:admin-user-role-update', args=[self.customer.pk]),
            {'role': 'general_admin'},
            format='json',
        )
        self.assertEqual(res_other.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot promote self via role endpoint
        res_self = self.client.patch(
            reverse('users:admin-user-role-update', args=[self.general_admin.pk]),
            {'role': 'general_admin'},
            format='json',
        )
        self.assertEqual(res_self.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot escalate via ordinary profile update endpoint
        res_profile = self.client.patch(
            reverse('users:update-profile'),
            {'is_superuser': True, 'first_name': 'Escalated'},
            format='json',
        )
        self.assertEqual(res_profile.status_code, status.HTTP_403_FORBIDDEN)
        self.general_admin.refresh_from_db()
        self.assertFalse(self.general_admin.is_superuser)

    def test_customer_and_farmer_cannot_access_role_or_audit_endpoints(self):
        for user in (self.customer, self.farmer):
            self.client.force_authenticate(user=user)
            self.assertEqual(
                self.client.get(reverse('users:admin-user-list')).status_code,
                status.HTTP_403_FORBIDDEN,
            )
            self.assertEqual(
                self.client.patch(
                    reverse('users:admin-user-role-update', args=[self.customer.pk]),
                    {'role': 'general_admin'},
                    format='json',
                ).status_code,
                status.HTTP_403_FORBIDDEN,
            )
            self.assertEqual(
                self.client.get(reverse('users:admin-audit-log-list')).status_code,
                status.HTTP_403_FORBIDDEN,
            )

    def test_super_admin_can_suspend_and_reactivate_general_admin(self):
        self.client.force_authenticate(user=self.super_admin)
        status_url = reverse('users:admin-user-status-update', args=[self.general_admin.pk])

        # Suspend General Admin
        suspend_res = self.client.patch(
            status_url,
            {'is_active': False, 'reason': 'Temporary leave'},
            format='json',
        )
        self.assertEqual(suspend_res.status_code, status.HTTP_200_OK)
        self.assertFalse(suspend_res.data['is_active'])

        # Suspended General Admin cannot access admin endpoints even with existing auth
        self.general_admin.refresh_from_db()
        self.client.force_authenticate(user=self.general_admin)
        blocked_res = self.client.get(reverse('users:admin-user-list'))
        self.assertEqual(blocked_res.status_code, status.HTTP_403_FORBIDDEN)

        # Super Admin reactivates General Admin
        self.client.force_authenticate(user=self.super_admin)
        reactivate_res = self.client.patch(
            status_url,
            {'is_active': True, 'reason': 'Returned'},
            format='json',
        )
        self.assertEqual(reactivate_res.status_code, status.HTTP_200_OK)
        self.assertTrue(reactivate_res.data['is_active'])

        # Reactivated General Admin regains read access to user list
        self.general_admin.refresh_from_db()
        self.client.force_authenticate(user=self.general_admin)
        self.assertEqual(
            self.client.get(reverse('users:admin-user-list')).status_code,
            status.HTTP_200_OK,
        )

    def test_general_admin_cannot_modify_suspend_or_delete_other_admins_or_super_admins(self):
        self.client.force_authenticate(user=self.general_admin)

        # Cannot suspend Super Admin or another General Admin
        self.assertEqual(
            self.client.patch(
                reverse('users:admin-user-status-update', args=[self.super_admin.pk]),
                {'is_active': False},
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        other_general_admin = User.objects.create_user(
            username='generaladmin2',
            email='generaladmin2@example.com',
            password='GeneralAdminPassword123!',
            user_type='admin',
            is_staff=True,
        )
        self.assertEqual(
            self.client.patch(
                reverse('users:admin-user-status-update', args=[other_general_admin.pk]),
                {'is_active': False},
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        # Cannot bypass via admin_user_detail PUT or DELETE
        detail_super_url = reverse('users:admin-user-detail', args=[self.super_admin.pk])
        self.assertEqual(
            self.client.put(detail_super_url, {'first_name': 'Hacked'}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.put(
                detail_super_url,
                {'is_superuser': False, 'user_type': 'customer'},
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.delete(detail_super_url).status_code, status.HTTP_403_FORBIDDEN)

        # Cannot bypass via admin_user_detail on non-admin to escalate privileges
        detail_customer_url = reverse('users:admin-user-detail', args=[self.customer.pk])
        self.assertEqual(
            self.client.put(
                detail_customer_url,
                {'user_type': 'admin', 'is_superuser': True},
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_super_admin_self_and_last_super_admin_protections(self):
        # Remove second superuser so super_admin is the last active Super Admin
        self.second_super_admin.delete()
        self.client.force_authenticate(user=self.super_admin)

        # Cannot demote self / last active Super Admin
        self.assertEqual(
            self.client.patch(
                reverse('users:admin-user-role-update', args=[self.super_admin.pk]),
                {'role': 'customer'},
                format='json',
            ).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        # Cannot suspend self / last active Super Admin
        self.assertEqual(
            self.client.patch(
                reverse('users:admin-user-status-update', args=[self.super_admin.pk]),
                {'is_active': False},
                format='json',
            ).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        # Cannot delete self / last active Super Admin
        self.assertEqual(
            self.client.delete(
                reverse('users:admin-user-detail', args=[self.super_admin.pk])
            ).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.super_admin.refresh_from_db()
        self.assertTrue(self.super_admin.is_active)
        self.assertTrue(self.super_admin.is_superuser)

    def test_super_admin_cannot_demote_suspend_or_delete_another_super_admin(self):
        self.client.force_authenticate(user=self.super_admin)

        self.assertEqual(
            self.client.patch(
                reverse('users:admin-user-role-update', args=[self.second_super_admin.pk]),
                {'role': 'customer'},
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.patch(
                reverse('users:admin-user-status-update', args=[self.second_super_admin.pk]),
                {'is_active': False},
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.delete(
                reverse('users:admin-user-detail', args=[self.second_super_admin.pk])
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_audit_log_access_sanitization_and_immutability(self):
        # Direct log sanitization test: secrets/passwords/tokens must be stripped
        entry = self.AdminAuditLog.log(
            actor=self.super_admin,
            action='test_sanitization',
            target_type='user',
            target_id=self.customer.pk,
            target_repr=self.customer.email,
            details={
                'reason': 'check',
                'password': 'must-not-be-stored',
                'access_token': 'jwt-secret',
                'smtp_password': 'smtp-secret',
            },
        )
        self.assertEqual(entry.details, {'reason': 'check'})

        # General Admin cannot read audit logs
        self.client.force_authenticate(user=self.general_admin)
        audit_url = reverse('users:admin-audit-log-list')
        self.assertEqual(self.client.get(audit_url).status_code, status.HTTP_403_FORBIDDEN)

        # Super Admin can read audit logs, and cannot mutate them via API
        self.client.force_authenticate(user=self.super_admin)
        get_res = self.client.get(audit_url)
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(get_res.data['count'], 1)
        self.assertEqual(
            self.client.post(audit_url, {'action': 'tamper'}, format='json').status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertEqual(
            self.client.delete(audit_url).status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_admin_user_list_search_role_status_filters_and_pagination(self):
        # Suspend farmer so we have both active & suspended accounts
        self.farmer.is_active = False
        self.farmer.save(update_fields=['is_active'])

        self.client.force_authenticate(user=self.super_admin)
        list_url = reverse('users:admin-user-list')

        # Paginated listing
        page_res = self.client.get(list_url, {'page': 1, 'page_size': 2})
        self.assertEqual(page_res.status_code, status.HTTP_200_OK)
        self.assertEqual(page_res.data['count'], 5)
        self.assertEqual(len(page_res.data['results']), 2)
        self.assertIsNotNone(page_res.data['next'])

        # Full-name search
        search_res = self.client.get(list_url, {'search': 'Jane Shopper', 'page': 1})
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        self.assertEqual(search_res.data['count'], 1)
        self.assertEqual(search_res.data['results'][0]['email'], self.customer.email)

        # Role filter
        ga_res = self.client.get(list_url, {'role': 'general_admin', 'page': 1})
        self.assertEqual(ga_res.status_code, status.HTTP_200_OK)
        self.assertEqual(ga_res.data['count'], 1)
        self.assertEqual(ga_res.data['results'][0]['email'], self.general_admin.email)

        sa_res = self.client.get(list_url, {'role': 'super_admin', 'page': 1})
        self.assertEqual(sa_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sa_res.data['count'], 2)

        # Status filter
        suspended_res = self.client.get(list_url, {'status': 'suspended', 'page': 1})
        self.assertEqual(suspended_res.status_code, status.HTTP_200_OK)
        self.assertEqual(suspended_res.data['count'], 1)
        self.assertEqual(suspended_res.data['results'][0]['email'], self.farmer.email)

        # General Admin can also view paginated list
        self.client.force_authenticate(user=self.general_admin)
        ga_list = self.client.get(list_url, {'page': 1, 'page_size': 10})
        self.assertEqual(ga_list.status_code, status.HTTP_200_OK)
        self.assertEqual(ga_list.data['count'], 5)

    def test_suspended_admin_jwt_rejected_and_super_admin_can_suspend_customer(self):
        # Issue real JWT for general_admin
        login_res = self.client.post(
            reverse('users:login'),
            {'email': self.general_admin.email, 'password': 'GeneralAdminPassword123!'},
            format='json',
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        ga_token = login_res.data['access']

        # Super Admin suspends general_admin
        self.client.force_authenticate(user=self.super_admin)
        suspend_res = self.client.patch(
            reverse('users:admin-user-status-update', args=[self.general_admin.pk]),
            {'is_active': False},
            format='json',
        )
        self.assertEqual(suspend_res.status_code, status.HTTP_200_OK)

        # Existing JWT for suspended admin must be rejected on protected API
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {ga_token}')
        blocked = self.client.get(reverse('users:admin-user-list'))
        self.assertIn(blocked.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
        self.client.credentials()

        # Super Admin can suspend/reactivate customer, General Admin cannot
        self.client.force_authenticate(user=self.super_admin)
        cust_status_url = reverse('users:admin-user-status-update', args=[self.customer.pk])
        self.assertEqual(
            self.client.patch(cust_status_url, {'is_active': False}, format='json').status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.patch(cust_status_url, {'is_active': True}, format='json').status_code,
            status.HTTP_200_OK,
        )

        # Reactivate general_admin and verify General Admin cannot suspend customer
        self.general_admin.is_active = True
        self.general_admin.save(update_fields=['is_active'])
        self.client.force_authenticate(user=self.general_admin)
        self.assertEqual(
            self.client.patch(cust_status_url, {'is_active': False}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )


class AdminFarmerManagementTests(APITestCase):
    def setUp(self):
        from products.models import Category, Product
        from orders.models import Order, OrderItem
        from users.models import AdminAuditLog

        self.Category = Category
        self.Product = Product
        self.Order = Order
        self.OrderItem = OrderItem
        self.AdminAuditLog = AdminAuditLog

        self.super_admin = User.objects.create_superuser(
            username='sa_farmers',
            email='sa_farmers@example.com',
            password='SuperPassword123!',
        )
        self.general_admin = User.objects.create_user(
            username='ga_farmers',
            email='ga_farmers@example.com',
            password='GeneralPassword123!',
            user_type='admin',
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            username='cust_farmers',
            email='cust_farmers@example.com',
            password='CustomerPassword123!',
            user_type='customer',
            first_name='Tariro',
            last_name='Buyer',
        )
        self.approved_farmer = User.objects.create_user(
            username='approved_farmer',
            email='approved_farmer@example.com',
            password='FarmerPassword123!',
            user_type='farmer',
            first_name='Nyasha',
            last_name='Moyo',
        )
        self.approved_profile = FarmerProfile.objects.create(
            user=self.approved_farmer,
            farm_name='Moyo Valley',
            location='Harare',
            status='approved',
        )
        self.pending_farmer = User.objects.create_user(
            username='pending_farmer',
            email='pending_farmer@example.com',
            password='FarmerPassword123!',
            user_type='farmer',
            first_name='Kudzai',
            last_name='Chipo',
        )
        self.pending_profile = FarmerProfile.objects.create(
            user=self.pending_farmer,
            farm_name='Chipo Homestead',
            location='Mutare',
            status='pending',
        )

        self.category, _ = Category.objects.get_or_create(slug='vegetables', defaults={'name': 'Vegetables'})
        self.approved_product = Product.objects.create(
            farmer=self.approved_farmer,
            category=self.category,
            name='Harare Tomatoes',
            slug='harare-tomatoes',
            description='Fresh vine tomatoes',
            price='2.00',
            stock=25,
        )
        self.out_of_stock_product = Product.objects.create(
            farmer=self.approved_farmer,
            category=self.category,
            name='Sold Out Kale',
            slug='sold-out-kale',
            description='Out of stock item',
            price='1.00',
            stock=0,
        )

    def test_unauthorized_users_cannot_access_admin_farmer_endpoints(self):
        list_url = reverse('users:admin-farmer-list-create')
        approve_url = reverse('users:admin-farmer-approve', args=[self.pending_farmer.pk])

        # Anonymous
        self.assertEqual(self.client.get(list_url).status_code, status.HTTP_401_UNAUTHORIZED)
        # Customer
        self.client.force_authenticate(user=self.customer)
        self.assertEqual(self.client.get(list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.patch(approve_url, {}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        # Farmer
        self.client.force_authenticate(user=self.approved_farmer)
        self.assertEqual(self.client.get(list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(list_url, {}, format='json').status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_farmer_list_search_status_filter_and_pagination(self):
        self.client.force_authenticate(user=self.general_admin)
        list_url = reverse('users:admin-farmer-list-create')

        res = self.client.get(list_url, {'page': 1, 'page_size': 10})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 2)

        pending_res = self.client.get(list_url, {'status': 'pending', 'page': 1})
        self.assertEqual(pending_res.status_code, status.HTTP_200_OK)
        self.assertEqual(pending_res.data['count'], 1)
        self.assertEqual(pending_res.data['results'][0]['email'], self.pending_farmer.email)

        search_res = self.client.get(list_url, {'search': 'Nyasha Moyo', 'page': 1})
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        self.assertEqual(search_res.data['count'], 1)
        self.assertEqual(search_res.data['results'][0]['product_count'], 2)

    @patch('users.api_views.email_service.send_welcome_email')
    def test_admin_registers_farmer_safely_without_sending_email_or_exposing_password(self, send_welcome):
        self.client.force_authenticate(user=self.general_admin)
        list_url = reverse('users:admin-farmer-list-create')

        payload = {
            'first_name': 'Chiedza',
            'last_name': 'Gumbo',
            'email': 'chiedza@farm.co.zw',
            'phone': '+263771234567',
            'password': 'UniqueFarmPassword987!',
            'password_confirm': 'UniqueFarmPassword987!',
            'farm_name': 'Gumbo Organics',
            'location': 'Gweru',
            'description': 'Organic tubers and greens',
        }
        res = self.client.post(list_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['status'], 'pending')
        self.assertNotIn('password', res.data)
        send_welcome.assert_not_called()

        created_user = User.objects.get(email='chiedza@farm.co.zw')
        self.assertEqual(created_user.user_type, 'farmer')
        self.assertFalse(created_user.is_staff)
        self.assertFalse(created_user.is_superuser)
        self.assertTrue(created_user.check_password('UniqueFarmPassword987!'))

        # Duplicate email rejected
        dup = self.client.post(list_url, payload, format='json')
        self.assertEqual(dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', dup.data)

        # Audit log contains no password
        audit = self.AdminAuditLog.objects.get(action='create_farmer', target_id=str(created_user.pk))
        self.assertNotIn('password', str(audit.details).lower())

    def test_farmer_lifecycle_approve_suspend_reactivate_and_product_order_enforcement(self):
        # 1. Create a historical order before suspension
        order = self.Order.objects.create(
            customer=self.customer,
            first_name='Tariro',
            last_name='Buyer',
            email=self.customer.email,
            address='12 Farm Rd',
            postal_code='0000',
            city='Harare',
            total_amount='4.00',
            status='paid',
        )
        order_item = self.OrderItem.objects.create(
            order=order,
            product=self.approved_product,
            price='2.00',
            quantity=2,
        )

        # Put approved product into customer's cart BEFORE suspension
        self.client.force_authenticate(user=self.customer)
        add_cart_res = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.approved_product.id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(add_cart_res.status_code, status.HTTP_201_CREATED)

        # 2. General Admin approves pending farmer
        self.client.force_authenticate(user=self.general_admin)
        approve_res = self.client.patch(
            reverse('users:admin-farmer-approve', args=[self.pending_farmer.pk]),
            {'reason': 'Verified farm location'},
            format='json',
        )
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_res.data['status'], 'approved')

        # 3. General Admin suspends approved_farmer (User.is_active stays True!)
        suspend_res = self.client.patch(
            reverse('users:admin-farmer-suspend', args=[self.approved_farmer.pk]),
            {'reason': 'Quality audit'},
            format='json',
        )
        self.assertEqual(suspend_res.status_code, status.HTTP_200_OK)
        self.assertEqual(suspend_res.data['status'], 'suspended')
        self.approved_farmer.refresh_from_db()
        self.assertTrue(self.approved_farmer.is_active)  # Separate from login deactivation

        # 4. Suspended farmer cannot create or edit products
        self.client.force_authenticate(user=self.approved_farmer)
        create_blocked = self.client.post(
            reverse('product-list-create'),
            {
                'name': 'Blocked Produce',
                'price': '3.00',
                'stock': 10,
                'description': 'Should fail',
                'category': self.category.id,
            },
            format='json',
        )
        self.assertEqual(create_blocked.status_code, status.HTTP_403_FORBIDDEN)

        edit_blocked = self.client.patch(
            reverse('product-detail', args=[self.approved_product.slug]),
            {'price': '5.00'},
            format='json',
        )
        self.assertEqual(edit_blocked.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Products remain in DB, but hidden from public listing, public detail, cart add, and checkout
        self.assertTrue(self.Product.objects.filter(pk=self.approved_product.pk).exists())
        self.client.force_authenticate(user=None)
        public_list = self.client.get(reverse('product-list-create'))
        self.assertEqual(public_list.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            self.approved_product.slug,
            [p['slug'] for p in public_list.data['results']],
        )
        public_detail = self.client.get(reverse('product-detail', args=[self.approved_product.slug]))
        self.assertEqual(public_detail.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.customer)
        cart_add_blocked = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.approved_product.id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(cart_add_blocked.status_code, status.HTTP_400_BAD_REQUEST)

        checkout_blocked = self.client.post(
            '/api/v1/cart/orders/create/',
            {
                'first_name': 'Tariro',
                'last_name': 'Buyer',
                'email': self.customer.email,
                'phone': '+263771234567',
                'address': '12 Farm Rd',
                'postal_code': '0000',
                'city': 'Harare',
                'payment_method': 'cod',
            },
            format='json',
        )
        self.assertEqual(checkout_blocked.status_code, status.HTTP_400_BAD_REQUEST)

        # Historical order intact
        self.assertTrue(self.OrderItem.objects.filter(pk=order_item.pk).exists())

        # 6. Reactivate farmer: restores active products publicly, keeps out-of-stock unavailable
        self.client.force_authenticate(user=self.general_admin)
        reactivate_res = self.client.patch(
            reverse('users:admin-farmer-reactivate', args=[self.approved_farmer.pk]),
            {'reason': 'Audit passed'},
            format='json',
        )
        self.assertEqual(reactivate_res.status_code, status.HTTP_200_OK)
        self.assertEqual(reactivate_res.data['status'], 'approved')

        self.out_of_stock_product.refresh_from_db()
        self.assertFalse(self.out_of_stock_product.is_available)

        self.client.force_authenticate(user=None)
        public_after = self.client.get(reverse('product-list-create'))
        slugs_after = [p['slug'] for p in public_after.data['results']]
        self.assertIn(self.approved_product.slug, slugs_after)
        self.assertNotIn(self.out_of_stock_product.slug, slugs_after)

        # Audit trail captured approve, suspend, reactivate
        self.assertEqual(
            self.AdminAuditLog.objects.filter(
                action__in=['approve_farmer', 'suspend_farmer', 'reactivate_farmer']
            ).count(),
            3,
        )


class SecurityAndHistoricalDataRemediationTests(APITestCase):
    def setUp(self):
        from django.contrib import admin
        from django.core.exceptions import PermissionDenied
        from django.db.models import ProtectedError
        from django.test import RequestFactory
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        from orders.models import Order, OrderItem
        from payments.models import Payment
        from products.models import Category, Product
        from reviews.models import ProductReview

        self.admin_site = admin.site
        self.PermissionDenied = PermissionDenied
        self.ProtectedError = ProtectedError
        self.RequestFactory = RequestFactory
        self.BlacklistedToken = BlacklistedToken
        self.Order = Order
        self.OrderItem = OrderItem
        self.Payment = Payment
        self.Product = Product
        self.ProductReview = ProductReview

        self.super_admin = User.objects.create_superuser(
            username='sec_super',
            email='sec_super@example.com',
            password='password123',
            first_name='Sec',
            last_name='Super',
        )
        self.general_admin = User.objects.create_user(
            username='sec_gen',
            email='sec_gen@example.com',
            password='password123',
            first_name='Sec',
            last_name='General',
            user_type='admin',
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            username='sec_cust',
            email='sec_cust@example.com',
            password='password123',
            first_name='Sec',
            last_name='Customer',
            user_type='customer',
        )
        self.farmer = User.objects.create_user(
            username='sec_farmer',
            email='sec_farmer@example.com',
            password='password123',
            first_name='Sec',
            last_name='Farmer',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.farmer,
            farm_name='Protected Farm',
            location='Harare',
            description='Safe farming',
            status='approved',
        )
        self.category, _ = Category.objects.get_or_create(
            slug='vegetables',
            defaults={'name': 'Vegetables'},
        )
        self.product = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Protected Kale',
            slug='protected-kale',
            description='Crisp greens',
            price='3.00',
            stock=10,
        )
        self.order = Order.objects.create(
            customer=self.customer,
            first_name='Sec',
            last_name='Customer',
            email=self.customer.email,
            phone='+263770000010',
            address='12 Safe Ave',
            postal_code='00263',
            city='Harare',
            total_amount='11.00',
            status='delivered',
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            price=self.product.price,
            quantity=2,
            status='delivered',
        )
        self.payment = Payment.objects.create(
            order=self.order,
            method='cod',
            status='completed',
            amount='11.00',
        )
        self.review = ProductReview.objects.create(
            product=self.product,
            customer=self.customer,
            rating=5,
            title='Fresh kale',
            comment='Really fresh and tasty',
            status='approved',
        )

    def test_suspended_admin_existing_access_and_refresh_tokens_rejected_and_reactivation_works(self):
        # 1. General Admin signs in and verifies token refresh works while active
        login_res = self.client.post(
            reverse('users:login'),
            {'email': self.general_admin.email, 'password': 'password123'},
            format='json',
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        old_access = login_res.data['access']
        old_refresh = login_res.data['refresh']

        # 2. Super Admin suspends General Admin
        self.client.force_authenticate(user=self.super_admin)
        susp_res = self.client.patch(
            reverse('users:admin-user-status-update', args=[self.general_admin.pk]),
            {'is_active': False, 'reason': 'Security test'},
            format='json',
        )
        self.assertEqual(susp_res.status_code, status.HTTP_200_OK)
        self.assertTrue(self.BlacklistedToken.objects.filter(token__user=self.general_admin).exists())

        # 3. Existing access token rejected (401)
        self.client.force_authenticate(user=None)
        acc_res = self.client.get(
            reverse('users:admin-user-list'),
            HTTP_AUTHORIZATION=f'Bearer {old_access}',
        )
        self.assertEqual(acc_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 4. Existing refresh token rejected (401) even via ActiveUserTokenRefreshView
        ref_res = self.client.post(
            reverse('users:token_refresh'),
            {'refresh': old_refresh},
            format='json',
        )
        self.assertEqual(ref_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 5. Even if token was not blacklisted explicitly, inactive user check on refresh rejects it
        self.general_admin.is_active = True
        self.general_admin.save(update_fields=['is_active'])
        fresh_login = self.client.post(
            reverse('users:login'),
            {'email': self.general_admin.email, 'password': 'password123'},
            format='json',
        )
        self.assertEqual(fresh_login.status_code, status.HTTP_200_OK)
        fresh_refresh = fresh_login.data['refresh']

        self.general_admin.is_active = False
        self.general_admin.save(update_fields=['is_active'])
        ref_res_2 = self.client.post(
            reverse('users:token_refresh'),
            {'refresh': fresh_refresh},
            format='json',
        )
        self.assertEqual(ref_res_2.status_code, status.HTTP_401_UNAUTHORIZED)

        # 6. Reactivated admin can authenticate and refresh tokens normally
        self.client.force_authenticate(user=self.super_admin)
        react_res = self.client.patch(
            reverse('users:admin-user-status-update', args=[self.general_admin.pk]),
            {'is_active': True, 'reason': 'Cleared'},
            format='json',
        )
        self.assertEqual(react_res.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=None)
        relogin_res = self.client.post(
            reverse('users:login'),
            {'email': self.general_admin.email, 'password': 'password123'},
            format='json',
        )
        self.assertEqual(relogin_res.status_code, status.HTTP_200_OK)
        ok_refresh = self.client.post(
            reverse('users:token_refresh'),
            {'refresh': relogin_res.data['refresh']},
            format='json',
        )
        self.assertEqual(ok_refresh.status_code, status.HTTP_200_OK, ok_refresh.data)

        # 7. Ordinary customer and farmer login + refresh regression
        for user in (self.customer, self.farmer):
            res = self.client.post(
                reverse('users:login'),
                {'email': user.email, 'password': 'password123'},
                format='json',
            )
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            ref = self.client.post(
                reverse('users:token_refresh'),
                {'refresh': res.data['refresh']},
                format='json',
            )
            self.assertEqual(ref.status_code, status.HTTP_200_OK)

    def test_django_admin_and_api_delete_cannot_destroy_historical_orders_or_reviews(self):
        from django.contrib.messages.storage.fallback import FallbackStorage
        from users.models import AdminAuditLog

        rf = self.RequestFactory()
        req = rf.post('/admin/')
        req.user = self.super_admin
        setattr(req, 'session', 'session')
        setattr(req, '_messages', FallbackStorage(req))

        product_admin = self.admin_site._registry[self.Product]
        user_admin = self.admin_site._registry[User]
        order_admin = self.admin_site._registry[self.Order]
        review_admin = self.admin_site._registry[self.ProductReview]
        payment_admin = self.admin_site._registry[self.Payment]

        # 1. FarmerProfileInline uses 'description' (not stale 'bio') cleanly
        inlines = user_admin.get_inline_instances(req, self.farmer)
        farmer_inline = inlines[0]
        self.assertIn('description', farmer_inline.fields)
        self.assertNotIn('bio', farmer_inline.fields)

        # 2. Django Admin delete permissions & delete_selected actions disabled on core models
        for model_admin, obj in (
            (product_admin, self.product),
            (user_admin, self.customer),
            (order_admin, self.order),
            (review_admin, self.review),
            (payment_admin, self.payment),
        ):
            self.assertFalse(model_admin.has_delete_permission(req, obj))
            self.assertNotIn('delete_selected', model_admin.get_actions(req))
            with self.assertRaises(self.PermissionDenied):
                model_admin.delete_model(req, obj)
            with self.assertRaises(self.PermissionDenied):
                model_admin.delete_queryset(req, model_admin.model.objects.filter(pk=obj.pk))

        # 3. Direct ORM delete attempts raise ProtectedError instead of cascading historical orders/reviews
        with self.assertRaises(self.ProtectedError):
            self.product.delete()
        with self.assertRaises(self.ProtectedError):
            self.customer.delete()
        with self.assertRaises(self.ProtectedError):
            self.farmer.delete()

        # 4. Administrative API DELETE user endpoint is blocked cleanly
        self.client.force_authenticate(user=self.super_admin)
        del_cust = self.client.delete(reverse('users:admin-user-detail', args=[self.customer.pk]))
        self.assertEqual(del_cust.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Safe Django Admin soft-remove bulk action works and preserves OrderItem & ProductReview
        product_admin.soft_remove_selected_products(
            req, self.Product.objects.filter(pk=self.product.pk)
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.moderation_status, 'removed')
        self.assertTrue(AdminAuditLog.objects.filter(action='remove_product', target_id=self.product.pk).exists())

        # Historical order, item, payment, and review remain completely intact
        self.assertTrue(self.Order.objects.filter(pk=self.order.pk).exists())
        self.assertTrue(self.OrderItem.objects.filter(pk=self.order_item.pk).exists())
        self.assertTrue(self.Payment.objects.filter(pk=self.payment.pk).exists())
        self.assertTrue(self.ProductReview.objects.filter(pk=self.review.pk).exists())


class SettingsConfigurationIsolationTests(APITestCase):
    """Verify explicit environment loading and isolation across dev and prod settings."""

    @staticmethod
    def _load_settings_with_env(env_vars):
        import os
        import runpy
        from pathlib import Path
        from django.conf import settings as django_settings

        settings_path = str(Path(django_settings.BASE_DIR) / 'backend' / 'settings.py')
        with patch.dict(os.environ, env_vars, clear=True):
            return runpy.run_path(settings_path)

    def test_development_settings_do_not_load_backend_dotenv_or_enable_tls_and_ssl_together(self):
        loaded = self._load_settings_with_env(
            {
                'SECRET_KEY': 'dev-isolation-key',
                'DEBUG': 'True',
                'PASSWORD_RESET_EMAIL_PROVIDER': 'django',
                'EMAIL_HOST': 'smtp.gmail.com',
                'EMAIL_PORT': '587',
                'EMAIL_USE_TLS': 'True',
            }
        )
        self.assertTrue(loaded['DEBUG'])
        self.assertEqual(loaded['PASSWORD_RESET_EMAIL_PROVIDER'], 'django')
        self.assertEqual(loaded['EMAIL_HOST'], 'smtp.gmail.com')
        self.assertEqual(loaded['EMAIL_PORT'], 587)
        self.assertTrue(loaded['EMAIL_USE_TLS'])
        self.assertFalse(loaded['EMAIL_USE_SSL'])
        self.assertFalse(loaded['EMAIL_USE_TLS'] and loaded['EMAIL_USE_SSL'])

    def test_explicit_django_env_file_loads_when_specified_and_rejects_missing_file(self):
        import os
        import tempfile
        from django.core.exceptions import ImproperlyConfigured

        with tempfile.NamedTemporaryFile('w', suffix='.env', delete=False) as tmp:
            tmp.write(
                'SECRET_KEY=explicit-file-secret\n'
                'DEBUG=False\n'
                'PASSWORD_RESET_EMAIL_PROVIDER=smtp\n'
                'EMAIL_HOST=smtp.explicit.example\n'
                'EMAIL_PORT=465\n'
                'EMAIL_USE_TLS=False\n'
                'EMAIL_USE_SSL=True\n'
                'EMAIL_HOST_USER=noreply@explicit.example\n'
                'EMAIL_HOST_PASSWORD=mock-explicit-pass\n'
            )
            tmp_path = tmp.name

        try:
            loaded = self._load_settings_with_env({'DJANGO_ENV_FILE': tmp_path})
            self.assertFalse(loaded['DEBUG'])
            self.assertEqual(loaded['EMAIL_HOST'], 'smtp.explicit.example')
            self.assertEqual(loaded['EMAIL_PORT'], 465)
            self.assertTrue(loaded['EMAIL_USE_SSL'])
            self.assertFalse(loaded['EMAIL_USE_TLS'])
        finally:
            os.unlink(tmp_path)

        with self.assertRaises(ImproperlyConfigured):
            self._load_settings_with_env({'DJANGO_ENV_FILE': '/nonexistent/missing.env'})

    def test_production_settings_use_explicit_env_and_reject_django_provider(self):
        from django.core.exceptions import ImproperlyConfigured

        loaded = self._load_settings_with_env(
            {
                'SECRET_KEY': 'prod-isolation-key',
                'DEBUG': 'False',
                'PASSWORD_RESET_EMAIL_PROVIDER': 'smtp',
                'EMAIL_HOST': 'mails.hpc.ac.zw',
                'EMAIL_PORT': '465',
                'EMAIL_USE_TLS': 'False',
                'EMAIL_USE_SSL': 'True',
                'EMAIL_HOST_USER': 'noreply@example.com',
                'EMAIL_HOST_PASSWORD': 'mock-prod-password',
                'DEFAULT_FROM_EMAIL': 'noreply@example.com',
            }
        )
        self.assertFalse(loaded['DEBUG'])
        self.assertEqual(loaded['PASSWORD_RESET_EMAIL_PROVIDER'], 'smtp')
        self.assertEqual(loaded['EMAIL_HOST'], 'mails.hpc.ac.zw')
        self.assertEqual(loaded['EMAIL_PORT'], 465)
        self.assertTrue(loaded['EMAIL_USE_SSL'])
        self.assertFalse(loaded['EMAIL_USE_TLS'])

        with self.assertRaises(ImproperlyConfigured):
            self._load_settings_with_env(
                {
                    'SECRET_KEY': 'prod-isolation-key',
                    'DEBUG': 'False',
                    'PASSWORD_RESET_EMAIL_PROVIDER': 'django',
                }
            )

    def test_missing_secret_key_does_not_auto_load_backend_dotenv_and_fails_safely(self):
        from django.core.exceptions import ImproperlyConfigured

        with self.assertRaises(ImproperlyConfigured):
            self._load_settings_with_env({'DEBUG': 'False'})

    def test_invalid_provider_conflicting_tls_ssl_and_incomplete_production_smtp_fail_safely(self):
        from django.core.exceptions import ImproperlyConfigured

        with self.assertRaises(ImproperlyConfigured):
            self._load_settings_with_env(
                {
                    'SECRET_KEY': 'test-key',
                    'DEBUG': 'False',
                    'PASSWORD_RESET_EMAIL_PROVIDER': 'invalid_provider',
                }
            )

        with self.assertRaises(ImproperlyConfigured):
            self._load_settings_with_env(
                {
                    'SECRET_KEY': 'test-key',
                    'DEBUG': 'False',
                    'PASSWORD_RESET_EMAIL_PROVIDER': 'smtp',
                    'EMAIL_USE_TLS': 'True',
                    'EMAIL_USE_SSL': 'True',
                }
            )

        with self.assertRaises(ImproperlyConfigured):
            self._load_settings_with_env(
                {
                    'SECRET_KEY': 'test-key',
                    'DEBUG': 'False',
                    'PASSWORD_RESET_EMAIL_PROVIDER': 'smtp',
                    'EMAIL_HOST': '',
                    'EMAIL_PORT': '',
                }
            )

        with self.assertRaises(ImproperlyConfigured):
            self._load_settings_with_env(
                {
                    'SECRET_KEY': 'test-key',
                    'DEBUG': 'False',
                    'PASSWORD_RESET_EMAIL_PROVIDER': 'smtp',
                    'EMAIL_HOST': 'mails.hpc.ac.zw',
                    'EMAIL_PORT': '465',
                    'EMAIL_HOST_USER': 'noreply@example.com',
                    'EMAIL_HOST_PASSWORD': 'mock-prod-password',
                    'EMAIL_USE_TLS': 'False',
                    'EMAIL_USE_SSL': 'False',
                }
            )



class AdminDashboardStatsTests(APITestCase):
    """Section 4.19: Backend tests for GET /api/v1/auth/admin/stats/."""

    def setUp(self):
        self.url = reverse('users:admin-dashboard-stats')
        self.super_admin = User.objects.create_superuser(
            username='stats_super',
            email='stats_super@example.com',
            password='password123',
            user_type='admin',
            first_name='Super',
            last_name='Boss',
        )
        self.general_admin = User.objects.create_user(
            username='stats_gen',
            email='stats_gen@example.com',
            password='password123',
            user_type='admin',
            is_staff=True,
            first_name='Gen',
            last_name='Admin',
        )

    def test_dashboard_stats_zero_records_state(self):
        self.client.force_authenticate(user=self.general_admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_users'], 2)
        self.assertEqual(response.data['total_farmers'], 0)
        self.assertEqual(response.data['total_products'], 0)
        self.assertEqual(response.data['total_orders'], 0)
        self.assertFalse(response.data['verified_payments_enabled'])
        self.assertIsNone(response.data['verified_sales_total'])
        self.assertEqual(len(response.data['monthly_activity']), 6)
        self.assertTrue(all(item['orders'] == 0 for item in response.data['monthly_activity']))

    def test_dashboard_stats_returns_real_aggregates_and_excludes_removed_and_simulated(self):
        from orders.models import Order, OrderItem
        from payments.models import Payment
        from products.models import Category, Product

        customer = User.objects.create_user(
            username='stats_cust',
            email='stats_cust@example.com',
            password='password123',
            user_type='customer',
        )
        farmer = User.objects.create_user(
            username='stats_farmer',
            email='stats_farmer@example.com',
            password='password123',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=farmer,
            farm_name='Stats Farm',
            location='Mutare',
            status='approved',
        )
        category, _ = Category.objects.get_or_create(slug='vegetables', defaults={'name': 'Vegetables'})
        active_prod = Product.objects.create(
            farmer=farmer,
            category=category,
            name='Active Carrots',
            slug='active-carrots',
            description='Fresh',
            price='4.00',
            stock=20,
            moderation_status='active',
        )
        Product.objects.create(
            farmer=farmer,
            category=category,
            name='Hidden Onions',
            slug='hidden-onions',
            description='Hidden',
            price='3.00',
            stock=10,
            moderation_status='hidden',
        )
        Product.objects.create(
            farmer=farmer,
            category=category,
            name='Removed Cabbage',
            slug='removed-cabbage',
            description='Removed',
            price='2.00',
            stock=0,
            is_available=False,
            moderation_status='removed',
        )

        paid_order = Order.objects.create(
            customer=customer,
            first_name='Buyer',
            last_name='One',
            email=customer.email,
            phone='+263771112222',
            address='10 Market Rd',
            postal_code='00263',
            city='Harare',
            total_amount='13.00',
            status='paid',
        )
        OrderItem.objects.create(order=paid_order, product=active_prod, price='4.00', quantity=2)
        Payment.objects.create(
            order=paid_order,
            method='mobile_money',
            status='completed',
            amount='13.00',
            transaction_id='SIMULATED-ECOCASH-ABCDEF123456',
        )

        Order.objects.create(
            customer=customer,
            first_name='Buyer',
            last_name='One',
            email=customer.email,
            phone='+263771112222',
            address='10 Market Rd',
            postal_code='00263',
            city='Harare',
            total_amount='9.00',
            status='cancelled',
        )

        for admin_user in (self.general_admin, self.super_admin):
            self.client.force_authenticate(user=admin_user)
            res = self.client.get(self.url)
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['total_users'], 4)
            self.assertEqual(res.data['total_farmers'], 1)
            self.assertEqual(res.data['total_products'], 2)  # excludes removed
            self.assertEqual(res.data['total_orders'], 1)  # excludes cancelled
            self.assertFalse(res.data['verified_payments_enabled'])
            self.assertIsNone(res.data['verified_sales_total'])
            self.assertEqual(len(res.data['monthly_activity']), 6)
            self.assertEqual(res.data['monthly_activity'][-1]['orders'], 1)
            raw = res.content.decode()
            self.assertNotIn('stats_cust@example.com', raw)
            self.assertNotIn('+263771112222', raw)

    def test_dashboard_stats_denies_unauthorized_and_suspended_users(self):
        customer = User.objects.create_user(
            username='unauth_cust',
            email='unauth_cust@example.com',
            password='password123',
            user_type='customer',
        )
        farmer = User.objects.create_user(
            username='unauth_farmer',
            email='unauth_farmer@example.com',
            password='password123',
            user_type='farmer',
        )
        for user in (None, customer, farmer):
            self.client.force_authenticate(user=user)
            res = self.client.get(self.url)
            self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        self.general_admin.is_active = False
        self.general_admin.save(update_fields=['is_active'])
        self.client.force_authenticate(user=self.general_admin)
        res = self.client.get(self.url)
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
