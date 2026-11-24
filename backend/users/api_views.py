from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Value
from django.db.models.functions import Concat
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.decorators import throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate, login, logout  # ✅ Added 'authenticate'
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import (
    UserRegistrationSerializer, 
    LoginSerializer, 
    UserSerializer,
    UserUpdateSerializer,
    AdminRoleUpdateSerializer,
    AdminStatusUpdateSerializer,
    AdminAuditLogSerializer,
    AdminFarmerSerializer,
    AdminFarmerCreateSerializer,
    AdminFarmerStatusActionSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ActiveUserTokenRefreshSerializer,
)
from .models import User, FarmerProfile, CustomerProfile, AdminAuditLog
from .permissions import IsAdmin, IsSuperAdmin, IsFarmer
from .tokens import revoke_user_refresh_tokens
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from backend.email_service import email_service
from .throttles import PasswordResetRateThrottle
import logging

logger = logging.getLogger(__name__)


class ActiveUserTokenRefreshView(TokenRefreshView):
    """Refresh JWT access tokens only for active user accounts."""
    serializer_class = ActiveUserTokenRefreshSerializer


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    """
    API endpoint for user registration
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Send welcome email
        try:
            email_result = email_service.send_welcome_email(
                user_email=user.email,
                user_name=user.get_full_name() or user.email.split('@')[0]
            )
            
            if not email_result['success']:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send welcome email: {email_result['message']}")
        
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending welcome email: {str(e)}")
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Get user data
        user_serializer = UserSerializer(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': user_serializer.data,
            'access': access_token,
            'refresh': str(refresh),
            'user_type': user.user_type
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ===== FIXED LOGIN VIEW =====
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@csrf_exempt
def login_user(request):
    """
    API endpoint for user login using email and password.
    """
    print("🔥 login_user called!")  # Debugging: Check if the view is being hit

    email = request.data.get('email')
    password = request.data.get('password')

    # 1. Validate that email and password are provided
    if not email or not password:
        return Response(
            {'error': 'Email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 2. Authenticate the user using the email as the username
    #    (Django's default authenticate uses 'username' field)
    user = authenticate(username=email, password=password)

    # 3. Check if authentication failed or user is inactive
    if user is None:
        return Response(
            {'error': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return Response(
            {'error': 'User account is disabled.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 4. Login successful - Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    # 5. Serialize user data for response
    user_serializer = UserSerializer(user)

    return Response({
        'message': 'Login successful',
        'user': user_serializer.data,
        'access': access_token,
        'refresh': str(refresh),
        'user_type': user.user_type
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_user(request):
    """
    API endpoint for user logout
    """
    try:
        # Blacklist the refresh token
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        # Logout the user
        logout(request)
        
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'error': 'Logout failed',
            'detail': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    """
    API endpoint to get current user profile
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


PRIVILEGED_USER_FIELDS = {'user_type', 'is_superuser', 'is_staff', 'is_active', 'is_verified'}


class AdminPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    """
    API endpoint to update current user's own profile (privilege fields strictly forbidden).
    """
    if any(field in request.data for field in PRIVILEGED_USER_FIELDS):
        return Response(
            {'detail': 'You cannot modify administrative roles or account status via profile updates.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    partial = request.method == 'PATCH'
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=partial)
    
    if serializer.is_valid():
        serializer.save()
        user_serializer = UserSerializer(request.user)
        return Response({
            'message': 'Profile updated successfully',
            'user': user_serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_user_list(request):
    """
    API endpoint for admins to list registered users.
    """
    users = User.objects.select_related('farmer_profile', 'customer_profile').annotate(
        full_name=Concat('first_name', Value(' '), 'last_name')
    ).order_by('-created_at')

    search = (request.query_params.get('search') or '').strip()
    if search:
        users = users.filter(
            Q(email__icontains=search)
            | Q(username__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(full_name__icontains=search)
        )

    role_filter = (request.query_params.get('role') or '').strip().lower()
    if role_filter == 'super_admin':
        users = users.filter(is_superuser=True)
    elif role_filter == 'general_admin':
        users = users.filter(is_superuser=False).filter(Q(user_type='admin') | Q(is_staff=True))
    elif role_filter in {'farmer', 'customer'}:
        users = users.filter(user_type=role_filter, is_superuser=False, is_staff=False)

    status_filter = (request.query_params.get('status') or '').strip().lower()
    if status_filter == 'active':
        users = users.filter(is_active=True)
    elif status_filter == 'suspended':
        users = users.filter(is_active=False)

    if 'page' in request.query_params or 'page_size' in request.query_params:
        paginator = AdminPagination()
        page = paginator.paginate_queryset(users, request)
        serializer = UserSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = UserSerializer(users, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def admin_user_detail(request, pk):
    """
    API endpoint for admins to inspect or manage a specific user safely.
    Privilege and status modifications must go through dedicated RBAC endpoints.
    """
    target = get_object_or_404(User, pk=pk)

    if request.method == 'GET':
        serializer = UserSerializer(target)
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method in {'PUT', 'PATCH'}:
        if any(field in request.data for field in PRIVILEGED_USER_FIELDS):
            return Response(
                {'detail': 'Use the dedicated role or status endpoints for administrative privilege and status changes.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (target.is_super_admin or target.is_general_admin) and not request.user.is_super_admin:
            return Response(
                {'detail': 'General Admins cannot modify administrator accounts.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if target.is_super_admin and target.pk != request.user.pk:
            return Response(
                {'detail': 'Other Super Admin accounts cannot be modified here.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UserUpdateSerializer(target, data=request.data, partial=True)
        if serializer.is_valid():
            with transaction.atomic():
                serializer.save()
                AdminAuditLog.log(
                    actor=request.user,
                    action='update_user_profile',
                    target_type='user',
                    target_id=target.pk,
                    target_repr=target.email,
                    details={'updated_fields': sorted(serializer.validated_data.keys())},
                )
            return Response(UserSerializer(target).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if not request.user.is_super_admin:
            return Response(
                {'detail': 'Only Super Admins can delete user accounts.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if target.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.is_super_admin or target.is_superuser:
            return Response(
                {'detail': 'Super Admin accounts are protected and cannot be deleted.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                'detail': 'Direct user deletion is disabled to preserve historical records. Suspend or deactivate the account via /status/ instead.'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['PATCH'])
@permission_classes([IsSuperAdmin])
def admin_user_role_update(request, pk):
    """
    Super-Admin-only endpoint to assign or revoke General Admin role.
    Protects against self-demotion, modifying Super Admins, and removing the last active Super Admin.
    """
    serializer = AdminRoleUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    requested_role = serializer.validated_data['role']
    reason = serializer.validated_data.get('reason', '').strip()

    with transaction.atomic():
        target = get_object_or_404(User.objects.select_for_update(), pk=pk)

        if target.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot modify your own administrative role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.is_super_admin or target.is_superuser:
            return Response(
                {'detail': 'Super Admin accounts cannot be demoted or modified via role management.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        previous_role = target.admin_role or target.user_type

        if requested_role == 'general_admin':
            target.user_type = 'admin'
            target.is_staff = True
            target.is_superuser = False
            action = 'assign_general_admin'
        else:
            if requested_role == 'farmer' and not FarmerProfile.objects.filter(user=target).exists():
                return Response(
                    {'detail': 'Cannot assign farmer role without an existing farmer profile.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if requested_role == 'customer':
                CustomerProfile.objects.get_or_create(user=target)
            target.user_type = requested_role
            target.is_staff = False
            target.is_superuser = False
            action = 'revoke_general_admin' if previous_role == 'general_admin' else 'change_user_role'

        target.save(update_fields=['user_type', 'is_staff', 'is_superuser', 'updated_at'])

        AdminAuditLog.log(
            actor=request.user,
            action=action,
            target_type='user',
            target_id=target.pk,
            target_repr=target.email,
            details={
                'previous_role': previous_role,
                'new_role': target.admin_role or target.user_type,
                **({'reason': reason} if reason else {}),
            },
        )

    return Response(UserSerializer(target).data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_user_status_update(request, pk):
    """
    Suspend or reactivate a user account.
    Super Admins can suspend/reactivate General Admins (never self or Super Admins).
    General Admins cannot suspend/reactivate any administrator or customer accounts here.
    """
    serializer = AdminStatusUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_is_active = serializer.validated_data['is_active']
    reason = serializer.validated_data.get('reason', '').strip()

    with transaction.atomic():
        target = get_object_or_404(User.objects.select_for_update(), pk=pk)

        if target.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot suspend or reactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.is_super_admin or target.is_superuser:
            return Response(
                {'detail': 'Super Admin accounts cannot be suspended.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (target.is_general_admin or target.is_admin) and not request.user.is_super_admin:
            return Response(
                {'detail': 'Only Super Admins can suspend or reactivate General Admin accounts.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not request.user.is_super_admin and target.user_type != 'farmer':
            return Response(
                {'detail': 'General Admins can only manage farmer account status.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not new_is_active and target.is_superuser:
            other_active_superusers = User.objects.filter(
                is_active=True,
                is_superuser=True,
            ).exclude(pk=target.pk).exists()
            if not other_active_superusers:
                return Response(
                    {'detail': 'Cannot suspend the last active Super Admin.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        previous_active = target.is_active
        target.is_active = new_is_active
        target.save(update_fields=['is_active', 'updated_at'])

        revoked_tokens = 0
        if not new_is_active:
            revoked_tokens = revoke_user_refresh_tokens(target)

        if target.is_general_admin or target.is_admin:
            action = 'reactivate_admin' if new_is_active else 'suspend_admin'
        else:
            action = 'reactivate_user' if new_is_active else 'suspend_user'

        AdminAuditLog.log(
            actor=request.user,
            action=action,
            target_type='user',
            target_id=target.pk,
            target_repr=target.email,
            details={
                'previous_is_active': previous_active,
                'new_is_active': new_is_active,
                'target_role': target.admin_role or target.user_type,
                **({'revoked_refresh_tokens': revoked_tokens} if not new_is_active else {}),
                **({'reason': reason} if reason else {}),
            },
        )

    return Response(UserSerializer(target).data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def admin_audit_log_list(request):
    """Super-Admin-only read-only endpoint to review administrative audit logs."""
    logs = AdminAuditLog.objects.select_related('actor').all()

    action_filter = (request.query_params.get('action') or '').strip()
    if action_filter:
        logs = logs.filter(action=action_filter)

    target_type = (request.query_params.get('target_type') or '').strip()
    if target_type:
        logs = logs.filter(target_type=target_type)

    search = (request.query_params.get('search') or '').strip()
    if search:
        logs = logs.filter(
            Q(actor_email__icontains=search)
            | Q(target_repr__icontains=search)
            | Q(action__icontains=search)
        )

    paginator = AdminPagination()
    page = paginator.paginate_queryset(logs, request)
    serializer = AdminAuditLogSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def admin_farmers_list_create(request):
    """
    GET: List farmer accounts with search, status filtering, and pagination.
    POST: Register a new farmer account safely (initial status='pending', no unverified emails).
    """
    if request.method == 'GET':
        farmers = FarmerProfile.objects.select_related('user').annotate(
            product_count=Count(
                'user__products',
                filter=~Q(user__products__moderation_status='removed'),
                distinct=True,
            ),
            full_name=Concat('user__first_name', Value(' '), 'user__last_name'),
        ).order_by('-created_at')

        search = (request.query_params.get('search') or '').strip()
        if search:
            farmers = farmers.filter(
                Q(user__email__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(full_name__icontains=search)
                | Q(farm_name__icontains=search)
                | Q(location__icontains=search)
            )

        status_filter = (request.query_params.get('status') or '').strip().lower()
        if status_filter in {'pending', 'approved', 'suspended'}:
            farmers = farmers.filter(status=status_filter)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(farmers, request)
        serializer = AdminFarmerSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = AdminFarmerCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        profile = serializer.save()
        AdminAuditLog.log(
            actor=request.user,
            action='create_farmer',
            target_type='farmer',
            target_id=profile.user_id,
            target_repr=profile.user.email,
            details={
                'farm_name': profile.farm_name,
                'location': profile.location,
                'status': profile.status,
            },
        )
    return Response(AdminFarmerSerializer(profile).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_farmer_detail(request, pk):
    """Retrieve a single farmer record (by User pk)."""
    profile = get_object_or_404(
        FarmerProfile.objects.select_related('user').annotate(
            product_count=Count(
                'user__products',
                filter=~Q(user__products__moderation_status='removed'),
                distinct=True,
            )
        ),
        user_id=pk,
    )
    return Response(AdminFarmerSerializer(profile).data, status=status.HTTP_200_OK)


def _update_farmer_status(request, pk, *, target_status, action_name, allowed_from, invalid_msg):
    serializer = AdminFarmerStatusActionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    reason = serializer.validated_data.get('reason', '').strip()

    with transaction.atomic():
        profile = get_object_or_404(
            FarmerProfile.objects.select_for_update().select_related('user'),
            user_id=pk,
        )
        if profile.status not in allowed_from:
            return Response({'detail': invalid_msg}, status=status.HTTP_400_BAD_REQUEST)

        previous_status = profile.status
        profile.status = target_status
        profile.status_reason = reason
        profile.status_updated_at = timezone.now()
        profile.status_updated_by = request.user
        profile.save(update_fields=['status', 'status_reason', 'status_updated_at', 'status_updated_by', 'updated_at'])

        if target_status == 'approved' and not profile.user.is_verified:
            profile.user.is_verified = True
            profile.user.save(update_fields=['is_verified', 'updated_at'])

        AdminAuditLog.log(
            actor=request.user,
            action=action_name,
            target_type='farmer',
            target_id=profile.user_id,
            target_repr=profile.user.email,
            details={
                'previous_status': previous_status,
                'new_status': target_status,
                'farm_name': profile.farm_name,
                **({'reason': reason} if reason else {}),
            },
        )

    refreshed = FarmerProfile.objects.select_related('user').annotate(
        product_count=Count('user__products', distinct=True)
    ).get(pk=profile.pk)
    return Response(AdminFarmerSerializer(refreshed).data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_farmer_approve(request, pk):
    """Approve a pending farmer account."""
    return _update_farmer_status(
        request,
        pk,
        target_status='approved',
        action_name='approve_farmer',
        allowed_from={'pending'},
        invalid_msg='Only pending farmers can be approved. Reactivate suspended farmers instead.',
    )


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_farmer_suspend(request, pk):
    """Suspend an approved or pending farmer without deactivating User.is_active."""
    return _update_farmer_status(
        request,
        pk,
        target_status='suspended',
        action_name='suspend_farmer',
        allowed_from={'pending', 'approved'},
        invalid_msg='Farmer is already suspended.',
    )


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_farmer_reactivate(request, pk):
    """Reactivate a suspended farmer account without altering product moderation."""
    return _update_farmer_status(
        request,
        pk,
        target_status='approved',
        action_name='reactivate_farmer',
        allowed_from={'suspended'},
        invalid_msg='Only suspended farmers can be reactivated.',
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request(request):
    """
    API endpoint to request a password reset
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    user = User.objects.filter(email=email).first()
    if user:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://farmconnect.zchpc.ac.zw').rstrip('/')
        reset_url = f"{frontend_url}/password-reset/confirm/{uid}/{token}/"

        try:
            email_result = email_service.send_password_reset(
                user_email=email,
                user_name=user.get_full_name() or email.split('@')[0],
                reset_link=reset_url
            )
            if not email_result.get('success'):
                logger.error("Password reset email delivery failed")
        except Exception:
            logger.error("Password reset email delivery failed")

    return Response(
        {'message': 'If an account with that email exists, password reset instructions will be sent.'},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_confirm(request, uidb64, token):
    """
    API endpoint to confirm password reset
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is None or not default_token_generator.check_token(user, token):
        return Response({'error': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = PasswordResetConfirmSerializer(
        data=request.data,
        context={'user': user},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.save(update_fields=['password'])
    return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_dashboard_stats(request):
    """
    Return real database aggregates for the Admin Dashboard.
    - Never reports simulated checkout transactions as verified revenue.
    - Exposes aggregate counts only (zero personal information).
    """
    from datetime import datetime, timezone as dt_timezone
    from django.db.models.functions import TruncMonth
    from orders.models import Order
    from products.models import Product

    now = timezone.now()
    current_year = now.year
    current_month = now.month

    month_slots = []
    for offset in range(5, -1, -1):
        total_months = (current_year * 12 + (current_month - 1)) - offset
        slot_year, slot_month_zero = divmod(total_months, 12)
        slot_month = slot_month_zero + 1
        slot_dt = datetime(slot_year, slot_month, 1, tzinfo=dt_timezone.utc)
        month_slots.append((f"{slot_year:04d}-{slot_month:02d}", slot_dt.strftime("%b %Y"), slot_dt))

    window_start = month_slots[0][2]
    grouped_orders = (
        Order.objects.exclude(status='cancelled')
        .filter(created_at__gte=window_start)
        .annotate(month_bucket=TruncMonth('created_at'))
        .values('month_bucket')
        .annotate(orders=Count('id'))
    )
    counts_by_month = {
        row['month_bucket'].strftime("%Y-%m"): row['orders']
        for row in grouped_orders
        if row.get('month_bucket') is not None
    }

    monthly_activity = [
        {
            'month': label,
            'month_key': key,
            'orders': counts_by_month.get(key, 0),
        }
        for key, label, _ in month_slots
    ]

    return Response(
        {
            'total_users': User.objects.count(),
            'total_farmers': FarmerProfile.objects.count(),
            'total_products': Product.objects.exclude(moderation_status='removed').count(),
            'total_orders': Order.objects.exclude(status='cancelled').count(),
            'verified_payments_enabled': False,
            'verified_sales_total': None,
            'monthly_activity': monthly_activity,
        },
        status=status.HTTP_200_OK,
    )
