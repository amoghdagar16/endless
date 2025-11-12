"""
Opening balances service for managing initial account balances.
"""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, joinedload

from app.db.models.account import Account
from app.db.models.period import Period
from app.db.models.transaction import Transaction
from app.db.models.transaction_line import TransactionLine
from app.db.models.types import AccountType, TransactionSource
from app.services.audit import log_action


class OpeningBalancesService:
    """Service for managing opening balances."""

    def __init__(self, db: Session):
        self.db = db

    def set_opening_balances(
        self,
        company_id: uuid.UUID,
        balances: list[dict],
        as_of_date: date,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Transaction:
        """
        Set opening balances for balance sheet accounts.

        Args:
            company_id: Company UUID
            balances: List of {account_id: str, balance: float}
            as_of_date: Date for opening balances
            actor_id: Optional user ID

        Returns:
            Created Transaction with source="opening_balance"

        Raises:
            HTTPException: If validation fails
        """
        # Validate balances list
        if not balances or len(balances) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one account balance is required"
            )

        # Check period lock
        self._check_period_lock(as_of_date, company_id)

        # Validate accounts and calculate totals
        account_ids = []
        total_debit = Decimal("0")
        total_credit = Decimal("0")

        for i, balance_data in enumerate(balances):
            # Check required fields
            if "account_id" not in balance_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Balance {i + 1}: account_id is required"
                )

            if "balance" not in balance_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Balance {i + 1}: balance is required"
                )

            try:
                account_id = uuid.UUID(balance_data["account_id"])
                account_ids.append(account_id)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Balance {i + 1}: invalid account_id format"
                )

            balance = Decimal(str(balance_data["balance"]))

            # Skip zero balances
            if balance == 0:
                continue

            # We'll determine debit/credit based on account type later
            # For now, just track that we have data

        # Fetch all accounts and validate they're balance sheet accounts
        accounts = self.db.query(Account).filter(
            and_(
                Account.id.in_(account_ids),
                Account.company_id == company_id
            )
        ).all()

        if len(accounts) != len(set(account_ids)):
            raise HTTPException(
                status_code=400,
                detail="One or more accounts not found or don't belong to company"
            )

        # Create account lookup
        account_lookup = {str(acc.id): acc for acc in accounts}

        # Validate account types and calculate debit/credit
        lines_to_create = []

        for balance_data in balances:
            account_id = str(balance_data["account_id"])
            balance = Decimal(str(balance_data["balance"]))

            # Skip zero balances
            if balance == 0:
                continue

            account = account_lookup.get(account_id)
            if not account:
                continue

            # Validate account type is balance sheet only
            if account.type not in [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Account {account.number} ({account.name}) is type {account.type.value}. "
                           f"Opening balances can only be set for asset, liability, or equity accounts."
                )

            # Determine debit/credit based on account type
            # Assets: positive balance = debit, negative balance = credit
            # Liabilities/Equity: positive balance = credit, negative balance = debit
            if account.type == AccountType.ASSET:
                if balance > 0:
                    debit = balance
                    credit = Decimal("0")
                else:
                    debit = Decimal("0")
                    credit = -balance
            else:  # LIABILITY or EQUITY
                if balance > 0:
                    debit = Decimal("0")
                    credit = balance
                else:
                    debit = -balance
                    credit = Decimal("0")

            total_debit += debit
            total_credit += credit

            lines_to_create.append({
                "account_id": account.id,
                "debit": debit,
                "credit": credit,
                "memo": balance_data.get("memo", "Opening balance"),
            })

        # Validate that debits = credits
        difference = total_debit - total_credit
        if abs(difference) > Decimal("0.01"):  # Allow 1 cent rounding
            raise HTTPException(
                status_code=400,
                detail=f"Opening balances must be balanced. "
                       f"Total debits: {total_debit}, Total credits: {total_credit}, "
                       f"Difference: {difference}"
            )

        # Check if opening balance transaction already exists
        existing = self.db.query(Transaction).filter(
            and_(
                Transaction.company_id == company_id,
                Transaction.source == TransactionSource.OPENING_BALANCE.value
            )
        ).first()

        if existing:
            # Delete existing transaction and its lines
            self.db.query(TransactionLine).filter(
                TransactionLine.transaction_id == existing.id
            ).delete()
            self.db.delete(existing)
            self.db.flush()

        # Create opening balance transaction
        transaction = Transaction(
            company_id=company_id,
            date=as_of_date,
            memo="Opening Balances",
            source=TransactionSource.OPENING_BALANCE.value,
            status="posted",  # Opening balances are always posted
            posted_at=func.now(),
            created_by=actor_id,
        )

        self.db.add(transaction)
        self.db.flush()  # Get transaction.id

        # Create transaction lines
        for line_data in lines_to_create:
            line = TransactionLine(
                id=uuid.uuid4(),
                transaction_id=transaction.id,
                account_id=line_data["account_id"],
                debit=line_data["debit"],
                credit=line_data["credit"],
                memo=line_data["memo"],
            )
            self.db.add(line)

        self.db.commit()

        # Log action
        log_action(
            self.db,
            company_id=company_id,
            actor_id=actor_id,
            action="opening_balances_set",
            entity="transaction",
            entity_id=transaction.id,
            before={"existing_id": str(existing.id)} if existing else None,
            after={"transaction_id": str(transaction.id), "total_lines": len(lines_to_create)},
        )

        # Reload transaction with lines
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines).joinedload(TransactionLine.account)
        ).filter(Transaction.id == transaction.id).first()

        return transaction

    def get_opening_balances(self, company_id: uuid.UUID) -> dict:
        """
        Get current opening balances.

        Args:
            company_id: Company UUID

        Returns:
            Dict with transaction and balances list
        """
        # Find opening balance transaction
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines).joinedload(TransactionLine.account)
        ).filter(
            and_(
                Transaction.company_id == company_id,
                Transaction.source == TransactionSource.OPENING_BALANCE.value
            )
        ).first()

        if not transaction:
            return {
                "exists": False,
                "transaction": None,
                "balances": [],
                "as_of_date": None,
            }

        # Extract balances from transaction lines
        balances = []
        for line in transaction.lines:
            # Determine balance based on account type
            account = line.account
            if not account:
                continue

            # For assets: debit is positive, credit is negative
            # For liabilities/equity: credit is positive, debit is negative
            if account.type == AccountType.ASSET:
                balance = float(line.debit - line.credit)
            else:  # LIABILITY or EQUITY
                balance = float(line.credit - line.debit)

            # Skip zero balances
            if balance == 0:
                continue

            balances.append({
                "account_id": str(line.account_id),
                "account_number": account.number,
                "account_name": account.name,
                "account_type": account.type.value,
                "balance": balance,
                "memo": line.memo,
            })

        return {
            "exists": True,
            "transaction_id": str(transaction.id),
            "as_of_date": transaction.date.isoformat(),
            "balances": balances,
        }

    def _check_period_lock(self, date: date, company_id: uuid.UUID) -> None:
        """
        Check if the period for the date is locked.

        Args:
            date: Transaction date
            company_id: Company UUID

        Raises:
            HTTPException: If period is locked
        """
        period = self.db.query(Period).filter(
            and_(
                Period.company_id == company_id,
                Period.start <= date,
                Period.end >= date
            )
        ).first()

        if period and period.status.value == "locked":
            raise HTTPException(
                status_code=400,
                detail=f"Period is locked for date {date}"
            )