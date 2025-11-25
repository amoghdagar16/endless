from __future__ import annotations

import enum


class AccountType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    INCOME = "income"
    EXPENSE = "expense"
    OTHER = "other"


class TransactionSource(str, enum.Enum):
    JOURNAL = "journal"
    OPENING_BALANCE = "opening_balance"
    OCR_RECEIPT = "ocr_receipt"
    MANUAL_ENTRY = "manual_entry"
    SIMPLE_ENTRY = "simple_entry"


class PeriodStatus(str, enum.Enum):
    OPEN = "open"
    SOFT_CLOSED = "soft_closed"
    LOCKED = "locked"
