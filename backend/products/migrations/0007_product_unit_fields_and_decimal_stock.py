from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_alter_product_farmer'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='min_order_quantity',
            field=models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=10),
        ),
        migrations.AddField(
            model_name='product',
            name='unit',
            field=models.CharField(
                blank=True,
                choices=[
                    ('kg', 'Kilogram'),
                    ('l', 'Litre'),
                    ('g', 'Gram'),
                    ('piece', 'Piece'),
                    ('head', 'Head'),
                    ('bunch', 'Bunch'),
                    ('bundle', 'Bundle'),
                    ('tray', 'Tray'),
                    ('crate', 'Crate'),
                    ('bag', 'Bag'),
                    ('bucket', 'Bucket'),
                    ('bird', 'Bird'),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='unit_description',
            field=models.CharField(blank=True, default='', max_length=40),
        ),
        migrations.AlterField(
            model_name='product',
            name='stock',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10),
        ),
    ]
