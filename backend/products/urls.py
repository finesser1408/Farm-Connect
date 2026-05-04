from django.urls import path
from . import api_views

urlpatterns = [
    path('', api_views.products_list_create, name='product-list-create'),
    path('categories/', api_views.category_list, name='category-list'),
    path('<slug:slug>/', api_views.product_detail, name='product-detail'),
]
