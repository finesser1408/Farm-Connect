 # backend/products/admin.py

from django.contrib import admin
from django.utils import timezone
from backend.admin_mixins import NoHardDeleteAdminMixin
from users.models import AdminAuditLog
from .models import Product, Category

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']

@admin.register(Product)
class ProductAdmin(NoHardDeleteAdminMixin, admin.ModelAdmin):
    list_display = ['id', 'name', 'price', 'stock', 'category', 'is_available', 'moderation_status']
    list_filter = ['category', 'is_available', 'moderation_status']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at', 'moderated_at']
    actions = ['hide_selected_products', 'restore_selected_products', 'soft_remove_selected_products']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'description', 'price', 'stock')
        }),
        ('Category & Farmer', {
            'fields': ('category', 'farmer')
        }),
        ('Media', {
            'fields': ('image',)
        }),
        ('Status & Moderation', {
            'fields': ('is_available', 'moderation_status', 'moderation_reason', 'moderated_by', 'moderated_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def _moderate_queryset(self, request, queryset, *, target_status, action_name, skip_statuses):
        updated = 0
        now = timezone.now()
        for product in queryset:
            if product.moderation_status in skip_statuses:
                continue
            prev = product.moderation_status
            product.moderation_status = target_status
            product.moderated_by = request.user
            product.moderated_at = now
            product.save(update_fields=['moderation_status', 'moderated_by', 'moderated_at', 'updated_at'])
            AdminAuditLog.log(
                actor=request.user,
                action=action_name,
                target_type='product',
                target_id=product.pk,
                target_repr=product.name,
                details={'previous_status': prev, 'new_status': target_status, 'source': 'django_admin'},
            )
            updated += 1
        return updated

    @admin.action(description='🙈 Hide selected active products')
    def hide_selected_products(self, request, queryset):
        count = self._moderate_queryset(request, queryset, target_status='hidden', action_name='hide_product', skip_statuses={'hidden', 'removed'})
        self.message_user(request, f'{count} product(s) hidden.')

    @admin.action(description='👁 Restore selected hidden products')
    def restore_selected_products(self, request, queryset):
        count = self._moderate_queryset(request, queryset, target_status='active', action_name='restore_product', skip_statuses={'active', 'removed'})
        self.message_user(request, f'{count} product(s) restored to active.')

    @admin.action(description='🗑 Soft-remove selected products (preserve orders & reviews)')
    def soft_remove_selected_products(self, request, queryset):
        count = self._moderate_queryset(request, queryset, target_status='removed', action_name='remove_product', skip_statuses={'removed'})
        self.message_user(request, f'{count} product(s) soft-removed cleanly.')
