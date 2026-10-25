from datetime import timedelta
import secrets

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """Custom user model"""
    USER_TYPE_CHOICES = (
        ('admin', 'Admin'),
        ('farmer', 'Farmer'),
        ('customer', 'Customer'),
    )
    
    email = models.EmailField(_('email address'), unique=True)
    phone = models.CharField(
        _('phone number'),
        max_length=20,
        blank=True,
        null=True,
        validators=[RegexValidator(
            regex=r'^[0-9+()\- ]{7,20}$',
            message=_('Enter a valid phone number, e.g. +263 77 123 4567.'),
        )],
    )
    user_type = models.CharField(
        max_length=10,
        choices=USER_TYPE_CHOICES,
        default='customer',
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    @property
    def is_farmer(self):
        return self.user_type == 'farmer'

    @property
    def is_customer(self):
        return self.user_type == 'customer'

    @property
    def is_admin(self):
        return self.user_type == 'admin'

class FarmerProfile(models.Model):
    """Profile model for farmers"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
    farm_name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.farm_name} ({self.user.email})"

class CustomerProfile(models.Model):
    """Profile model for customers"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.email


class Review(models.Model):
    """Verified-purchase review of a product"""
    product = models.ForeignKey(
        'products.Product', related_name='reviews', on_delete=models.CASCADE
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order_item = models.OneToOneField(
        'orders.OrderItem', on_delete=models.CASCADE, null=True, blank=True,
        related_name='review',
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A user may review a given purchased item only once
        unique_together = ('user', 'order_item')

    def __str__(self):
        return f'{self.user.username} - {self.product.name} ({self.rating} Stars)'


class EmailOTP(models.Model):
    """Single-use one-time passcode delivered to a user's email over SMTP.

    Only a PBKDF2 hash of the code is stored, so a leaked database row cannot
    be turned back into a working code.
    """

    PURPOSE_CHOICES = (
        ('verification', 'Verification'),
        ('login', 'Login'),
        ('password_reset', 'Password reset'),
    )

    TTL_MINUTES = 10
    RESEND_COOLDOWN_SECONDS = 60

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='email_otps', on_delete=models.CASCADE)
    code = models.CharField(max_length=128)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='verification')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def issue(cls, user, purpose='verification'):
        """Issue a fresh code, invalidating any outstanding one for the same purpose."""
        cls.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

        plain_code = f"{secrets.randbelow(10**6):06d}"
        otp = cls.objects.create(
            user=user,
            code=make_password(plain_code),
            purpose=purpose,
            expires_at=timezone.now() + timedelta(minutes=cls.TTL_MINUTES),
        )
        return otp, plain_code

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_valid(self):
        return not self.is_used and not self.is_expired

    def check_code(self, plain_code):
        return bool(plain_code) and check_password(str(plain_code), self.code)

    def mark_used(self):
        self.is_used = True
        self.save(update_fields=['is_used'])

    def __str__(self):
        return f"{self.purpose} OTP for {self.user.email}"

