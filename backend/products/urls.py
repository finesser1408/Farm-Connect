from django.urls import path
from . import api_views

urlpatterns = [
    path('', api_views.products_list_create, name='product-list-create'),
    path('<slug:slug>/', api_views.product_detail, name='product-detail'),
]
