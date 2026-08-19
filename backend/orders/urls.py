from django.urls import path

from . import api_views, order_views

urlpatterns = [
    # Cart endpoints
    path('', api_views.cart_detail, name='cart-detail'),
    path('add/', api_views.add_to_cart, name='cart-add'),
    
    # Order endpoints
    path('orders/', order_views.order_list, name='order-list'),
    path('orders/create/', order_views.create_order, name='create-order'),
    path('orders/<int:order_id>/', order_views.order_detail, name='order-detail'),
    path('orders/<int:order_id>/status/', order_views.update_order_status, name='update-order-status'),
    path('orders/<int:order_id>/cancel/', order_views.cancel_order, name='cancel-order'),
    
    # Farmer specific endpoints
    path('farmer/items/', order_views.farmer_order_items, name='farmer-order-items'),
    path('farmer/items/<int:item_id>/status/', order_views.update_order_item_status, name='update-order-item-status'),
]
