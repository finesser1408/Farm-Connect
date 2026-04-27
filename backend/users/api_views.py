from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import (
    UserRegistrationSerializer, 
    LoginSerializer, 
    UserSerializer,
    UserUpdateSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)
from .models import User
from .permissions import IsAdmin, IsFarmer
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from backend.email_service import email_service


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


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@method_decorator(csrf_exempt, name='dispatch')
def login_user(request):
    """
    API endpoint for user login
    """
    serializer = LoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Log in the user (for session)
        login(request, user)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Get user data
        user_serializer = UserSerializer(user)
        
        return Response({
            'message': 'Login successful',
            'user': user_serializer.data,
            'access': access_token,
            'refresh': str(refresh),
            'user_type': user.user_type
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    """
    API endpoint to update user profile
    """
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
    API endpoint for admin to list all users
    """
    users = User.objects.all().order_by('-created_at')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdmin])
def admin_user_detail(request, pk):
    """
    API endpoint for admin to manage a specific user
    """
    user = get_object_or_404(User, pk=pk)
    
    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    elif request.method == 'PUT':
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    """
    API endpoint to request a password reset
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # In a real app, this would be a link to your frontend
            reset_url = f"https://farmfreshhub.com/password-reset/confirm/{uid}/{token}/"
            
            email_result = email_service.send_password_reset(
                user_email=email,
                user_name=user.get_full_name() or email.split('@')[0],
                reset_link=reset_url
            )
            
            if email_result['success']:
                return Response({'message': 'Password reset email sent'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Failed to send email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Always return 200 to avoid email enumeration
        return Response({'message': 'Password reset email sent if account exists'}, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request, uidb64, token):
    """
    API endpoint to confirm password reset
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
            
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
