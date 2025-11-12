"""V1 accounting schema."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20240911_0001"
down_revision = None
branch_labels = None
depends_on = None


account_type_enum = postgresql.ENUM(
    "asset",
    "liability",
    "equity",
    "income",
    "expense",
    "other",
    name="account_type",
    create_type=False,
)

txn_source_enum = postgresql.ENUM(
    "journal",
    "opening_balance",
    name="txn_source",
    create_type=False,
)
period_status_enum = postgresql.ENUM(
    "open",
    "soft_closed",
    "locked",
    name="period_status",
    create_type=False,
)


def upgrade() -> None:
    op.execute(sa.text("DROP TYPE IF EXISTS account_type CASCADE"))
    op.execute(sa.text("DROP TYPE IF EXISTS txn_source CASCADE"))
    op.execute(sa.text("DROP TYPE IF EXISTS period_status CASCADE"))

    account_type_enum.create(op.get_bind(), checkfirst=True)
    txn_source_enum.create(op.get_bind(), checkfirst=True)
    period_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("base_currency", sa.String(length=3), nullable=False),
        sa.Column("fiscal_year_start_month", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("accounting_method", sa.String(length=32), nullable=False, server_default="accrual"),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
    )

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("number", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", account_type_enum, nullable=False),
        sa.Column("detail_type", sa.String(length=64), nullable=True),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("opening_balance", sa.Numeric(18, 2), nullable=True),
        sa.Column("opening_balance_date", sa.Date(), nullable=True),
        sa.UniqueConstraint("company_id", "number", name="uq_accounts_company_number"),
    )
    op.create_index("ix_accounts_company_type", "accounts", ["company_id", "type"])

    op.create_table(
        "periods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start", sa.Date(), nullable=False),
        sa.Column("end", sa.Date(), nullable=False),
        sa.Column("status", period_status_enum, nullable=False, server_default="open"),
        sa.UniqueConstraint("company_id", "start", "end", name="uq_periods_company_dates"),
        sa.CheckConstraint("start <= \"end\"", name="ck_periods_date_order"),
    )

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("source", txn_source_enum, nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("doc_no", sa.String(length=64), nullable=True),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("exchange_rate", sa.Numeric(18, 6), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_transactions_company_date", "transactions", ["company_id", "date"])

    op.create_table(
        "transaction_lines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transactions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("accounts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("debit", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("credit", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "(debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0)",
            name="ck_transaction_lines_debit_credit",
        ),
    )
    op.create_index("ix_transaction_lines_account_id", "transaction_lines", ["account_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("entity", sa.String(length=64), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("before", sa.JSON(), nullable=True),
        sa.Column("after", sa.JSON(), nullable=True),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_index("ix_transaction_lines_account_id", table_name="transaction_lines")
    op.drop_table("transaction_lines")
    op.drop_index("ix_transactions_company_date", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("periods")
    op.drop_index("ix_accounts_company_type", table_name="accounts")
    op.drop_table("accounts")
    op.drop_table("companies")

    period_status_enum.drop(op.get_bind(), checkfirst=True)
    txn_source_enum.drop(op.get_bind(), checkfirst=True)
    account_type_enum.drop(op.get_bind(), checkfirst=True)

    period_status_enum.drop(op.get_bind(), checkfirst=True)
    txn_source_enum.drop(op.get_bind(), checkfirst=True)
    account_type_enum.drop(op.get_bind(), checkfirst=True)
