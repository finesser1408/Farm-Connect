from django.db import transaction
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products.models import Product
from users.api_views import AdminPagination
from users.models import AdminAuditLog
from users.permissions import IsAdmin, IsCustomer
from .models import PlatformTestimonial, ProductReview
from .serializers import (
    AdminModerationSerializer,
    AdminPlatformTestimonialSerializer,
    AdminProductReviewSerializer,
    PlatformTestimonialCustomerSerializer,
    PlatformTestimonialPublicSerializer,
    ProductReviewCustomerSerializer,
    ProductReviewPublicSerializer,
)


@api_view(['GET', 'POST'])
def testimonials_list_create(request):
    """
    GET: List all approved platform testimonials that gave public consent.
    POST: Authenticated customer submits or updates their platform testimonial (status='pending').
    """
    if request.method == 'GET':
        testimonials = PlatformTestimonial.objects.filter(
            status='approved',
            consent_public=True,
        ).select_related('customer')
        serializer = PlatformTestimonialPublicSerializer(testimonials, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # POST requires authenticated customer
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    if getattr(request.user, 'user_type', None) != 'customer':
        return Response({'detail': 'Only customers can submit testimonials.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = PlatformTestimonialCustomerSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Check if customer already has a testimonial
    testimonial = PlatformTestimonial.objects.filter(customer=request.user).first()
    validated_data = serializer.validated_data

    if testimonial:
        # Update existing record and reset status to pending for moderation
        testimonial.rating = validated_data['rating']
        testimonial.comment = validated_data['comment']
        testimonial.display_name = validated_data.get('display_name', '')
        testimonial.role_or_title = validated_data.get('role_or_title', '')
        testimonial.consent_public = validated_data['consent_public']
        testimonial.status = 'pending'
        testimonial.is_verified_buyer = False  # Kept disabled for simulated orders
        testimonial.moderated_by = None
        testimonial.moderated_at = None
        testimonial.save()
        return Response(
            PlatformTestimonialCustomerSerializer(testimonial).data,
            status=status.HTTP_200_OK,
        )

    # Create new testimonial
    new_testimonial = PlatformTestimonial.objects.create(
        customer=request.user,
        rating=validated_data['rating'],
        comment=validated_data['comment'],
        display_name=validated_data.get('display_name', ''),
        role_or_title=validated_data.get('role_or_title', ''),
        consent_public=validated_data['consent_public'],
        status='pending',
        is_verified_buyer=False,
    )
    return Response(
        PlatformTestimonialCustomerSerializer(new_testimonial).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsCustomer])
def my_testimonial(request):
    """Retrieve the logged-in customer's own testimonial submission, if one exists."""
    testimonial = PlatformTestimonial.objects.filter(customer=request.user).first()
    if not testimonial:
        return Response({'has_testimonial': False, 'testimonial': None}, status=status.HTTP_200_OK)
    return Response(
        {
            'has_testimonial': True,
            'testimonial': PlatformTestimonialCustomerSerializer(testimonial).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET', 'POST'])
def product_reviews_list_create(request, slug):
    """
    GET: List approved reviews and summary statistics for a given product slug.
    POST: Authenticated customer submits or updates their review for this product (status='pending').
    """
    product = get_object_or_404(Product, slug=slug)

    if request.method == 'GET':
        approved_reviews = ProductReview.objects.filter(
            product=product,
            status='approved',
        ).select_related('customer')

        aggregates = approved_reviews.aggregate(
            avg_rating=Avg('rating'),
            total_count=Count('id'),
        )
        avg = aggregates['avg_rating']
        total = aggregates['total_count'] or 0

        serializer = ProductReviewPublicSerializer(approved_reviews, many=True)
        return Response(
            {
                'product_slug': product.slug,
                'total_reviews': total,
                'average_rating': round(float(avg), 1) if avg is not None else None,
                'reviews': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # POST requires authenticated customer
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    if getattr(request.user, 'user_type', None) != 'customer':
        return Response({'detail': 'Only customers can submit product reviews.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ProductReviewCustomerSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    existing_review = ProductReview.objects.filter(
        product=product,
        customer=request.user,
    ).first()

    validated_data = serializer.validated_data

    if existing_review:
        # Update existing review and reset status to pending for moderation
        existing_review.rating = validated_data['rating']
        existing_review.title = validated_data.get('title', '')
        existing_review.comment = validated_data['comment']
        existing_review.status = 'pending'
        existing_review.verified_purchase = False  # Kept disabled for simulated orders
        existing_review.moderated_by = None
        existing_review.moderated_at = None
        existing_review.save()
        return Response(
            ProductReviewCustomerSerializer(existing_review).data,
            status=status.HTTP_200_OK,
        )

    new_review = ProductReview.objects.create(
        product=product,
        customer=request.user,
        rating=validated_data['rating'],
        title=validated_data.get('title', ''),
        comment=validated_data['comment'],
        status='pending',
        verified_purchase=False,
    )
    return Response(
        ProductReviewCustomerSerializer(new_review).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsCustomer])
def my_product_review(request, slug):
    """Retrieve the logged-in customer's own review for a specific product, if one exists."""
    product = get_object_or_404(Product, slug=slug)
    review = ProductReview.objects.filter(product=product, customer=request.user).first()
    if not review:
        return Response({'has_review': False, 'review': None}, status=status.HTTP_200_OK)
    return Response(
        {
            'has_review': True,
            'review': ProductReviewCustomerSerializer(review).data,
        },
        status=status.HTTP_200_OK,
    )


# ── Admin Moderation Endpoints ─────────────────────────
#
# Backward compatibility: when neither ``page`` nor ``page_size`` is supplied the
# list endpoints keep returning a plain JSON array (legacy contract). Supplying
# either parameter returns the standard paginated envelope
# ``{count, next, previous, results}`` used by the other admin list endpoints.

MODERATION_STATUSES = {'pending', 'approved', 'rejected'}


def _invalid_status_filter_response(status_filter):
    return Response(
        {'detail': f'Invalid status filter "{status_filter}". Use pending, approved, or rejected.'},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _list_response(request, queryset, serializer_class):
    if 'page' in request.query_params or 'page_size' in request.query_params:
        paginator = AdminPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = serializer_class(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    serializer = serializer_class(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


def _moderate_submission(request, *, model, pk, serializer_class, target_type, describe):
    """Apply an approve/reject decision atomically and record it in AdminAuditLog."""
    decision = AdminModerationSerializer(data=request.data)
    if not decision.is_valid():
        return Response(decision.errors, status=status.HTTP_400_BAD_REQUEST)

    new_status = decision.validated_data['status']
    reason = decision.validated_data.get('reason', '').strip()

    with transaction.atomic():
        submission = get_object_or_404(model.objects.select_for_update(), pk=pk)
        previous_status = submission.status
        if previous_status == new_status:
            return Response(
                {'detail': f'Submission is already {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submission.status = new_status
        submission.moderated_by = request.user
        submission.moderated_at = timezone.now()
        submission.save(update_fields=['status', 'moderated_by', 'moderated_at', 'updated_at'])

        target_repr, extra_details = describe(submission)
        AdminAuditLog.log(
            actor=request.user,
            action=f"{'approve' if new_status == 'approved' else 'reject'}_{target_type}",
            target_type=target_type,
            target_id=submission.pk,
            target_repr=target_repr,
            details={
                'previous_status': previous_status,
                'new_status': new_status,
                'moderated_at': submission.moderated_at.isoformat(),
                **extra_details,
                **({'reason': reason} if reason else {}),
            },
        )

    submission = model.objects.select_related('customer', 'moderated_by').get(pk=submission.pk)
    return Response(serializer_class(submission).data, status=status.HTTP_200_OK)


def _describe_testimonial(testimonial):
    return (
        f"Testimonial #{testimonial.pk} ({testimonial.rating}★)",
        {'customer_id': testimonial.customer_id},
    )


def _describe_product_review(review):
    return (
        f"Review #{review.pk} on {review.product.name}"[:255],
        {
            'customer_id': review.customer_id,
            'product_id': review.product_id,
            'product_slug': review.product.slug,
        },
    )


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdmin])
def admin_testimonials_moderate(request, pk=None):
    """
    GET  /admin/testimonials/          list (filters: status, search; optional pagination)
    GET  /admin/testimonials/<pk>/     retrieve one testimonial
    PATCH /admin/testimonials/<pk>/    {"status": "approved"|"rejected", "reason"?: str}
    """
    if request.method == 'GET':
        if pk is not None:
            testimonial = get_object_or_404(
                PlatformTestimonial.objects.select_related('customer', 'moderated_by'), pk=pk,
            )
            return Response(AdminPlatformTestimonialSerializer(testimonial).data, status=status.HTTP_200_OK)

        queryset = PlatformTestimonial.objects.select_related('customer', 'moderated_by').order_by('-created_at')
        status_filter = (request.query_params.get('status') or '').strip().lower()
        if status_filter:
            if status_filter not in MODERATION_STATUSES:
                return _invalid_status_filter_response(status_filter)
            queryset = queryset.filter(status=status_filter)

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(customer__email__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(display_name__icontains=search)
                | Q(comment__icontains=search)
            )
        return _list_response(request, queryset, AdminPlatformTestimonialSerializer)

    if pk is None:
        return Response({'detail': 'Method "PATCH" not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    return _moderate_submission(
        request,
        model=PlatformTestimonial,
        pk=pk,
        serializer_class=AdminPlatformTestimonialSerializer,
        target_type='platform_testimonial',
        describe=_describe_testimonial,
    )


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdmin])
def admin_product_reviews_moderate(request, pk=None):
    """
    GET  /admin/products/          list (filters: status, search; optional pagination)
    GET  /admin/products/<pk>/     retrieve one product review
    PATCH /admin/products/<pk>/    {"status": "approved"|"rejected", "reason"?: str}
    """
    base_qs = ProductReview.objects.select_related('product', 'customer', 'moderated_by')
    if request.method == 'GET':
        if pk is not None:
            review = get_object_or_404(base_qs, pk=pk)
            return Response(AdminProductReviewSerializer(review).data, status=status.HTTP_200_OK)

        queryset = base_qs.order_by('-created_at')
        status_filter = (request.query_params.get('status') or '').strip().lower()
        if status_filter:
            if status_filter not in MODERATION_STATUSES:
                return _invalid_status_filter_response(status_filter)
            queryset = queryset.filter(status=status_filter)

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(customer__email__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(product__name__icontains=search)
                | Q(title__icontains=search)
                | Q(comment__icontains=search)
            )
        return _list_response(request, queryset, AdminProductReviewSerializer)

    if pk is None:
        return Response({'detail': 'Method "PATCH" not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    return _moderate_submission(
        request,
        model=ProductReview,
        pk=pk,
        serializer_class=AdminProductReviewSerializer,
        target_type='product_review',
        describe=_describe_product_review,
    )
