from django.urls import path
from . import api_views

app_name = 'users'

urlpatterns = [
    path('register/', api_views.register_user, name='register'),
    path('login/', api_views.login_user, name='login'),
    path('logout/', api_views.logout_user, name='logout'),
    path('profile/', api_views.user_profile, name='profile'),
    path('profile/update/', api_views.update_profile, name='update-profile'),
    
    # Admin User Management
    path('admin/users/', api_views.admin_user_list, name='admin-user-list'),
    path('admin/users/<int:pk>/', api_views.admin_user_detail, name='admin-user-detail'),

    # Password Reset
    path('password-reset/', api_views.password_reset_request, name='password-reset-request'),
    path('password-reset/confirm/<str:uidb64>/<str:token>/', api_views.password_reset_confirm, name='password-reset-confirm'),
]
