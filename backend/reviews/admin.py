from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from backend.admin_mixins import NoHardDeleteAdminMixin
from .models import PlatformTestimonial, ProductReview


@admin.register(PlatformTestimonial)
class PlatformTestimonialAdmin(NoHardDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        'id',
        'customer_email',
        'effective_name',
        'rating_stars',
        'consent_badge',
        'status_badge',
        'verified_badge',
        'created_at',
    )
    list_filter = ('status', 'rating', 'consent_public', 'is_verified_buyer', 'created_at')
    search_fields = ('customer__email', 'display_name', 'comment', 'role_or_title')
    readonly_fields = ('created_at', 'updated_at', 'moderated_by', 'moderated_at')
    ordering = ('-created_at',)
    list_per_page = 25

    fieldsets = (
        ('Submission Details', {
            'fields': (
                'customer',
                'rating',
                'comment',
                'display_name',
                'role_or_title',
                'consent_public',
            )
        }),
        ('Moderation', {
            'fields': (
                'status',
                'is_verified_buyer',
                'moderated_by',
                'moderated_at',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    actions = ['mark_approved', 'mark_rejected', 'mark_pending']

    @admin.display(description='Customer', ordering='customer__email')
    def customer_email(self, obj):
        return obj.customer.email

    @admin.display(description='Display Name')
    def effective_name(self, obj):
        return obj.effective_display_name

    @admin.display(description='Rating', ordering='rating')
    def rating_stars(self, obj):
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        return format_html('<span style="color:#f59e0b;font-weight:bold;">{}</span>', stars)

    @admin.display(description='Consent', ordering='consent_public')
    def consent_badge(self, obj):
        if obj.consent_public:
            return format_html('<span style="color:#10b981;font-weight:600;">✔ Granted</span>')
        return format_html('<span style="color:#ef4444;font-weight:600;">✘ None</span>')

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        colours = {
            'pending': ('#fef3c7', '#92400e'),
            'approved': ('#d1fae5', '#065f46'),
            'rejected': ('#fee2e2', '#991b1b'),
        }
        bg, fg = colours.get(obj.status, ('#f3f4f6', '#374151'))
        return format_html(
            '<span style="background:{};color:{};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.get_status_display(),
        )

    @admin.display(description='Verified Buyer', ordering='is_verified_buyer')
    def verified_badge(self, obj):
        if obj.is_verified_buyer:
            return format_html('<span style="color:#2563eb;font-weight:600;">✔ Verified</span>')
        return format_html('<span style="color:#9ca3af;">—</span>')

    @admin.action(description='✔ Mark selected testimonials as Approved')
    def mark_approved(self, request, queryset):
        updated = queryset.update(
            status='approved',
            moderated_by=request.user,
            moderated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} testimonial(s) marked as Approved.")

    @admin.action(description='✘ Mark selected testimonials as Rejected')
    def mark_rejected(self, request, queryset):
        updated = queryset.update(
            status='rejected',
            moderated_by=request.user,
            moderated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} testimonial(s) marked as Rejected.")

    @admin.action(description='⏳ Mark selected testimonials as Pending')
    def mark_pending(self, request, queryset):
        updated = queryset.update(
            status='pending',
            moderated_by=None,
            moderated_at=None,
        )
        self.message_user(request, f"{updated} testimonial(s) reset to Pending.")


@admin.register(ProductReview)
class ProductReviewAdmin(NoHardDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        'id',
        'product',
        'customer_email',
        'rating_stars',
        'title',
        'status_badge',
        'verified_badge',
        'created_at',
    )
    list_filter = ('status', 'rating', 'verified_purchase', 'created_at')
    search_fields = ('product__name', 'customer__email', 'title', 'comment')
    readonly_fields = ('created_at', 'updated_at', 'moderated_by', 'moderated_at')
    ordering = ('-created_at',)
    list_per_page = 25

    fieldsets = (
        ('Review Information', {
            'fields': (
                'product',
                'customer',
                'rating',
                'title',
                'comment',
            )
        }),
        ('Moderation', {
            'fields': (
                'status',
                'verified_purchase',
                'moderated_by',
                'moderated_at',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    actions = ['mark_approved', 'mark_rejected', 'mark_pending']

    @admin.display(description='Customer', ordering='customer__email')
    def customer_email(self, obj):
        return obj.customer.email

    @admin.display(description='Rating', ordering='rating')
    def rating_stars(self, obj):
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        return format_html('<span style="color:#f59e0b;font-weight:bold;">{}</span>', stars)

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        colours = {
            'pending': ('#fef3c7', '#92400e'),
            'approved': ('#d1fae5', '#065f46'),
            'rejected': ('#fee2e2', '#991b1b'),
        }
        bg, fg = colours.get(obj.status, ('#f3f4f6', '#374151'))
        return format_html(
            '<span style="background:{};color:{};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.get_status_display(),
        )

    @admin.display(description='Verified Purchase', ordering='verified_purchase')
    def verified_badge(self, obj):
        if obj.verified_purchase:
            return format_html('<span style="color:#2563eb;font-weight:600;">✔ Verified</span>')
        return format_html('<span style="color:#9ca3af;">—</span>')

    @admin.action(description='✔ Mark selected reviews as Approved')
    def mark_approved(self, request, queryset):
        updated = queryset.update(
            status='approved',
            moderated_by=request.user,
            moderated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} review(s) marked as Approved.")

    @admin.action(description='✘ Mark selected reviews as Rejected')
    def mark_rejected(self, request, queryset):
        updated = queryset.update(
            status='rejected',
            moderated_by=request.user,
            moderated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} review(s) marked as Rejected.")

    @admin.action(description='⏳ Mark selected reviews as Pending')
    def mark_pending(self, request, queryset):
        updated = queryset.update(
            status='pending',
            moderated_by=None,
            moderated_at=None,
        )
        self.message_user(request, f"{updated} review(s) reset to Pending.")
