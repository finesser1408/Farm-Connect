from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Product


class ProductAPITestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='farmer',
            email='farmer@example.com',
            password='password123',
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

    def test_product_list_search_by_name(self):
        url = reverse('product-list-create')
        response = self.client.get(url, {'search': 'apple'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Organic Apple')
