from django.db import migrations
from django.utils.text import slugify


CATEGORIES = (
    ('Vegetables', 'vegetables', ('vegetable',)),
    ('Fruits', 'fruits', ('fruit',)),
    ('Grains and Cereals', 'grains-and-cereals', ('grains', 'cereals', 'grains-cereals')),
    ('Legumes and Pulses', 'legumes-and-pulses', ('legumes', 'pulses', 'legumes-pulses')),
    ('Root and Tuber crops', 'root-and-tuber-crops', ('root-and-tuber', 'tubers', 'root-crops')),
    ('Oilseeds', 'oilseeds', ('oil-seeds', 'oilseed')),
    ('Livestock and Poultry', 'livestock-and-poultry', ('livestock', 'poultry', 'livestock-poultry')),
)


def seed_approved_categories(apps, schema_editor):
    Category = apps.get_model('products', 'Category')
    database = schema_editor.connection.alias

    for name, slug, aliases in CATEGORIES:
        category = Category.objects.using(database).filter(slug=slug).first()
        if category is None:
            category = Category.objects.using(database).filter(name__iexact=name).first()
        if category is None:
            alias_slugs = (*aliases, *(slugify(alias) for alias in aliases))
            category = (
                Category.objects.using(database)
                .filter(slug__in=alias_slugs)
                .order_by('id')
                .first()
            )
            if category is None:
                for alias in aliases:
                    category = (
                        Category.objects.using(database)
                        .filter(name__iexact=alias)
                        .order_by('id')
                        .first()
                    )
                    if category is not None:
                        break

        if category is None:
            Category.objects.using(database).create(name=name, slug=slug)
        else:
            category.name = name
            category.slug = slug
            category.save(using=database, update_fields=('name', 'slug'))


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0003_alter_product_image_alter_product_stock'),
    ]

    operations = [
        migrations.RunPython(seed_approved_categories, migrations.RunPython.noop),
    ]
