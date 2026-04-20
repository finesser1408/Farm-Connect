from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Cart, CartItem
from .serializers import (
    CartSerializer, CartItemSerializer, CartItemUpdateSerializer,
    CartItemUpdateQuantitySerializer, CartItemDetailSerializer
)


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer

    @action(detail=True, methods=['post'], url_path='add-item')
    def add_item(self, request, pk=None):
        cart = self.get_object()
        serializer = CartItemUpdateSerializer(
            data=request.data,
            context={'cart': cart}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='remove-item')
    def remove_item(self, request, pk=None):
        cart = self.get_object()
        product_id = request.data.get('product_id')

        try:
            item = cart.items.get(product_id=product_id)
            item.delete()
            return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
        except CartItem.DoesNotExist:
            return Response(
                {"error": "Item not found in cart"},
                status=status.HTTP_404_NOT_FOUND
            )


class CartItemViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A simple ViewSet for viewing cart items.
    'ReadOnlyModelViewSet' automatically provides 'list' and 'retrieve' actions.
    """
    serializer_class = CartItemDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Ensure users can only see items in their own cart
        return CartItem.objects.filter(cart__customer=self.request.user)