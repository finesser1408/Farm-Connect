from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, FarmerProfile, CustomerProfile, EmailOTP


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'phone', 'user_type', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Create profile based on user type
        if user.user_type == 'farmer':
            FarmerProfile.objects.create(user=user)
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
        fields = ['id', 'email', 'username', 'phone', 'user_type', 'is_verified', 
                  'created_at', 'farmer_profile', 'customer_profile', 'first_name', 'last_name']
        read_only_fields = ['id', 'created_at', 'is_verified', 'user_type']


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


class ChangePasswordSerializer(serializers.Serializer):
    """Change the signed-in user's own password from inside their account."""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Your current password is incorrect.")
        return value

    def validate(self, attrs):
        current_password = attrs['current_password']
        new_password = attrs['new_password']

        if new_password != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Passwords don't match."
            })

        if new_password == current_password:
            raise serializers.ValidationError({
                'new_password': "Choose a password you haven't used before."
            })

        user = self.context['request'].user
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'new_password': error.messages})

        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class EmailOTPSendSerializer(serializers.Serializer):
    """Serializer for requesting an email one-time code"""
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=EmailOTP.PURPOSE_CHOICES, default='verification')


class EmailOTPVerifySerializer(serializers.Serializer):
    """Serializer for verifying an email one-time code"""
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)
    purpose = serializers.ChoiceField(choices=EmailOTP.PURPOSE_CHOICES, default='verification')

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Code must be 6 digits")
        return value
