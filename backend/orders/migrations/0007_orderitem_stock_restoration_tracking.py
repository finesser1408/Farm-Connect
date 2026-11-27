from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_decimal_quantities_and_orderitem_snapshots'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='stock_restored',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='stock_restored_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
