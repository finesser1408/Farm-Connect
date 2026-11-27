import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from PIL import Image

from users.models import FarmerProfile
from .models import Category, Product


def make_test_image(image_format):
    image = Image.new('RGB', (2, 2), color='green')
    image_data = BytesIO()
    image.save(image_data, format=image_format)
    return image_data.getvalue()


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
            status='approved',
        )
        self.category, _ = Category.objects.get_or_create(
            slug='fruits',
            defaults={'name': 'Fruits'},
        )
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
        self.other_category, _ = Category.objects.get_or_create(
            slug='vegetables',
            defaults={'name': 'Vegetables'},
        )
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
            status='approved',
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

    def test_product_detail_includes_farmer_name_and_location(self):
        self.user.first_name = 'Tariro'
        self.user.last_name = 'Moyo'
        self.user.save(update_fields=['first_name', 'last_name'])

        response = self.client.get(reverse('product-detail', args=['organic-apple']))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['farmer_name'], 'Tariro Moyo')
        self.assertEqual(response.data['farmer_location'], 'Nairobi')
        self.assertNotIn('farmer_email', response.data)

    def test_product_detail_without_farmer_profile_returns_empty_location(self):
        FarmerProfile.objects.get(user=self.user).delete()
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('product-detail', args=['organic-apple']))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['farmer_location'], '')

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

    def test_public_product_list_excludes_out_of_stock_products(self):
        Product.objects.create(
            farmer=self.user,
            category=self.category,
            name='Out of stock apple',
            slug='out-of-stock-apple',
            description='Not currently available',
            price='3.50',
            stock=0,
        )

        response = self.client.get(reverse('product-list-create'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 4)
        self.assertNotIn('Out of stock apple', [item['name'] for item in response.data['results']])

    def test_only_admin_can_list_unavailable_products(self):
        response = self.client.get(reverse('product-list-create'), {'available': 'all'})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_product_creation_rejects_anonymous_and_customer_users(self):
        product_data = {
            'name': 'Unauthorized product',
            'price': '2.50',
            'stock': 3,
            'description': 'Fresh produce',
            'category': self.category.id,
        }
        url = reverse('product-list-create')

        response = self.client.post(url, product_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        customer = get_user_model().objects.create_user(
            username='customer',
            email='customer@example.com',
            password='password123',
            user_type='customer',
        )
        self.client.force_authenticate(user=customer)
        response = self.client.post(url, product_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_farmer_cannot_modify_another_farmers_product(self):
        product = Product.objects.get(slug='kigali-kale')
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse('product-detail', args=[product.slug]),
            {'name': 'Changed by another farmer'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        product.refresh_from_db()
        self.assertEqual(product.name, 'Kigali Kale')

    def test_category_api_returns_only_approved_categories(self):
        response = self.client.get(reverse('category-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [category['name'] for category in response.data],
            [
                'Vegetables',
                'Fruits',
                'Grains and Cereals',
                'Legumes and Pulses',
                'Root and Tuber crops',
                'Oilseeds',
                'Livestock and Poultry',
            ],
        )

    def test_product_image_uploads_are_validated_and_retrievable(self):
        self.client.force_authenticate(user=self.user)
        supported_images = (
            ('JPEG', 'product.jpg'),
            ('PNG', 'product.png'),
            ('WEBP', 'product.webp'),
        )

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            for image_format, filename in supported_images:
                with self.subTest(image_format=image_format):
                    image = SimpleUploadedFile(
                        filename,
                        make_test_image(image_format),
                        content_type=f'image/{image_format.lower()}',
                    )
                    response = self.client.post(
                        reverse('product-list-create'),
                        {
                            'name': f'{image_format} produce',
                            'price': '2.50',
                            'stock': 3,
                            'unit': 'kg',
                            'description': 'Fresh produce',
                            'category': self.category.id,
                            'image': image,
                        },
                        format='multipart',
                    )

                    self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
                    self.assertEqual(response.data['category'], self.category.id)
                    self.assertIsNotNone(response.data['image'])
                    detail = self.client.get(
                        reverse('product-detail', args=[response.data['slug']])
                    )
                    self.assertEqual(detail.status_code, status.HTTP_200_OK)
                    self.assertIsNotNone(detail.data['image'])
                    product = Product.objects.get(slug=response.data['slug'])
                    self.assertTrue(product.image.storage.exists(product.image.name))

    def test_product_image_upload_rejects_mismatched_content_and_oversized_files(self):
        self.client.force_authenticate(user=self.user)
        upload_url = reverse('product-list-create')
        product_data = {
            'name': 'Invalid image product',
            'price': '2.50',
            'stock': 3,
            'description': 'Fresh produce',
            'category': self.category.id,
        }

        mismatched_image = SimpleUploadedFile(
            'not-an-image.jpg',
            make_test_image('PNG'),
            content_type='image/jpeg',
        )
        response = self.client.post(
            upload_url,
            {**product_data, 'image': mismatched_image},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', response.data)

        oversized_image = SimpleUploadedFile(
            'oversized.jpg',
            b'x' * (5 * 1024 * 1024 + 1),
            content_type='image/jpeg',
        )
        response = self.client.post(
            upload_url,
            {**product_data, 'image': oversized_image},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('5 MB or smaller', str(response.data['image']))


class AdminProductModerationTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        from orders.models import Order, OrderItem
        from reviews.models import ProductReview
        self.Order = Order
        self.OrderItem = OrderItem
        self.ProductReview = ProductReview

        self.super_admin = User.objects.create_superuser(
            username='superadmin',
            email='superadmin@example.com',
            password='password123',
            first_name='Super',
            last_name='Admin',
        )
        self.general_admin = User.objects.create_user(
            username='generaladmin',
            email='generaladmin@example.com',
            password='password123',
            first_name='General',
            last_name='Admin',
            user_type='admin',
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='password123',
            first_name='Tariro',
            last_name='Buyer',
            user_type='customer',
        )
        self.approved_farmer = User.objects.create_user(
            username='approvedfarmer',
            email='approvedfarmer@example.com',
            password='password123',
            first_name='Chipo',
            last_name='Moyo',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.approved_farmer,
            farm_name='Moyo Greens',
            location='Harare',
            status='approved',
        )
        self.other_farmer = User.objects.create_user(
            username='otherfarmer',
            email='otherfarmer@example.com',
            password='password123',
            first_name='Rudo',
            last_name='Ndlovu',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.other_farmer,
            farm_name='Ndlovu Harvest',
            location='Bulawayo',
            status='approved',
        )
        self.suspended_farmer = User.objects.create_user(
            username='suspendedfarmer',
            email='suspendedfarmer@example.com',
            password='password123',
            first_name='Tendai',
            last_name='Dube',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.suspended_farmer,
            farm_name='Paused Plot',
            location='Mutare',
            status='suspended',
        )
        self.pending_farmer = User.objects.create_user(
            username='pendingfarmer',
            email='pendingfarmer@example.com',
            password='password123',
            first_name='Nyasha',
            last_name='Shumba',
            user_type='farmer',
        )
        FarmerProfile.objects.create(
            user=self.pending_farmer,
            farm_name='New Soil Farm',
            location='Gweru',
            status='pending',
        )

        self.vegetables, _ = Category.objects.get_or_create(
            slug='vegetables',
            defaults={'name': 'Vegetables'},
        )
        self.fruits, _ = Category.objects.get_or_create(
            slug='fruits',
            defaults={'name': 'Fruits'},
        )
        self.product = Product.objects.create(
            farmer=self.approved_farmer,
            category=self.vegetables,
            name='Fresh Spinach',
            slug='fresh-spinach',
            description='Organic leafy spinach',
            price='3.00',
            stock=12,
        )
        self.other_product = Product.objects.create(
            farmer=self.other_farmer,
            category=self.fruits,
            name='Sweet Mangoes',
            slug='sweet-mangoes',
            description='Ripe mangoes',
            price='4.50',
            stock=15,
        )
        self.suspended_product = Product.objects.create(
            farmer=self.suspended_farmer,
            category=self.vegetables,
            name='Suspended Squash',
            slug='suspended-squash',
            description='Butternut squash',
            price='2.50',
            stock=5,
        )

    def test_super_and_general_admin_can_list_specific_farmer_products(self):
        url = reverse('product-list-create')
        for admin in (self.super_admin, self.general_admin):
            with self.subTest(admin=admin.email):
                self.client.force_authenticate(user=admin)
                response = self.client.get(
                    url,
                    {
                        'farmer_id': self.approved_farmer.id,
                        'available': 'all',
                        'moderation_status': 'all',
                    },
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data['count'], 1)
                self.assertEqual(response.data['results'][0]['slug'], 'fresh-spinach')
                self.assertEqual(response.data['results'][0]['farmer_id'], self.approved_farmer.id)

    def test_non_admin_cannot_access_admin_moderation_or_filter_hidden_products(self):
        for actor in (None, self.customer, self.approved_farmer):
            with self.subTest(actor=getattr(actor, 'email', 'anon')):
                if actor:
                    self.client.force_authenticate(user=actor)
                else:
                    self.client.force_authenticate(user=None)
                res_hidden = self.client.get(reverse('product-list-create'), {'moderation_status': 'hidden'})
                self.assertEqual(res_hidden.status_code, status.HTTP_403_FORBIDDEN)
                res_hide = self.client.patch(reverse('product-hide', args=[self.product.slug]))
                self.assertIn(res_hide.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
                res_restore = self.client.patch(reverse('product-restore', args=[self.product.slug]))
                self.assertIn(res_restore.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
                res_remove = self.client.patch(reverse('product-remove', args=[self.product.slug]))
                self.assertIn(res_remove.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_admin_can_create_product_for_approved_farmer_and_blocks_non_approved(self):
        from users.models import AdminAuditLog
        url = reverse('product-list-create')

        for admin in (self.super_admin, self.general_admin):
            self.client.force_authenticate(user=admin)
            res = self.client.post(
                url,
                {
                    'farmer_id': self.approved_farmer.id,
                    'name': f'Admin Onions {admin.username}',
                    'description': 'Red onions',
                    'price': '2.25',
                    'stock': 20,
                    'unit': 'kg',
                    'category': self.vegetables.id,
                },
                format='json',
            )
            self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
            self.assertEqual(res.data['farmer_id'], self.approved_farmer.id)
            self.assertEqual(res.data['moderation_status'], 'active')
            self.assertTrue(
                AdminAuditLog.objects.filter(
                    actor=admin,
                    action='admin_create_product',
                    target_id=res.data['id'],
                ).exists()
            )

        # Reject missing, pending, suspended, and non-farmer target IDs
        for bad_id in ('', self.pending_farmer.id, self.suspended_farmer.id, self.customer.id):
            bad_res = self.client.post(
                url,
                {
                    'farmer_id': bad_id,
                    'name': 'Blocked Admin Item',
                    'description': 'Should fail',
                    'price': '2.00',
                    'stock': 5,
                    'category': self.vegetables.id,
                },
                format='json',
            )
            self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_edit_product_and_replace_image_without_touching_others(self):
        from users.models import AdminAuditLog
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            initial_img = SimpleUploadedFile('initial.jpg', make_test_image('JPEG'), content_type='image/jpeg')
            other_img = SimpleUploadedFile('other.png', make_test_image('PNG'), content_type='image/png')
            self.other_product.image = other_img
            self.other_product.save()
            self.product.image = initial_img
            self.product.save()

            self.client.force_authenticate(user=self.general_admin)
            replacement_img = SimpleUploadedFile('updated.webp', make_test_image('WEBP'), content_type='image/webp')
            res = self.client.patch(
                reverse('product-detail', args=[self.product.slug]),
                {
                    'name': 'Organic Spinach Bundle',
                    'price': '3.75',
                    'stock': 18,
                    'image': replacement_img,
                },
                format='multipart',
            )
            self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
            self.product.refresh_from_db()
            self.other_product.refresh_from_db()
            self.assertEqual(self.product.name, 'Organic Spinach Bundle')
            self.assertEqual(str(self.product.price), '3.75')
            self.assertEqual(self.product.stock, 18)
            self.assertIn('updated', self.product.image.name)
            self.assertTrue(self.other_product.image.storage.exists(self.other_product.image.name))
            self.assertTrue(
                AdminAuditLog.objects.filter(
                    actor=self.general_admin,
                    action='admin_update_product',
                    target_id=self.product.id,
                ).exists()
            )

    def test_hide_and_restore_enforce_public_visibility_cart_and_checkout(self):
        from orders.models import Cart, CartItem
        from users.models import AdminAuditLog

        # Customer adds product to cart before hiding
        cart, _ = Cart.objects.get_or_create(customer=self.customer)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2, price=self.product.price)

        # Admin hides product
        self.client.force_authenticate(user=self.general_admin)
        hide_res = self.client.patch(
            reverse('product-hide', args=[self.product.slug]),
            {'reason': 'Seasonal stock check'},
            format='json',
        )
        self.assertEqual(hide_res.status_code, status.HTTP_200_OK)
        self.assertEqual(hide_res.data['moderation_status'], 'hidden')
        self.assertEqual(hide_res.data['moderation_reason'], 'Seasonal stock check')
        self.assertTrue(
            AdminAuditLog.objects.filter(actor=self.general_admin, action='hide_product', target_id=self.product.id).exists()
        )

        # Public listing, search, category filter, and direct detail reject/exclude hidden product
        self.client.force_authenticate(user=None)
        list_res = self.client.get(reverse('product-list-create'), {'search': 'Spinach', 'category': 'vegetables'})
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(list_res.data['count'], 0)
        detail_res = self.client.get(reverse('product-detail', args=[self.product.slug]))
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)

        # Cart add/update and checkout block hidden product
        self.client.force_authenticate(user=self.customer)
        add_res = self.client.post('/api/v1/cart/add/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(add_res.status_code, status.HTTP_400_BAD_REQUEST)
        update_res = self.client.patch(f'/api/v1/cart/items/{self.product.id}/', {'quantity': 1}, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_400_BAD_REQUEST)
        checkout_res = self.client.post(
            reverse('create-order'),
            {
                'first_name': 'Tariro',
                'last_name': 'Buyer',
                'email': self.customer.email,
                'phone': '+263771234567',
                'address': '10 First Street',
                'postal_code': '00263',
                'city': 'Harare',
                'payment_method': 'cod',
            },
            format='json',
        )
        self.assertEqual(checkout_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Admin restores hidden product -> returns to public visibility and preserves stock
        self.client.force_authenticate(user=self.super_admin)
        restore_res = self.client.patch(
            reverse('product-restore', args=[self.product.slug]),
            {'reason': 'Verified back in stock'},
            format='json',
        )
        self.assertEqual(restore_res.status_code, status.HTTP_200_OK)
        self.assertEqual(restore_res.data['moderation_status'], 'active')
        self.assertEqual(restore_res.data['stock'], 12)
        self.assertTrue(
            AdminAuditLog.objects.filter(actor=self.super_admin, action='restore_product', target_id=self.product.id).exists()
        )

        self.client.force_authenticate(user=None)
        public_after = self.client.get(reverse('product-detail', args=[self.product.slug]))
        self.assertEqual(public_after.status_code, status.HTTP_200_OK)

        # Restoring a product of a suspended farmer still does NOT make it public
        self.client.force_authenticate(user=self.super_admin)
        self.client.patch(reverse('product-hide', args=[self.suspended_product.slug]))
        self.client.patch(reverse('product-restore', args=[self.suspended_product.slug]))
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get(reverse('product-detail', args=[self.suspended_product.slug])).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_soft_remove_preserves_orders_and_reviews_and_blocks_restore(self):
        from users.models import AdminAuditLog

        order = self.Order.objects.create(
            customer=self.customer,
            first_name='Tariro',
            last_name='Buyer',
            email=self.customer.email,
            phone='+263771234567',
            address='10 First Street',
            postal_code='00263',
            city='Harare',
            total_amount='11.00',
            status='delivered',
        )
        order_item = self.OrderItem.objects.create(
            order=order,
            product=self.product,
            price=self.product.price,
            quantity=2,
        )
        review = self.ProductReview.objects.create(
            product=self.product,
            customer=self.customer,
            rating=5,
            title='Crisp leaves',
            comment='Really fresh spinach',
            status='approved',
        )

        self.client.force_authenticate(user=self.general_admin)
        remove_res = self.client.patch(
            reverse('product-remove', args=[self.product.slug]),
            {'reason': 'Discontinued product line'},
            format='json',
        )
        self.assertEqual(remove_res.status_code, status.HTTP_200_OK)
        self.assertEqual(remove_res.data['moderation_status'], 'removed')
        self.assertTrue(
            AdminAuditLog.objects.filter(actor=self.general_admin, action='remove_product', target_id=self.product.id).exists()
        )

        # Database rows remain intact
        self.assertTrue(Product.objects.filter(pk=self.product.id).exists())
        self.assertTrue(self.OrderItem.objects.filter(pk=order_item.id).exists())
        self.assertTrue(self.ProductReview.objects.filter(pk=review.id).exists())

        # Restoring or editing removed product is rejected
        self.assertEqual(
            self.client.patch(reverse('product-restore', args=[self.product.slug])).status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.patch(reverse('product-detail', args=[self.product.slug]), {'name': 'Hacked'}, format='json').status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        # Customer historical orders & reviews continue working
        self.client.force_authenticate(user=self.customer)
        order_res = self.client.get(reverse('order-detail', args=[order.id]))
        self.assertEqual(order_res.status_code, status.HTTP_200_OK)
        self.assertEqual(order_res.data['items'][0]['product']['name'], 'Fresh Spinach')
        review_res = self.client.get(f'/api/v1/reviews/products/{self.product.slug}/')
        self.assertEqual(review_res.status_code, status.HTTP_200_OK)
        self.assertEqual(review_res.data['total_reviews'], 1)

        # Farmer own view excludes removed products
        self.client.force_authenticate(user=self.approved_farmer)
        farmer_res = self.client.get(reverse('product-list-create'), {'farmer': 'me'})
        self.assertEqual(farmer_res.status_code, status.HTTP_200_OK)
        self.assertEqual(farmer_res.data['count'], 0)

    def test_farmer_cannot_self_restore_hidden_product_or_spoof_farmer_id(self):
        self.product.moderation_status = 'hidden'
        self.product.save(update_fields=['moderation_status'])

        self.client.force_authenticate(user=self.approved_farmer)
        patch_res = self.client.patch(
            reverse('product-detail', args=[self.product.slug]),
            {'moderation_status': 'active', 'name': 'Updated Name'},
            format='json',
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.moderation_status, 'hidden')

        # Farmer creating product with spoofed farmer_id ignores spoof and binds to self
        create_res = self.client.post(
            reverse('product-list-create'),
            {
                'farmer_id': self.other_farmer.id,
                'name': 'Farmer Owned Beans',
                'description': 'Fresh green beans',
                'price': '3.20',
                'stock': 10,
                'unit': 'kg',
                'category': self.vegetables.id,
            },
            format='json',
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data['farmer_id'], self.approved_farmer.id)

    def test_delete_endpoint_soft_removes_instead_of_hard_deleting(self):
        self.client.force_authenticate(user=self.super_admin)
        del_res = self.client.delete(reverse('product-detail', args=[self.other_product.slug]))
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.other_product.refresh_from_db()
        self.assertEqual(self.other_product.moderation_status, 'removed')



class ProductListingV1Tests(APITestCase):
    """Section 4.22 Phase 2A: Selling units, package descriptions, decimal stock, and min order validation."""

    def setUp(self):
        User = get_user_model()
        self.farmer = User.objects.create_user(
            username='v1_farmer',
            email='v1_farmer@example.com',
            password='password123',
            user_type='farmer',
            first_name='Tendai',
            last_name='Moyo',
        )
        FarmerProfile.objects.create(
            user=self.farmer,
            farm_name='Mazowe Valley Farm',
            location='Mazowe',
            status='approved',
        )
        self.category, _ = Category.objects.get_or_create(
            slug='vegetables',
            defaults={'name': 'Vegetables'},
        )
        self.url = reverse('product-list-create')
        self.client.force_authenticate(user=self.farmer)

    def test_create_products_with_continuous_and_countable_units(self):
        # 1. Continuous unit (kg) with fractional stock and min_order_quantity
        res_kg = self.client.post(
            self.url,
            {
                'name': 'Organic Tomatoes',
                'category': self.category.id,
                'unit': 'kg',
                'price': '1.50',
                'stock': '50.5',
                'min_order_quantity': '0.5',
                'description': 'Fresh red tomatoes sold per kg.',
            },
            format='json',
        )
        self.assertEqual(res_kg.status_code, status.HTTP_201_CREATED, res_kg.data)
        self.assertEqual(res_kg.data['unit'], 'kg')
        self.assertEqual(res_kg.data['unit_display'], 'Kilogram')
        self.assertEqual(res_kg.data['formatted_unit'], 'kg')
        self.assertFalse(res_kg.data['is_countable_unit'])
        self.assertEqual(res_kg.data['stock'], 50.5)
        self.assertEqual(res_kg.data['min_order_quantity'], 0.5)

        # 2. Continuous unit (Litre)
        res_l = self.client.post(
            self.url,
            {
                'name': 'Fresh Farm Milk',
                'category': self.category.id,
                'unit': 'l',
                'price': '1.20',
                'stock': '25.5',
                'min_order_quantity': '0.5',
                'description': 'Pasteurized whole milk.',
            },
            format='json',
        )
        self.assertEqual(res_l.status_code, status.HTTP_201_CREATED, res_l.data)
        self.assertEqual(res_l.data['formatted_unit'], 'L')
        self.assertFalse(res_l.data['is_countable_unit'])

        # 3. Packaged countable unit (bag with unit_description)
        res_bag = self.client.post(
            self.url,
            {
                'name': 'Washed Potatoes',
                'category': self.category.id,
                'unit': 'bag',
                'unit_description': '10 kg',
                'price': '8.00',
                'stock': 15,
                'min_order_quantity': 1,
                'description': '10 kg pocket of potatoes.',
            },
            format='json',
        )
        self.assertEqual(res_bag.status_code, status.HTTP_201_CREATED, res_bag.data)
        self.assertEqual(res_bag.data['formatted_unit'], '10 kg bag')
        self.assertTrue(res_bag.data['is_countable_unit'])
        self.assertEqual(res_bag.data['stock'], 15)

        # 4. Packaged countable unit (tray of 30 eggs)
        res_tray = self.client.post(
            self.url,
            {
                'name': 'Free Range Eggs',
                'category': self.category.id,
                'unit': 'tray',
                'unit_description': '30 eggs',
                'price': '4.50',
                'stock': 20,
                'min_order_quantity': 1,
                'description': 'Farm fresh eggs.',
            },
            format='json',
        )
        self.assertEqual(res_tray.status_code, status.HTTP_201_CREATED, res_tray.data)
        self.assertEqual(res_tray.data['formatted_unit'], '30 eggs tray')

    def test_rejects_missing_or_invalid_unit_on_create(self):
        # Missing unit
        res_missing = self.client.post(
            self.url,
            {
                'name': 'Unitless Tomatoes',
                'category': self.category.id,
                'price': '2.00',
                'stock': 10,
                'description': 'Missing unit.',
            },
            format='json',
        )
        self.assertEqual(res_missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unit', res_missing.data)

        # Invalid unit code
        res_invalid = self.client.post(
            self.url,
            {
                'name': 'Invalid Unit Tomatoes',
                'category': self.category.id,
                'unit': 'wheelbarrow',
                'price': '2.00',
                'stock': 10,
                'description': 'Invalid unit.',
            },
            format='json',
        )
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unit', res_invalid.data)

    def test_packaged_units_require_package_description(self):
        for packaged_unit in ('tray', 'crate', 'bag', 'bucket'):
            with self.subTest(unit=packaged_unit):
                res = self.client.post(
                    self.url,
                    {
                        'name': f'Ambiguous {packaged_unit}',
                        'category': self.category.id,
                        'unit': packaged_unit,
                        'price': '5.00',
                        'stock': 10,
                        'description': 'No package size provided.',
                    },
                    format='json',
                )
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('unit_description', res.data)

        # Description > 40 chars rejected
        res_long = self.client.post(
            self.url,
            {
                'name': 'Too Long Desc Bag',
                'category': self.category.id,
                'unit': 'bag',
                'unit_description': 'x' * 41,
                'price': '5.00',
                'stock': 10,
                'description': 'Too long package size.',
            },
            format='json',
        )
        self.assertEqual(res_long.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unit_description', res_long.data)

    def test_rejects_invalid_prices_stock_and_min_order_quantities(self):
        base = {
            'name': 'Validation Item',
            'category': self.category.id,
            'unit': 'kg',
            'price': '2.00',
            'stock': 10,
            'min_order_quantity': 1,
            'description': 'Test item.',
        }
        # Zero / negative price
        for bad_price in ('0', '0.00', '-2.50', '1.999'):
            res = self.client.post(self.url, {**base, 'price': bad_price}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative / excessive precision stock
        for bad_stock in ('-1', '-0.5', '10.125'):
            res = self.client.post(self.url, {**base, 'stock': bad_stock}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Zero / negative / excessive precision min_order_quantity
        for bad_min in ('0', '-1', '0.125'):
            res = self.client.post(self.url, {**base, 'min_order_quantity': bad_min}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Fractional stock or min_order_quantity on countable units rejected
        res_frac_stock = self.client.post(
            self.url,
            {**base, 'unit': 'bunch', 'stock': '5.5'},
            format='json',
        )
        self.assertEqual(res_frac_stock.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('stock', res_frac_stock.data)

        res_frac_min = self.client.post(
            self.url,
            {**base, 'unit': 'head', 'min_order_quantity': '0.5'},
            format='json',
        )
        self.assertEqual(res_frac_min.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('min_order_quantity', res_frac_min.data)

    def test_legacy_product_with_null_unit_remains_valid_without_fabricating_kg(self):
        legacy = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Legacy Test Onion',
            slug='legacy-test-onion',
            description='Created before V1',
            price='3.50',
            stock=20,
            unit=None,
        )
        self.assertIsNone(legacy.unit)
        self.assertEqual(legacy.formatted_unit, '')

        # Public detail works and does not fabricate 'kg'
        detail = self.client.get(reverse('product-detail', args=[legacy.slug]))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertIsNone(detail.data['unit'])
        self.assertEqual(detail.data['formatted_unit'], '')

        # Partial update of price/stock on legacy product succeeds without forcing a fake unit
        patch_res = self.client.patch(
            reverse('product-detail', args=[legacy.slug]),
            {'price': '4.00'},
            format='json',
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        legacy.refresh_from_db()
        self.assertIsNone(legacy.unit)
