from decimal import Decimal
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from .models import Product, Category
from .validators import (
    PACKAGED_UNITS_REQUIRING_DESCRIPTION,
    QuantityDecimalField,
    UNIT_DISPLAY_LABELS,
    parse_strict_decimal,
    validate_quantity_for_unit,
)


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
    farmer_id = serializers.IntegerField(source='farmer.id', read_only=True)
    farmer_name = serializers.SerializerMethodField()
    farmer_location = serializers.SerializerMethodField()
    farmer_status = serializers.SerializerMethodField()
    moderated_by_email = serializers.SerializerMethodField()
    slug = serializers.SlugField(read_only=True)
    category_details = CategorySerializer(source='category', read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
    )
    stock = QuantityDecimalField(required=False, default=Decimal('0.00'))
    min_order_quantity = QuantityDecimalField(required=False, default=Decimal('1.00'))
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)
    formatted_unit = serializers.CharField(read_only=True)
    is_countable_unit = serializers.BooleanField(read_only=True)
    image = ProductImageField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'farmer_id',
            'farmer_name',
            'farmer_location',
            'farmer_status',
            'category',
            'category_details',
            'name',
            'slug',
            'description',
            'price',
            'stock',
            'unit',
            'unit_display',
            'unit_description',
            'formatted_unit',
            'is_countable_unit',
            'min_order_quantity',
            'image',
            'is_available',
            'moderation_status',
            'moderation_reason',
            'moderated_at',
            'moderated_by',
            'moderated_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'farmer_id',
            'farmer_name',
            'farmer_location',
            'farmer_status',
            'category_details',
            'unit_display',
            'formatted_unit',
            'is_countable_unit',
            'is_available',
            'moderation_status',
            'moderation_reason',
            'moderated_at',
            'moderated_by',
            'moderated_by_email',
            'created_at',
            'updated_at',
        ]

    def validate_price(self, value):
        price_dec = parse_strict_decimal(value, field_name='price')
        if price_dec <= Decimal('0.00'):
            raise serializers.ValidationError('Price must be greater than zero.')
        return price_dec

    def validate_unit_description(self, value):
        cleaned = (value or '').strip()
        if len(cleaned) > 40:
            raise serializers.ValidationError('Package description cannot exceed 40 characters.')
        return cleaned

    def validate(self, attrs):
        is_create = self.instance is None

        if is_create:
            unit = attrs.get('unit')
            if not unit:
                raise serializers.ValidationError({'unit': 'A selling unit is required when creating a product.'})
        else:
            if 'unit' in attrs:
                unit = attrs.get('unit')
                if not unit:
                    raise serializers.ValidationError({'unit': 'A selling unit is required.'})
            else:
                unit = self.instance.unit

        unit_description = attrs.get(
            'unit_description',
            self.instance.unit_description if self.instance else '',
        )
        unit_description = (unit_description or '').strip()
        if 'unit_description' in attrs or is_create:
            attrs['unit_description'] = unit_description

        if unit in PACKAGED_UNITS_REQUIRING_DESCRIPTION and (
            is_create or 'unit' in attrs or 'unit_description' in attrs
        ):
            if not unit_description:
                unit_label = UNIT_DISPLAY_LABELS.get(unit, unit)
                raise serializers.ValidationError(
                    {
                        'unit_description': (
                            f'Provide a clear package size description for {unit_label} listings '
                            '(e.g. "10 kg", "30 eggs", "20 L").'
                        )
                    }
                )

        stock_val = attrs.get(
            'stock',
            self.instance.stock if self.instance is not None else Decimal('0.00'),
        )
        validate_quantity_for_unit(Decimal(str(stock_val)), unit, field_name='stock', allow_zero=True)

        if is_create and 'min_order_quantity' not in attrs:
            attrs['min_order_quantity'] = Decimal('1.00')
        min_order_val = attrs.get(
            'min_order_quantity',
            self.instance.min_order_quantity if self.instance is not None else Decimal('1.00'),
        )
        validate_quantity_for_unit(
            Decimal(str(min_order_val)),
            unit,
            field_name='min_order_quantity',
            allow_zero=False,
        )

        return attrs

    def get_farmer_name(self, obj):
        return f"{obj.farmer.first_name} {obj.farmer.last_name}".strip()

    def get_farmer_location(self, obj):
        try:
            return obj.farmer.farmer_profile.location.strip()
        except ObjectDoesNotExist:
            return ''

    def get_farmer_status(self, obj):
        try:
            return obj.farmer.farmer_profile.status
        except ObjectDoesNotExist:
            return ''

    def get_moderated_by_email(self, obj):
        return obj.moderated_by.email if obj.moderated_by else None
