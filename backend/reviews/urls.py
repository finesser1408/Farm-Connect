from django.urls import path
from . import api_views

urlpatterns = [
    # Platform Testimonials
    path('testimonials/', api_views.testimonials_list_create, name='testimonials-list-create'),
    path('testimonials/mine/', api_views.my_testimonial, name='my-testimonial'),
    
    # Product Reviews
    path('products/<slug:slug>/', api_views.product_reviews_list_create, name='product-reviews-list-create'),
    path('products/<slug:slug>/mine/', api_views.my_product_review, name='my-product-review'),

    # Admin Moderation
    path('admin/testimonials/', api_views.admin_testimonials_moderate, name='admin-testimonials-list'),
    path('admin/testimonials/<int:pk>/', api_views.admin_testimonials_moderate, name='admin-testimonials-detail'),
    path('admin/products/', api_views.admin_product_reviews_moderate, name='admin-product-reviews-list'),
    path('admin/products/<int:pk>/', api_views.admin_product_reviews_moderate, name='admin-product-reviews-detail'),
]
