from decimal import Decimal

from app.services.extract import extract_fields


def test_extract_fields_coherent_totals_with_tax_sum():
    text = """
    WALL-MART-SUPERSTORE
    (888) 888 - 8888
    SUBTOTAI 23.09
    TAK 1 7.89% 2.90
    TAK 2 4.90% 1.28
    TOTAL aw
    $27.27
    ACCOUNT # **** **** ***9999
    Thank You For Shopping!
    10/17/2020 16:12
    """

    result = extract_fields(text)

    assert result.vendor == "WALL-MART-SUPERSTORE"
    assert result.txn_date.isoformat() == "2020-10-17"
    assert result.total == Decimal("27.27")
    assert result.tax == Decimal("4.18")
    assert result.payment_last4 == "9999"
    assert result.currency == "USD"
    assert "total_coherent" in result.debug["confidence_notes"]
    assert result.confidence <= Decimal("95")
    assert result.confidence >= Decimal("80")


def test_extract_fields_date_prefers_bottom_with_time():
    text = """
    Sample Vendor
    Order Date: 01/01/2024
    ITEMS...
    SEE YOU AGAIN!
    Printed: 10/17/2020 16:12
    """

    result = extract_fields(text)

    assert result.txn_date.isoformat() == "2020-10-17"


def test_extract_fields_ignores_future_header_date():
    text = """
    Fresh Foods Market
    Expires: 2099-10-05
    MEMBER ID 123456
    Thank you!
    3/18/2014 09:56
    """

    result = extract_fields(text)

    assert result.txn_date.isoformat() == "2014-03-18"


def test_last4_requires_mask():
    text = """
    Sample Vendor
    TCA 1752 5627 3145 9811 0000
    TOTAL $12.34
    09/09/2024 12:00
    """

    result = extract_fields(text)

    assert result.payment_last4 is None
    assert not result.debug["masked_line_found"]


def test_confidence_penalties_when_fields_missing():
    text = """
    RECEIPT
    TAX 7.00%
    THANK YOU
    """

    result = extract_fields(text)

    assert result.total is None
    assert result.txn_date is None
    assert result.confidence <= Decimal("50")


def test_confidence_drops_when_date_missing():
    text = """
    Vendor ABC
    SUBTOTAL $4.50
    TAX 0.36
    TOTAL $4.86
    """

    result = extract_fields(text)

    assert result.txn_date is None
    assert result.confidence <= Decimal("70")


def test_cash_change_bonus():
    text = """
    Fresh Foods
    SUBTOTAL $4.50
    TAX 0.36
    TOTAL $4.86
    CASH 10.00
    CHANGE 5.14
    3/18/2014 09:56
    """

    result = extract_fields(text)

    assert result.total == Decimal("4.86")
    assert result.debug["cash"] == Decimal("10.00")
    assert result.debug["change"] == Decimal("5.14")
    assert "cash_change_coherent" in result.debug["confidence_notes"]
    assert result.confidence >= Decimal("95")
    assert result.confidence <= Decimal("100")
