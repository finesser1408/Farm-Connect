from decimal import Decimal
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products.models import Product
from products.validators import (
    PACKAGED_UNITS_REQUIRING_DESCRIPTION,
    parse_strict_decimal,
    validate_quantity_for_unit,
)
from users.permissions import is_product_publicly_visible
from .models import Cart, CartItem
from .serializers import CartSerializer


def _parse_and_validate_cart_quantity(raw_quantity, product):
    try:
        quantity = parse_strict_decimal(raw_quantity, field_name='detail')
    except serializers.ValidationError as exc:
        detail_msg = exc.detail.get('detail') if isinstance(exc.detail, dict) else 'Invalid quantity.'
        if isinstance(detail_msg, list):
            detail_msg = detail_msg[0]
        return None, Response({'detail': str(detail_msg)}, status=status.HTTP_400_BAD_REQUEST)

    if quantity <= Decimal('0.00'):
        return None, Response({'detail': 'Quantity must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_quantity_for_unit(quantity, product.unit, field_name='detail', allow_zero=False)
    except serializers.ValidationError as exc:
        detail_msg = exc.detail.get('detail') if isinstance(exc.detail, dict) else 'Invalid quantity for this selling unit.'
        if isinstance(detail_msg, list):
            detail_msg = detail_msg[0]
        return None, Response({'detail': str(detail_msg)}, status=status.HTTP_400_BAD_REQUEST)

    return quantity, None


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cart_detail(request):
    cart, _ = Cart.objects.get_or_create(customer=request.user)
    serializer = CartSerializer(cart, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get('product_id')
    raw_quantity = request.data.get('quantity', 1)

    product = get_object_or_404(
        Product.objects.select_related('farmer', 'farmer__farmer_profile'),
        id=product_id,
    )
    quantity, error_response = _parse_and_validate_cart_quantity(raw_quantity, product)
    if error_response is not None:
        return error_response

    if not product.is_available or not is_product_publicly_visible(product):
        return Response({'detail': 'This product is currently unavailable for purchase.'}, status=status.HTTP_400_BAD_REQUEST)
    if product.unit in PACKAGED_UNITS_REQUIRING_DESCRIPTION and not (product.unit_description or '').strip():
        return Response(
            {'detail': 'This product listing has an incomplete package description and cannot be purchased right now.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cart, _ = Cart.objects.get_or_create(customer=request.user)
    existing_item = CartItem.objects.filter(cart=cart, product=product).first()
    new_total_quantity = quantity + (existing_item.quantity if existing_item else Decimal('0.00'))

    try:
        validate_quantity_for_unit(new_total_quantity, product.unit, field_name='detail', allow_zero=False)
    except serializers.ValidationError as exc:
        detail_msg = exc.detail.get('detail') if isinstance(exc.detail, dict) else 'Invalid cart quantity for this selling unit.'
        if isinstance(detail_msg, list):
            detail_msg = detail_msg[0]
        return Response({'detail': str(detail_msg)}, status=status.HTTP_400_BAD_REQUEST)

    if new_total_quantity < product.min_order_quantity:
        return Response(
            {'detail': f'Minimum order quantity for this product is {product.min_order_quantity}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if new_total_quantity > product.stock:
        return Response({'detail': 'Requested quantity exceeds available stock.'}, status=status.HTTP_400_BAD_REQUEST)

    if existing_item:
        existing_item.quantity = new_total_quantity
        existing_item.price = product.price
        existing_item.save()
    else:
        CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=new_total_quantity,
            price=product.price,
        )

    serializer = CartSerializer(cart, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def cart_item_detail(request, product_id):
    cart, _ = Cart.objects.get_or_create(customer=request.user)

    if request.method == 'DELETE':
        get_object_or_404(CartItem, cart=cart, product_id=product_id).delete()
    else:
        product = get_object_or_404(
            Product.objects.select_related('farmer', 'farmer__farmer_profile'),
            id=product_id,
        )
        raw_quantity = request.data.get('quantity', 0)
        quantity, error_response = _parse_and_validate_cart_quantity(raw_quantity, product)
        if error_response is not None:
            return error_response

        if not product.is_available or not is_product_publicly_visible(product):
            return Response({'detail': 'This product is currently unavailable for purchase.'}, status=status.HTTP_400_BAD_REQUEST)
        if product.unit in PACKAGED_UNITS_REQUIRING_DESCRIPTION and not (product.unit_description or '').strip():
            return Response(
                {'detail': 'This product listing has an incomplete package description and cannot be purchased right now.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if quantity < product.min_order_quantity:
            return Response(
                {'detail': f'Minimum order quantity for this product is {product.min_order_quantity}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if quantity > product.stock:
            return Response({'detail': 'Requested quantity exceeds available stock.'}, status=status.HTTP_400_BAD_REQUEST)
        CartItem.objects.update_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity, 'price': product.price},
        )

    return Response(CartSerializer(cart, context={'request': request}).data)
