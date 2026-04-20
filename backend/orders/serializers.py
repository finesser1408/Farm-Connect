from rest_framework import serializers
from products.serializers import ProductSerializer
from .models import Cart, CartItem, Order, OrderItem

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


class CartItemUpdateQuantitySerializer(serializers.ModelSerializer):
    """
    Used for updating the quantity of an existing item in the cart.
    The product and price remain fixed.
    """
    class Meta:
        model = CartItem
        fields = ['quantity']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

class CartItemDetailSerializer(serializers.ModelSerializer):
    """
    Detailed view for getting a single cart item or listing them.
    """
    product = ProductSerializer(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'price', 'total_price']


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'price', 'quantity', 'total_price']

    def get_total_price(self, obj):
        return obj.get_cost()


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer.email', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'first_name', 'last_name', 'email', 'address', 'postal_code', 'city', 'total_amount', 'status', 'created_at', 'updated_at', 'items']
        read_only_fields = ['id', 'customer', 'total_amount', 'created_at', 'updated_at', 'items']


class OrderCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=250)
    postal_code = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=100)