from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from .models import User, FarmerProfile, CustomerProfile, AdminAuditLog


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    farm_name = serializers.CharField(write_only=True, required=False, max_length=255)
    location = serializers.CharField(write_only=True, required=False, max_length=255)
    farm_description = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'password_confirm', 'phone',
            'user_type', 'first_name', 'last_name', 'farm_name', 'location',
            'farm_description',
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        if attrs.get('user_type') == 'admin':
            raise serializers.ValidationError({'user_type': 'Admin accounts cannot be created through public registration.'})
        if attrs.get('user_type') == 'farmer':
            for field in ('farm_name', 'location'):
                value = (attrs.get(field) or '').strip()
                if not value:
                    raise serializers.ValidationError({field: 'This field is required for farmers.'})
                attrs[field] = value
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        farm_name = validated_data.pop('farm_name', '')
        location = validated_data.pop('location', '')
        farm_description = validated_data.pop('farm_description', '')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        if user.user_type == 'farmer':
            FarmerProfile.objects.create(
                user=user,
                farm_name=farm_name,
                location=location,
                description=farm_description,
                status='pending',
            )
        elif user.user_type == 'customer':
            CustomerProfile.objects.create(user=user)
            
        return user


class FarmerProfileSerializer(serializers.ModelSerializer):
    """Serializer for farmer profile"""
    class Meta:
        model = FarmerProfile
        fields = ['farm_name', 'location', 'description', 'status', 'status_reason', 'status_updated_at']
        read_only_fields = ['status', 'status_reason', 'status_updated_at']

    def validate_location(self, value):
        location = value.strip()
        if not location:
            raise serializers.ValidationError('Enter a city, town, or district.')
        return location


class AdminFarmerSerializer(serializers.ModelSerializer):
    """Serializer for administrative farmer listing and details."""
    id = serializers.IntegerField(source='user.id', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    profile_id = serializers.IntegerField(source='id', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = FarmerProfile
        fields = [
            'id',
            'user_id',
            'profile_id',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone',
            'username',
            'is_active',
            'farm_name',
            'location',
            'description',
            'status',
            'status_reason',
            'status_updated_at',
            'product_count',
            'created_at',
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username or obj.user.email

    def get_product_count(self, obj):
        annotated = getattr(obj, 'product_count', None)
        if annotated is not None:
            return annotated
        return obj.user.products.count()


class AdminFarmerCreateSerializer(serializers.Serializer):
    """Serializer for administrators to register a farmer account safely."""
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=13, required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    farm_name = serializers.CharField(max_length=255)
    location = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return normalized

    def validate_first_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('First name is required.')
        return cleaned

    def validate_last_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Last name is required.')
        return cleaned

    def validate_farm_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Farm name is required.')
        return cleaned

    def validate_location(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Location is required.')
        return cleaned

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': "Passwords don't match."})

        username = (attrs.get('username') or '').strip() or attrs['email']
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError({'username': 'A user with this username already exists.'})
        attrs['username'] = username

        validate_password(attrs['password'])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        farm_name = validated_data.pop('farm_name')
        location = validated_data.pop('location')
        description = validated_data.pop('description', '').strip()

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', '').strip(),
            user_type='farmer',
            is_staff=False,
            is_superuser=False,
            is_active=True,
            is_verified=False,
        )
        profile = FarmerProfile.objects.create(
            user=user,
            farm_name=farm_name,
            location=location,
            description=description,
            status='pending',
        )
        return profile


class AdminFarmerStatusActionSerializer(serializers.Serializer):
    """Serializer for farmer approval/suspension/reactivation actions."""
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Serializer for customer profile"""
    class Meta:
        model = CustomerProfile
        fields = ['address', 'city']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data"""
    farmer_profile = FarmerProfileSerializer(read_only=True)
    customer_profile = CustomerProfileSerializer(read_only=True)
    admin_role = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'phone', 'user_type', 'is_staff', 'is_superuser',
                  'is_active', 'is_verified', 'admin_role', 'created_at', 'farmer_profile',
                  'customer_profile', 'first_name', 'last_name']
        read_only_fields = ['id', 'created_at', 'is_staff', 'is_superuser', 'is_active',
                            'is_verified', 'user_type', 'admin_role']


class AdminRoleUpdateSerializer(serializers.Serializer):
    """Serializer for Super Admin role assignment/revocation."""
    role = serializers.ChoiceField(choices=('general_admin', 'customer', 'farmer'))
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')


class AdminStatusUpdateSerializer(serializers.Serializer):
    """Serializer for suspending or reactivating a user account."""
    is_active = serializers.BooleanField()
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')


class AdminAuditLogSerializer(serializers.ModelSerializer):
    """Read-only serializer for AdminAuditLog entries."""
    class Meta:
        model = AdminAuditLog
        fields = [
            'id',
            'actor',
            'actor_email',
            'action',
            'target_type',
            'target_id',
            'target_repr',
            'details',
            'created_at',
        ]
        read_only_fields = fields


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user and profile data"""
    farmer_profile = FarmerProfileSerializer(required=False)
    customer_profile = CustomerProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'username', 'phone', 'farmer_profile', 'customer_profile']

    def update(self, instance, validated_data):
        farmer_profile_data = validated_data.pop('farmer_profile', None)
        customer_profile_data = validated_data.pop('customer_profile', None)

        # Update user fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.username = validated_data.get('username', instance.username)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.save()

        # Update profile fields
        if instance.user_type == 'farmer' and farmer_profile_data:
            profile, _ = FarmerProfile.objects.get_or_create(
                user=instance,
                defaults={'farm_name': ''},
            )
            for attr, value in farmer_profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        elif instance.user_type == 'customer' and customer_profile_data:
            profile, _ = CustomerProfile.objects.get_or_create(user=instance)
            for attr, value in customer_profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Email and password are required')


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    new_password = serializers.CharField(min_length=8)
    new_password_confirm = serializers.CharField()

    def validate_new_password(self, value):
        validate_password(value, user=self.context.get('user'))
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs


class ActiveUserTokenRefreshSerializer(TokenRefreshSerializer):
    """Reject refresh-token exchanges when the underlying user is missing or inactive."""

    def validate(self, attrs):
        refresh = self.token_class(attrs['refresh'])
        user_id = refresh.get(api_settings.USER_ID_CLAIM)
        user_model = get_user_model()
        user = (
            user_model.objects.filter(**{api_settings.USER_ID_FIELD: user_id}).first()
            if user_id is not None
            else None
        )
        if not user or not user.is_active:
            raise AuthenticationFailed(
                'User account is inactive or suspended.',
                code='user_inactive',
            )
        return super().validate(attrs)
