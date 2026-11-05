from uuid import uuid4

from django.db import transaction
from rest_framework import serializers

from payments.models import Payment
from products.models import Product
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
        fields = ['id', 'product', 'price', 'quantity', 'get_cost', 'status']
        read_only_fields = ['id', 'product', 'price', 'get_cost', 'status']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer.email', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'first_name', 'last_name', 'email', 'phone', 'address',
                  'postal_code', 'city', 'total_amount', 'status', 'created_at', 
                  'updated_at', 'items', 'payment_method', 'payment_status']
        read_only_fields = ['id', 'customer', 'total_amount', 'created_at', 'updated_at', 'items']

    payment_method = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    def get_payment_method(self, obj):
        if not hasattr(obj, 'payment'):
            return None
        transaction_id = obj.payment.transaction_id or ''
        if transaction_id.startswith('SIMULATED-'):
            return f'{transaction_id.split("-")[1].title()} (simulated)'
        return obj.payment.get_method_display()

    def get_payment_status(self, obj):
        return obj.payment.status if hasattr(obj, 'payment') else None


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating orders from cart items"""
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(max_length=250)
    postal_code = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=100)
    payment_method = serializers.ChoiceField(choices=('ecocash', 'onemoney', 'cod'))

    def validate_email(self, value):
        if value != self.context['request'].user.email:
            raise serializers.ValidationError("Email must match the logged-in user's email")
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        payment_method = validated_data.pop('payment_method')
        cart = Cart.objects.select_for_update().filter(customer=user).first()
        if not cart:
            raise serializers.ValidationError({'cart': 'Your cart is empty.'})
        cart_items = list(cart.items.select_related('product').select_for_update())
        if not cart_items:
            raise serializers.ValidationError("Cannot create order with empty cart")

        locked_products = []
        for item in cart_items:
            product = Product.objects.select_for_update().get(pk=item.product_id)
            if not product.is_available or item.quantity > product.stock:
                raise serializers.ValidationError({
                    'cart': f'{product.name} is no longer available in the requested quantity.'
                })
            locked_products.append((item, product))

        subtotal = sum((product.price * item.quantity for item, product in locked_products))
        total_amount = subtotal + 5
        order = Order.objects.create(
            customer=user,
            total_amount=total_amount,
            status='pending' if payment_method == 'cod' else 'paid',
            **validated_data
        )
        for cart_item, product in locked_products:
            OrderItem.objects.create(
                order=order,
                product=product,
                price=product.price,
                quantity=cart_item.quantity
            )
            product.stock -= cart_item.quantity
            product.save(update_fields=['stock', 'is_available', 'updated_at'])

        Payment.objects.create(
            order=order,
            method='cod' if payment_method == 'cod' else 'mobile_money',
            status='pending' if payment_method == 'cod' else 'completed',
            amount=total_amount,
            transaction_id=None if payment_method == 'cod' else f'SIMULATED-{payment_method.upper()}-{uuid4().hex[:12]}',
        )

        cart.items.all().delete()
        return order


class UpdateOrderStatusSerializer(serializers.Serializer):
    """Serializer for updating order status"""
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)

    def validate_status(self, value):
        if value not in dict(Order.STATUS_CHOICES):
            raise serializers.ValidationError("Invalid status")
        return value