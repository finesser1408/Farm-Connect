from django.contrib.auth import get_user_model
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

from payments.models import Payment
from products.models import Product
from .models import Cart, Order


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
        response = self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 2}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cart.objects.filter(customer=self.user).count(), 1)
        cart = Cart.objects.get(customer=self.user)
        self.assertEqual(cart.items.count(), 1)
        cart_item = cart.items.first()
        self.assertEqual(cart_item.quantity, 2)
        self.assertEqual(str(cart_item.price), '3.50')

    def test_add_to_cart_increments_existing_item_quantity(self):
        self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 3}, format='json')
        cart = Cart.objects.get(customer=self.user)
        cart_item = cart.items.get(product=self.product)
        self.assertEqual(cart_item.quantity, 4)

    def test_add_to_cart_requires_authenticated_user(self):
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cart_quantity_can_be_set_and_item_removed(self):
        self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 2}, format='json')
        response = self.client.patch(
            f'/api/v1/cart/items/{self.product.id}/',
            {'quantity': 4},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['items'][0]['quantity'], 4)

        response = self.client.delete(f'/api/v1/cart/items/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['items'], [])

    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_checkout_creates_order_payment_and_decrements_stock(self, send_email):
        send_email.return_value = {'success': True, 'message': 'sent'}
        self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 2}, format='json')
        response = self.client.post('/api/v1/cart/orders/create/', {
            'first_name': 'Test',
            'last_name': 'Customer',
            'email': self.user.email,
            'phone': '+263771234567',
            'address': 'Farm Road',
            'postal_code': '0000',
            'city': 'Harare',
            'payment_method': 'ecocash',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        order = Order.objects.get()
        self.assertEqual(order.total_amount, 12.00)
        self.assertEqual(order.phone, '+263771234567')
        self.assertEqual(order.status, 'paid')
        self.assertEqual(order.payment.status, 'completed')
        self.assertTrue(order.payment.transaction_id.startswith('SIMULATED-ECOCASH-'))
        self.assertEqual(self.product.__class__.objects.get(pk=self.product.pk).stock, 18)
        self.assertFalse(Cart.objects.get(customer=self.user).items.exists())

    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_checkout_rejects_empty_cart(self, send_email):
        response = self.client.post('/api/v1/cart/orders/create/', {
            'first_name': 'Test',
            'last_name': 'Customer',
            'email': self.user.email,
            'phone': '+263771234567',
            'address': 'Farm Road',
            'postal_code': '0000',
            'city': 'Harare',
            'payment_method': 'cod',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(Payment.objects.count(), 0)
        send_email.assert_not_called()

    def test_admin_can_list_all_orders(self):
        admin = get_user_model().objects.create_user(
            email='admin@example.com',
            username='admin',
            password='password123',
            user_type='admin',
        )
        self.client.force_authenticate(user=admin)

        response = self.client.get('/api/v1/cart/admin/orders/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_customer_cannot_list_all_orders(self):
        response = self.client.get('/api/v1/cart/admin/orders/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
