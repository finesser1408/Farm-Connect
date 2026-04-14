from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Product
from .serializers import ProductSerializer


def _ensure_farmer_permission(request, product=None):
    if not request.user.is_authenticated:
        return Response(
            {'detail': 'Authentication credentials were not provided.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not getattr(request.user, 'is_farmer', False) or (product is not None and product.farmer != request.user):
        return Response(
            {'detail': 'You do not have permission to modify this product.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    return None


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def products_list_create(request):
    """List all products or create a new product."""
    if request.method == 'GET':
        products = Product.objects.all().order_by('-created_at')
        available = request.query_params.get('available')
        if available is not None:
            products = products.filter(is_available=available.lower() in ('1', 'true', 'yes'))

        search = request.query_params.get('search')
        if search:
            products = products.filter(name__icontains=search)

        category = request.query_params.get('category')
        if category:
            products = products.filter(category__slug__iexact=category)

        location = request.query_params.get('location')
        if location:
            products = products.filter(farmer__farmer_profile__location__icontains=location)

        price = request.query_params.get('price')
        if price:
            try:
                products = products.filter(price=Decimal(price))
            except InvalidOperation:
                return Response({'detail': 'Invalid price filter.'}, status=status.HTTP_400_BAD_REQUEST)

        min_price = request.query_params.get('min_price')
        if min_price:
            try:
                products = products.filter(price__gte=Decimal(min_price))
            except InvalidOperation:
                return Response({'detail': 'Invalid min_price filter.'}, status=status.HTTP_400_BAD_REQUEST)

        max_price = request.query_params.get('max_price')
        if max_price:
            try:
                products = products.filter(price__lte=Decimal(max_price))
            except InvalidOperation:
                return Response({'detail': 'Invalid max_price filter.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    error = _ensure_farmer_permission(request)
    if error:
        return error

    serializer = ProductSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(farmer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def product_detail(request, slug):
    """Retrieve, update, or delete a product by slug."""
    product = get_object_or_404(Product, slug=slug)

    if request.method == 'GET':
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    error = _ensure_farmer_permission(request, product)
    if error:
        return error

    if request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = ProductSerializer(product, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        product.delete()
        return Response(
            {'message': 'Product deleted successfully.'},
            status=status.HTTP_204_NO_CONTENT,
        )
