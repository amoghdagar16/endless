"""Add documents table for OCR

Revision ID: 20241116_0002
Revises: 20240911_0001
Create Date: 2024-11-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20241116_0002'
down_revision = '20240911_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('ocr_text', sa.Text(), nullable=True),
        sa.Column('ocr_confidence', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('ocr_engine', sa.String(length=50), nullable=False, server_default='easyocr'),
        sa.Column('ocr_processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('vendor', sa.String(length=255), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=True),
        sa.Column('total_amount', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='uploaded'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create index on company_id for faster queries
    op.create_index(
        'ix_documents_company_id',
        'documents',
        ['company_id']
    )


def downgrade() -> None:
    op.drop_index('ix_documents_company_id', table_name='documents')
    op.drop_table('documents')
