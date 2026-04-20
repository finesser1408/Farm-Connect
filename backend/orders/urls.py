from django.urls import path

from . import api_views

urlpatterns = [
    path('', api_views.cart_detail, name='cart-detail'),
    path('add/', api_views.add_to_cart, name='cart-add'),
    path('orders/', api_views.get_user_orders, name='user-orders'),
    path('orders/create/', api_views.create_order, name='create-order'),
    path('farmer/orders/', api_views.get_farmer_orders, name='farmer-orders'),
    path('orders/<int:order_id>/status/', api_views.update_order_status, name='update-order-status'),
]
