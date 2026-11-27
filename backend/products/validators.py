from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from rest_framework import serializers


TWOPLACES = Decimal('0.01')

CONTINUOUS_UNITS = (
    'kg',
    'l',
)

COUNTABLE_UNITS = (
    'g',
    'piece',
    'head',
    'bunch',
    'bundle',
    'tray',
    'crate',
    'bag',
    'bucket',
    'bird',
)

PACKAGED_UNITS_REQUIRING_DESCRIPTION = (
    'tray',
    'crate',
    'bag',
    'bucket',
)

UNIT_CHOICES = (
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
)

VALID_UNIT_CODES = {code for code, _ in UNIT_CHOICES}
UNIT_DISPLAY_LABELS = dict(UNIT_CHOICES)
UNIT_SHORT_LABELS = {
    'kg': 'kg',
    'l': 'L',
    'g': 'g',
    'piece': 'piece',
    'head': 'head',
    'bunch': 'bunch',
    'bundle': 'bundle',
    'tray': 'tray',
    'crate': 'crate',
    'bag': 'bag',
    'bucket': 'bucket',
    'bird': 'bird',
}


def is_continuous_unit(unit):
    return bool(unit and unit in CONTINUOUS_UNITS)


def is_countable_unit(unit):
    return not is_continuous_unit(unit)


def format_unit_label(unit, unit_description=''):
    """
    Build a concise human-readable unit label such as:
    - "kg"
    - "L"
    - "10 kg bag"
    - "30 eggs tray"
    Returns "" when unit is None/blank (legacy pre-V1 records).
    """
    if not unit:
        return ''
    short_unit = UNIT_SHORT_LABELS.get(unit, unit)
    desc = (unit_description or '').strip()
    if desc:
        return f"{desc} {short_unit}"
    return short_unit


def quantize_currency(value):
    """Round a Decimal monetary value to 2 decimal places using ROUND_HALF_UP."""
    return Decimal(str(value)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def calculate_line_subtotal(unit_price, quantity):
    """Multiply unit_price * quantity in pure Decimal and round to 0.01 with ROUND_HALF_UP."""
    price_dec = Decimal(str(unit_price))
    qty_dec = Decimal(str(quantity))
    return (price_dec * qty_dec).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def parse_strict_decimal(raw_value, *, field_name='quantity', max_digits=10, decimal_places=2):
    """
    Parse a numeric input into a Decimal without silent truncation or float precision loss.
    Rejects booleans, NaN, Infinity, malformed strings, and values exceeding decimal_places.
    """
    if raw_value is None or raw_value == '' or isinstance(raw_value, bool):
        raise serializers.ValidationError({field_name: 'A valid number is required.'})

    if isinstance(raw_value, float):
        if not (raw_value == raw_value and abs(raw_value) != float('inf')):
            raise serializers.ValidationError({field_name: 'Enter a finite number.'})
        raw_str = str(raw_value)
    else:
        raw_str = str(raw_value).strip()

    if not raw_str:
        raise serializers.ValidationError({field_name: 'A valid number is required.'})

    try:
        dec = Decimal(raw_str)
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise serializers.ValidationError({field_name: 'Enter a valid number.'}) from exc

    if not dec.is_finite():
        raise serializers.ValidationError({field_name: 'Enter a finite number.'})

    sign, digits, exponent = dec.as_tuple()
    if exponent < -decimal_places:
        raise serializers.ValidationError(
            {field_name: f'Ensure that there are no more than {decimal_places} decimal places.'}
        )

    whole_digits = len(digits) + exponent if exponent < 0 else len(digits) + exponent
    if max(whole_digits, 0) > (max_digits - decimal_places):
        raise serializers.ValidationError(
            {field_name: f'Ensure that there are no more than {max_digits - decimal_places} whole digits.'}
        )

    return dec.quantize(TWOPLACES)


def validate_quantity_for_unit(quantity_dec, unit, *, field_name='quantity', allow_zero=False):
    """
    Validate that quantity_dec satisfies sign and unit-granularity constraints:
    - Continuous units ('kg', 'l') allow fractional decimals up to 2 decimal places.
    - Countable units (and legacy None unit) require whole-number quantities.
    """
    if allow_zero:
        if quantity_dec < Decimal('0.00'):
            raise serializers.ValidationError({field_name: 'Value cannot be negative.'})
    else:
        if quantity_dec <= Decimal('0.00'):
            raise serializers.ValidationError({field_name: 'Value must be greater than zero.'})

    if is_countable_unit(unit) and quantity_dec != quantity_dec.to_integral_value():
        unit_name = UNIT_DISPLAY_LABELS.get(unit, unit or 'this item')
        raise serializers.ValidationError(
            {field_name: f'Whole-number quantities are required for {unit_name} listings.'}
        )

    return quantity_dec


class QuantityDecimalField(serializers.DecimalField):
    """
    DecimalField that strictly validates input precision without silent truncation
    and serializes whole numbers as int (e.g. 4) and fractions as float (e.g. 2.5)
    for seamless JSON compatibility with existing frontend numeric types.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_digits', 10)
        kwargs.setdefault('decimal_places', 2)
        super().__init__(*args, **kwargs)

    def to_internal_value(self, data):
        field_name = self.field_name or 'quantity'
        try:
            return parse_strict_decimal(
                data,
                field_name=field_name,
                max_digits=self.max_digits,
                decimal_places=self.decimal_places,
            )
        except serializers.ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict) and field_name in detail:
                raise serializers.ValidationError(detail[field_name]) from exc
            raise

    def to_representation(self, value):
        if value is None:
            return None
        dec = Decimal(str(value)).quantize(TWOPLACES)
        if dec == dec.to_integral_value():
            return int(dec)
        return float(dec)
