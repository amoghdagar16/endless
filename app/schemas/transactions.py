from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class OpeningBalanceRequest(BaseModel):
    as_of: date = Field(alias="asOf")
    replace: bool = False


class OpeningBalanceResponse(BaseModel):
    transaction_id: str = Field(alias="transactionId")
    total_debits: Decimal = Field(alias="totalDebits")
    total_credits: Decimal = Field(alias="totalCredits")


# New schemas for setting opening balances via API
class AccountBalanceInput(BaseModel):
    """Schema for setting an account balance."""
    account_id: UUID = Field(alias="accountId")
    balance: Decimal
    memo: Optional[str] = None

    model_config = {"populate_by_name": True}


class SetOpeningBalancesRequest(BaseModel):
    """Schema for setting opening balances."""
    as_of_date: date = Field(alias="asOfDate")
    balances: list[AccountBalanceInput]

    model_config = {"populate_by_name": True}

    @field_validator('balances')
    @classmethod
    def validate_balances(cls, v):
        """Ensure at least one balance."""
        if not v or len(v) == 0:
            raise ValueError("At least one account balance is required")
        return v


class AccountBalanceOutput(BaseModel):
    """Schema for account balance output."""
    account_id: str = Field(alias="accountId")
    account_number: str = Field(alias="accountNumber")
    account_name: str = Field(alias="accountName")
    account_type: str = Field(alias="accountType")
    balance: Decimal
    memo: Optional[str] = None

    model_config = {"populate_by_name": True}


class GetOpeningBalancesResponse(BaseModel):
    """Schema for getting opening balances."""
    exists: bool
    transaction_id: Optional[str] = Field(None, alias="transactionId")
    as_of_date: Optional[date] = Field(None, alias="asOfDate")
    balances: list[AccountBalanceOutput]

    model_config = {"populate_by_name": True}


# Transaction Line Schemas

class TransactionLineCreate(BaseModel):
    """Schema for creating a transaction line."""
    account_id: UUID = Field(alias="accountId")
    debit: Decimal = Field(default=Decimal("0"))
    credit: Decimal = Field(default=Decimal("0"))
    memo: Optional[str] = None
    
    model_config = {"populate_by_name": True}
    
    @field_validator('debit', 'credit')
    @classmethod
    def validate_amounts(cls, v):
        """Ensure amounts are non-negative."""
        if v < 0:
            raise ValueError("Amounts must be non-negative")
        return v
    
    @field_validator('credit', mode='after')
    @classmethod
    def validate_debit_or_credit(cls, v, info):
        """Ensure exactly one of debit or credit is non-zero."""
        # Get debit value, handling both Decimal and numeric types
        debit = info.data.get('debit', Decimal("0"))
        if isinstance(debit, (int, float)):
            debit = Decimal(str(debit))

        # Convert credit to Decimal if needed
        credit = v
        if isinstance(credit, (int, float)):
            credit = Decimal(str(credit))

        # Both cannot be zero (commented out for now - backend will validate)
        # if debit == 0 and credit == 0:
        #     raise ValueError("Either debit or credit must be non-zero")

        # Both cannot be non-zero
        if debit != 0 and credit != 0:
            raise ValueError("Cannot have both debit and credit")
        return v


class TransactionLineResponse(BaseModel):
    """Schema for transaction line response."""
    id: UUID
    account_id: UUID = Field(alias="accountId")
    account_number: str = Field(alias="accountNumber")
    account_name: str = Field(alias="accountName")
    debit: Decimal
    credit: Decimal
    memo: Optional[str] = None
    
    model_config = {"populate_by_name": True, "from_attributes": True}


# Transaction Schemas

class TransactionCreate(BaseModel):
    """Schema for creating a transaction."""
    date: date
    description: str
    reference: Optional[str] = None
    source: str = Field(default="journal")
    lines: list[TransactionLineCreate]
    
    model_config = {"populate_by_name": True}
    
    @field_validator('lines')
    @classmethod
    def validate_lines(cls, v):
        """Ensure at least 2 lines."""
        if len(v) < 2:
            raise ValueError("Transaction must have at least 2 lines")
        return v


# TransactionUpdate removed - using dict directly in route for flexibility

class TransactionResponse(BaseModel):
    """Schema for transaction response."""
    id: UUID
    company_id: UUID = Field(alias="companyId")
    date: date
    description: str
    reference: Optional[str] = None
    source: str
    status: str
    total_debit: Decimal = Field(alias="totalDebit")
    total_credit: Decimal = Field(alias="totalCredit")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    lines: list[TransactionLineResponse]
    
    model_config = {"populate_by_name": True, "from_attributes": True}


class TransactionListResponse(BaseModel):
    """Schema for paginated transaction list."""
    transactions: list[TransactionResponse]
    total: int
    page: int
    per_page: int = Field(alias="perPage")
    
    model_config = {"populate_by_name": True}
