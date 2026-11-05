from rest_framework import serializers
from django.contrib.auth import authenticate
from django.db import transaction
from .models import User, FarmerProfile, CustomerProfile


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
                if not attrs.get(field, '').strip():
                    raise serializers.ValidationError({field: 'This field is required for farmers.'})
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
            )
        elif user.user_type == 'customer':
            CustomerProfile.objects.create(user=user)
            
        return user


class FarmerProfileSerializer(serializers.ModelSerializer):
    """Serializer for farmer profile"""
    class Meta:
        model = FarmerProfile
        fields = ['farm_name', 'location', 'description']


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Serializer for customer profile"""
    class Meta:
        model = CustomerProfile
        fields = ['address', 'city']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data"""
    farmer_profile = FarmerProfileSerializer(read_only=True)
    customer_profile = CustomerProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'phone', 'user_type', 'is_staff', 'is_verified',
                  'created_at', 'farmer_profile', 'customer_profile', 'first_name', 'last_name']
        read_only_fields = ['id', 'created_at', 'is_staff', 'is_verified', 'user_type']


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user and profile data"""
    farmer_profile = FarmerProfileSerializer(required=False)
    customer_profile = CustomerProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['username', 'phone', 'farmer_profile', 'customer_profile']

    def update(self, instance, validated_data):
        farmer_profile_data = validated_data.pop('farmer_profile', None)
        customer_profile_data = validated_data.pop('customer_profile', None)

        # Update user fields
        instance.username = validated_data.get('username', instance.username)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.save()

        # Update profile fields
        if instance.user_type == 'farmer' and farmer_profile_data:
            profile, _ = FarmerProfile.objects.get_or_create(user=instance)
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

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
