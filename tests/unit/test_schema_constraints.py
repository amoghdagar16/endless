from __future__ import annotations

from app.db.base import Base


def test_transaction_line_check_constraint_present():
    metadata = Base.metadata
    table = metadata.tables["transaction_lines"]
    constraint_names = {constraint.name for constraint in table.constraints if constraint.name}
    assert "ck_transaction_lines_debit_credit" in constraint_names


def test_account_unique_company_number_constraint_present():
    metadata = Base.metadata
    table = metadata.tables["accounts"]
    constraint_names = {constraint.name for constraint in table.constraints if constraint.name}
    assert "uq_accounts_company_number" in constraint_names
