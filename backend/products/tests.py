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
