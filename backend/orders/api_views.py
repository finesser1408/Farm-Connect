from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products.models import Product
from .models import Cart, CartItem
from .serializers import CartSerializer


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
    quantity = request.data.get('quantity', 1)

    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return Response({'detail': 'Quantity must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

    if quantity < 1:
        return Response({'detail': 'Quantity must be at least 1.'}, status=status.HTTP_400_BAD_REQUEST)

    product = get_object_or_404(Product, id=product_id, is_available=True)
    cart, _ = Cart.objects.get_or_create(customer=request.user)
    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={'quantity': quantity, 'price': product.price},
    )

    if not created:
        quantity += cart_item.quantity
    if quantity > product.stock:
        if created:
            cart_item.delete()
        return Response({'detail': 'Requested quantity exceeds available stock.'}, status=status.HTTP_400_BAD_REQUEST)
    if not created:
        cart_item.quantity = quantity
        cart_item.price = product.price
    cart_item.save()

    serializer = CartSerializer(cart, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def cart_item_detail(request, product_id):
    cart, _ = Cart.objects.get_or_create(customer=request.user)

    if request.method == 'DELETE':
        get_object_or_404(CartItem, cart=cart, product_id=product_id).delete()
    else:
        try:
            quantity = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'Quantity must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1:
            return Response({'detail': 'Quantity must be at least 1.'}, status=status.HTTP_400_BAD_REQUEST)
        product = get_object_or_404(Product, id=product_id, is_available=True)
        if quantity > product.stock:
            return Response({'detail': 'Requested quantity exceeds available stock.'}, status=status.HTTP_400_BAD_REQUEST)
        CartItem.objects.update_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity, 'price': product.price},
        )

    return Response(CartSerializer(cart, context={'request': request}).data)
