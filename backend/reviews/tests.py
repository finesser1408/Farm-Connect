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



class AdminReviewModerationTests(APITestCase):
    """Section 4.16: admin moderation of product reviews and platform testimonials."""

    def setUp(self):
        from users.models import FarmerProfile

        self.super_admin = User.objects.create_superuser(
            username='mod_super', email='super@example.com', password='pw-123456!', user_type='admin',
        )
        self.general_admin = User.objects.create_user(
            username='mod_general', email='general@example.com', password='pw-123456!',
            user_type='admin', is_staff=True,
        )
        self.customer = User.objects.create_user(
            username='cust_a', email='alice@example.com', password='pw-123456!',
            user_type='customer', first_name='Alice', last_name='Moyo',
        )
        self.other_customer = User.objects.create_user(
            username='cust_b', email='brian@example.com', password='pw-123456!',
            user_type='customer', first_name='Brian', last_name='Dube',
        )
        self.farmer = User.objects.create_user(
            username='farm_c', email='farmer@example.com', password='pw-123456!', user_type='farmer',
        )
        FarmerProfile.objects.create(user=self.farmer, farm_name='Green Acres', location='Harare', status='approved')
        category, _ = Category.objects.get_or_create(slug='vegetables', defaults={'name': 'Vegetables'})
        self.product = Product.objects.create(
            farmer=self.farmer, category=category, name='Butternut Squash', slug='butternut-squash',
            description='Sweet squash', price='2.00', stock=10, is_available=True,
        )
        self.review = ProductReview.objects.create(
            product=self.product, customer=self.customer, rating=4, title='Nice squash',
            comment='Sweet and fresh squash from the farm.', status='pending',
        )
        self.testimonial = PlatformTestimonial.objects.create(
            customer=self.customer, rating=5, comment='Great marketplace with reliable delivery.',
            consent_public=True, status='pending',
        )
        self.review_url = reverse('admin-product-reviews-detail', kwargs={'pk': self.review.pk})
        self.testimonial_url = reverse('admin-testimonials-detail', kwargs={'pk': self.testimonial.pk})
        self.review_list_url = reverse('admin-product-reviews-list')
        self.testimonial_list_url = reverse('admin-testimonials-list')

    def _public_review_count(self):
        url = reverse('product-reviews-list-create', kwargs={'slug': self.product.slug})
        self.client.force_authenticate(user=None)
        return len(self.client.get(url).data['reviews'])

    def _public_testimonial_count(self):
        self.client.force_authenticate(user=None)
        return len(self.client.get(reverse('testimonials-list-create')).data)

    # ── Status transitions & public visibility ─────────

    def test_product_review_full_transition_cycle_controls_public_visibility(self):
        self.assertEqual(self._public_review_count(), 0)  # pending hidden

        self.client.force_authenticate(user=self.general_admin)
        res = self.client.patch(self.review_url, {'status': 'approved'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'approved')
        self.assertEqual(res.data['moderated_by_email'], 'general@example.com')
        self.assertEqual(self._public_review_count(), 1)  # approved visible

        self.client.force_authenticate(user=self.general_admin)
        res = self.client.patch(self.review_url, {'status': 'rejected'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._public_review_count(), 0)  # approved -> rejected hidden

        self.client.force_authenticate(user=self.super_admin)
        res = self.client.patch(self.review_url, {'status': 'approved'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._public_review_count(), 1)  # rejected -> approved visible

    def test_testimonial_pending_to_rejected_and_back_to_approved(self):
        self.client.force_authenticate(user=self.general_admin)
        res = self.client.patch(self.testimonial_url, {'status': 'rejected'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._public_testimonial_count(), 0)

        self.client.force_authenticate(user=self.general_admin)
        res = self.client.patch(self.testimonial_url, {'status': 'approved'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._public_testimonial_count(), 1)

        self.client.force_authenticate(user=self.general_admin)
        res = self.client.patch(self.testimonial_url, {'status': 'rejected'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._public_testimonial_count(), 0)

    def test_reapplying_current_status_is_rejected_without_audit(self):
        from users.models import AdminAuditLog

        self.client.force_authenticate(user=self.general_admin)
        self.client.patch(self.review_url, {'status': 'approved'}, format='json')
        res = self.client.patch(self.review_url, {'status': 'approved'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AdminAuditLog.objects.filter(target_type='product_review').count(), 1)

    # ── Audit logging ───────────────────────────────────

    def test_each_decision_creates_audit_log_entry(self):
        from users.models import AdminAuditLog

        self.client.force_authenticate(user=self.general_admin)
        self.client.patch(self.review_url, {'status': 'approved', 'reason': 'Looks genuine'}, format='json')
        self.client.patch(self.testimonial_url, {'status': 'rejected'}, format='json')

        review_log = AdminAuditLog.objects.get(target_type='product_review')
        self.assertEqual(review_log.action, 'approve_product_review')
        self.assertEqual(review_log.actor, self.general_admin)
        self.assertEqual(review_log.target_id, str(self.review.pk))
        self.assertEqual(review_log.details['previous_status'], 'pending')
        self.assertEqual(review_log.details['new_status'], 'approved')
        self.assertEqual(review_log.details['reason'], 'Looks genuine')
        self.assertIn('moderated_at', review_log.details)
        self.assertIsNotNone(review_log.created_at)

        testimonial_log = AdminAuditLog.objects.get(target_type='platform_testimonial')
        self.assertEqual(testimonial_log.action, 'reject_platform_testimonial')
        self.assertEqual(testimonial_log.target_id, str(self.testimonial.pk))
        self.assertEqual(testimonial_log.details['previous_status'], 'pending')
        self.assertEqual(testimonial_log.details['new_status'], 'rejected')

    # ── Unauthorized access ─────────────────────────────

    def test_non_admins_cannot_list_or_moderate(self):
        for user in (None, self.customer, self.farmer):
            self.client.force_authenticate(user=user)
            for url in (self.review_list_url, self.testimonial_list_url, self.review_url):
                res = self.client.get(url)
                self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
            for url in (self.review_url, self.testimonial_url):
                res = self.client.patch(url, {'status': 'approved'}, format='json')
                self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        self.review.refresh_from_db()
        self.testimonial.refresh_from_db()
        self.assertEqual(self.review.status, 'pending')
        self.assertEqual(self.testimonial.status, 'pending')

    def test_suspended_admin_cannot_moderate(self):
        self.general_admin.is_active = False
        self.general_admin.save(update_fields=['is_active'])
        self.client.force_authenticate(user=self.general_admin)
        res = self.client.patch(self.review_url, {'status': 'approved'}, format='json')
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    # ── Pagination, filters & backward compatibility ───

    def test_list_keeps_legacy_array_without_page_params(self):
        self.client.force_authenticate(user=self.general_admin)
        res = self.client.get(self.review_list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        self.assertEqual(res.data[0]['product_name'], 'Butternut Squash')
        self.assertEqual(res.data[0]['customer_email'], 'alice@example.com')

    def test_paginated_list_with_status_filter_and_search(self):
        for i in range(14):
            buyer = User.objects.create_user(
                username=f'bulk_{i}', email=f'bulk{i}@example.com', password='pw-123456!', user_type='customer',
            )
            ProductReview.objects.create(
                product=self.product, customer=buyer, rating=3, comment=f'Bulk pending review number {i}.',
                status='pending',
            )
        ProductReview.objects.create(
            product=self.product, customer=self.other_customer, rating=2, comment='Rejected content here.',
            status='rejected',
        )

        self.client.force_authenticate(user=self.general_admin)
        res = self.client.get(self.review_list_url, {'page': 1, 'page_size': 10, 'status': 'pending'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 15)
        self.assertEqual(len(res.data['results']), 10)
        self.assertIsNotNone(res.data['next'])

        res = self.client.get(self.review_list_url, {'page': 2, 'page_size': 10, 'status': 'pending'})
        self.assertEqual(len(res.data['results']), 5)

        res = self.client.get(self.review_list_url, {'page': 1, 'status': 'rejected'})
        self.assertEqual(res.data['count'], 1)

        res = self.client.get(self.review_list_url, {'page': 1, 'search': 'alice'})
        self.assertEqual(res.data['count'], 1)

        res = self.client.get(self.testimonial_list_url, {'page': 1, 'status': 'pending', 'search': 'Moyo'})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['customer_name'], 'Alice Moyo')

    def test_retrieve_single_submission(self):
        self.client.force_authenticate(user=self.general_admin)
        res = self.client.get(self.testimonial_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['id'], self.testimonial.pk)

    # ── Invalid requests ────────────────────────────────

    def test_invalid_requests_are_rejected(self):
        self.client.force_authenticate(user=self.general_admin)
        for payload in ({'status': 'pending'}, {'status': 'deleted'}, {}):
            res = self.client.patch(self.review_url, payload, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.get(self.review_list_url, {'status': 'bogus'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.patch(self.review_list_url, {'status': 'approved'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        missing = reverse('admin-product-reviews-detail', kwargs={'pk': 999999})
        self.assertEqual(self.client.patch(missing, {'status': 'approved'}, format='json').status_code, 404)

        self.review.refresh_from_db()
        self.assertEqual(self.review.status, 'pending')

    # ── Privacy & data preservation ─────────────────────

    def test_public_serializers_never_expose_customer_email(self):
        self.review.status = 'approved'
        self.review.save()
        self.testimonial.status = 'approved'
        self.testimonial.save()

        self.client.force_authenticate(user=None)
        review_payload = self.client.get(
            reverse('product-reviews-list-create', kwargs={'slug': self.product.slug})
        ).content.decode()
        testimonial_payload = self.client.get(reverse('testimonials-list-create')).content.decode()
        for payload in (review_payload, testimonial_payload):
            self.assertNotIn('alice@example.com', payload)
            self.assertNotIn('customer_email', payload)

    def test_moderation_preserves_submission_content_and_records(self):
        original = (self.review.rating, self.review.title, self.review.comment, self.review.customer_id)
        self.client.force_authenticate(user=self.general_admin)
        self.client.patch(self.review_url, {'status': 'rejected'}, format='json')
        self.client.patch(self.testimonial_url, {'status': 'rejected'}, format='json')

        self.review.refresh_from_db()
        self.assertEqual(
            (self.review.rating, self.review.title, self.review.comment, self.review.customer_id), original,
        )
        self.assertEqual(ProductReview.objects.count(), 1)
        self.assertEqual(PlatformTestimonial.objects.count(), 1)
