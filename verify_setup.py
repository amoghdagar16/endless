#!/usr/bin/env python3
"""
Verify Supabase setup and environment configuration
"""

from database import supabase
import os

def verify_setup():
    print("🔍 Verifying Supabase Setup...\n")

    all_good = True

    # Test 1: Connection
    print("1. Testing Supabase connection...")
    try:
        response = supabase.table('users').select('*').limit(1).execute()
        print("   ✅ Connected successfully\n")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}\n")
        all_good = False
        return

    # Test 2: Migration columns
    print("2. Checking migration columns...")
    required_columns = [
        'industry', 'business_type', 'location_city', 'location_state',
        'competitors', 'primary_products', 'growth_stage', 'annual_revenue',
        'employee_count', 'onboarding_completed', 'onboarding_step'
    ]

    try:
        response = supabase.table('companies').select(', '.join(required_columns)).limit(1).execute()
        print("   ✅ All migration columns exist\n")
    except Exception as e:
        print(f"   ❌ Migration columns missing: {e}")
        print("   → Run the migration in Supabase SQL Editor\n")
        all_good = False

    # Test 3: Environment variables
    print("3. Checking environment variables...")
    env_vars = {
        'SUPABASE_URL': os.getenv('SUPABASE_URL'),
        'SUPABASE_KEY': os.getenv('SUPABASE_KEY'),
        'SUPABASE_JWT_SECRET': os.getenv('SUPABASE_JWT_SECRET'),
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
        'PERPLEXITY_API_KEY': os.getenv('PERPLEXITY_API_KEY')
    }

    for key, value in env_vars.items():
        if value:
            print(f"   ✅ {key}")
        else:
            print(f"   ❌ {key} - NOT SET")
            all_good = False

    print()

    # Summary
    if all_good:
        print("🎉 All checks passed! Your Supabase backend is synced up properly.")
        print("\nNext steps:")
        print("1. Install Python dependencies: pip install -r requirements.txt")
        print("2. Install frontend dependencies: cd frontend && npm install")
        print("3. Start backend: uvicorn main:app --reload")
        print("4. Start frontend: cd frontend && npm run dev")
        print("5. Visit http://localhost:3000 and test!")
    else:
        print("⚠️  Some issues need to be fixed (see above)")
        print("\nRefer to QUICK_START.md for detailed instructions")

if __name__ == "__main__":
    verify_setup()
