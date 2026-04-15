from rest_framework import serializers

from products.serializers import ProductSerializer
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'price', 'total_price']
        read_only_fields = ['id', 'product', 'price', 'total_price']


class CartSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source='customer.email', read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'customer', 'items', 'total_amount', 'created_at', 'updated_at']
        read_only_fields = ['id', 'customer', 'items', 'total_amount', 'created_at', 'updated_at']
