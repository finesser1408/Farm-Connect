from django.urls import path
from . import api_views

urlpatterns = [
    path('', api_views.products_list_create, name='product-list-create'),
    path('categories/', api_views.category_list, name='category-list'),
    path('<slug:slug>/hide/', api_views.product_hide, name='product-hide'),
    path('<slug:slug>/restore/', api_views.product_restore, name='product-restore'),
    path('<slug:slug>/remove/', api_views.product_remove, name='product-remove'),
    path('<slug:slug>/', api_views.product_detail, name='product-detail'),
]
