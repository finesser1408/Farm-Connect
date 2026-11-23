from django.urls import path
from . import api_views

from rest_framework_simplejwt.views import TokenObtainPairView

app_name = 'users'

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', api_views.ActiveUserTokenRefreshView.as_view(), name='token_refresh'),
    path('register/', api_views.register_user, name='register'),
    path('login/', api_views.login_user, name='login'),
    path('logout/', api_views.logout_user, name='logout'),
    path('profile/', api_views.user_profile, name='profile'),
    path('profile/update/', api_views.update_profile, name='update-profile'),
    
    # Admin User Management & Audit Trail
    path('admin/users/', api_views.admin_user_list, name='admin-user-list'),
    path('admin/users/<int:pk>/', api_views.admin_user_detail, name='admin-user-detail'),
    path('admin/users/<int:pk>/role/', api_views.admin_user_role_update, name='admin-user-role-update'),
    path('admin/users/<int:pk>/status/', api_views.admin_user_status_update, name='admin-user-status-update'),
    path('admin/audit-logs/', api_views.admin_audit_log_list, name='admin-audit-log-list'),

    # Admin Farmer Management
    path('admin/farmers/', api_views.admin_farmers_list_create, name='admin-farmer-list-create'),
    path('admin/farmers/<int:pk>/', api_views.admin_farmer_detail, name='admin-farmer-detail'),
    path('admin/farmers/<int:pk>/approve/', api_views.admin_farmer_approve, name='admin-farmer-approve'),
    path('admin/farmers/<int:pk>/suspend/', api_views.admin_farmer_suspend, name='admin-farmer-suspend'),
    path('admin/farmers/<int:pk>/reactivate/', api_views.admin_farmer_reactivate, name='admin-farmer-reactivate'),

    # Password Reset
    path('password-reset/', api_views.password_reset_request, name='password-reset-request'),
    path('password-reset/confirm/<str:uidb64>/<str:token>/', api_views.password_reset_confirm, name='password-reset-confirm'),
]
