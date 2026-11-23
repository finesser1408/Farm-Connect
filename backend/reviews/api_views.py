from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products.models import Product
from users.permissions import IsAdmin, IsCustomer
from .models import PlatformTestimonial, ProductReview
from .serializers import (
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

@api_view(['GET', 'PATCH'])
@permission_classes([IsAdmin])
def admin_testimonials_moderate(request, pk=None):
    """Admin endpoint to list all testimonials or moderate a specific one."""
    if request.method == 'GET':
        status_filter = request.query_params.get('status')
        queryset = PlatformTestimonial.objects.select_related('customer').all()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        serializer = PlatformTestimonialCustomerSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PATCH moderate
    testimonial = get_object_or_404(PlatformTestimonial, pk=pk)
    new_status = request.data.get('status')
    if new_status not in ['approved', 'rejected', 'pending']:
        return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    testimonial.status = new_status
    testimonial.moderated_by = request.user
    testimonial.moderated_at = timezone.now()
    testimonial.save()
    return Response(
        PlatformTestimonialCustomerSerializer(testimonial).data,
        status=status.HTTP_200_OK,
    )


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdmin])
def admin_product_reviews_moderate(request, pk=None):
    """Admin endpoint to list all product reviews or moderate a specific one."""
    if request.method == 'GET':
        status_filter = request.query_params.get('status')
        queryset = ProductReview.objects.select_related('product', 'customer').all()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        serializer = ProductReviewCustomerSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PATCH moderate
    review = get_object_or_404(ProductReview, pk=pk)
    new_status = request.data.get('status')
    if new_status not in ['approved', 'rejected', 'pending']:
        return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    review.status = new_status
    review.moderated_by = request.user
    review.moderated_at = timezone.now()
    review.save()
    return Response(
        ProductReviewCustomerSerializer(review).data,
        status=status.HTTP_200_OK,
    )
