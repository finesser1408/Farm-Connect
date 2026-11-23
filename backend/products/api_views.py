from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from users.models import AdminAuditLog
from users.permissions import (
    IsAdmin,
    get_farmer_block_reason,
    is_admin_user,
    is_approved_farmer_user,
    is_product_publicly_visible,
    public_purchasable_product_q,
)
from .models import APPROVED_CATEGORY_SLUGS, Category, Product
from .serializers import CategorySerializer, ProductSerializer


class ProductPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


def _generate_unique_slug(name):
    base_slug = slugify(name) or 'product'
    slug = base_slug
    counter = 1
    while Product.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def _resolve_admin_target_farmer(raw_farmer_id):
    if raw_farmer_id in (None, ''):
        raise ValidationError({'farmer_id': ['A valid approved farmer must be selected.']})
    try:
        farmer_id = int(raw_farmer_id)
    except (TypeError, ValueError) as exc:
        raise ValidationError({'farmer_id': ['Invalid farmer identifier.']}) from exc

    User = get_user_model()
    farmer_user = User.objects.select_related('farmer_profile').filter(pk=farmer_id).first()
    if not farmer_user or farmer_user.user_type != 'farmer':
        raise ValidationError({'farmer_id': ['Selected user is not a farmer account.']})
    try:
        farmer_profile = farmer_user.farmer_profile
    except ObjectDoesNotExist as exc:
        raise ValidationError({'farmer_id': ['Selected farmer does not have a farmer profile.']}) from exc

    if not farmer_user.is_active:
        raise ValidationError({'farmer_id': ['Cannot create products for an inactive farmer account.']})
    if farmer_profile.status != 'approved':
        raise ValidationError({
            'farmer_id': [f'Cannot create products for a {farmer_profile.status} farmer. Approve the farmer first.']
        })
    return farmer_user


def _extract_reason(request):
    if isinstance(request.data, dict) or hasattr(request.data, 'get'):
        return str(request.data.get('reason') or '').strip()
    return ''


