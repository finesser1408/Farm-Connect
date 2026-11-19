from pathlib import Path

from PIL import Image, UnidentifiedImageError
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from .models import Product, Category


MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024
SUPPORTED_IMAGE_EXTENSIONS = {
    '.jpg': 'JPEG',
    '.jpeg': 'JPEG',
    '.png': 'PNG',
    '.webp': 'WEBP',
}


class ProductImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if data.size > MAX_PRODUCT_IMAGE_SIZE:
            raise serializers.ValidationError('Image must be 5 MB or smaller.')

        extension = Path(data.name).suffix.lower()
        expected_format = SUPPORTED_IMAGE_EXTENSIONS.get(extension)
        if expected_format is None:
            raise serializers.ValidationError(
                'Upload a JPEG, PNG, or WebP image.'
            )

        try:
            image = Image.open(data)
            actual_format = image.format
            image.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise serializers.ValidationError(
                'The uploaded file is not a valid image.'
            )
        finally:
            data.seek(0)

        if actual_format != expected_format:
            raise serializers.ValidationError(
                'The image content does not match its file type.'
            )
        return super().to_internal_value(data)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image']


class ProductSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    farmer_location = serializers.SerializerMethodField()
    slug = serializers.SlugField(read_only=True)
    category_details = CategorySerializer(source='category', read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
    )
    image = ProductImageField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'farmer_name',
            'farmer_location',
            'category',
            'category_details',
            'name',
            'slug',
            'description',
            'price',
            'stock',
            'image',
            'is_available',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'farmer_name', 'farmer_location', 'category_details', 'created_at', 'updated_at', 'is_available']

    def get_farmer_name(self, obj):
        return f"{obj.farmer.first_name} {obj.farmer.last_name}".strip()

    def get_farmer_location(self, obj):
        try:
            return obj.farmer.farmer_profile.location.strip()
        except ObjectDoesNotExist:
            return ''
