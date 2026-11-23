from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.utils.translation import gettext_lazy as _


class FarmConnectUserManager(UserManager):
    use_in_migrations = False

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('user_type', 'admin')
        return super().create_superuser(username, email, password, **extra_fields)


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

    objects = FarmConnectUserManager()

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
        return self.user_type == 'admin' or self.is_staff or self.is_superuser

    @property
    def is_super_admin(self):
        return bool(self.is_superuser and (self.user_type == 'admin' or self.is_staff))

    @property
    def is_general_admin(self):
        return bool(not self.is_superuser and (self.user_type == 'admin' or self.is_staff))

    @property
    def admin_role(self):
        if self.is_super_admin:
            return 'super_admin'
        if self.is_general_admin:
            return 'general_admin'
        return None

class FarmerProfile(models.Model):
    """Profile model for farmers"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('suspended', 'Suspended'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
    farm_name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    status_reason = models.TextField(blank=True, default='')
    status_updated_at = models.DateTimeField(null=True, blank=True)
    status_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='farmer_status_updates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_approved(self):
        return self.status == 'approved'

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


SENSITIVE_AUDIT_KEYS = (
    'password',
    'token',
    'secret',
    'key',
    'credential',
    'authorization',
)


def _sanitize_audit_details(value):
    if isinstance(value, dict):
        sanitized = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(marker in lowered for marker in SENSITIVE_AUDIT_KEYS):
                continue
            sanitized[str(key)] = _sanitize_audit_details(item)
        return sanitized
    if isinstance(value, (list, tuple)):
        return [_sanitize_audit_details(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


class AdminAuditLog(models.Model):
    """Immutable audit trail for sensitive administrative actions."""
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_audit_logs',
    )
    actor_email = models.EmailField(blank=True, default='')
    action = models.CharField(max_length=64, db_index=True)
    target_type = models.CharField(max_length=64, db_index=True)
    target_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    target_repr = models.CharField(max_length=255, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Admin Audit Log'
        verbose_name_plural = 'Admin Audit Logs'

    def __str__(self):
        who = self.actor_email or 'system'
        return f"{who} -> {self.action} ({self.target_type}:{self.target_id})"

    @classmethod
    def log(cls, *, actor, action, target_type, target_id='', target_repr='', details=None):
        """Record an administrative action without storing sensitive secrets."""
        actor_email = getattr(actor, 'email', '') if actor else ''
        return cls.objects.create(
            actor=actor if getattr(actor, 'pk', None) else None,
            actor_email=actor_email,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id != '' and target_id is not None else '',
            target_repr=str(target_repr)[:255],
            details=_sanitize_audit_details(details or {}),
        )
