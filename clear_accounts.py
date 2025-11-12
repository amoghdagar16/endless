#!/usr/bin/env python3
"""Clear all accounts from the database for a specific company"""
import sys
sys.path.insert(0, '/Users/atimanr/AI_accounting/v21.1/backend')

from app.core.db import get_db
from app.db.models.account import Account
from sqlalchemy import delete
import uuid

def clear_accounts(company_id: str):
    db = next(get_db())
    try:
        company_uuid = uuid.UUID(company_id)
        result = db.execute(
            delete(Account).where(Account.company_id == company_uuid)
        )
        db.commit()
        print(f"✅ Deleted {result.rowcount} accounts for company {company_id}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    company_id = "00000000-0000-0000-0000-000000000001"
    print(f"Clearing accounts for company: {company_id}")
    clear_accounts(company_id)
