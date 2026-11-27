from decimal import Decimal
from django.db import models
from django.conf import settings
from products.models import Product
from products.validators import calculate_line_subtotal, quantize_currency


class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, default='')
    address = models.CharField(max_length=250)
    postal_code = models.CharField(max_length=20)
    city = models.CharField(max_length=100)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f'Order {self.id}'


class OrderItem(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    product_name = models.CharField(max_length=255, blank=True, default='')
    unit_label = models.CharField(max_length=64, blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    stock_restored = models.BooleanField(default=False)
    stock_restored_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return str(self.id)

    def get_cost(self):
        return calculate_line_subtotal(self.price, self.quantity)


class Cart(models.Model):
    customer = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'

    def __str__(self):
        return f'Cart for {self.customer.email}'

    @property
    def total_amount(self):
        total = sum((item.total_price for item in self.items.all()), Decimal('0.00'))
        return quantize_currency(total)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('cart', 'product')

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'

    @property
    def current_price(self):
        if self.product_id and getattr(self, 'product', None) is not None:
            return self.product.price
        return self.price

    @property
    def total_price(self):
        return calculate_line_subtotal(self.current_price, self.quantity)

    def save(self, *args, **kwargs):
        if not self.price:
            self.price = self.product.price
        super().save(*args, **kwargs)
