from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products.models import Product
from .models import Cart, CartItem, Order, OrderItem
from .serializers import CartSerializer, OrderSerializer, OrderCreateSerializer


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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_order(request):
    cart = get_object_or_404(Cart, customer=request.user)
    if not cart.items.exists():
        return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = OrderCreateSerializer(data=request.data)
    if serializer.is_valid():
        order = Order.objects.create(
            customer=request.user,
            **serializer.validated_data,
            total_amount=cart.total_amount
        )

        # Create order items from cart items
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                price=cart_item.price,
                quantity=cart_item.quantity
            )

        # Clear the cart
        cart.items.all().delete()

        order_serializer = OrderSerializer(order)
        return Response(order_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_orders(request):
    orders = Order.objects.filter(customer=request.user)
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_farmer_orders(request):
    # Assuming user has a user_type field or similar to identify farmers
    if not hasattr(request.user, 'user_type') or request.user.user_type != 'farmer':
        return Response({'detail': 'Only farmers can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)

    # Get orders for products owned by this farmer
    orders = Order.objects.filter(items__product__farmer=request.user).distinct()
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_order_status(request, order_id):
    order = get_object_or_404(Order, id=order_id)
    
    # Check if user is the farmer of the products in the order or admin
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'farmer' and 
            order.items.filter(product__farmer=request.user).exists()) and not request.user.is_staff:
        return Response({'detail': 'You do not have permission to update this order.'}, status=status.HTTP_403_FORBIDDEN)

    status_value = request.data.get('status')
    if status_value not in dict(Order.STATUS_CHOICES):
        return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    order.status = status_value
    order.save()
    serializer = OrderSerializer(order)
    return Response(serializer.data, status=status.HTTP_200_OK)
