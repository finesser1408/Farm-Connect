from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image']


class ProductSerializer(serializers.ModelSerializer):
    farmer_email = serializers.EmailField(source='farmer.email', read_only=True)
    farmer_name = serializers.SerializerMethodField()
    category_details = CategorySerializer(source='category', read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
        write_only=True
    )
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'farmer_email',
            'farmer_name',
            'category',
            'category_details',
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
        read_only_fields = ['id', 'farmer_email', 'farmer_name', 'category_details', 'created_at', 'updated_at', 'is_available']

    def get_farmer_name(self, obj):
        return f"{obj.farmer.first_name} {obj.farmer.last_name}".strip() or obj.farmer.email
