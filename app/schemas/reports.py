from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class TrialBalanceRow(BaseModel):
    account_number: str = Field(alias="accountNumber")
    name: str
    type: str
    debits: Decimal
    credits: Decimal
    net: Decimal


class TrialBalanceResponse(BaseModel):
    as_of: date = Field(alias="asOf")
    rows: list[TrialBalanceRow]
    totals: dict[str, Decimal]


class BalanceSheetSection(BaseModel):
    heading: str
    rows: list[TrialBalanceRow]
    subtotal: Decimal


class ProfitAndLossRow(BaseModel):
    account_number: str = Field(alias="accountNumber")
    name: str
    type: str
    amount: Decimal


class ProfitAndLossResponse(BaseModel):
    start: date
    end: date
    rows: list[ProfitAndLossRow]
    net_income: Decimal = Field(alias="netIncome")
