from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.db.models.account import Account
from app.db.models.transaction import Transaction
from app.db.models.transaction_line import TransactionLine
from app.db.models.types import AccountType


@dataclass
class ReportRow:
    account_number: str
    name: str
    type: str
    debits: Decimal
    credits: Decimal
    net: Decimal


@dataclass
class TrialBalance:
    as_of: date
    rows: list[ReportRow]
    total_debits: Decimal
    total_credits: Decimal


def trial_balance(session: Session, *, company_id: uuid.UUID, as_of: date) -> TrialBalance:
    stmt = (
        select(
            Account.number,
            Account.name,
            Account.type,
            func.coalesce(func.sum(TransactionLine.debit), 0).label("debits"),
            func.coalesce(func.sum(TransactionLine.credit), 0).label("credits"),
        )
        .outerjoin(TransactionLine, TransactionLine.account_id == Account.id)
        .outerjoin(Transaction, Transaction.id == TransactionLine.transaction_id)
        .where(Account.company_id == company_id)
        .where(
            func.coalesce(Transaction.status, "posted") == "posted",
        )
        .where(
            (Transaction.date <= as_of) | (Transaction.id.is_(None))
        )
        .group_by(Account.id)
        .order_by(Account.number)
    )

    rows_data = session.execute(stmt).all()

    rows: list[ReportRow] = []
    total_debits = Decimal("0")
    total_credits = Decimal("0")

    for number, name, acc_type, debits, credits in rows_data:
        debits = Decimal(debits or 0)
        credits = Decimal(credits or 0)
        net = debits - credits
        rows.append(
            ReportRow(
                account_number=number,
                name=name,
                type=acc_type.value if isinstance(acc_type, AccountType) else acc_type,
                debits=debits,
                credits=credits,
                net=net,
            )
        )
        total_debits += debits
        total_credits += credits

    return TrialBalance(as_of=as_of, rows=rows, total_debits=total_debits, total_credits=total_credits)


def balance_sheet(session: Session, *, company_id: uuid.UUID, as_of: date) -> TrialBalance:
    tb = trial_balance(session, company_id=company_id, as_of=as_of)
    filtered_rows = [row for row in tb.rows if row.type in {"asset", "liability", "equity"}]
    total_debits = sum((row.debits for row in filtered_rows), Decimal("0"))
    total_credits = sum((row.credits for row in filtered_rows), Decimal("0"))
    return TrialBalance(as_of=as_of, rows=filtered_rows, total_debits=total_debits, total_credits=total_credits)


@dataclass
class ProfitAndLossRow:
    account_number: str
    name: str
    type: str
    amount: Decimal


@dataclass
class ProfitAndLoss:
    start: date
    end: date
    rows: list[ProfitAndLossRow]
    net_income: Decimal


def profit_and_loss(
    session: Session,
    *,
    company_id: uuid.UUID,
    start: date,
    end: date,
) -> ProfitAndLoss:
    stmt = (
        select(
            Account.number,
            Account.name,
            Account.type,
            func.coalesce(
                func.sum(
                    case(
                        (Account.type == AccountType.INCOME, TransactionLine.credit - TransactionLine.debit),
                        (Account.type == AccountType.EXPENSE, TransactionLine.debit - TransactionLine.credit),
                        else_=0,
                    )
                ),
                0,
            ).label("amount"),
        )
        .join(TransactionLine, TransactionLine.account_id == Account.id)
        .join(Transaction, Transaction.id == TransactionLine.transaction_id)
        .where(Account.company_id == company_id)
        .where(Account.type.in_([AccountType.INCOME, AccountType.EXPENSE]))
        .where(Transaction.status == "posted")
        .where(Transaction.date >= start)
        .where(Transaction.date <= end)
        .group_by(Account.id)
        .order_by(Account.number)
    )

    rows_data = session.execute(stmt).all()

    rows: list[ProfitAndLossRow] = []
    net_income = Decimal("0")

    for number, name, acc_type, amount in rows_data:
        amount_decimal = Decimal(amount or 0)
        rows.append(
            ProfitAndLossRow(
                account_number=number,
                name=name,
                type=acc_type.value if isinstance(acc_type, AccountType) else acc_type,
                amount=amount_decimal,
            )
        )
        net_income += amount_decimal

    return ProfitAndLoss(start=start, end=end, rows=rows, net_income=net_income)
