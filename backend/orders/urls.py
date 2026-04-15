from django.urls import path

from . import api_views

urlpatterns = [
    path('', api_views.cart_detail, name='cart-detail'),
    path('add/', api_views.add_to_cart, name='cart-add'),
]
