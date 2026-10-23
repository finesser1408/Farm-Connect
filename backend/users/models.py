from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """Custom user model"""
    USER_TYPE_CHOICES = (
        ('admin', 'Admin'),
        ('farmer', 'Farmer'),
        ('customer', 'Customer'),
    )
    
    email = models.EmailField(_('email address'), unique=True)
    phone = models.CharField(_('phone number'), max_length=13, blank=True, null=True)
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
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Review(models.Model):
  # Links the review to a product (replace 'store' with your actual app name if it's different!)
  product = models.ForeignKey(
      'store.Product', related_name='reviews', on_delete=models.CASCADE
  )

  # Links the review to your custom user model
  user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

  # Links to the exact order item as proof of purchase
  order_item = models.OneToOneField(
      'store.OrderItem', on_delete=models.CASCADE, null=True, blank=True
  )

  # Star rating from 1 to 5
  rating = models.IntegerField(
      validators=[MinValueValidator(1), MaxValueValidator(5)]
  )

  # The comment text left by the customer
  comment = models.TextField()

  # Timestamp for when it was written
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    # Ensures a user can only review the exact same purchased item once
    unique_together = ('user', 'order_item')

  def __str__(self):
    return (
        f'{self.user.username} - {self.product.name} ({self.rating} Stars)'
    )