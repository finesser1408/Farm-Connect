from django.contrib import admin
from django.utils.html import format_html
from backend.admin_mixins import NoHardDeleteAdminMixin
from .models import Order, OrderItem


# ──────────────────────────────────────────────
#  OrderItem Inline
# ──────────────────────────────────────────────

class OrderItemInline(admin.TabularInline):
    model          = OrderItem
    can_delete     = False
    raw_id_fields  = ['product']
    readonly_fields = ('line_total', 'stock_restored', 'stock_restored_at')
    fields         = ('product', 'product_name', 'unit_label', 'quantity', 'price', 'status', 'stock_restored', 'stock_restored_at', 'line_total')
    extra          = 0

    @admin.display(description='Line Total')
    def line_total(self, obj):
        if obj.pk:
            return f'${obj.get_cost():,.2f}'
        return '—'


# ──────────────────────────────────────────────
#  Order Admin
# ──────────────────────────────────────────────

@admin.register(Order)
class OrderAdmin(NoHardDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        'id', 'customer', 'full_name', 'email',
        'city', 'formatted_total', 'status_badge', 'created_at',
    )
    list_filter    = ('status', 'created_at', 'city')
    search_fields  = ('first_name', 'last_name', 'email', 'customer__email', 'address')
    ordering       = ('-created_at',)
    date_hierarchy = 'created_at'
    list_per_page  = 25
    readonly_fields = ('created_at', 'updated_at', 'total_amount')

    fieldsets = (
        ('Order Info', {
            'fields': ('customer', 'status', 'total_amount'),
        }),
        ('Shipping Details', {
            'fields': ('first_name', 'last_name', 'email', 'address', 'postal_code', 'city'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    inlines = [OrderItemInline]

    # ── Computed columns ──────────────────────

    @admin.display(description='Customer Name')
    def full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'

    @admin.display(description='Total', ordering='total_amount')
    def formatted_total(self, obj):
        return f'${obj.total_amount:,.2f}'

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        colours = {
            'pending':   ('#fdcb6e', '#2d3436'),
            'paid':      ('#00b894', '#fff'),
            'shipped':   ('#0984e3', '#fff'),
            'delivered': ('#6c5ce7', '#fff'),
            'cancelled': ('#d63031', '#fff'),
        }
        bg, fg = colours.get(obj.status, ('#636e72', '#fff'))
        return format_html(
            '<span style="background:{};color:{};padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.get_status_display(),
        )

    # ── Bulk actions ──────────────────────────

    actions = ['mark_paid', 'mark_shipped', 'mark_delivered', 'mark_cancelled']

    @admin.action(description='💳 Mark selected orders as Paid')
    def mark_paid(self, request, queryset):
        updated = queryset.update(status='paid')
        self.message_user(request, f'{updated} order(s) marked as Paid.')

    @admin.action(description='🚚 Mark selected orders as Shipped')
    def mark_shipped(self, request, queryset):
        updated = queryset.update(status='shipped')
        self.message_user(request, f'{updated} order(s) marked as Shipped.')

    @admin.action(description='✔ Mark selected orders as Delivered')
    def mark_delivered(self, request, queryset):
        updated = queryset.update(status='delivered')
        self.message_user(request, f'{updated} order(s) marked as Delivered.')

    @admin.action(description='✘ Mark selected orders as Cancelled (with stock restoration)')
    def mark_cancelled(self, request, queryset):
        from rest_framework import serializers as drf_serializers
        from .order_views import _cancel_order_and_restore_stock

        cancelled_count = 0
        skipped_count = 0
        for order in queryset:
            try:
                _cancel_order_and_restore_stock(order.id)
                cancelled_count += 1
            except drf_serializers.ValidationError:
                skipped_count += 1
        msg = f'{cancelled_count} order(s) cancelled and stock restored.'
        if skipped_count:
            msg += f' {skipped_count} ineligible order(s) skipped.'
        self.message_user(request, msg)


# ──────────────────────────────────────────────
#  OrderItem Admin (standalone)
# ──────────────────────────────────────────────

@admin.register(OrderItem)
class OrderItemAdmin(NoHardDeleteAdminMixin, admin.ModelAdmin):
    list_display   = ('id', 'order', 'product', 'quantity', 'price', 'status', 'stock_restored', 'line_total')
    search_fields  = ('product__name', 'order__id')
    list_filter    = ('status', 'stock_restored', 'product__category')
    raw_id_fields  = ('order', 'product')
    readonly_fields = ('line_total', 'stock_restored', 'stock_restored_at')

    @admin.display(description='Line Total')
    def line_total(self, obj):
        return f'${obj.get_cost():,.2f}'
