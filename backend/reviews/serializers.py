from rest_framework import serializers
from .models import PlatformTestimonial, ProductReview, REVIEW_STATUS_CHOICES
from products.models import Product


class PlatformTestimonialPublicSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='effective_display_name', read_only=True)

    class Meta:
        model = PlatformTestimonial
        fields = [
            'id',
            'display_name',
            'role_or_title',
            'rating',
            'comment',
            'is_verified_buyer',
            'created_at',
        ]
        read_only_fields = fields


class PlatformTestimonialCustomerSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Optional name to show publicly. Leave blank to display First Name + Last Initial.",
    )
    role_or_title = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = PlatformTestimonial
        fields = [
            'id',
            'rating',
            'comment',
            'display_name',
            'role_or_title',
            'consent_public',
            'status',
            'is_verified_buyer',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status', 'is_verified_buyer', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be an integer between 1 and 5.")
        return value

    def validate_comment(self, value):
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise serializers.ValidationError("Feedback must be at least 10 characters long.")
        if len(cleaned) > 1000:
            raise serializers.ValidationError("Feedback cannot exceed 1000 characters.")
        return cleaned

    def validate_consent_public(self, value):
        if value is not True:
            raise serializers.ValidationError("You must consent to public display before submitting a testimonial.")
        return value


class ProductReviewPublicSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='effective_display_name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            'id',
            'product_id',
            'product_slug',
            'display_name',
            'rating',
            'title',
            'comment',
            'verified_purchase',
            'created_at',
        ]
        read_only_fields = fields


class ProductReviewCustomerSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = ProductReview
        fields = [
            'id',
            'product',
            'rating',
            'title',
            'comment',
            'status',
            'verified_purchase',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'product', 'status', 'verified_purchase', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be an integer between 1 and 5.")
        return value

    def validate_comment(self, value):
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise serializers.ValidationError("Review must be at least 10 characters long.")
        if len(cleaned) > 1000:
            raise serializers.ValidationError("Review cannot exceed 1000 characters.")
        return cleaned
