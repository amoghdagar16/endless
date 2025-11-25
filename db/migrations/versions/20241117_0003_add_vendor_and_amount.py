"""Add vendor_name and amount to transactions

Revision ID: 20241117_0003
Revises: 01f08ed60582
Create Date: 2024-11-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20241117_0003'
down_revision = '01f08ed60582'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add vendor_name column to transactions table
    op.add_column('transactions', sa.Column('vendor_name', sa.String(length=255), nullable=True))
    
    # Add amount column to transactions table
    op.add_column('transactions', sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=True))
    
    # Add SIMPLE_ENTRY value to txn_source enum
    op.execute("ALTER TYPE txn_source ADD VALUE IF NOT EXISTS 'simple_entry'")


def downgrade() -> None:
    # Remove columns
    op.drop_column('transactions', 'amount')
    op.drop_column('transactions', 'vendor_name')
    
    # Note: Cannot easily remove enum value in PostgreSQL
    # Would require recreating the enum type
