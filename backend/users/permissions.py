from rest_framework import permissions

class IsFarmer(permissions.BasePermission):
    """
    Allows access only to farmers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.user_type == 'farmer')

class IsCustomer(permissions.BasePermission):
    """
    Allows access only to customers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.user_type == 'customer')

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.user_type == 'admin')

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.user_type == 'admin':
            return True
        
        # Check if the object has a 'user' or 'farmer' attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'farmer'):
            return obj.farmer == request.user
            
        return False
