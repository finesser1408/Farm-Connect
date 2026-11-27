
from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products.models import Product
from .models import Order, Cart, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer, UpdateOrderStatusSerializer, OrderItemSerializer
from backend.email_service import email_service
from users.permissions import IsAdmin, IsCustomer

ALLOWED_ORDER_STATUS_TRANSITIONS = {
    'pending': {'paid', 'shipped', 'cancelled'},
    'paid': {'shipped', 'cancelled'},
    'shipped': {'delivered'},
    'delivered': set(),
    'cancelled': set(),
}

ALLOWED_ORDER_ITEM_STATUS_TRANSITIONS = {
    'pending': {'accepted', 'rejected'},
    'accepted': {'shipped'},
    'shipped': {'delivered'},
    'rejected': set(),
    'delivered': set(),
}


def _is_active_admin(user):
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and (getattr(user, 'is_admin_role', False) or user.is_staff)
    )


def _cancel_order_and_restore_stock(order_id):
    """
    Atomically cancel an eligible pre-shipment order and restore stock once per OrderItem.
    Locks Order, OrderItems, and Products in deterministic primary-key order.
    """
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order_id)
        if order.status not in ('pending', 'paid'):
            raise serializers.ValidationError({'detail': 'Cannot cancel order in current status'})

        items = list(order.items.select_for_update().order_by('product_id', 'id'))
        if any(item.status in ('shipped', 'delivered') for item in items):
            raise serializers.ValidationError(
                {'detail': 'Cannot cancel order after items have been shipped or delivered.'}
            )

        product_ids = sorted({item.product_id for item in items})
        products_by_id = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=product_ids).order_by('id')
        }

        now = timezone.now()
        modified_product_ids = set()
        for item in items:
            if not item.stock_restored:
                product = products_by_id.get(item.product_id)
                if product is not None:
                    product.stock = Decimal(str(product.stock)) + Decimal(str(item.quantity))
                    modified_product_ids.add(product.id)
                item.stock_restored = True
                item.stock_restored_at = now
                item.save(update_fields=['stock_restored', 'stock_restored_at'])

        for product_id in sorted(modified_product_ids):
            products_by_id[product_id].save(update_fields=['stock', 'is_available', 'updated_at'])

        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])
        return order



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
                    'name': item.product_name or item.product.name,
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
    """Update order status with strict role and lifecycle transition checks."""
    order = get_object_or_404(Order, id=order_id)
    is_admin = _is_active_admin(request.user)

    if order.customer != request.user and not is_admin:
        return Response(
            {"detail": "Permission denied"},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = UpdateOrderStatusSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_status = serializer.validated_data['status']

    # Non-admin customers may only request cancellation of their own eligible orders
    if not is_admin and new_status != 'cancelled':
        return Response(
            {"detail": "Permission denied"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if new_status == 'cancelled':
        try:
            order = _cancel_order_and_restore_stock(order.id)
        except serializers.ValidationError as exc:
            detail = exc.detail if isinstance(exc.detail, dict) else {'detail': 'Cannot cancel order in current status'}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
    else:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.id)
            allowed_targets = ALLOWED_ORDER_STATUS_TRANSITIONS.get(order.status, set())
            if new_status not in allowed_targets:
                return Response(
                    {"detail": f"Cannot transition order from '{order.status}' to '{new_status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            order.status = new_status
            order.save(update_fields=['status', 'updated_at'])

    # Send status update email
    try:
        email_result = email_service.send_order_status_update(
            user_email=order.email,
            user_name=f"{order.first_name} {order.last_name}",
            order_id=order.id,
            status=new_status,
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, order_id):
    """Cancel an eligible pre-shipment order and restore stock idempotently."""
    order = get_object_or_404(Order, id=order_id)
    if order.customer != request.user and not _is_active_admin(request.user):
        return Response(
            {"detail": "Permission denied"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        order = _cancel_order_and_restore_stock(order.id)
    except serializers.ValidationError as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {"detail": "Cannot cancel order in current status"}
        return Response(detail, status=status.HTTP_400_BAD_REQUEST)

    # Send cancellation email
    try:
        email_result = email_service.send_order_status_update(
            user_email=order.email,
            user_name=f"{order.first_name} {order.last_name}",
            order_id=order.id,
            status='cancelled',
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

    order_items = OrderItem.objects.select_related('order', 'product').filter(
        product__farmer=request.user,
    ).order_by('-order__created_at')
    serializer = OrderItemSerializer(order_items, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_order_item_status(request, item_id):
    """Update status of a specific order item (farmer only) with forward-only transition checks."""
    item = get_object_or_404(OrderItem.objects.select_related('order', 'product'), id=item_id, product__farmer=request.user)

    new_status = (request.data.get('status') or '').strip().lower()
    valid_statuses = {choice[0] for choice in OrderItem.STATUS_CHOICES}
    if new_status not in valid_statuses:
        return Response({'detail': 'Invalid order item status.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(pk=item.order_id)
        locked_item = OrderItem.objects.select_for_update().get(pk=item.id)

        if locked_order.status in ('cancelled', 'delivered'):
            return Response(
                {'detail': f"Cannot update item status when parent order is '{locked_order.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_targets = ALLOWED_ORDER_ITEM_STATUS_TRANSITIONS.get(locked_item.status, set())
        if new_status not in allowed_targets:
            return Response(
                {'detail': f"Cannot transition order item from '{locked_item.status}' to '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        locked_item.status = new_status
        locked_item.save(update_fields=['status'])

    return Response(OrderItemSerializer(locked_item).data)
