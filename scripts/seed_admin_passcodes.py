"""
One-time script: set admin passcode to "admin" for every user
who has a company_id and a role of owner or admin.

Usage:
    cd /home/azythromycin/endless
    source venv/bin/activate
    python scripts/seed_admin_passcodes.py
"""

import hashlib
import os
import sys

# Allow importing project modules
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from database import table  # reuse the project's Supabase client

PASSCODE = "admin"
PEPPER = os.getenv("ADMIN_PASSCODE_PEPPER", "dev-admin-pepper")


def _hash(company_id: str, user_id: str, passcode: str) -> str:
    source = f"{PEPPER}:{company_id}:{user_id}:{passcode}"
    return hashlib.sha256(source.encode()).hexdigest()


def main():
    print("Fetching users with a company_id …")
    resp = (
        table("users")
        .select("id, company_id, role, email")
        .not_.is_("company_id", "null")
        .execute()
    )
    users = resp.data or []
    if not users:
        print("No users found.")
        return

    print(f"Found {len(users)} user(s). Seeding passcodes …\n")
    ok = 0
    skip = 0
    for u in users:
        uid = u["id"]
        cid = u["company_id"]
        role = u.get("role", "?")
        email = u.get("email", "?")
        hashed = _hash(cid, uid, PASSCODE)
        upsert_resp = (
            table("admin_passcodes")
            .upsert(
                {
                    "user_id": uid,
                    "company_id": cid,
                    "passcode_hash": hashed,
                },
                on_conflict="user_id",
            )
            .execute()
        )
        if upsert_resp.data is not None:
            print(f"  ✓  {email} ({role})")
            ok += 1
        else:
            print(f"  ✗  {email} ({role})  — upsert returned no data")
            skip += 1

    print(f"\nDone. {ok} seeded, {skip} failed.")


if __name__ == "__main__":
    main()
