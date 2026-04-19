from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import FarmerProfile
from .models import Category, Product


class ProductAPITestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='farmer',
            email='farmer@example.com',
            password='password123',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.user,
            farm_name='Green Fields',
            location='Nairobi',
        )
        self.category = Category.objects.create(name='Fruits', slug='fruits')
        Product.objects.create(
            farmer=self.user,
            category=self.category,
            name='Organic Apple',
            slug='organic-apple',
            description='Fresh organic apples',
            price='3.50',
            stock=10,
        )
        Product.objects.create(
            farmer=self.user,
            category=self.category,
            name='Carrot Bundle',
            slug='carrot-bundle',
            description='Crunchy carrots',
            price='2.00',
            stock=15,
        )
        self.other_category = Category.objects.create(name='Vegetables', slug='vegetables')
        Product.objects.create(
            farmer=self.user,
            category=self.other_category,
            name='Organic Broccoli',
            slug='organic-broccoli',
            description='Fresh broccoli',
            price='2.50',
            stock=8,
        )
        self.other_user = get_user_model().objects.create_user(
            username='farmer2',
            email='farmer2@example.com',
            password='password123',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.other_user,
            farm_name='Kigali Greens',
            location='Kigali',
        )
        Product.objects.create(
            farmer=self.other_user,
            category=self.other_category,
            name='Kigali Kale',
            slug='kigali-kale',
            description='Fresh kale',
            price='1.50',
            stock=20,
        )

    def test_product_list_search_by_name(self):
        url = reverse('product-list-create')
        response = self.client.get(url, {'search': 'apple'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Organic Apple')

    def test_product_list_filter_by_category(self):
        url = reverse('product-list-create')
        response = self.client.get(url, {'category': 'fruits'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)
        self.assertTrue(all(item['category'] == self.category.id for item in response.data['results']))

    def test_product_list_filter_by_price_exact(self):
        url = reverse('product-list-create')
        response = self.client.get(url, {'price': '2.00'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Carrot Bundle')

    def test_product_list_filter_by_price_range(self):
        url = reverse('product-list-create')
        response = self.client.get(url, {'min_price': '2.00', 'max_price': '2.50'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)
        names = {item['name'] for item in response.data['results']}
        self.assertEqual(names, {'Carrot Bundle', 'Organic Broccoli'})

    def test_product_list_filter_by_location(self):
        url = reverse('product-list-create')
        response = self.client.get(url, {'location': 'Nairobi'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(len(response.data['results']), 3)
        names = {item['name'] for item in response.data['results']}
        self.assertEqual(names, {'Organic Apple', 'Carrot Bundle', 'Organic Broccoli'})

    def test_product_list_pagination_page_two(self):
        url = reverse('product-list-create')
        response = self.client.get(url, {'page': 2, 'page_size': 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 4)
        self.assertEqual(len(response.data['results']), 2)
        names = {item['name'] for item in response.data['results']}
        self.assertEqual(names, {'Carrot Bundle', 'Organic Apple'})
