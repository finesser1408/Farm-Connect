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

    def test_order_creation_requires_authenticated_customer(self):
        order_data = {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test@example.com',
            'phone': '+263771234567',
            'address': 'Test Road',
            'postal_code': '0000',
            'city': 'Harare',
            'payment_method': 'cod',
        }

        self.client.force_authenticate(user=None)
        response = self.client.post('/api/v1/cart/orders/create/', order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        farmer = get_user_model().objects.create_user(
            email='farmer@example.com',
            username='farmer',
            password='password123',
            user_type='farmer',
        )
        self.client.force_authenticate(user=farmer)
        response = self.client.post('/api/v1/cart/orders/create/', order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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



class OrderDecimalAndSnapshotTests(APITestCase):
    """Section 4.22 Phase 2A: Fractional quantities, countable unit enforcement, cent rounding, and historical snapshots."""

    def setUp(self):
        from decimal import Decimal
        from users.models import FarmerProfile
        from products.models import Category

        self.Decimal = Decimal
        User = get_user_model()
        self.customer = User.objects.create_user(
            email='v1_buyer@example.com',
            username='v1_buyer',
            password='password123',
            user_type='customer',
            first_name='Rudo',
            last_name='Buyer',
        )
        self.farmer = User.objects.create_user(
            email='v1_grower@example.com',
            username='v1_grower',
            password='password123',
            user_type='farmer',
            first_name='Farai',
            last_name='Grower',
        )
        FarmerProfile.objects.create(
            user=self.farmer,
            farm_name='Sunrise Acres',
            location='Harare',
            status='approved',
        )
        self.category, _ = Category.objects.get_or_create(slug='vegetables', defaults={'name': 'Vegetables'})

        self.tomatoes_kg = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Organic Tomatoes',
            slug='organic-tomatoes-v1',
            description='Sold by the kilogram',
            price=Decimal('1.50'),
            stock=Decimal('50.00'),
            unit='kg',
            min_order_quantity=Decimal('0.50'),
        )
        self.milk_litre = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Fresh Milk',
            slug='fresh-milk-v1',
            description='Sold by the litre',
            price=Decimal('1.25'),
            stock=Decimal('20.00'),
            unit='l',
            min_order_quantity=Decimal('0.50'),
        )
        self.eggs_tray = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Farm Eggs',
            slug='farm-eggs-v1',
            description='Tray of 30 eggs',
            price=Decimal('4.50'),
            stock=Decimal('10.00'),
            unit='tray',
            unit_description='30 eggs',
            min_order_quantity=Decimal('1.00'),
        )
        self.chickens_bird = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Live Broiler',
            slug='live-broiler-v1',
            description='Live bird',
            price=Decimal('7.00'),
            stock=Decimal('15.00'),
            unit='bird',
            min_order_quantity=Decimal('1.00'),
        )
        self.client.force_authenticate(user=self.customer)

    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_fractional_kg_and_litre_cart_and_checkout_calculations_and_rounding(self, send_email):
        send_email.return_value = {'success': True, 'message': 'sent'}

        # 1. Add 0.5 kg tomatoes, then increment by 2.0 kg -> 2.5 kg @ $1.50/kg = $3.75
        res1 = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.tomatoes_kg.id, 'quantity': '0.5'},
            format='json',
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED, res1.data)
        self.assertEqual(res1.data['items'][0]['quantity'], 0.5)
        self.assertEqual(res1.data['items'][0]['total_price'], '0.75')

        res2 = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.tomatoes_kg.id, 'quantity': '2.0'},
            format='json',
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED, res2.data)
        self.assertEqual(res2.data['items'][0]['quantity'], 2.5)
        self.assertEqual(res2.data['items'][0]['total_price'], '3.75')

        # 2. Add 0.50 L milk @ $1.25/L -> $0.625 rounds to $0.63 (ROUND_HALF_UP)
        res3 = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.milk_litre.id, 'quantity': '0.50'},
            format='json',
        )
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED, res3.data)
        # Cart subtotal: $3.75 + $0.63 = $4.38
        self.assertEqual(res3.data['total_amount'], '4.38')

        # 3. Update milk to 1.5 L via PATCH -> 1.5 * $1.25 = $1.875 -> $1.88
        patch_res = self.client.patch(
            f'/api/v1/cart/items/{self.milk_litre.id}/',
            {'quantity': '1.5'},
            format='json',
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK, patch_res.data)
        self.assertEqual(patch_res.data['total_amount'], '5.63')  # $3.75 + $1.88

        # 4. Checkout: $5.63 subtotal + $5.00 delivery = $10.63
        checkout_res = self.client.post(
            '/api/v1/cart/orders/create/',
            {
                'first_name': 'Rudo',
                'last_name': 'Buyer',
                'email': self.customer.email,
                'phone': '+263771234567',
                'address': '15 Samora Machel Ave',
                'postal_code': '00263',
                'city': 'Harare',
                'payment_method': 'ecocash',
            },
            format='json',
        )
        self.assertEqual(checkout_res.status_code, status.HTTP_201_CREATED, checkout_res.data)
        self.assertEqual(checkout_res.data['total_amount'], '10.63')

        self.tomatoes_kg.refresh_from_db()
        self.milk_litre.refresh_from_db()
        self.assertEqual(self.tomatoes_kg.stock, self.Decimal('47.50'))
        self.assertEqual(self.milk_litre.stock, self.Decimal('18.50'))

    def test_countable_units_accept_whole_numbers_and_reject_fractions(self):
        # Valid whole-number tray quantity (2 trays)
        ok_res = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.eggs_tray.id, 'quantity': 2},
            format='json',
        )
        self.assertEqual(ok_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ok_res.data['items'][0]['quantity'], 2)
        self.assertEqual(ok_res.data['items'][0]['total_price'], '9.00')

        # Reject 1.5 trays on POST and PATCH
        bad_tray = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.eggs_tray.id, 'quantity': '1.5'},
            format='json',
        )
        self.assertEqual(bad_tray.status_code, status.HTTP_400_BAD_REQUEST)

        bad_tray_patch = self.client.patch(
            f'/api/v1/cart/items/{self.eggs_tray.id}/',
            {'quantity': '1.5'},
            format='json',
        )
        self.assertEqual(bad_tray_patch.status_code, status.HTTP_400_BAD_REQUEST)

        # Reject 0.5 birds
        bad_bird = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.chickens_bird.id, 'quantity': '0.5'},
            format='json',
        )
        self.assertEqual(bad_bird.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_negative_zero_below_minimum_and_excessive_precision_quantities(self):
        # Negative, zero, >2 decimal places, and malformed inputs
        for invalid_qty in (0, -1, '-0.5', '0.125', 'NaN', 'Infinity', '', True):
            with self.subTest(qty=invalid_qty):
                res = self.client.post(
                    '/api/v1/cart/add/',
                    {'product_id': self.tomatoes_kg.id, 'quantity': invalid_qty},
                    format='json',
                )
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Below min_order_quantity (0.25 kg < 0.50 kg minimum)
        below_min = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.tomatoes_kg.id, 'quantity': '0.25'},
            format='json',
        )
        self.assertEqual(below_min.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Minimum order quantity', str(below_min.data))

        # Exceeding stock (55 kg > 50 kg stock)
        over_stock = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.tomatoes_kg.id, 'quantity': '55'},
            format='json',
        )
        self.assertEqual(over_stock.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_historical_order_snapshots_preserved_when_farmer_edits_product(self, send_email):
        send_email.return_value = {'success': True, 'message': 'sent'}

        self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.eggs_tray.id, 'quantity': 2},
            format='json',
        )
        checkout_res = self.client.post(
            '/api/v1/cart/orders/create/',
            {
                'first_name': 'Rudo',
                'last_name': 'Buyer',
                'email': self.customer.email,
                'phone': '+263771234567',
                'address': '15 Samora Machel Ave',
                'postal_code': '00263',
                'city': 'Harare',
                'payment_method': 'cod',
            },
            format='json',
        )
        self.assertEqual(checkout_res.status_code, status.HTTP_201_CREATED)
        order_id = checkout_res.data['id']

        # Farmer later renames product, changes unit to crate, and raises price
        self.eggs_tray.name = 'Jumbo Crate Eggs'
        self.eggs_tray.unit = 'crate'
        self.eggs_tray.unit_description = '360 eggs'
        self.eggs_tray.price = self.Decimal('45.00')
        self.eggs_tray.save()

        # Historical order must still show the purchase-time snapshots
        order_detail = self.client.get(f'/api/v1/cart/orders/{order_id}/')
        self.assertEqual(order_detail.status_code, status.HTTP_200_OK)
        item_data = order_detail.data['items'][0]
        self.assertEqual(item_data['product_name'], 'Farm Eggs')
        self.assertEqual(item_data['unit_label'], '30 eggs tray')
        self.assertEqual(item_data['price'], '4.50')
        self.assertEqual(item_data['quantity'], 2)
        self.assertEqual(item_data['get_cost'], '9.00')
        self.assertEqual(order_detail.data['total_amount'], '14.00')

    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_price_manipulation_prevention_and_live_cart_price_sync(self, send_email):
        send_email.return_value = {'success': True, 'message': 'sent'}

        # Client sends forged price/total fields in POST /api/v1/cart/add/ and PATCH
        add_res = self.client.post(
            '/api/v1/cart/add/',
            {
                'product_id': self.tomatoes_kg.id,
                'quantity': '2.00',
                'price': '0.01',
                'total_price': '0.02',
                'total_amount': '0.02',
            },
            format='json',
        )
        self.assertEqual(add_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(add_res.data['items'][0]['price'], '1.50')
        self.assertEqual(add_res.data['items'][0]['total_price'], '3.00')

        patch_res = self.client.patch(
            f'/api/v1/cart/items/{self.tomatoes_kg.id}/',
            {'quantity': '2.00', 'price': '0.01', 'total_price': '0.02'},
            format='json',
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['items'][0]['price'], '1.50')
        self.assertEqual(patch_res.data['items'][0]['total_price'], '3.00')

        # Farmer updates product price from $1.50 to $2.25 while item is in customer's cart
        self.tomatoes_kg.price = self.Decimal('2.25')
        self.tomatoes_kg.save(update_fields=['price', 'updated_at'])

        cart_res = self.client.get('/api/v1/cart/')
        self.assertEqual(cart_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cart_res.data['items'][0]['price'], '2.25')
        self.assertEqual(cart_res.data['items'][0]['total_price'], '4.50')
        self.assertEqual(cart_res.data['total_amount'], '4.50')

        # Checkout ignores forged total_amount and charges $4.50 + $5.00 delivery = $9.50
        order_res = self.client.post(
            '/api/v1/cart/orders/create/',
            {
                'first_name': 'Rudo',
                'last_name': 'Buyer',
                'email': self.customer.email,
                'phone': '+263771234567',
                'address': '15 Samora Machel Ave',
                'postal_code': '00263',
                'city': 'Harare',
                'payment_method': 'ecocash',
                'total_amount': '0.05',
            },
            format='json',
        )
        self.assertEqual(order_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(order_res.data['total_amount'], '9.50')
        self.assertEqual(order_res.data['items'][0]['price'], '2.25')

    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_stale_cart_protected_when_farmer_changes_unit_min_order_or_stock(self, send_email):
        send_email.return_value = {'success': True, 'message': 'sent'}

        # Customer adds 1.50 kg of tomatoes to cart while unit='kg'
        res = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.tomatoes_kg.id, 'quantity': '1.50'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # 1. Farmer changes unit from 'kg' to countable 'bag' (10 kg)
        self.tomatoes_kg.unit = 'bag'
        self.tomatoes_kg.unit_description = '10 kg'
        self.tomatoes_kg.min_order_quantity = self.Decimal('1.00')
        self.tomatoes_kg.save()

        # Cart is not silently deleted, but adding 1 bag (1.50 + 1 = 2.50) or checking out with 1.50 bags fails
        cart_check = self.client.get('/api/v1/cart/')
        self.assertEqual(len(cart_check.data['items']), 1)

        increment_res = self.client.post(
            '/api/v1/cart/add/',
            {'product_id': self.tomatoes_kg.id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(increment_res.status_code, status.HTTP_400_BAD_REQUEST)

        order_payload = {
            'first_name': 'Rudo',
            'last_name': 'Buyer',
            'email': self.customer.email,
            'phone': '+263771234567',
            'address': '15 Samora Machel Ave',
            'postal_code': '00263',
            'city': 'Harare',
            'payment_method': 'cod',
        }
        stale_unit_checkout = self.client.post('/api/v1/cart/orders/create/', order_payload, format='json')
        self.assertEqual(stale_unit_checkout.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid quantity', str(stale_unit_checkout.data))

        # Customer updates cart quantity to whole number 2 bags
        fix_qty_res = self.client.patch(
            f'/api/v1/cart/items/{self.tomatoes_kg.id}/',
            {'quantity': 2},
            format='json',
        )
        self.assertEqual(fix_qty_res.status_code, status.HTTP_200_OK)

        # 2. Farmer increases min_order_quantity to 3 bags -> checkout blocked
        self.tomatoes_kg.min_order_quantity = self.Decimal('3.00')
        self.tomatoes_kg.save()
        stale_min_checkout = self.client.post('/api/v1/cart/orders/create/', order_payload, format='json')
        self.assertEqual(stale_min_checkout.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('minimum order', str(stale_min_checkout.data))

        # 3. Farmer lowers min_order_quantity back to 1, but lowers stock to 1 bag (< 2 in cart) -> checkout blocked
        self.tomatoes_kg.min_order_quantity = self.Decimal('1.00')
        self.tomatoes_kg.stock = self.Decimal('1.00')
        self.tomatoes_kg.save()
        stale_stock_checkout = self.client.post('/api/v1/cart/orders/create/', order_payload, format='json')
        self.assertEqual(stale_stock_checkout.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no longer available in the requested quantity', str(stale_stock_checkout.data))


class OrderLifecycleAndStockRestorationTests(APITestCase):
    """Section 4.22 Phase 2B: Cancellation, idempotent stock restoration, transition guards, and RBAC."""

    def setUp(self):
        from decimal import Decimal
        from users.models import FarmerProfile
        from products.models import Category

        self.Decimal = Decimal
        User = get_user_model()
        self.customer = User.objects.create_user(
            email='cancel_buyer@example.com',
            username='cancel_buyer',
            password='password123',
            user_type='customer',
            first_name='Tendai',
            last_name='Moyo',
        )
        self.other_customer = User.objects.create_user(
            email='other_buyer@example.com',
            username='other_buyer',
            password='password123',
            user_type='customer',
        )
        self.farmer = User.objects.create_user(
            email='cancel_farmer@example.com',
            username='cancel_farmer',
            password='password123',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.farmer,
            farm_name='Green Valley',
            location='Mutare',
            status='approved',
        )
        self.admin = User.objects.create_user(
            email='cancel_admin@example.com',
            username='cancel_admin',
            password='password123',
            user_type='admin',
            is_staff=True,
        )
        self.category, _ = Category.objects.get_or_create(slug='vegetables', defaults={'name': 'Vegetables'})
        self.product_kg = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Butternut Squash',
            slug='butternut-squash-v1',
            description='Fresh squash per kg',
            price=Decimal('2.00'),
            stock=Decimal('10.00'),
            unit='kg',
            min_order_quantity=Decimal('0.50'),
        )
        self.product_crate = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Sweet Potatoes',
            slug='sweet-potatoes-crate-v1',
            description='20 kg crate',
            price=Decimal('15.00'),
            stock=Decimal('2.00'),
            unit='crate',
            unit_description='20 kg',
            min_order_quantity=Decimal('1.00'),
        )

    def _create_sample_order(self, payment_method='ecocash'):
        self.client.force_authenticate(user=self.customer)
        self.client.post('/api/v1/cart/add/', {'product_id': self.product_kg.id, 'quantity': '2.50'}, format='json')
        self.client.post('/api/v1/cart/add/', {'product_id': self.product_crate.id, 'quantity': 2}, format='json')
        res = self.client.post(
            '/api/v1/cart/orders/create/',
            {
                'first_name': 'Tendai',
                'last_name': 'Moyo',
                'email': self.customer.email,
                'phone': '+263771112233',
                'address': '10 Churchill Rd',
                'postal_code': '00263',
                'city': 'Mutare',
                'payment_method': payment_method,
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        return Order.objects.get(pk=res.data['id'])

    @patch('orders.order_views.email_service.send_order_status_update')
    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_eligible_order_cancellation_restores_stock_once_and_preserves_moderation_and_history(
        self, send_confirm, send_status
    ):
        send_confirm.return_value = {'success': True, 'message': 'sent'}
        send_status.return_value = {'success': True, 'message': 'sent'}

        order = self._create_sample_order(payment_method='ecocash')
        self.product_kg.refresh_from_db()
        self.product_crate.refresh_from_db()
        self.assertEqual(self.product_kg.stock, self.Decimal('7.50'))
        self.assertEqual(self.product_crate.stock, self.Decimal('0.00'))
        self.assertFalse(self.product_crate.is_available)

        # Admin hides product_crate after purchase; cancelling the order must NOT un-hide it
        self.product_crate.moderation_status = 'hidden'
        self.product_crate.save(update_fields=['moderation_status', 'updated_at'])

        cancel_res = self.client.post(f'/api/v1/cart/orders/{order.id}/cancel/')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK, cancel_res.data)
        self.assertEqual(cancel_res.data['status'], 'cancelled')
        self.assertEqual(cancel_res.data['total_amount'], '40.00')  # $5.00 + $30.00 + $5.00 delivery preserved

        # Farmer order items endpoint exposes parent order_status='cancelled' so dashboard excludes it
        self.client.force_authenticate(user=self.farmer)
        farmer_items_res = self.client.get('/api/v1/cart/farmer/items/')
        self.assertEqual(farmer_items_res.status_code, status.HTTP_200_OK)
        self.assertTrue(all(it['order_status'] == 'cancelled' for it in farmer_items_res.data))
        self.client.force_authenticate(user=self.customer)

        self.product_kg.refresh_from_db()
        self.product_crate.refresh_from_db()
        self.assertEqual(self.product_kg.stock, self.Decimal('10.00'))
        self.assertEqual(self.product_crate.stock, self.Decimal('2.00'))
        self.assertTrue(self.product_crate.is_available)
        self.assertEqual(self.product_crate.moderation_status, 'hidden')

        for item in order.items.all():
            self.assertTrue(item.stock_restored)
            self.assertIsNotNone(item.stock_restored_at)

        # Double cancellation via /cancel/ or /status/ is rejected and never double-restores stock
        second_cancel = self.client.post(f'/api/v1/cart/orders/{order.id}/cancel/')
        self.assertEqual(second_cancel.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.admin)
        admin_recancel = self.client.patch(
            f'/api/v1/cart/orders/{order.id}/status/',
            {'status': 'cancelled'},
            format='json',
        )
        self.assertEqual(admin_recancel.status_code, status.HTTP_400_BAD_REQUEST)

        self.product_kg.refresh_from_db()
        self.product_crate.refresh_from_db()
        self.assertEqual(self.product_kg.stock, self.Decimal('10.00'))
        self.assertEqual(self.product_crate.stock, self.Decimal('2.00'))

    @patch('orders.order_views.email_service.send_order_status_update')
    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_cancellation_blocked_after_item_shipped_or_order_shipped_and_rbac_enforced(
        self, send_confirm, send_status
    ):
        send_confirm.return_value = {'success': True, 'message': 'sent'}
        send_status.return_value = {'success': True, 'message': 'sent'}

        order = self._create_sample_order(payment_method='cod')

        # 1. Unauthorized users (another customer or farmer) cannot cancel order
        self.client.force_authenticate(user=self.other_customer)
        other_res = self.client.post(f'/api/v1/cart/orders/{order.id}/cancel/')
        self.assertEqual(other_res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.farmer)
        farmer_cancel = self.client.post(f'/api/v1/cart/orders/{order.id}/cancel/')
        self.assertEqual(farmer_cancel.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Customer cannot use PATCH /status/ to mark their own order paid/shipped/delivered
        self.client.force_authenticate(user=self.customer)
        for forbidden_status in ('paid', 'shipped', 'delivered'):
            res = self.client.patch(
                f'/api/v1/cart/orders/{order.id}/status/',
                {'status': forbidden_status},
                format='json',
            )
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Farmer transitions one item: pending -> accepted -> shipped (invalid jump pending -> shipped blocked first)
        self.client.force_authenticate(user=self.farmer)
        item = order.items.order_by('id').first()

        invalid_jump = self.client.patch(
            f'/api/v1/cart/farmer/items/{item.id}/status/',
            {'status': 'shipped'},
            format='json',
        )
        self.assertEqual(invalid_jump.status_code, status.HTTP_400_BAD_REQUEST)

        accept_res = self.client.patch(
            f'/api/v1/cart/farmer/items/{item.id}/status/',
            {'status': 'accepted'},
            format='json',
        )
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)

        ship_res = self.client.patch(
            f'/api/v1/cart/farmer/items/{item.id}/status/',
            {'status': 'shipped'},
            format='json',
        )
        self.assertEqual(ship_res.status_code, status.HTTP_200_OK)

        # Backward transition shipped -> pending is rejected
        backward_item = self.client.patch(
            f'/api/v1/cart/farmer/items/{item.id}/status/',
            {'status': 'pending'},
            format='json',
        )
        self.assertEqual(backward_item.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Now that an item has shipped, customer and admin cancellation must both be rejected without restoring stock
        self.client.force_authenticate(user=self.customer)
        cancel_after_ship = self.client.post(f'/api/v1/cart/orders/{order.id}/cancel/')
        self.assertEqual(cancel_after_ship.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('shipped or delivered', str(cancel_after_ship.data))

        self.client.force_authenticate(user=self.admin)
        admin_cancel_after_ship = self.client.patch(
            f'/api/v1/cart/orders/{order.id}/status/',
            {'status': 'cancelled'},
            format='json',
        )
        self.assertEqual(admin_cancel_after_ship.status_code, status.HTTP_400_BAD_REQUEST)

        self.product_kg.refresh_from_db()
        self.product_crate.refresh_from_db()
        self.assertEqual(self.product_kg.stock, self.Decimal('7.50'))
        self.assertEqual(self.product_crate.stock, self.Decimal('0.00'))


import threading
from decimal import Decimal
from django.db import connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient


class ConcurrentCheckoutTransactionTests(TransactionTestCase):
    """
    Section 4.22 Phase 2B: Actual concurrent checkout & cancellation verification
    using independent database transactions and PostgreSQL row locks.
    """

    def setUp(self):
        from users.models import FarmerProfile
        from products.models import Category

        User = get_user_model()
        self.farmer = User.objects.create_user(
            email='concurrent_farmer@example.com',
            username='concurrent_farmer',
            password='password123',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.farmer,
            farm_name='Concurrent Farm',
            location='Harare',
            status='approved',
        )
        self.buyer_1 = User.objects.create_user(
            email='concurrent_buyer1@example.com',
            username='concurrent_buyer1',
            password='password123',
            user_type='customer',
        )
        self.buyer_2 = User.objects.create_user(
            email='concurrent_buyer2@example.com',
            username='concurrent_buyer2',
            password='password123',
            user_type='customer',
        )
        self.category, _ = Category.objects.get_or_create(
            slug='vegetables',
            defaults={'name': 'Vegetables'},
        )
        self.honey = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Organic Raw Honey',
            slug='organic-raw-honey-concurrent',
            description='Pure raw honey sold by the kilogram',
            price=Decimal('10.00'),
            stock=Decimal('2.00'),
            unit='kg',
            min_order_quantity=Decimal('0.50'),
        )

    @patch('orders.order_views.email_service.send_order_status_update')
    @patch('orders.order_views.email_service.send_order_confirmation')
    def test_simultaneous_checkouts_and_cancellations_across_independent_transactions(
        self, send_confirm, send_status
    ):
        send_confirm.return_value = {'success': True, 'message': 'sent'}
        send_status.return_value = {'success': True, 'message': 'sent'}

        # Both buyers place 1.50 kg into their respective carts while 2.00 kg is in stock
        for buyer in (self.buyer_1, self.buyer_2):
            client = APIClient()
            client.force_authenticate(user=buyer)
            add_res = client.post(
                '/api/v1/cart/add/',
                {'product_id': self.honey.id, 'quantity': '1.50'},
                format='json',
            )
            self.assertEqual(add_res.status_code, status.HTTP_201_CREATED)

        checkout_barrier = threading.Barrier(2)
        checkout_results = [None, None]

        def run_checkout(idx, buyer):
            try:
                client = APIClient()
                client.force_authenticate(user=buyer)
                checkout_barrier.wait(timeout=15)
                res = client.post(
                    '/api/v1/cart/orders/create/',
                    {
                        'first_name': 'Buyer',
                        'last_name': str(idx),
                        'email': buyer.email,
                        'phone': '+263770001122',
                        'address': '1 Concurrency Way',
                        'postal_code': '00263',
                        'city': 'Harare',
                        'payment_method': 'ecocash',
                    },
                    format='json',
                )
                checkout_results[idx] = (res.status_code, res.data)
            finally:
                connections.close_all()

        t1 = threading.Thread(target=run_checkout, args=(0, self.buyer_1))
        t2 = threading.Thread(target=run_checkout, args=(1, self.buyer_2))
        t1.start()
        t2.start()
        t1.join(timeout=30)
        t2.join(timeout=30)

        statuses = sorted([checkout_results[0][0], checkout_results[1][0]])
        self.assertEqual(statuses, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST], checkout_results)
        self.assertEqual(Order.objects.count(), 1)

        self.honey.refresh_from_db()
        self.assertEqual(self.honey.stock, Decimal('0.50'))

        # Now verify two simultaneous cancellation requests on that single order in independent transactions
        order = Order.objects.get()
        winning_buyer = order.customer
        cancel_barrier = threading.Barrier(2)
        cancel_statuses = [None, None]

        def run_cancel(idx):
            try:
                client = APIClient()
                client.force_authenticate(user=winning_buyer)
                cancel_barrier.wait(timeout=15)
                res = client.post(f'/api/v1/cart/orders/{order.id}/cancel/')
                cancel_statuses[idx] = res.status_code
            finally:
                connections.close_all()

        c1 = threading.Thread(target=run_cancel, args=(0,))
        c2 = threading.Thread(target=run_cancel, args=(1,))
        c1.start()
        c2.start()
        c1.join(timeout=30)
        c2.join(timeout=30)

        self.assertEqual(sorted(cancel_statuses), [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
        self.honey.refresh_from_db()
        self.assertEqual(self.honey.stock, Decimal('2.00'))
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertTrue(order.items.get().stock_restored)
