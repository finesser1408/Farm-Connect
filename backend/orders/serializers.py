from rest_framework import serializers
from products.serializers import ProductSerializer
from .models import Cart, CartItem

# --- READ SERIALIZERS (Your original logic) ---

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


# --- WRITE SERIALIZERS (New Add/Remove Logic) ---

class CartItemUpdateSerializer(serializers.ModelSerializer):
    """
    Handles adding products or updating quantities.
    If the product exists in the cart, it adds to the quantity.
    """
    class Meta:
        model = CartItem
        fields = ['product', 'quantity']

    def create(self, validated_data):
        # We get the cart from the context passed by the View
        cart_id = self.context.get('cart_id')
        product = validated_data.get('product')
        quantity = validated_data.get('quantity')

        cart_item, created = CartItem.objects.get_or_create(
            cart_id=cart_id,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        return cart_item


class CartItemRemoveSerializer(serializers.Serializer):
    """
    Used purely for validating a removal request by product ID.
    """
    product_id = serializers.IntegerField()

    def validate_product_id(self, value):
        # Optional: Add check if product actually exists in DB
        return value