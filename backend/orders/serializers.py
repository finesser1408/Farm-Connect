from rest_framework import serializers
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
    status = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'price', 'quantity', 'status', 'get_cost']
        read_only_fields = ['id', 'product', 'price', 'status', 'get_cost']

    def get_status(self, obj):
        """Item status mirrors the order it belongs to."""
        return obj.order.status


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer.email', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'first_name', 'last_name', 'email', 'address',
                  'postal_code', 'city', 'phone', 'total_amount', 'status', 'created_at',
                  'updated_at', 'items']
        read_only_fields = ['id', 'customer', 'total_amount', 'created_at', 'updated_at', 'items']


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating orders from cart items.

    Orders are placed, never paid for: there is no payment field here on
    purpose. Checkout only collects where the order should be delivered.
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=250)
    postal_code = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    items = serializers.ListField(required=False)

    def validate_items(self, value):
        """The cart as the customer actually sees it: [{product_id, quantity}].

        Prices and availability always come from the product record, never from
        the client, so a tampered payload can't alter what an order costs.
        """
        if not value:
            return []

        cleaned = []
        for entry in value:
            if not isinstance(entry, dict):
                raise serializers.ValidationError("Each item must be an object.")
            try:
                product_id = int(entry.get('product_id'))
                quantity = int(entry.get('quantity'))
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "Each item needs a numeric product id and quantity."
                )

            if quantity < 1:
                raise serializers.ValidationError("Quantity must be at least 1.")

            product = Product.objects.filter(pk=product_id).first()
            if product is None or not product.is_available:
                raise serializers.ValidationError(
                    "One of the products in your cart is no longer available."
                )
            if quantity > product.stock:
                raise serializers.ValidationError(
                    f"Only {product.stock} left in stock for {product.name}."
                )

            cleaned.append({'product': product, 'quantity': quantity})

        return cleaned

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("First name is required.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Last name is required.")
        return value

    def validate_address(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("Enter a full delivery address.")
        return value

    def validate_city(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("City is required.")
        return value

    def validate_postal_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Postal code is required.")
        return value

    def validate_phone(self, value):
        value = (value or '').strip()
        if not value:
            return ''
        digits = ''.join(ch for ch in value if ch.isdigit())
        if len(digits) < 7 or any(ch not in '0123456789+()- ' for ch in value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def validate_email(self, value):
        """The order must belong to the account placing it."""
        request = self.context.get('request')
        if request is not None and request.user.is_authenticated \
                and value.lower() != request.user.email.lower():
            raise serializers.ValidationError("Email must match the logged-in user's email")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        lines = validated_data.pop('items', None)

        # Preferred path: the checkout sends the cart the customer was looking at.
        if lines:
            total = sum(line['product'].price * line['quantity'] for line in lines)
            order = Order.objects.create(
                customer=user,
                total_amount=total,
                **validated_data
            )
            for line in lines:
                OrderItem.objects.create(
                    order=order,
                    product=line['product'],
                    price=line['product'].price,
                    quantity=line['quantity'],
                )
            return order

        # Fallback: build from the server-side cart (used by tests and any
        # client that syncs its cart through /cart/add/).
        cart, _ = Cart.objects.get_or_create(customer=user)

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