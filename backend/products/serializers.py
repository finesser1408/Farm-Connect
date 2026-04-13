from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image']


class ProductSerializer(serializers.ModelSerializer):
    farmer = serializers.CharField(source='farmer.email', read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
    )
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'farmer',
            'category',
            'name',
            'slug',
            'description',
            'price',
            'stock',
            'image',
            'is_available',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'farmer', 'created_at', 'updated_at', 'is_available']
