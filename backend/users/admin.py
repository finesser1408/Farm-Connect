from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, FarmerProfile, CustomerProfile

class FarmerProfileInline(admin.StackedInline):
    model = FarmerProfile
    can_delete = False
    verbose_name_plural = 'Farmer Profile'

class CustomerProfileInline(admin.StackedInline):
    model = CustomerProfile
    can_delete = False
    verbose_name_plural = 'Customer Profile'

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'user_type', 'is_verified', 'is_staff')
    list_filter = ('user_type', 'is_verified', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('phone', 'user_type', 'is_verified')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('email', 'phone', 'user_type', 'is_verified')}),
    )
    inlines = [FarmerProfileInline, CustomerProfileInline]

admin.site.register(User, CustomUserAdmin)
admin.site.register(FarmerProfile)
admin.site.register(CustomerProfile)
