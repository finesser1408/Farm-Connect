from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product
from .models import PlatformTestimonial, ProductReview

User = get_user_model()


class ReviewSystemTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='customer_jane',
            email='jane@example.com',
            password='testpassword123',
            user_type='customer',
            first_name='Jane',
            last_name='Doe',
        )
        self.other_customer = User.objects.create_user(
            username='customer_john',
            email='john@example.com',
            password='testpassword123',
            user_type='customer',
            first_name='John',
            last_name='Smith',
        )
        self.farmer = User.objects.create_user(
            username='farmer_bob',
            email='bob@example.com',
            password='testpassword123',
            user_type='farmer',
            first_name='Bob',
            last_name='Farmer',
        )
        self.admin = User.objects.create_superuser(
            username='admin_boss',
            email='admin@example.com',
            password='testpassword123',
            user_type='admin',
        )

        self.category, _ = Category.objects.get_or_create(slug='vegetables', defaults={'name': 'Vegetables'})
        self.product = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name='Fresh Organic Spinach',
            slug='fresh-organic-spinach',
            description='Crisp farm spinach',
            price='3.50',
            stock=50,
            is_available=True,
        )

    # ── Platform Testimonial Tests ─────────────────────

    def test_public_testimonial_listing_only_shows_approved_with_consent(self):
        PlatformTestimonial.objects.create(
            customer=self.customer,
            rating=5,
            comment='Absolutely delicious fresh produce every week!',
            display_name='Jane D.',
            consent_public=True,
            status='approved',
        )
        PlatformTestimonial.objects.create(
            customer=self.other_customer,
            rating=4,
            comment='Pending moderation review from John.',
            consent_public=True,
            status='pending',
        )

        url = reverse('testimonials-list-create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['display_name'], 'Jane D.')
        self.assertEqual(response.data[0]['rating'], 5)

    def test_anonymous_cannot_submit_testimonial(self):
        url = reverse('testimonials-list-create')
        payload = {
            'rating': 5,
            'comment': 'Anonymous attempt to submit feedback.',
            'consent_public': True,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_farmer_cannot_submit_testimonial(self):
        self.client.force_authenticate(user=self.farmer)
        url = reverse('testimonials-list-create')
        payload = {
            'rating': 5,
            'comment': 'Farmers should not be reviewing the platform as customers.',
            'consent_public': True,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_can_submit_testimonial_and_cannot_self_approve(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('testimonials-list-create')
        payload = {
            'rating': 5,
            'comment': 'High quality greens and exceptional customer care.',
            'display_name': 'Jane D.',
            'consent_public': True,
            'status': 'approved',  # Trying to self-approve
            'is_verified_buyer': True,  # Trying to self-verify
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')  # Forced pending
        self.assertFalse(response.data['is_verified_buyer'])  # Kept false

        saved = PlatformTestimonial.objects.get(customer=self.customer)
        self.assertEqual(saved.status, 'pending')
        self.assertFalse(saved.is_verified_buyer)

    def test_testimonial_validation_rules(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('testimonials-list-create')

        # Invalid rating > 5
        res = self.client.post(url, {'rating': 6, 'comment': 'Valid length feedback text.', 'consent_public': True})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Rating < 1
        res = self.client.post(url, {'rating': 0, 'comment': 'Valid length feedback text.', 'consent_public': True})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Comment too short (< 10 chars)
        res = self.client.post(url, {'rating': 5, 'comment': 'Short', 'consent_public': True})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Without consent
        res = self.client.post(url, {'rating': 5, 'comment': 'Valid length feedback text.', 'consent_public': False})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_can_update_existing_pending_testimonial(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('testimonials-list-create')

        # First submission
        self.client.post(url, {'rating': 4, 'comment': 'Initial feedback that was four stars.', 'consent_public': True})
        self.assertEqual(PlatformTestimonial.objects.filter(customer=self.customer).count(), 1)

        # Update submission
        response = self.client.post(
            url,
            {'rating': 5, 'comment': 'Updated feedback now five stars after further deliveries.', 'consent_public': True},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PlatformTestimonial.objects.filter(customer=self.customer).count(), 1)
        updated = PlatformTestimonial.objects.get(customer=self.customer)
        self.assertEqual(updated.rating, 5)
        self.assertEqual(updated.status, 'pending')

    # ── Product Review Tests ───────────────────────────

    def test_product_review_listing_and_aggregates(self):
        ProductReview.objects.create(
            product=self.product,
            customer=self.customer,
            rating=5,
            title='Best spinach',
            comment='Super crisp and fresh leaves. Loved it!',
            status='approved',
        )
        ProductReview.objects.create(
            product=self.product,
            customer=self.other_customer,
            rating=4,
            title='Good quality',
            comment='Arrived in good condition and tasted great.',
            status='approved',
        )

        url = reverse('product-reviews-list-create', kwargs={'slug': self.product.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_reviews'], 2)
        self.assertEqual(response.data['average_rating'], 4.5)
        self.assertEqual(len(response.data['reviews']), 2)

    def test_customer_can_submit_and_update_product_review(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('product-reviews-list-create', kwargs={'slug': self.product.slug})

        # Submit review
        response = self.client.post(
            url,
            {
                'rating': 4,
                'title': 'Tasty produce',
                'comment': 'Good fresh produce delivered safely.',
                'status': 'approved',  # Attempt self-approval
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertFalse(response.data['verified_purchase'])

        # Update review
        response_update = self.client.post(
            url,
            {
                'rating': 5,
                'title': 'Tasty produce updated',
                'comment': 'Even better than expected on second try!',
            },
        )
        self.assertEqual(response_update.status_code, status.HTTP_200_OK)
        self.assertEqual(ProductReview.objects.filter(product=self.product, customer=self.customer).count(), 1)
        saved = ProductReview.objects.get(product=self.product, customer=self.customer)
        self.assertEqual(saved.rating, 5)
        self.assertEqual(saved.status, 'pending')

    # ── Admin Moderation Tests ─────────────────────────

    def test_admin_can_moderate_testimonial(self):
        testimonial = PlatformTestimonial.objects.create(
            customer=self.customer,
            rating=5,
            comment='Excellent produce quality and service.',
            consent_public=True,
            status='pending',
        )

        # Regular customer cannot access moderation
        self.client.force_authenticate(user=self.customer)
        url = reverse('admin-testimonials-detail', kwargs={'pk': testimonial.pk})
        res = self.client.patch(url, {'status': 'approved'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin approves
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(url, {'status': 'approved'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        testimonial.refresh_from_db()
        self.assertEqual(testimonial.status, 'approved')
        self.assertEqual(testimonial.moderated_by, self.admin)
        self.assertIsNotNone(testimonial.moderated_at)
