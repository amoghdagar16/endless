from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.v1.deps import get_company_id, get_db
from app.schemas.accounts import (
    ImportApplyResponse,
    ImportDryRunResponse,
    ImportMessage as ImportMessageSchema,
    ProposedAccount as ProposedAccountSchema,
)
from app.schemas.accounts import Account as AccountSchema
from app.services import coa_import
from app.services.coa_import import ImportResult
from app.services.company import ensure_company
from app.db.models.account import Account as AccountModel
from app.db.models.types import AccountType
from datetime import date


router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("/import", response_model=ImportDryRunResponse | ImportApplyResponse)
async def import_accounts(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    file: UploadFile = File(...),
    dry_run: bool = True,
) -> ImportDryRunResponse | ImportApplyResponse:
    ensure_company(db, company_id)

    payload = await file.read()
    accounts = coa_import.parse_coa_bytes(payload, file.filename or "upload.csv")

    if dry_run:
        result = coa_import.validate_accounts(db, company_id=company_id, accounts=accounts)
        return _to_dry_run_response(result)

    result = coa_import.apply_import(db, company_id=company_id, accounts=accounts, actor_id=None)
    return ImportApplyResponse(inserted=result.inserted, warnings=_map_messages(result.warnings))


@router.get("")
def list_accounts(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    hierarchy: bool = False,
) -> dict:
    ensure_company(db, company_id)

    if hierarchy:
        tree = coa_import.list_accounts_hierarchy(db, company_id)
        return {"accounts": tree}

    accounts = coa_import.list_accounts(db, company_id)
    id_to_number = {acct.id: acct.number for acct in accounts}
    return {
        "accounts": [
            {
                "id": str(acct.id),
                "companyId": str(acct.company_id),
                "number": acct.number,
                "name": acct.name,
                "type": acct.type.value if hasattr(acct.type, "value") else acct.type,
                "detail_type": acct.detail_type,
                "parentId": str(acct.parent_id) if acct.parent_id else None,
                "parentNumber": id_to_number.get(acct.parent_id) if acct.parent_id else None,
                "isActive": acct.is_active,
                "openingBalance": float(acct.opening_balance) if acct.opening_balance is not None else None,
                "openingBalanceDate": acct.opening_balance_date,
            }
            for acct in accounts
        ]
    }


@router.get("/export", response_class=PlainTextResponse)
def export_accounts(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
) -> PlainTextResponse:
    ensure_company(db, company_id)
    csv_data = coa_import.export_accounts_csv(db, company_id)
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=chart_of_accounts.csv"},
    )


def _to_dry_run_response(result: ImportResult) -> ImportDryRunResponse:
    proposed = [
        ProposedAccountSchema(
            number=acct.number,
            name=acct.name,
            type=acct.type,
            detail_type=acct.detail_type,
            parent_number=acct.parent_number,
            is_active=acct.is_active,
            opening_balance=float(acct.opening_balance) if acct.opening_balance is not None else None,
            opening_balance_date=acct.opening_balance_date,
        )
        for acct in result.proposed_accounts
    ]
    return ImportDryRunResponse(
        proposedAccounts=proposed,
        errors=_map_messages(result.errors),
        warnings=_map_messages(result.warnings),
    )


def _map_messages(messages: list[coa_import.ImportMessage]) -> list[ImportMessageSchema]:
    return [
        ImportMessageSchema(level=msg.level, message=msg.message, row=msg.row)
        for msg in messages
    ]


# Request/Response schemas for CRUD operations
class AccountCreateRequest(BaseModel):
    model_config = {"populate_by_name": True}
    
    number: str
    name: str
    type: str
    detail_type: Optional[str] = Field(default=None, serialization_alias="detailType", validation_alias="detailType")
    parent_number: Optional[str] = Field(default=None, serialization_alias="parentNumber", validation_alias="parentNumber")
    is_active: bool = Field(default=True, serialization_alias="isActive", validation_alias="isActive")
    opening_balance: Optional[float] = Field(default=None, serialization_alias="openingBalance", validation_alias="openingBalance")
    opening_balance_date: Optional[date] = Field(default=None, serialization_alias="openingBalanceDate", validation_alias="openingBalanceDate")


class AccountUpdateRequest(BaseModel):
    model_config = {"populate_by_name": True}
    
    number: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    detail_type: Optional[str] = Field(default=None, serialization_alias="detailType", validation_alias="detailType")
    parent_number: Optional[str] = Field(default=None, serialization_alias="parentNumber", validation_alias="parentNumber")
    is_active: Optional[bool] = Field(default=None, serialization_alias="isActive", validation_alias="isActive")
    opening_balance: Optional[float] = Field(default=None, serialization_alias="openingBalance", validation_alias="openingBalance")
    opening_balance_date: Optional[date] = Field(default=None, serialization_alias="openingBalanceDate", validation_alias="openingBalanceDate")


