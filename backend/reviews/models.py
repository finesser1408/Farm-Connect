from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


REVIEW_STATUS_CHOICES = (
    ('pending', 'Pending'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
)


class PlatformTestimonial(models.Model):
    """Platform-wide customer testimonial displayed on the homepage once approved."""
    customer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='platform_testimonial',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating score from 1 to 5.",
    )
    comment = models.TextField(
        max_length=1000,
        help_text="Customer feedback text (10 to 1000 characters).",
    )
    display_name = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Optional customer-approved public display name (e.g. 'Nicole M.').",
    )
    role_or_title = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Optional role description like 'Home Cook' or 'Regular Shopper'.",
    )
    consent_public = models.BooleanField(
        default=False,
        help_text="Explicit consent to display feedback and display name publicly.",
    )
    status = models.CharField(
        max_length=20,
        choices=REVIEW_STATUS_CHOICES,
        default='pending',
        db_index=True,
    )
    is_verified_buyer = models.BooleanField(
        default=False,
        help_text="Requires independently verifiable real-payment proof. Kept disabled for simulated orders.",
    )
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='moderated_testimonials',
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Platform Testimonial'
        verbose_name_plural = 'Platform Testimonials'

    def __str__(self):
        return f"Testimonial from {self.effective_display_name} ({self.rating}★ - {self.status})"

    @property
    def effective_display_name(self):
        if self.display_name.strip():
            return self.display_name.strip()
        first = (self.customer.first_name or '').strip()
        last = (self.customer.last_name or '').strip()
        if first and last:
            return f"{first} {last[0]}."
        if first:
            return first
        return "Customer"


class ProductReview(models.Model):
    """Product-specific customer review."""
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='reviews',
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='product_reviews',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating score from 1 to 5.",
    )
    title = models.CharField(
        max_length=120,
        blank=True,
        default='',
        help_text="Optional short review headline.",
    )
    comment = models.TextField(
        max_length=1000,
        help_text="Detailed product review (10 to 1000 characters).",
    )
    status = models.CharField(
        max_length=20,
        choices=REVIEW_STATUS_CHOICES,
        default='pending',
        db_index=True,
    )
    verified_purchase = models.BooleanField(
        default=False,
        help_text="Requires independently verifiable real-payment proof. Kept disabled for simulated orders.",
    )
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='moderated_product_reviews',
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Product Review'
        verbose_name_plural = 'Product Reviews'
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'customer'],
                name='unique_product_customer_review',
            )
        ]

    def __str__(self):
        return f"{self.product.name} review by {self.customer.email} ({self.rating}★ - {self.status})"

    @property
    def effective_display_name(self):
        first = (self.customer.first_name or '').strip()
        last = (self.customer.last_name or '').strip()
        if first and last:
            return f"{first} {last[0]}."
        if first:
            return first
        return "Customer"
