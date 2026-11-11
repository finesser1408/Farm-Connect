from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Order, Cart, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer, UpdateOrderStatusSerializer, OrderItemSerializer
from backend.email_service import email_service
from users.permissions import IsAdmin, IsCustomer


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsCustomer])
def create_order(request):
    """Create an order from cart items"""
    serializer = CreateOrderSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        order = serializer.save()
        
        # Send order confirmation email
        try:
            order_items = [
                {
                    'name': item.product.name,
                    'quantity': item.quantity,
                    'price': float(item.price)
                }
                for item in order.items.all()
            ]
            
            email_result = email_service.send_order_confirmation(
                user_email=order.email,
                user_name=f"{order.first_name} {order.last_name}",
                order_id=order.id,
                order_items=order_items,
                total_amount=float(order.total_amount)
            )
            
            if not email_result['success']:
                # Log the error but don't fail the order creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send order confirmation email: {email_result['message']}")
        
        except Exception as e:
            # Log the error but don't fail the order creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending order confirmation email: {str(e)}")
        
        # Return order details
        order_serializer = OrderSerializer(order)
        return Response(order_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_list(request):
    """Get user's orders"""
    orders = Order.objects.filter(customer=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_order_list(request):
    orders = Order.objects.select_related('customer').prefetch_related(
        'items__product__farmer',
    ).order_by('-created_at')
    return Response(OrderSerializer(orders, many=True).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_detail(request, order_id):
    """Get order details"""
    order = get_object_or_404(Order, id=order_id, customer=request.user)
    serializer = OrderSerializer(order)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_order_status(request, order_id):
    """Update order status (admin only or for specific status changes)"""
    order = get_object_or_404(Order, id=order_id)
    
    # Only allow status updates for the order owner or admin
    if order.customer != request.user and not request.user.is_staff:
        return Response(
            {"detail": "Permission denied"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = UpdateOrderStatusSerializer(data=request.data)
    
    if serializer.is_valid():
        old_status = order.status
        new_status = serializer.validated_data['status']
        
        order.status = new_status
        order.save()
        
        # Send status update email
        try:
            email_result = email_service.send_order_status_update(
                user_email=order.email,
                user_name=f"{order.first_name} {order.last_name}",
                order_id=order.id,
                status=new_status
            )
            
            if not email_result['success']:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send order status update email: {email_result['message']}")
        
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending order status update email: {str(e)}")
        
        return Response(OrderSerializer(order).data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, order_id):
    """Cancel an order"""
    order = get_object_or_404(Order, id=order_id, customer=request.user)
    
    if order.status not in ['pending', 'paid']:
        return Response(
            {"detail": "Cannot cancel order in current status"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    order.status = 'cancelled'
    order.save()
    
    # Send cancellation email
    try:
        email_result = email_service.send_order_status_update(
            user_email=order.email,
            user_name=f"{order.first_name} {order.last_name}",
            order_id=order.id,
            status='cancelled'
        )
        
        if not email_result['success']:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send order cancellation email: {email_result['message']}")
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending order cancellation email: {str(e)}")
    
    return Response(OrderSerializer(order).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def farmer_order_items(request):
    """Get order items for a specific farmer"""
    if request.user.user_type != 'farmer' and not request.user.is_staff:
        return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
    order_items = OrderItem.objects.filter(product__farmer=request.user).order_by('-order__created_at')
    serializer = OrderItemSerializer(order_items, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_order_item_status(request, item_id):
    """Update status of a specific order item (farmer only)"""
    item = get_object_or_404(OrderItem, id=item_id, product__farmer=request.user)

    new_status = request.data.get('status', '').lower()
    valid_statuses = {choice[0] for choice in OrderItem.STATUS_CHOICES}
    if new_status not in valid_statuses:
        return Response({'detail': 'Invalid order item status.'}, status=status.HTTP_400_BAD_REQUEST)
    item.status = new_status
    item.save(update_fields=['status'])
    return Response(OrderItemSerializer(item).data)
