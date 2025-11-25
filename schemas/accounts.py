from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AccountBase(BaseModel):
    number: str
    name: str
    type: str
    detail_type: Optional[str] = None
    parent_number: Optional[str] = Field(default=None, alias="parentNumber")
    is_active: bool = Field(default=True, alias="isActive")
    opening_balance: Optional[float] = Field(default=None, alias="openingBalance")
    opening_balance_date: Optional[date] = Field(default=None, alias="openingBalanceDate")


class Account(AccountBase):
    id: str
    parent_id: Optional[str] = Field(default=None, alias="parentId")
    company_id: str = Field(alias="companyId")
    opening_balance: Optional[float] = Field(default=None, alias="openingBalance")
    opening_balance_date: Optional[date] = Field(default=None, alias="openingBalanceDate")


class ProposedAccount(AccountBase):
    opening_balance: Optional[float] = Field(default=None, alias="openingBalance")
    opening_balance_date: Optional[date] = Field(default=None, alias="openingBalanceDate")


class ImportMessage(BaseModel):
    level: str
    message: str
    row: Optional[int] = None


class ImportDryRunResponse(BaseModel):
    proposed_accounts: list[ProposedAccount] = Field(alias="proposedAccounts")
    errors: list[ImportMessage]
    warnings: list[ImportMessage]


class ImportApplyResponse(BaseModel):
    inserted: int
    warnings: list[ImportMessage]
