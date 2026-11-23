from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from rest_framework import permissions


def is_approved_farmer_user(user):
    """Return True if user is an active user with an approved FarmerProfile."""
    if not (user and user.is_authenticated and user.is_active and user.user_type == 'farmer'):
        return False
    try:
        return user.farmer_profile.status == 'approved'
    except ObjectDoesNotExist:
        return False


def get_farmer_block_reason(user):
    """Return human-readable reason why a farmer cannot perform marketplace writes."""
    if not user or not user.is_authenticated:
        return 'Authentication required.'
    if not user.is_active:
        return 'Your account is deactivated.'
    try:
        farmer_status = user.farmer_profile.status
    except ObjectDoesNotExist:
        return 'Farmer profile is required before managing products.'
    if farmer_status == 'suspended':
        return 'Your farmer account is suspended. You cannot create or modify products.'
    if farmer_status != 'approved':
        return 'Your farmer account is pending approval. You cannot create or modify products until approved.'
    return ''


def is_admin_user(user):
    """Return True if user is an active General Admin or Super Admin."""
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and (
            user.is_superuser
            or user.is_staff
            or user.user_type == 'admin'
        )
    )


def is_product_farmer_purchasable(product):
    """Return True if the product's farmer is active and approved for public purchase."""
    farmer = getattr(product, 'farmer', None)
    if not farmer or not farmer.is_active:
        return False
    try:
        return farmer.farmer_profile.status == 'approved'
    except ObjectDoesNotExist:
        return farmer.user_type != 'farmer'


def is_product_publicly_visible(product):
    """Return True if product is active under moderation and its farmer is purchasable."""
    return getattr(product, 'moderation_status', 'active') == 'active' and is_product_farmer_purchasable(product)


def public_purchasable_farmer_q():
    """Query filter restricting products to active, approved farmers."""
    return Q(farmer__is_active=True) & (
        Q(farmer__farmer_profile__status='approved')
        | (Q(farmer__farmer_profile__isnull=True) & ~Q(farmer__user_type='farmer'))
    )


def public_purchasable_product_q():
    """Query filter restricting products to active moderation status and active, approved farmers."""
    return Q(moderation_status='active') & public_purchasable_farmer_q()


class IsFarmer(permissions.BasePermission):
    """
    Allows access only to active farmers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.user_type == 'farmer'
        )


class IsCustomer(permissions.BasePermission):
    """
    Allows access only to active customers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.user_type == 'customer'
        )


class IsAdmin(permissions.BasePermission):
    """
    Allows access to active General Admins and Super Admins.
    """
    def has_permission(self, request, view):
        return is_admin_user(request.user)


class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to active Super Admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.is_super_admin
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to edit it.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False

        # Admin can do anything permitted by the view's permission class
        if (
            request.user.is_superuser
            or request.user.is_staff
            or request.user.user_type == 'admin'
        ):
            return True

        # Check if the object has a 'user' or 'farmer' attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'farmer'):
            return obj.farmer == request.user

        return False
