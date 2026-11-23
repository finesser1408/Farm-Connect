from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from backend.admin_mixins import NoHardDeleteAdminMixin
from .models import User, FarmerProfile, CustomerProfile, AdminAuditLog
from .tokens import revoke_user_refresh_tokens


# ──────────────────────────────────────────────
#  Inlines
# ──────────────────────────────────────────────

class FarmerProfileInline(admin.StackedInline):
    model = FarmerProfile
    can_delete = False
    verbose_name_plural = 'Farmer Profile'
    fk_name = 'user'
    fields = ('farm_name', 'location', 'description', 'status')
    extra = 0


class CustomerProfileInline(admin.StackedInline):
    model = CustomerProfile
    can_delete = False
    verbose_name_plural = 'Customer Profile'
    fk_name = 'user'
    fields = ('address', 'city')
    extra = 0


# ──────────────────────────────────────────────
#  Custom User Admin
# ──────────────────────────────────────────────

@admin.register(User)
class CustomUserAdmin(NoHardDeleteAdminMixin, UserAdmin):
    # List view
    list_display = (
        'email', 'username', 'user_type_badge', 'is_verified',
        'is_staff', 'is_active', 'date_joined',
    )
    list_filter = (
        'user_type', 'is_verified', 'is_staff',
        'is_superuser', 'is_active',
    )
    search_fields = ('email', 'username', 'phone')
    ordering = ('-date_joined',)
    list_per_page = 25
    date_hierarchy = 'date_joined'

    # Detail view – fieldsets
    fieldsets = (
        (None, {
            'fields': ('username', 'password'),
        }),
        ('Personal Information', {
            'fields': ('email', 'first_name', 'last_name', 'phone'),
        }),
        ('Account Type & Verification', {
            'fields': ('user_type', 'is_verified'),
            'classes': ('wide',),
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions',
            ),
            'classes': ('collapse',),
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',),
        }),
    )

    # Add user view fieldsets
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
        ('Profile', {
            'classes': ('wide',),
            'fields': ('phone', 'user_type', 'is_verified'),
        }),
    )

    readonly_fields = ('date_joined', 'last_login')

    # Inline profiles
    inlines = [FarmerProfileInline, CustomerProfileInline]

    # ── Computed columns ──────────────────────

    @admin.display(description='Type', ordering='user_type')
    def user_type_badge(self, obj):
        colours = {
            'admin':    ('#6c5ce7', '#fff'),
            'farmer':   ('#00b894', '#fff'),
            'customer': ('#0984e3', '#fff'),
        }
        bg, fg = colours.get(obj.user_type, ('#636e72', '#fff'))
        return format_html(
            '<span style="background:{};color:{};padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.get_user_type_display(),
        )

    # ── Bulk actions ──────────────────────────

    actions = ['verify_users', 'unverify_users', 'deactivate_users', 'activate_users']

    @admin.action(description='✔ Mark selected users as verified')
    def verify_users(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} user(s) verified.')

    @admin.action(description='✘ Mark selected users as unverified')
    def unverify_users(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f'{updated} user(s) unverified.')

    @admin.action(description='⛔ Deactivate selected non-Super-Admin accounts')
    def deactivate_users(self, request, queryset):
        deactivated = 0
        for target in queryset:
            if target.pk == request.user.pk or target.is_superuser:
                continue
            if target.is_active:
                target.is_active = False
                target.save(update_fields=['is_active', 'updated_at'])
                revoked = revoke_user_refresh_tokens(target)
                AdminAuditLog.log(
                    actor=request.user,
                    action='suspend_user',
                    target_type='user',
                    target_id=target.pk,
                    target_repr=target.email,
                    details={'source': 'django_admin', 'revoked_refresh_tokens': revoked},
                )
                deactivated += 1
        self.message_user(request, f'{deactivated} user account(s) deactivated (self and Super Admins skipped).')

    @admin.action(description='✅ Activate selected user accounts')
    def activate_users(self, request, queryset):
        activated = 0
        for target in queryset:
            if not target.is_active:
                target.is_active = True
                target.save(update_fields=['is_active', 'updated_at'])
                AdminAuditLog.log(
                    actor=request.user,
                    action='reactivate_user',
                    target_type='user',
                    target_id=target.pk,
                    target_repr=target.email,
                    details={'source': 'django_admin'},
                )
                activated += 1
        self.message_user(request, f'{activated} user account(s) activated.')


# ──────────────────────────────────────────────
#  Farmer & Customer Profile Admins
# ──────────────────────────────────────────────

@admin.register(FarmerProfile)
class FarmerProfileAdmin(NoHardDeleteAdminMixin, admin.ModelAdmin):
    list_display  = ('farm_name', 'user', 'location', 'status', 'created_at')
    search_fields = ('farm_name', 'user__email', 'location')
    list_filter   = ('status', 'location')
    ordering      = ('farm_name',)
    readonly_fields = ('created_at', 'updated_at', 'status_updated_at', 'status_updated_by')
    fieldsets = (
        ('Farm Details', {
            'fields': ('user', 'farm_name', 'location', 'description'),
        }),
        ('Moderation Status', {
            'fields': ('status', 'status_reason', 'status_updated_by', 'status_updated_at'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'city', 'created_at')
    search_fields = ('user__email', 'city', 'address')
    list_filter   = ('city',)
    ordering      = ('user__email',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Customer Details', {
            'fields': ('user', 'address', 'city'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'actor_email', 'action', 'target_type', 'target_id', 'target_repr')
    list_filter = ('action', 'target_type', 'created_at')
    search_fields = ('actor_email', 'action', 'target_repr', 'target_id')
    ordering = ('-created_at',)
    readonly_fields = ('actor', 'actor_email', 'action', 'target_type', 'target_id', 'target_repr', 'details', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
