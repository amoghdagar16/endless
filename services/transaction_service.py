"""
Transaction service for managing journal entries and double-entry bookkeeping.
"""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, desc, exists, func
from sqlalchemy.orm import Session, joinedload

from app.db.models.account import Account
from app.db.models.period import Period
from app.db.models.transaction import Transaction
from app.db.models.transaction_line import TransactionLine
from app.db.models.types import TransactionSource


class TransactionService:
    """Service for managing accounting transactions (journal entries)."""

    def __init__(self, db: Session):
        self.db = db

    def create_transaction(
        self,
        company_id: uuid.UUID,
        date: date,
        description: str,
        lines: list[dict],
        reference: Optional[str] = None,
        source: str = "journal",
    ) -> Transaction:
        """
        Create a new transaction (journal entry).
        
        Args:
            company_id: Company UUID
            date: Transaction date
            description: Description of the transaction
            lines: List of transaction lines with account_id, debit, credit, memo
            reference: Optional reference number
            source: Source of transaction (journal, import, ocr, etc.)
            
        Returns:
            Created Transaction with lines
            
        Raises:
            HTTPException: If validation fails
        """
        # Validate lines
        self._validate_lines(lines, company_id)
        
        # Check period lock
        self._check_period_lock(date, company_id)
        
        # Calculate totals
        total_debit = sum(Decimal(str(line.get("debit", 0))) for line in lines)
        total_credit = sum(Decimal(str(line.get("credit", 0))) for line in lines)
        
        # Validate balance
        if total_debit != total_credit:
            raise HTTPException(
                status_code=400,
                detail=f"Transaction not balanced: debits={total_debit}, credits={total_credit}"
            )
        
        # Create transaction
        transaction = Transaction(
            company_id=company_id,
            date=date,
            memo=description,
            doc_no=reference,
            source=TransactionSource.JOURNAL.value,  # Use .value to get lowercase string
            status="draft",
        )
        
        self.db.add(transaction)
        self.db.flush()  # Get transaction.id before creating lines
        
        # Create transaction lines
        for line_data in lines:
            line = TransactionLine(
                id=uuid.uuid4(),
                transaction_id=transaction.id,
                account_id=uuid.UUID(line_data["account_id"]),
                debit=Decimal(str(line_data.get("debit", 0))),
                credit=Decimal(str(line_data.get("credit", 0))),
                memo=line_data.get("memo"),
            )
            self.db.add(line)
        
        self.db.commit()
        self.db.refresh(transaction)
        
        # Load lines with accounts
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines).joinedload(TransactionLine.account)
        ).filter(Transaction.id == transaction.id).first()
        
        return transaction

    def post_transaction(self, transaction_id: uuid.UUID) -> Transaction:
        """
        Post a transaction (mark as final/posted).
        
        Args:
            transaction_id: Transaction UUID
            
        Returns:
            Updated Transaction
            
        Raises:
            HTTPException: If transaction not found, already posted, or period locked
        """
        transaction = self.db.query(Transaction).filter(
            Transaction.id == transaction_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction.status == "posted":
            raise HTTPException(status_code=400, detail="Transaction already posted")
        
        # Check period lock
        self._check_period_lock(transaction.date, transaction.company_id)
        
        # Update status
        transaction.status = "posted"
        
        self.db.commit()
        self.db.refresh(transaction)
        
        # Load lines with accounts
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines).joinedload(TransactionLine.account)
        ).filter(Transaction.id == transaction.id).first()
        
        return transaction

    def get_transaction(self, transaction_id: uuid.UUID) -> Transaction:
        """
        Get a transaction by ID with all lines and account names.
        
        Args:
            transaction_id: Transaction UUID
            
        Returns:
            Transaction with lines
            
        Raises:
            HTTPException: If transaction not found
        """
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines).joinedload(TransactionLine.account)
        ).filter(Transaction.id == transaction_id).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return transaction

    def list_transactions(
        self,
        company_id: uuid.UUID,
        status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        account_id: Optional[uuid.UUID] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        """
        List transactions with optional filters and pagination.
        
        Args:
            company_id: Company UUID
            status: Filter by status (draft, posted)
            date_from: Start date filter
            date_to: End date filter
            account_id: Filter by account
            page: Page number (1-indexed)
            per_page: Items per page
            
        Returns:
            Dict with transactions, total, page, per_page
        """
        query = self.db.query(Transaction).filter(
            Transaction.company_id == company_id
        )
        
        # Apply filters
        if status:
            query = query.filter(Transaction.status == status)
        
        if date_from:
            query = query.filter(Transaction.date >= date_from)
        
        if date_to:
            query = query.filter(Transaction.date <= date_to)
        
        if account_id:
            # Join with transaction_lines to filter by account
            query = query.join(TransactionLine).filter(
                TransactionLine.account_id == account_id
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        transactions = query.order_by(
            desc(Transaction.date),
            desc(Transaction.id)
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        # Load lines with accounts for each transaction
        transaction_ids = [t.id for t in transactions]
        if transaction_ids:
            transactions = self.db.query(Transaction).options(
                joinedload(Transaction.lines).joinedload(TransactionLine.account)
            ).filter(Transaction.id.in_(transaction_ids)).order_by(
                desc(Transaction.date),
                desc(Transaction.id)
            ).all()
        
        return {
            "transactions": transactions,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    def update_transaction(
        self,
        transaction_id: uuid.UUID,
        date: Optional[date] = None,
        description: Optional[str] = None,
        reference: Optional[str] = None,
        lines: Optional[list[dict]] = None,
    ) -> Transaction:
        """
        Update a draft transaction.
        
        Args:
            transaction_id: Transaction UUID
            date: New date
            description: New description
            reference: New reference
            lines: New lines (replaces all existing lines)
            
        Returns:
            Updated Transaction
            
        Raises:
            HTTPException: If transaction not found, already posted, or validation fails
        """
        transaction = self.db.query(Transaction).filter(
            Transaction.id == transaction_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction.status == "posted":
            raise HTTPException(
                status_code=400,
                detail="Cannot update posted transaction"
            )
        
        # Update fields
        if date is not None:
            self._check_period_lock(date, transaction.company_id)
            transaction.date = date

        if description is not None:
            transaction.memo = description

        if reference is not None:
            transaction.doc_no = reference
        
        if lines is not None:
            # Validate new lines
            self._validate_lines(lines, transaction.company_id)
            
            # Calculate totals
            total_debit = sum(Decimal(str(line.get("debit", 0))) for line in lines)
            total_credit = sum(Decimal(str(line.get("credit", 0))) for line in lines)
            
            # Validate balance
            if total_debit != total_credit:
                raise HTTPException(
                    status_code=400,
                    detail=f"Transaction not balanced: debits={total_debit}, credits={total_credit}"
                )
            
            # Delete old lines
            self.db.query(TransactionLine).filter(
                TransactionLine.transaction_id == transaction_id
            ).delete()
            
            # Create new lines
            for line_data in lines:
                line = TransactionLine(
                    id=uuid.uuid4(),
                    transaction_id=transaction.id,
                    account_id=uuid.UUID(line_data["account_id"]),
                    debit=Decimal(str(line_data.get("debit", 0))),
                    credit=Decimal(str(line_data.get("credit", 0))),
                    memo=line_data.get("memo"),
                )
                self.db.add(line)
        
        self.db.commit()
        self.db.refresh(transaction)
        
        # Load lines with accounts
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines).joinedload(TransactionLine.account)
        ).filter(Transaction.id == transaction.id).first()
        
        return transaction

    def delete_transaction(self, transaction_id: uuid.UUID) -> None:
        """
        Delete a draft transaction.
        
        Args:
            transaction_id: Transaction UUID
            
        Raises:
            HTTPException: If transaction not found or already posted
        """
        transaction = self.db.query(Transaction).filter(
            Transaction.id == transaction_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction.status == "posted":
            raise HTTPException(
                status_code=400,
                detail="Cannot delete posted transaction"
            )
        
        # Delete lines first (should cascade, but being explicit)
        self.db.query(TransactionLine).filter(
            TransactionLine.transaction_id == transaction_id
        ).delete()
        
        # Delete transaction
        self.db.delete(transaction)
        self.db.commit()

    def _validate_lines(self, lines: list[dict], company_id: uuid.UUID) -> None:
        """
        Validate transaction lines.
        
        Args:
            lines: List of line dictionaries
            company_id: Company UUID
            
        Raises:
            HTTPException: If validation fails
        """
        if not lines or len(lines) < 2:
            raise HTTPException(
                status_code=400,
                detail="Transaction must have at least 2 lines"
            )
        
        account_ids = []
        for i, line in enumerate(lines):
            # Check account_id exists
            if "account_id" not in line:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {i + 1}: account_id is required"
                )
            
            try:
                account_id = uuid.UUID(line["account_id"])
                account_ids.append(account_id)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {i + 1}: invalid account_id format"
                )
            
            # Get debit and credit
            debit = Decimal(str(line.get("debit", 0)))
            credit = Decimal(str(line.get("credit", 0)))
            
            # Check that exactly one is non-zero
            if debit == 0 and credit == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {i + 1}: either debit or credit must be non-zero"
                )
            
            if debit != 0 and credit != 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {i + 1}: cannot have both debit and credit"
                )
            
            # Check amounts are positive
            if debit < 0 or credit < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {i + 1}: amounts must be positive"
                )
        
        # Check all accounts exist and belong to company
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

    def create_simple_transaction(
        self,
        company_id: uuid.UUID,
        vendor_name: str,
        date: date,
        amount: Decimal,
        description: str,
        reference: Optional[str] = None,
    ) -> Transaction:
        """
        Create a simple transaction entry (user-friendly format).
        
        This creates a draft transaction with minimal information.
        The transaction will need to be converted to a proper journal entry
        with account assignments before it can be posted.
        
        Args:
            company_id: Company UUID
            vendor_name: Vendor/supplier name
            date: Transaction date
            amount: Transaction amount (positive)
            description: Transaction description
            reference: Optional reference number
            
        Returns:
            Created Transaction
        """
        # Check period lock
        self._check_period_lock(date, company_id)
        
        # Create transaction without lines initially
        transaction = Transaction(
            company_id=company_id,
            date=date,
            memo=description,
            doc_no=reference,
            source=TransactionSource.SIMPLE_ENTRY.value,
            status="draft",
            vendor_name=vendor_name,
            amount=amount,
        )
        
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        
        # Load with lines relationship (even though it's empty)
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines)
        ).filter(Transaction.id == transaction.id).first()
        
        return transaction

    def convert_simple_to_journal(
        self,
        transaction_id: uuid.UUID,
        lines: list[dict],
    ) -> Transaction:
        """
        Convert a simple transaction to a journal entry with account assignments.
        
        Args:
            transaction_id: Transaction UUID
            lines: List of transaction lines with account_id, debit, credit, memo
            
        Returns:
            Updated Transaction with lines
            
        Raises:
            HTTPException: If validation fails or transaction is not simple entry
        """
        # Get the transaction
        transaction = self.get_transaction(transaction_id)
        
        # Verify it's a simple entry
        if transaction.source != TransactionSource.SIMPLE_ENTRY.value:
            raise HTTPException(
                status_code=400,
                detail="Only simple entry transactions can be converted"
            )
        
        # Verify it's still in draft status
        if transaction.status != "draft":
            raise HTTPException(
                status_code=400,
                detail="Only draft transactions can be converted"
            )
        
        # Validate the new lines
        self._validate_lines(lines, transaction.company_id)
        
        # Calculate totals to verify they match the simple amount
        total_debit = sum(Decimal(str(line.get("debit", 0))) for line in lines)
        total_credit = sum(Decimal(str(line.get("credit", 0))) for line in lines)
        
        if total_debit != total_credit:
            raise HTTPException(
                status_code=400,
                detail=f"Debits ({total_debit}) must equal credits ({total_credit})"
            )
        
        # Optional: Check if the total matches the simple amount
        if transaction.amount and total_debit != transaction.amount:
            raise HTTPException(
                status_code=400,
                detail=f"Line totals ({total_debit}) must match transaction amount ({transaction.amount})"
            )
        
        # Delete any existing lines (in case of re-conversion)
        self.db.query(TransactionLine).filter(
            TransactionLine.transaction_id == transaction_id
        ).delete()
        
        # Create new lines
        for line in lines:
            account_id = uuid.UUID(line["account_id"])
            debit = Decimal(str(line.get("debit", 0)))
            credit = Decimal(str(line.get("credit", 0)))
            memo = line.get("memo")
            
            transaction_line = TransactionLine(
                id=uuid.uuid4(),
                transaction_id=transaction_id,
                account_id=account_id,
                debit=debit,
                credit=credit,
                memo=memo,
            )
            self.db.add(transaction_line)
        
        self.db.commit()
        
        # Reload transaction with lines
        transaction = self.db.query(Transaction).options(
            joinedload(Transaction.lines).joinedload(TransactionLine.account)
        ).filter(Transaction.id == transaction_id).first()
        
        return transaction

    def list_simple_transactions(
        self,
        company_id: uuid.UUID,
        status: Optional[str] = None,
        needs_review: Optional[bool] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        """
        List simple transactions.
        
        Args:
            company_id: Company UUID
            status: Filter by status (draft, posted)
            needs_review: Filter by whether transaction needs account assignment
            page: Page number
            per_page: Items per page
            
        Returns:
            Dict with transactions, total count, and pagination info
        """
        query = self.db.query(Transaction).filter(
            and_(
                Transaction.company_id == company_id,
                Transaction.source == TransactionSource.SIMPLE_ENTRY.value
            )
        )
        
        if status:
            query = query.filter(Transaction.status == status)
        
        if needs_review is not None:
            if needs_review:
                # Transactions without lines need review
                # Use NOT EXISTS subquery
                has_lines = exists().where(
                    TransactionLine.transaction_id == Transaction.id
                )
                query = query.filter(~has_lines)
            else:
                # Transactions with lines
                # Use EXISTS subquery
                has_lines = exists().where(
                    TransactionLine.transaction_id == Transaction.id
                )
                query = query.filter(has_lines)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        transactions = query.order_by(
            desc(Transaction.date),
            desc(Transaction.id)
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        # Load lines with accounts for each transaction
        transaction_ids = [t.id for t in transactions]
        if transaction_ids:
            transactions = self.db.query(Transaction).options(
                joinedload(Transaction.lines).joinedload(TransactionLine.account)
            ).filter(Transaction.id.in_(transaction_ids)).order_by(
                desc(Transaction.date),
                desc(Transaction.id)
            ).all()
        
        return {
            "transactions": transactions,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

