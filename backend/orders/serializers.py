from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from rest_framework import serializers

from payments.models import Payment
from products.models import Product
from products.serializers import ProductSerializer
from products.validators import (
    PACKAGED_UNITS_REQUIRING_DESCRIPTION,
    QuantityDecimalField,
    calculate_line_subtotal,
    quantize_currency,
    validate_quantity_for_unit,
)
from users.permissions import is_product_publicly_visible
from .models import Cart, CartItem, Order, OrderItem

DELIVERY_FEE = Decimal('5.00')


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    quantity = QuantityDecimalField(read_only=True)
    price = serializers.DecimalField(source='current_price', max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'price', 'total_price']
        read_only_fields = ['id', 'product', 'quantity', 'price', 'total_price']


class CartSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source='customer.email', read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'customer', 'items', 'total_amount', 'created_at', 'updated_at']
        read_only_fields = ['id', 'customer', 'items', 'total_amount', 'created_at', 'updated_at']


class CartItemUpdateSerializer(serializers.ModelSerializer):
    """
    Handles adding products or updating quantities.
    If the product exists in the cart, it adds to the quantity.
    """
    quantity = QuantityDecimalField()

    class Meta:
        model = CartItem
        fields = ['product', 'quantity']

    def create(self, validated_data):
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
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_name = serializers.SerializerMethodField()
    unit_label = serializers.CharField(read_only=True)
    quantity = QuantityDecimalField(read_only=True)
    get_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'unit_label',
            'price',
            'quantity',
            'get_cost',
            'status',
            'order_status',
            'stock_restored',
            'stock_restored_at',
        ]
        read_only_fields = fields

    def get_product_name(self, obj):
        return obj.product_name or (obj.product.name if obj.product_id else '')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer.email', read_only=True)
    payment_method = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    accepted_subtotal = serializers.SerializerMethodField()
    pending_subtotal = serializers.SerializerMethodField()
    rejected_subtotal = serializers.SerializerMethodField()
    delivery_fee_effective = serializers.SerializerMethodField()
    effective_total = serializers.SerializerMethodField()
    fulfillment_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'first_name', 'last_name', 'email', 'phone', 'address',
            'postal_code', 'city', 'total_amount', 'status', 'created_at',
            'updated_at', 'items', 'payment_method', 'payment_status',
            'accepted_subtotal', 'pending_subtotal', 'rejected_subtotal',
            'delivery_fee_effective', 'effective_total', 'fulfillment_status',
        ]
        read_only_fields = [
            'id', 'customer', 'total_amount', 'created_at', 'updated_at', 'items',
            'accepted_subtotal', 'pending_subtotal', 'rejected_subtotal',
            'delivery_fee_effective', 'effective_total', 'fulfillment_status',
        ]

    def _get_financials(self, obj):
        cache = getattr(obj, '_cached_financials', None)
        if cache is not None:
            return cache

        items = list(obj.items.all())
        accepted_subtotal = Decimal('0.00')
        pending_subtotal = Decimal('0.00')
        rejected_subtotal = Decimal('0.00')

        for item in items:
            line_cost = item.get_cost()
            if item.status in ('accepted', 'shipped', 'delivered'):
                accepted_subtotal += line_cost
            elif item.status == 'pending':
                pending_subtotal += line_cost
            elif item.status == 'rejected':
                rejected_subtotal += line_cost

        accepted_subtotal = quantize_currency(accepted_subtotal)
        pending_subtotal = quantize_currency(pending_subtotal)
        rejected_subtotal = quantize_currency(rejected_subtotal)

        all_rejected = bool(items) and all(item.status == 'rejected' for item in items)
        is_inactive = obj.status == 'cancelled' or all_rejected or not items
        delivery_fee_effective = Decimal('0.00') if is_inactive else DELIVERY_FEE
        effective_total = (
            Decimal('0.00')
            if is_inactive
            else quantize_currency(accepted_subtotal + pending_subtotal + delivery_fee_effective)
        )

        if all_rejected:
            fulfillment_status = 'all_rejected'
        elif obj.status == 'cancelled':
            fulfillment_status = 'cancelled'
        elif any(item.status == 'rejected' for item in items):
            fulfillment_status = 'partially_rejected'
        elif items and all(item.status == 'delivered' for item in items):
            fulfillment_status = 'delivered'
        elif items and all(item.status in ('shipped', 'delivered') for item in items):
            fulfillment_status = 'shipped'
        elif any(item.status in ('shipped', 'delivered') for item in items):
            fulfillment_status = 'partially_shipped'
        elif items and all(item.status == 'accepted' for item in items):
            fulfillment_status = 'accepted'
        elif any(item.status == 'accepted' for item in items):
            fulfillment_status = 'partially_accepted'
        else:
            fulfillment_status = 'pending'

        cache = {
            'accepted_subtotal': f'{accepted_subtotal:.2f}',
            'pending_subtotal': f'{pending_subtotal:.2f}',
            'rejected_subtotal': f'{rejected_subtotal:.2f}',
            'delivery_fee_effective': f'{delivery_fee_effective:.2f}',
            'effective_total': f'{effective_total:.2f}',
            'fulfillment_status': fulfillment_status,
        }
        obj._cached_financials = cache
        return cache

    def get_accepted_subtotal(self, obj):
        return self._get_financials(obj)['accepted_subtotal']

    def get_pending_subtotal(self, obj):
        return self._get_financials(obj)['pending_subtotal']

    def get_rejected_subtotal(self, obj):
        return self._get_financials(obj)['rejected_subtotal']

    def get_delivery_fee_effective(self, obj):
        return self._get_financials(obj)['delivery_fee_effective']

    def get_effective_total(self, obj):
        return self._get_financials(obj)['effective_total']

    def get_fulfillment_status(self, obj):
        return self._get_financials(obj)['fulfillment_status']

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
        cart_items = list(cart.items.select_for_update().order_by('product_id', 'id'))
        if not cart_items:
            raise serializers.ValidationError("Cannot create order with empty cart")

        product_ids = sorted({item.product_id for item in cart_items})
        products_by_id = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=product_ids).order_by('id')
        }

        locked_products = []
        for item in cart_items:
            product = products_by_id.get(item.product_id)
            if product is None or not is_product_publicly_visible(product):
                product_label = product.name if product is not None else f'Product #{item.product_id}'
                raise serializers.ValidationError({
                    'cart': f'{product_label} is no longer available for purchase.'
                })
            if product.unit in PACKAGED_UNITS_REQUIRING_DESCRIPTION and not (product.unit_description or '').strip():
                raise serializers.ValidationError({
                    'cart': f'{product.name} has an incomplete package description and cannot be purchased right now.'
                })
            try:
                validate_quantity_for_unit(item.quantity, product.unit, field_name='cart', allow_zero=False)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({'cart': f'Invalid quantity for {product.name}.'}) from exc

            if item.quantity < product.min_order_quantity:
                raise serializers.ValidationError({
                    'cart': f'{product.name} requires a minimum order of {product.min_order_quantity}.'
                })
            if not product.is_available or item.quantity > product.stock:
                raise serializers.ValidationError({
                    'cart': f'{product.name} is no longer available in the requested quantity.'
                })
            locked_products.append((item, product))

        subtotal = sum(
            (calculate_line_subtotal(product.price, item.quantity) for item, product in locked_products),
            Decimal('0.00'),
        )
        total_amount = quantize_currency(subtotal + DELIVERY_FEE)
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
                product_name=product.name,
                unit_label=product.formatted_unit,
                price=product.price,
                quantity=cart_item.quantity,
            )
            product.stock = Decimal(str(product.stock)) - Decimal(str(cart_item.quantity))
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
