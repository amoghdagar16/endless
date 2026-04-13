from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase credentials. Check your .env file.")

# Connect to Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Access the PUBLIC schema (works with Supabase API)
def table(name: str):
    return supabase.table(name)

print("Supabase connection initialized successfully (using service_role key).")
