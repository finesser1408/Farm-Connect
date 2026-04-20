from django.contrib import admin
from django.utils.html import format_html
from .models import Payment


# ──────────────────────────────────────────────
#  Payment Admin
# ──────────────────────────────────────────────

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'order_link', 'method_badge', 'status_badge',
        'formatted_amount', 'transaction_id', 'created_at',
    )
    list_filter    = ('status', 'method', 'created_at')
    search_fields  = ('transaction_id', 'order__id', 'order__customer__email')
    ordering       = ('-created_at',)
    date_hierarchy = 'created_at'
    list_per_page  = 25
    readonly_fields = ('created_at', 'updated_at', 'order')

    fieldsets = (
        ('Payment Details', {
            'fields': ('order', 'method', 'status', 'amount', 'transaction_id'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    # ── Computed columns ──────────────────────

    @admin.display(description='Order', ordering='order__id')
    def order_link(self, obj):
        return format_html(
            '<a href="/admin/orders/order/{}/change/">Order #{}</a>',
            obj.order.id, obj.order.id,
        )

    @admin.display(description='Amount', ordering='amount')
    def formatted_amount(self, obj):
        return f'${obj.amount:,.2f}'

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        colours = {
            'pending':   ('#fdcb6e', '#2d3436'),
            'completed': ('#00b894', '#fff'),
            'failed':    ('#d63031', '#fff'),
            'refunded':  ('#636e72', '#fff'),
        }
        bg, fg = colours.get(obj.status, ('#636e72', '#fff'))
        return format_html(
            '<span style="background:{};color:{};padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.get_status_display(),
        )

    @admin.display(description='Method', ordering='method')
    def method_badge(self, obj):
        icons = {
            'card':         '💳',
            'transfer':     '🏦',
            'mobile_money': '📱',
            'cod':          '💵',
        }
        icon = icons.get(obj.method, '💰')
        return format_html('{} {}', icon, obj.get_method_display())

    # ── Bulk actions ──────────────────────────

    actions = ['mark_completed', 'mark_failed', 'mark_refunded']

    @admin.action(description='✔ Mark selected payments as Completed')
    def mark_completed(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} payment(s) marked as Completed.')

    @admin.action(description='✘ Mark selected payments as Failed')
    def mark_failed(self, request, queryset):
        updated = queryset.update(status='failed')
        self.message_user(request, f'{updated} payment(s) marked as Failed.')

    @admin.action(description='↩ Mark selected payments as Refunded')
    def mark_refunded(self, request, queryset):
        updated = queryset.update(status='refunded')
        self.message_user(request, f'{updated} payment(s) marked as Refunded.')
