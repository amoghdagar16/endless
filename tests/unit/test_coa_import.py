from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from app.services import coa_import


class FakeScalarResult:
    def __init__(self, values):
        self._values = values

    def __iter__(self):
        return iter(self._values)


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return FakeScalarResult([row[0] for row in self._rows])

    def all(self):
        return self._rows


class FakeSession:
    def __init__(self):
        self._data = []

    def execute(self, stmt):  # pragma: no cover - stub interface only
        return FakeResult(self._data)


def test_validate_accounts_rejects_invalid_type():
    session = FakeSession()
    company_id = uuid.uuid4()

    accounts = [
        coa_import.ProposedAccount(
            number="1000",
            name="Cash",
            type="invalid",
            detail_type=None,
            parent_number=None,
            is_active=True,
            opening_balance=Decimal("0"),
            opening_balance_date=date(2025, 1, 1),
            source_row=2,
        )
    ]

    result = coa_import.validate_accounts(session, company_id=company_id, accounts=accounts)
    assert result.errors
    assert "Invalid account type" in result.errors[0].message


def test_parse_coa_csv(tmp_path):
    csv_content = (
        "number,name,type,detail_type,parent_number,is_active,opening_balance,opening_balance_date\n"
        "1000,Cash,asset,bank,,true,5000,2025-01-01\n"
    )
    file_path = tmp_path / "coa.csv"
    file_path.write_text(csv_content)

    accounts = coa_import.parse_coa_bytes(file_path.read_bytes(), file_path.name)
    assert len(accounts) == 1
    acct = accounts[0]
    assert acct.number == "1000"
    assert acct.type == "asset"
    assert acct.opening_balance == Decimal("5000")
    assert acct.opening_balance_date.isoformat() == "2025-01-01"
