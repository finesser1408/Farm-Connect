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
        cart_item.quantity += quantity
        cart_item.price = product.price
        cart_item.save()

    serializer = CartSerializer(cart, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)
