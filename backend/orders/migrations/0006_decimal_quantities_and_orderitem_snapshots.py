from decimal import Decimal
from django.db import migrations, models


def backfill_orderitem_product_names(apps, schema_editor):
    OrderItem = apps.get_model('orders', 'OrderItem')
    db_alias = schema_editor.connection.alias
    for item in OrderItem.objects.using(db_alias).select_related('product').all():
        if not item.product_name and item.product_id:
            item.product_name = item.product.name
            item.save(using=db_alias, update_fields=['product_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_alter_order_customer_alter_orderitem_product'),
        ('products', '0007_product_unit_fields_and_decimal_stock'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='product_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='unit_label',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AlterField(
            model_name='cartitem',
            name='quantity',
            field=models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=10),
        ),
        migrations.AlterField(
            model_name='orderitem',
            name='quantity',
            field=models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=10),
        ),
        migrations.RunPython(backfill_orderitem_product_names, migrations.RunPython.noop),
    ]
