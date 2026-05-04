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


class CartItemRemoveSerializer(serializers.Serializer):
    """
    Used purely for validating a removal request by product ID.
    """
    product_id = serializers.IntegerField()

    def validate_product_id(self, value):
        # Optional: Add check if product actually exists in DB
        return value

# --- ORDER SERIALIZERS ---

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    get_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'price', 'quantity', 'get_cost']
        read_only_fields = ['id', 'product', 'price', 'get_cost']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer.email', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'first_name', 'last_name', 'email', 'address', 
                  'postal_code', 'city', 'total_amount', 'status', 'created_at', 
                  'updated_at', 'items']
        read_only_fields = ['id', 'customer', 'total_amount', 'created_at', 'updated_at', 'items']


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating orders from cart items"""
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=250)
    postal_code = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=100)

    def validate_email(self, value):
        if self.instance and self.instance.customer.email != value:
            raise serializers.ValidationError("Email must match the logged-in user's email")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        cart = Cart.objects.get(customer=user)
        
        if not cart.items.exists():
            raise serializers.ValidationError("Cannot create order with empty cart")
        
        # Create order
        order = Order.objects.create(
            customer=user,
            total_amount=cart.total_amount,
            **validated_data
        )
        
        # Create order items from cart items
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                price=cart_item.price,
                quantity=cart_item.quantity
            )
        
        # Clear cart
        cart.items.all().delete()
        
        return order


class UpdateOrderStatusSerializer(serializers.Serializer):
    """Serializer for updating order status"""
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)

    def validate_status(self, value):
        if value not in dict(Order.STATUS_CHOICES):
            raise serializers.ValidationError("Invalid status")
        return value