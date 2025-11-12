from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, PeriodLockedError, UnbalancedEntryError
from app.db.models.account import Account
from app.db.models.period import Period, PeriodStatus
from app.db.models.transaction import Transaction
from app.db.models.transaction_line import TransactionLine
from app.db.models.types import AccountType, TransactionSource
from app.services.audit import log_action


@dataclass
class PostingSummary:
    transaction_id: uuid.UUID
    total_debits: Decimal
    total_credits: Decimal


def create_opening_balance_txn(
    session: Session,
    *,
    company_id: uuid.UUID,
    as_of_date: date,
    replace: bool = False,
    actor_id: Optional[uuid.UUID] = None,
) -> PostingSummary:
    _ensure_period_open(session, company_id, as_of_date)

    source_value = TransactionSource.OPENING_BALANCE.value

    existing_txn = session.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.source == source_value,
        )
    ).scalar_one_or_none()

    if existing_txn:
        if not replace:
            raise ConflictError("Opening balances already posted for this company")
        session.delete(existing_txn)

    accounts = session.execute(
        select(Account).where(Account.company_id == company_id, Account.opening_balance.isnot(None))
    ).scalars().all()

    if not accounts:
        raise UnbalancedEntryError("No accounts with opening balances to post")

    opening_equity = _get_or_create_opening_equity_account(session, company_id)

    txn = Transaction(
        company_id=company_id,
        date=as_of_date,
        source=source_value,
        status="posted",
        posted_at=func.now(),
        memo="Opening Balances",
    )
    session.add(txn)
    session.flush()

    total_debits = Decimal("0")
    total_credits = Decimal("0")

    for account in accounts:
        balance = Decimal(account.opening_balance or 0)
        if balance == 0:
            continue

        if account.type == AccountType.ASSET:
            debit = balance if balance > 0 else Decimal("0")
            credit = -balance if balance < 0 else Decimal("0")
        elif account.type in {AccountType.LIABILITY, AccountType.EQUITY}:
            debit = -balance if balance < 0 else Decimal("0")
            credit = balance if balance > 0 else Decimal("0")
        else:
            continue

        total_debits += debit
        total_credits += credit

        session.add(
            TransactionLine(
                transaction_id=txn.id,
                account_id=account.id,
                debit=debit,
                credit=credit,
                memo="Opening balance",
            )
        )

    balancing = total_debits - total_credits
    if balancing != 0:
        if balancing > 0:
            session.add(
                TransactionLine(
                    transaction_id=txn.id,
                    account_id=opening_equity.id,
                    debit=Decimal("0"),
                    credit=balancing,
                    memo="Opening balance offset",
                )
            )
            total_credits += balancing
        else:
            session.add(
                TransactionLine(
                    transaction_id=txn.id,
                    account_id=opening_equity.id,
                    debit=-balancing,
                    credit=Decimal("0"),
                    memo="Opening balance offset",
                )
            )
            total_debits += -balancing

    if (total_debits - total_credits).copy_abs() > Decimal("0.01"):
        raise UnbalancedEntryError("Opening balances journal is not balanced")

    session.flush()

    log_action(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action="opening_balances_posted",
        entity="transaction",
        entity_id=txn.id,
        before=None,
        after={"transaction_id": str(txn.id)},
    )

    return PostingSummary(transaction_id=txn.id, total_debits=total_debits, total_credits=total_credits)


def _ensure_period_open(session: Session, company_id: uuid.UUID, posting_date: date) -> None:
    period = session.execute(
        select(Period)
        .where(Period.company_id == company_id)
        .where(Period.start <= posting_date)
        .where(Period.end >= posting_date)
    ).scalar_one_or_none()

    if period and period.status == PeriodStatus.LOCKED:
        raise PeriodLockedError("Period is locked. Cannot post opening balances.")
    if period and period.status == PeriodStatus.SOFT_CLOSED:
        raise PeriodLockedError("Period is soft-closed. Cannot post opening balances without override.")


def _get_or_create_opening_equity_account(session: Session, company_id: uuid.UUID) -> Account:
    account = session.execute(
        select(Account).where(Account.company_id == company_id, Account.number == "3900")
    ).scalar_one_or_none()
    if account:
        return account

    account = Account(
        company_id=company_id,
        number="3900",
        name="Opening Balance Equity",
        type=AccountType.EQUITY,
        detail_type="opening_balance_equity",
        is_active=True,
    )
    session.add(account)
    session.flush()
    return account