@router.post("", response_model=dict)
def create_account(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    account_data: AccountCreateRequest,
) -> dict:
    """Create a new account"""
    ensure_company(db, company_id)
    
    # Check if account number already exists
    existing = db.query(AccountModel).filter(
        AccountModel.company_id == company_id,
        AccountModel.number == account_data.number
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Account number {account_data.number} already exists")
    
    # Validate account type
    try:
        account_type = AccountType(account_data.type.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid account type: {account_data.type}")
    
    # Find parent account if parent_number is provided
    parent_id = None
    if account_data.parent_number:
        parent = db.query(AccountModel).filter(
            AccountModel.company_id == company_id,
            AccountModel.number == account_data.parent_number
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail=f"Parent account {account_data.parent_number} not found")
        parent_id = parent.id
    
    # Create new account
    new_account = AccountModel(
        id=uuid.uuid4(),
        company_id=company_id,
        number=account_data.number,
        name=account_data.name,
        type=account_type,
        detail_type=account_data.detail_type,
        parent_id=parent_id,
        is_active=account_data.is_active,
        opening_balance=account_data.opening_balance,
        opening_balance_date=account_data.opening_balance_date,
    )
    
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    return {
        "id": str(new_account.id),
        "companyId": str(new_account.company_id),
        "number": new_account.number,
        "name": new_account.name,
        "type": new_account.type.value,
        "detail_type": new_account.detail_type,
        "parentId": str(new_account.parent_id) if new_account.parent_id else None,
        "parentNumber": account_data.parent_number,
        "isActive": new_account.is_active,
        "openingBalance": float(new_account.opening_balance) if new_account.opening_balance else None,
        "openingBalanceDate": new_account.opening_balance_date,
    }


@router.put("/{account_id}", response_model=dict)
def update_account(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    account_id: uuid.UUID,
    account_data: AccountUpdateRequest,
) -> dict:
    """Update an existing account"""
    ensure_company(db, company_id)
    
    # Find the account
    account = db.query(AccountModel).filter(
        AccountModel.id == account_id,
        AccountModel.company_id == company_id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Update fields if provided
    if account_data.number is not None:
        # Check if new number conflicts with existing
        existing = db.query(AccountModel).filter(
            AccountModel.company_id == company_id,
            AccountModel.number == account_data.number,
            AccountModel.id != account_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Account number {account_data.number} already exists")
        account.number = account_data.number
    
    if account_data.name is not None:
        account.name = account_data.name
    
    if account_data.type is not None:
        try:
            account.type = AccountType(account_data.type.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid account type: {account_data.type}")
    
    if account_data.detail_type is not None:
        account.detail_type = account_data.detail_type
    
    if account_data.parent_number is not None:
        if account_data.parent_number:
            parent = db.query(AccountModel).filter(
                AccountModel.company_id == company_id,
                AccountModel.number == account_data.parent_number
            ).first()
            if not parent:
                raise HTTPException(status_code=404, detail=f"Parent account {account_data.parent_number} not found")
            account.parent_id = parent.id
        else:
            account.parent_id = None
    
    if account_data.is_active is not None:
        account.is_active = account_data.is_active
    
    if account_data.opening_balance is not None:
        account.opening_balance = account_data.opening_balance
    
    if account_data.opening_balance_date is not None:
        account.opening_balance_date = account_data.opening_balance_date
    
    db.commit()
    db.refresh(account)
    
    # Get parent number
    parent_number = None
    if account.parent_id:
        parent = db.query(AccountModel).filter(AccountModel.id == account.parent_id).first()
        if parent:
            parent_number = parent.number
    
    return {
        "id": str(account.id),
        "companyId": str(account.company_id),
        "number": account.number,
        "name": account.name,
        "type": account.type.value,
        "detail_type": account.detail_type,
        "parentId": str(account.parent_id) if account.parent_id else None,
        "parentNumber": parent_number,
        "isActive": account.is_active,
        "openingBalance": float(account.opening_balance) if account.opening_balance else None,
        "openingBalanceDate": account.opening_balance_date,
    }


@router.delete("/{account_id}")
def delete_account(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    account_id: uuid.UUID,
) -> dict:
    """Delete an account"""
    ensure_company(db, company_id)
    
    # Find the account
    account = db.query(AccountModel).filter(
        AccountModel.id == account_id,
        AccountModel.company_id == company_id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Check if account has children
    children = db.query(AccountModel).filter(
        AccountModel.parent_id == account_id
    ).first()
    
    if children:
        raise HTTPException(status_code=400, detail="Cannot delete account with child accounts")
    
    # Check if account has transactions (you might want to add this check)
    # For now, we'll just delete it
    
    db.delete(account)
    db.commit()

    return {"message": "Account deleted successfully"}


@router.delete("/")
def delete_all_accounts(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
) -> dict:
    """Delete all accounts for the company (also deletes all associated transactions)"""
    ensure_company(db, company_id)

    # Import TransactionLine and Transaction models
    from app.db.models.transaction import Transaction
    from app.db.models.transaction_line import TransactionLine

    # Delete transaction lines first (foreign key dependency)
    deleted_lines = db.execute(
        TransactionLine.__table__.delete().where(
            TransactionLine.transaction_id.in_(
                db.query(Transaction.id).filter(Transaction.company_id == company_id)
            )
        )
    ).rowcount

    # Delete transactions
    deleted_transactions = db.execute(
        Transaction.__table__.delete().where(Transaction.company_id == company_id)
    ).rowcount

    # Delete accounts
    deleted_accounts = db.execute(
        AccountModel.__table__.delete().where(AccountModel.company_id == company_id)
    ).rowcount

    db.commit()

    return {
        "message": "All accounts deleted successfully",
        "deleted": {
            "accounts": deleted_accounts,
            "transactions": deleted_transactions,
            "transaction_lines": deleted_lines
        }
    }
