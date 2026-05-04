from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product


# ──────────────────────────────────────────────
#  Category Admin
# ──────────────────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display        = ('name', 'slug', 'product_count')
    search_fields       = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering            = ('name',)

    @admin.display(description='# Products')
    def product_count(self, obj):
        return obj.products.count()


# ──────────────────────────────────────────────
#  Product Admin
# ──────────────────────────────────────────────

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'farmer', 'category',
        'price', 'stock', 'availability_badge', 'created_at',
    )
    list_filter        = ('is_available', 'category', 'farmer')
    search_fields      = ('name', 'description', 'farmer__email')
    list_editable      = ('price', 'stock')
    prepopulated_fields = {'slug': ('name',)}
    ordering           = ('-created_at',)
    date_hierarchy     = 'created_at'
    list_per_page      = 20
    readonly_fields    = ('is_available', 'created_at', 'updated_at', 'product_image_preview')

    fieldsets = (
        ('Basic Information', {
            'fields': ('farmer', 'category', 'name', 'slug', 'description'),
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'stock', 'is_available'),
        }),
        ('Media', {
            'fields': ('image', 'product_image_preview'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    # ── Computed columns ──────────────────────

    @admin.display(description='Available', ordering='is_available')
    def availability_badge(self, obj):
        if obj.is_available:
            return format_html(
                '<span style="color:#00b894;font-weight:700;">✔ In Stock</span>'
            )
        return format_html(
            '<span style="color:#d63031;font-weight:700;">✘ Out of Stock</span>'
        )

    @admin.display(description='Image Preview')
    def product_image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height:120px;border-radius:6px;" />',
                obj.image.url,
            )
        return '—'

    # ── Actions ──────────────────────────────

    actions = ['mark_available', 'mark_unavailable']

    @admin.action(description='✔ Mark selected products as available')
    def mark_available(self, request, queryset):
        updated = queryset.filter(stock__gt=0).update(is_available=True)
        self.message_user(request, f'{updated} product(s) marked as available.')

    @admin.action(description='✘ Mark selected products as unavailable')
    def mark_unavailable(self, request, queryset):
        updated = queryset.update(is_available=False)
        self.message_user(request, f'{updated} product(s) marked as unavailable.')
