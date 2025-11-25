"""add description to documents

Revision ID: 01f08ed60582
Revises: 20241116_0002
Create Date: 2025-11-17

"""
from alembic import op
import sqlalchemy as sa


revision = '01f08ed60582'
down_revision = '20241116_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add description column to documents table
    op.add_column('documents', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove description column from documents table
    op.drop_column('documents', 'description')
