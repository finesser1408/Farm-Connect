from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from django.utils.text import slugify
from .models import APPROVED_CATEGORY_SLUGS, Product, Category
from .serializers import ProductSerializer, CategorySerializer
from users.permissions import IsFarmer


class ProductPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# Removed manual permission check in favor of DRF permission classes


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def products_list_create(request):
    """List all products or create a new product."""
    if request.method == 'GET':
        products = Product.objects.all()
        farmer_filter = request.query_params.get('farmer')
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering not in {'price', '-price', 'created_at', '-created_at', 'name', '-name'}:
            return Response({'detail': 'Invalid ordering value.'}, status=status.HTTP_400_BAD_REQUEST)
        products = products.order_by(ordering)
        available = request.query_params.get('available')
        is_admin = request.user.is_authenticated and (
            request.user.is_staff or request.user.user_type == 'admin'
        )
        if available is not None and available.lower() == 'all':
            if not is_admin:
                return Response({'detail': 'Only admins can view unavailable products.'}, status=status.HTTP_403_FORBIDDEN)
        elif available is not None:
            products = products.filter(is_available=available.lower() in ('1', 'true', 'yes'))
        elif not (farmer_filter == 'me' and request.user.is_authenticated):
            products = products.filter(is_available=True)

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

        # Filtering by farmer
        if farmer_filter == 'me' and request.user.is_authenticated:
            products = products.filter(farmer=request.user)
        elif farmer_filter:
            products = products.filter(farmer__email=farmer_filter)

        paginator = ProductPagination()
        page = paginator.paginate_queryset(products, request)
        if page is not None:
            serializer = ProductSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method == 'POST':
        if not request.user.is_authenticated or (
            request.user.user_type != 'farmer'
            and not request.user.is_staff
            and request.user.user_type != 'admin'
        ):
            return Response({'detail': 'Only farmers can create products.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ProductSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Automatically generate slug
            name = serializer.validated_data.get('name')
            slug = slugify(name)
            
            # Ensure unique slug
            original_slug = slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{original_slug}-{counter}"
                counter += 1
                
            serializer.save(farmer=request.user, slug=slug)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def product_detail(request, slug):
    """Retrieve, update, or delete a product by slug."""
    product = get_object_or_404(Product, slug=slug)

    if request.method == 'GET':
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method in ['PUT', 'PATCH', 'DELETE']:
        if not request.user.is_authenticated or (
            product.farmer != request.user
            and not request.user.is_staff
            and request.user.user_type != 'admin'
        ):
            return Response({'detail': 'You do not have permission to modify this product.'}, status=status.HTTP_403_FORBIDDEN)

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


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def category_list(request):
    """List the approved product categories."""
    categories = Category.objects.filter(slug__in=APPROVED_CATEGORY_SLUGS)
    categories = sorted(
        categories,
        key=lambda category: APPROVED_CATEGORY_SLUGS.index(category.slug),
    )
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
