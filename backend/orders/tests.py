from contextlib import contextmanager

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product
from smtp_sink import SMTPSink
from .models import Cart, Order

# Order creation emails the customer. Point those deliveries at a local sink so
# the suite never talks to a real mail server.
sink = None


def setUpModule():
    global sink
    sink = SMTPSink().start()


def tearDownModule():
    if sink is not None:
        sink.stop()


@contextmanager
def smtp_delivery():
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


class OrderPlacementTests(APITestCase):
    """Placing an order collects delivery details only — never payment."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email='buyer@example.com',
            username='buyer',
            password='password123',
            user_type='customer',
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            username='otherbuyer',
            password='password123',
            user_type='customer',
        )
        self.farmer = User.objects.create_user(
            email='farmer@example.com',
            username='farmer',
            password='password123',
            user_type='farmer',
        )
        self.client.force_authenticate(user=self.user)

        self.product = Product.objects.create(
            farmer=self.farmer,
            name='Fresh Apple',
            slug='fresh-apple',
            description='Crisp apple',
            price='3.50',
            stock=20,
        )
        self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 2}, format='json')

        self.payload = {
            'first_name': 'Ada',
            'last_name': 'Nhemwa',
            'email': 'buyer@example.com',
            'address': '12 Rainbow Avenue',
            'city': 'Harare',
            'postal_code': '00100',
            'phone': '+263 77 123 4567',
        }
        self.url = '/api/v1/cart/orders/create/'

    def post_order(self, overrides=None):
        payload = {**self.payload, **(overrides or {})}
        with smtp_delivery() as mail_sink:
            response = self.client.post(self.url, payload, format='json')
        return response, mail_sink

    def test_place_order_stores_delivery_details_and_succeeds(self):
        response, mail_sink = self.post_order()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['phone'], '+263 77 123 4567')
        # A fresh order starts as pending: nothing was paid for.
        self.assertEqual(response.data['status'], 'pending')
        self.assertNotIn('payment', response.data)

        order = Order.objects.get(pk=response.data['id'])
        self.assertEqual(order.phone, '+263 77 123 4567')
        self.assertEqual(order.address, '12 Rainbow Avenue')
        self.assertEqual(order.customer, self.user)
        self.assertEqual(order.items.count(), 1)
        # Placing the order empties the cart.
        self.assertFalse(Cart.objects.get(customer=self.user).items.exists())
        # The confirmation email really went out over SMTP.
        self.assertEqual(len(mail_sink.messages), 1)

    def test_place_order_rejects_someone_elses_email(self):
        response, _ = self.post_order({'email': 'other@example.com'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_place_order_rejects_too_short_address(self):
        response, _ = self.post_order({'address': '1 A'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('address', response.data)

    def test_place_order_rejects_invalid_phone(self):
        response, _ = self.post_order({'phone': 'call-me-maybe'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone', response.data)

    def test_place_order_requires_postal_code(self):
        response, _ = self.post_order({'postal_code': '   '})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('postal_code', response.data)

    def test_place_order_requires_a_name(self):
        response, _ = self.post_order({'first_name': '   '})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('first_name', response.data)

    def test_order_items_expose_the_order_status(self):
        response, _ = self.post_order()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = response.data['items'][0]
        self.assertEqual(item['status'], 'pending')

    def test_customer_only_sees_their_own_orders(self):
        self.post_order()
        response = self.client.get('/api/v1/cart/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['customer'], 'buyer@example.com')

    def test_staff_sees_every_order(self):
        self.post_order()
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get('/api/v1/cart/orders/')
        self.assertEqual(len(response.data), 0)

        self.other_user.is_staff = True
        self.other_user.save(update_fields=['is_staff'])
        response = self.client.get('/api/v1/cart/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class OrderFromBrowserCartTests(APITestCase):
    """Checkout sends the cart it rendered; the server re-checks it."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email='browser@example.com',
            username='browserbuyer',
            password='password123',
            user_type='customer',
        )
        self.farmer = User.objects.create_user(
            email='farmer2@example.com',
            username='farmer2',
            password='password123',
            user_type='farmer',
        )
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(
            farmer=self.farmer,
            name='Sweet Potatoes',
            slug='sweet-potatoes',
            description='Golden and fresh',
            price='1.75',
            stock=10,
        )
        self.url = '/api/v1/cart/orders/create/'
        self.payload = {
            'first_name': 'Ada',
            'last_name': 'Nhemwa',
            'email': 'browser@example.com',
            'address': '12 Rainbow Avenue',
            'city': 'Harare',
            'postal_code': '00100',
            'phone': '0771234567',
        }

    def test_order_can_be_placed_without_a_server_side_cart(self):
        # The browser cart is never synced, so no Cart row exists yet.
        self.assertFalse(Cart.objects.filter(customer=self.user).exists())

        payload = {
            **self.payload,
            'items': [{'product_id': self.product.id, 'quantity': 3}],
        }
        with smtp_delivery() as mail_sink:
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        order = Order.objects.get(pk=response.data['id'])
        item = order.items.get()
        self.assertEqual(item.quantity, 3)
        self.assertEqual(str(item.price), '1.75')
        self.assertEqual(str(order.total_amount), '5.25')
        self.assertEqual(len(mail_sink.messages), 1)

    def test_price_sent_by_the_client_is_ignored(self):
        payload = {
            **self.payload,
            'items': [{'product_id': self.product.id, 'quantity': 2, 'price': '0.01'}],
        }
        with smtp_delivery():
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        order = Order.objects.get(pk=response.data['id'])
        self.assertEqual(str(order.items.get().price), '1.75')
        self.assertEqual(str(order.total_amount), '3.50')

    def test_order_rejects_more_than_available_stock(self):
        payload = {
            **self.payload,
            'items': [{'product_id': self.product.id, 'quantity': 999}],
        }
        with smtp_delivery() as mail_sink:
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('items', response.data)
        self.assertEqual(mail_sink.messages, [])
        self.assertEqual(Order.objects.count(), 0)

    def test_order_rejects_a_product_that_does_not_exist(self):
        payload = {
            **self.payload,
            'items': [{'product_id': 999999, 'quantity': 1}],
        }
        with smtp_delivery():
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_order_rejects_an_empty_items_list_with_no_cart(self):
        payload = {**self.payload, 'items': []}
        with smtp_delivery():
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_order_rejects_a_non_integer_quantity(self):
        payload = {
            **self.payload,
            'items': [{'product_id': self.product.id, 'quantity': 'lots'}],
        }
        with smtp_delivery():
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)
