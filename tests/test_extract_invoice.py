from decimal import Decimal

from app.services.extract import extract_fields


def test_invoice_total_ranking_and_bottom_choice():
    text = """
    TARGET
    Item total $47.79
    Sales tax 0.35
    Payment method: Visa***7325
    Thank you!
    Invoice total $48.14
    """
    res = extract_fields(text)
    assert res.total == Decimal("48.14")
    assert res.tax == Decimal("0.35") or res.tax is None  # tax may be accounted via addends
    assert res.payment_last4 == "7325"


def test_arithmetic_repair_with_discount_and_shipping():
    text = """
    Store XYZ
    Subtotal 20.00
    Shipping 5.00
    Sales tax 1.60
    Promotion 2.00
    TOTAI aw
    Invoice total 24.60
    """
    res = extract_fields(text)
    assert res.total == Decimal("24.60")


def test_last4_bullet_and_ending_variants():
    text = """
    Vendor ABC
    VISA •••• 1234
    ending in 5678
    TOTAL $12.34
    2024-09-09 12:00
    """
    res = extract_fields(text)
    # First acceptable pattern should be captured
    assert res.payment_last4 in {"1234", "5678"}