def _apply_moderation_status(product, new_status, actor, reason=''):
    previous_status = product.moderation_status
    product.moderation_status = new_status
    product.moderated_by = actor
    product.moderated_at = timezone.now()
    product.moderation_reason = reason
    product.save(
        update_fields=[
            'moderation_status',
            'moderated_by',
            'moderated_at',
            'moderation_reason',
            'updated_at',
        ]
    )
    return previous_status


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def products_list_create(request):
    """List products with public/admin moderation scoping, or create a product."""
    if request.method == 'GET':
        products = Product.objects.select_related(
            'farmer',
            'farmer__farmer_profile',
            'category',
            'moderated_by',
        )
        farmer_filter = request.query_params.get('farmer')
        farmer_id_filter = request.query_params.get('farmer_id')
        moderation_param = request.query_params.get('moderation_status')
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering not in {'price', '-price', 'created_at', '-created_at', 'name', '-name'}:
            return Response({'detail': 'Invalid ordering value.'}, status=status.HTTP_400_BAD_REQUEST)
        products = products.order_by(ordering)
        available = request.query_params.get('available')
        is_admin = is_admin_user(request.user)
        is_own_farmer_view = farmer_filter == 'me' and request.user.is_authenticated

        if available is not None and available.lower() == 'all':
            if not is_admin:
                return Response({'detail': 'Only admins can view unavailable products.'}, status=status.HTTP_403_FORBIDDEN)
        elif available is not None:
            products = products.filter(is_available=available.lower() in ('1', 'true', 'yes'))
        elif not is_own_farmer_view:
            products = products.filter(is_available=True)

        if moderation_param is not None and moderation_param != '':
            normalized_moderation = moderation_param.strip().lower()
            if normalized_moderation not in {'all', 'active', 'hidden', 'removed'}:
                return Response({'detail': 'Invalid moderation_status filter.'}, status=status.HTTP_400_BAD_REQUEST)
            if normalized_moderation != 'active' and not is_admin:
                return Response({'detail': 'Only admins can view moderated products.'}, status=status.HTTP_403_FORBIDDEN)
            if normalized_moderation != 'all':
                products = products.filter(moderation_status=normalized_moderation)
        elif is_admin and available is not None and available.lower() == 'all':
            pass
        elif is_own_farmer_view:
            products = products.exclude(moderation_status='removed')
        else:
            products = products.filter(moderation_status='active')

        if not is_admin and not is_own_farmer_view:
            products = products.filter(public_purchasable_product_q())

        search = request.query_params.get('search')
        if search:
            if is_admin:
                products = products.filter(
                    Q(name__icontains=search)
                    | Q(farmer__first_name__icontains=search)
                    | Q(farmer__last_name__icontains=search)
                    | Q(farmer__email__icontains=search)
                    | Q(farmer__farmer_profile__farm_name__icontains=search)
                )
            else:
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

        if farmer_id_filter:
            try:
                products = products.filter(farmer_id=int(farmer_id_filter))
            except (TypeError, ValueError):
                return Response({'detail': 'Invalid farmer_id filter.'}, status=status.HTTP_400_BAD_REQUEST)

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
        is_admin = is_admin_user(request.user)
        if not request.user.is_authenticated or (
            request.user.user_type != 'farmer' and not is_admin
        ):
            return Response({'detail': 'Only farmers can create products.'}, status=status.HTTP_403_FORBIDDEN)

        if request.user.user_type == 'farmer' and not is_admin and not is_approved_farmer_user(request.user):
            return Response({'detail': get_farmer_block_reason(request.user)}, status=status.HTTP_403_FORBIDDEN)

        target_farmer = _resolve_admin_target_farmer(request.data.get('farmer_id')) if is_admin else request.user

        serializer = ProductSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            slug = _generate_unique_slug(serializer.validated_data.get('name'))
            product = serializer.save(farmer=target_farmer, slug=slug, moderation_status='active')
            if is_admin:
                AdminAuditLog.log(
                    actor=request.user,
                    action='admin_create_product',
                    target_type='product',
                    target_id=product.pk,
                    target_repr=product.name,
                    details={
                        'farmer_id': target_farmer.id,
                        'farmer_email': target_farmer.email,
                        'category_id': product.category_id,
                        'price': str(product.price),
                        'stock': product.stock,
                    },
                )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def product_detail(request, slug):
    """Retrieve, update, or soft-remove a product by slug."""
    product = get_object_or_404(
        Product.objects.select_related(
            'farmer',
            'farmer__farmer_profile',
            'category',
            'moderated_by',
        ),
        slug=slug,
    )

    is_admin = is_admin_user(request.user)
    is_owner = bool(request.user.is_authenticated and product.farmer == request.user)

    if request.method == 'GET':
        if not is_admin:
            if is_owner:
                if product.moderation_status == 'removed':
                    return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)
            elif not is_product_publicly_visible(product):
                return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method in ['PUT', 'PATCH', 'DELETE']:
        if not request.user.is_authenticated or (not is_owner and not is_admin):
            return Response({'detail': 'You do not have permission to modify this product.'}, status=status.HTTP_403_FORBIDDEN)
        if is_owner and not is_admin and request.user.user_type == 'farmer' and not is_approved_farmer_user(request.user):
            return Response({'detail': get_farmer_block_reason(request.user)}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ['PUT', 'PATCH']:
        if product.moderation_status == 'removed':
            return Response({'detail': 'Removed products cannot be edited.'}, status=status.HTTP_400_BAD_REQUEST)
        partial = request.method == 'PATCH'
        before_snapshot = {
            'name': product.name,
            'description': product.description,
            'price': str(product.price),
            'stock': product.stock,
            'category': product.category_id,
            'image': product.image.name if product.image else '',
        }
        serializer = ProductSerializer(product, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            updated_product = serializer.save()
            if is_admin:
                after_snapshot = {
                    'name': updated_product.name,
                    'description': updated_product.description,
                    'price': str(updated_product.price),
                    'stock': updated_product.stock,
                    'category': updated_product.category_id,
                    'image': updated_product.image.name if updated_product.image else '',
                }
                changed_fields = [
                    field for field, old_val in before_snapshot.items()
                    if after_snapshot.get(field) != old_val
                ]
                AdminAuditLog.log(
                    actor=request.user,
                    action='admin_update_product',
                    target_type='product',
                    target_id=updated_product.pk,
                    target_repr=updated_product.name,
                    details={
                        'farmer_id': updated_product.farmer_id,
                        'updated_fields': changed_fields,
                    },
                )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if product.moderation_status == 'removed':
            return Response({'detail': 'Product is already removed.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = _extract_reason(request)
        previous_status = _apply_moderation_status(product, 'removed', request.user, reason)
        if is_admin:
            AdminAuditLog.log(
                actor=request.user,
                action='remove_product',
                target_type='product',
                target_id=product.pk,
                target_repr=product.name,
                details={
                    'farmer_id': product.farmer_id,
                    'previous_status': previous_status,
                    'new_status': 'removed',
                    'reason': reason,
                },
            )
        serializer = ProductSerializer(product, context={'request': request})
        return Response(
            {
                'detail': 'Product removed successfully.',
                'product': serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@api_view(['PATCH', 'POST'])
@permission_classes([IsAdmin])
def product_hide(request, slug):
    """Hide a product from public marketplace listings without deleting it."""
    product = get_object_or_404(
        Product.objects.select_related('farmer', 'farmer__farmer_profile', 'category', 'moderated_by'),
        slug=slug,
    )
    if product.moderation_status == 'removed':
        return Response({'detail': 'Removed products cannot be hidden.'}, status=status.HTTP_400_BAD_REQUEST)
    if product.moderation_status == 'hidden':
        return Response({'detail': 'Product is already hidden.'}, status=status.HTTP_400_BAD_REQUEST)

    reason = _extract_reason(request)
    previous_status = _apply_moderation_status(product, 'hidden', request.user, reason)
    AdminAuditLog.log(
        actor=request.user,
        action='hide_product',
        target_type='product',
        target_id=product.pk,
        target_repr=product.name,
        details={
            'farmer_id': product.farmer_id,
            'previous_status': previous_status,
            'new_status': 'hidden',
            'reason': reason,
        },
    )
    serializer = ProductSerializer(product, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH', 'POST'])
@permission_classes([IsAdmin])
def product_restore(request, slug):
    """Restore a hidden product back to active moderation status."""
    product = get_object_or_404(
        Product.objects.select_related('farmer', 'farmer__farmer_profile', 'category', 'moderated_by'),
        slug=slug,
    )
    if product.moderation_status == 'removed':
        return Response({'detail': 'Removed products cannot be restored.'}, status=status.HTTP_400_BAD_REQUEST)
    if product.moderation_status == 'active':
        return Response({'detail': 'Product is already active.'}, status=status.HTTP_400_BAD_REQUEST)

    reason = _extract_reason(request)
    previous_status = _apply_moderation_status(product, 'active', request.user, reason)
    AdminAuditLog.log(
        actor=request.user,
        action='restore_product',
        target_type='product',
        target_id=product.pk,
        target_repr=product.name,
        details={
            'farmer_id': product.farmer_id,
            'previous_status': previous_status,
            'new_status': 'active',
            'reason': reason,
        },
    )
    serializer = ProductSerializer(product, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH', 'POST'])
@permission_classes([IsAdmin])
def product_remove(request, slug):
    """Safely soft-remove a product while preserving historical orders and reviews."""
    product = get_object_or_404(
        Product.objects.select_related('farmer', 'farmer__farmer_profile', 'category', 'moderated_by'),
        slug=slug,
    )
    if product.moderation_status == 'removed':
        return Response({'detail': 'Product is already removed.'}, status=status.HTTP_400_BAD_REQUEST)

    reason = _extract_reason(request)
    previous_status = _apply_moderation_status(product, 'removed', request.user, reason)
    AdminAuditLog.log(
        actor=request.user,
        action='remove_product',
        target_type='product',
        target_id=product.pk,
        target_repr=product.name,
        details={
            'farmer_id': product.farmer_id,
            'previous_status': previous_status,
            'new_status': 'removed',
            'reason': reason,
        },
    )
    serializer = ProductSerializer(product, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


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
