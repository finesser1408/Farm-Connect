from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import FarmerProfile, CustomerProfile

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
