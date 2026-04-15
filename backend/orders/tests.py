from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product
from .models import Cart


class CartApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email='customer@example.com',
            username='customer',
            password='password123',
            user_type='customer',
        )
        self.client.force_authenticate(user=self.user)

        self.product = Product.objects.create(
            farmer=self.user,
            name='Fresh Apple',
            slug='fresh-apple',
            description='Crisp apple',
            price='3.50',
            stock=20,
        )

    def test_add_to_cart_creates_cart_and_item(self):
        response = self.client.post('/api/cart/add/', {'product_id': self.product.id, 'quantity': 2}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cart.objects.filter(customer=self.user).count(), 1)
        cart = Cart.objects.get(customer=self.user)
        self.assertEqual(cart.items.count(), 1)
        cart_item = cart.items.first()
        self.assertEqual(cart_item.quantity, 2)
        self.assertEqual(str(cart_item.price), '3.50')

    def test_add_to_cart_increments_existing_item_quantity(self):
        self.client.post('/api/cart/add/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.client.post('/api/cart/add/', {'product_id': self.product.id, 'quantity': 3}, format='json')
        cart = Cart.objects.get(customer=self.user)
        cart_item = cart.items.get(product=self.product)
        self.assertEqual(cart_item.quantity, 4)

    def test_add_to_cart_requires_authenticated_user(self):
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/cart/add/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
