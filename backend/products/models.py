from decimal import Decimal
from django.db import models
from django.conf import settings

from .validators import (
    CONTINUOUS_UNITS,
    COUNTABLE_UNITS,
    PACKAGED_UNITS_REQUIRING_DESCRIPTION,
    UNIT_CHOICES,
    format_unit_label,
    is_countable_unit,
)


APPROVED_CATEGORY_SLUGS = (
    'vegetables',
    'fruits',
    'grains-and-cereals',
    'legumes-and-pulses',
    'root-and-tuber-crops',
    'oilseeds',
    'livestock-and-poultry',
)


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Product(models.Model):
    MODERATION_STATUS_CHOICES = (
        ('active', 'Active'),
        ('hidden', 'Hidden'),
        ('removed', 'Removed'),
    )
    UNIT_CHOICES = UNIT_CHOICES
    CONTINUOUS_UNITS = CONTINUOUS_UNITS
    COUNTABLE_UNITS = COUNTABLE_UNITS
    PACKAGED_UNITS_REQUIRING_DESCRIPTION = PACKAGED_UNITS_REQUIRING_DESCRIPTION

    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    unit = models.CharField(
        max_length=20,
        choices=UNIT_CHOICES,
        null=True,
        blank=True,
    )
    unit_description = models.CharField(
        max_length=40,
        blank=True,
        default='',
    )
    min_order_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
    )
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_available = models.BooleanField(default=True)
    moderation_status = models.CharField(
        max_length=20,
        choices=MODERATION_STATUS_CHOICES,
        default='active',
        db_index=True,
    )
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_products',
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderation_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def formatted_unit(self):
        return format_unit_label(self.unit, self.unit_description)

    @property
    def is_countable_unit(self):
        return is_countable_unit(self.unit)

    def save(self, *args, **kwargs):
        stock_dec = Decimal(str(self.stock if self.stock is not None else '0.00'))
        min_order_dec = Decimal(str(self.min_order_quantity if self.min_order_quantity is not None else '1.00'))
        self.is_available = stock_dec > Decimal('0.00') and stock_dec >= min_order_dec
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
