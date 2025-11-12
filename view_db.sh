#!/bin/bash
# Script to view Chart of Accounts from database
# Usage: ./view_db.sh [all|assets|liabilities|other|search <term>|count]

cd "$(dirname "$0")"
source .venv/bin/activate
cd backend

case "${1:-help}" in
  all)
    python << 'EOF'
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from tabulate import tabulate

settings = get_settings()
engine = create_engine(settings.database_url)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT a.number, a.name, a.type, a.detail_type, p.number as parent_number, a.is_active
        FROM accounts a
        LEFT JOIN accounts p ON p.id = a.parent_id
        WHERE a.company_id = :company_id
        ORDER BY a.number
    '''), {'company_id': '00000000-0000-0000-0000-000000000001'})
    
    rows = [[r[0], r[1][:40], r[2], r[3] or '', r[4] or '-', '✓' if r[5] else '✗'] for r in result.fetchall()]
    print('\n=== ALL ACCOUNTS ===')
    print(tabulate(rows, headers=['Number', 'Name', 'Type', 'Detail', 'Parent', 'Active'], tablefmt='grid'))
    print(f'\nTotal: {len(rows)} accounts')
EOF
    ;;
    
  assets)
    python << 'EOF'
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from tabulate import tabulate

settings = get_settings()
engine = create_engine(settings.database_url)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT a.number, a.name, a.detail_type, p.number as parent_number
        FROM accounts a
        LEFT JOIN accounts p ON p.id = a.parent_id
        WHERE a.company_id = :company_id AND a.type = 'asset'
        ORDER BY a.number
    '''), {'company_id': '00000000-0000-0000-0000-000000000001'})
    
    rows = [[r[0], r[1][:50], r[2] or '', r[3] or '-'] for r in result.fetchall()]
    print('\n=== ASSET ACCOUNTS ===')
    print(tabulate(rows, headers=['Number', 'Name', 'Detail Type', 'Parent'], tablefmt='grid'))
    print(f'\nTotal: {len(rows)} asset accounts')
EOF
    ;;
    
  liabilities)
    python << 'EOF'
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from tabulate import tabulate

settings = get_settings()
engine = create_engine(settings.database_url)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT a.number, a.name, a.detail_type, p.number as parent_number
        FROM accounts a
        LEFT JOIN accounts p ON p.id = a.parent_id
        WHERE a.company_id = :company_id AND a.type = 'liability'
        ORDER BY a.number
    '''), {'company_id': '00000000-0000-0000-0000-000000000001'})
    
    rows = [[r[0], r[1][:50], r[2] or '', r[3] or '-'] for r in result.fetchall()]
    print('\n=== LIABILITY ACCOUNTS ===')
    print(tabulate(rows, headers=['Number', 'Name', 'Detail Type', 'Parent'], tablefmt='grid'))
    print(f'\nTotal: {len(rows)} liability accounts')
EOF
    ;;
    
  other)
    python << 'EOF'
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from tabulate import tabulate

settings = get_settings()
engine = create_engine(settings.database_url)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT a.number, a.name, a.detail_type, p.number as parent_number
        FROM accounts a
        LEFT JOIN accounts p ON p.id = a.parent_id
        WHERE a.company_id = :company_id AND a.type = 'other'
        ORDER BY a.number
    '''), {'company_id': '00000000-0000-0000-0000-000000000001'})
    
    rows = [[r[0], r[1][:50], r[2] or '', r[3] or '-'] for r in result.fetchall()]
    print('\n=== OTHER TYPE ACCOUNTS ===')
    print(tabulate(rows, headers=['Number', 'Name', 'Detail Type', 'Parent'], tablefmt='grid'))
    print(f'\nTotal: {len(rows)} other accounts')
EOF
    ;;
    
  search)
    if [ -z "$2" ]; then
      echo "Usage: $0 search <search_term>"
      exit 1
    fi
    python << EOF
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from tabulate import tabulate

settings = get_settings()
engine = create_engine(settings.database_url)

search_term = "$2"
with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT a.number, a.name, a.type, a.detail_type, p.number as parent_number
        FROM accounts a
        LEFT JOIN accounts p ON p.id = a.parent_id
        WHERE a.company_id = :company_id 
        AND (a.name ILIKE :search OR a.number LIKE :search)
        ORDER BY a.number
    '''), {'company_id': '00000000-0000-0000-0000-000000000001', 'search': f'%{search_term}%'})
    
    rows = [[r[0], r[1][:50], r[2], r[3] or '', r[4] or '-'] for r in result.fetchall()]
    print(f'\n=== SEARCH RESULTS FOR: {search_term} ===')
    if rows:
        print(tabulate(rows, headers=['Number', 'Name', 'Type', 'Detail', 'Parent'], tablefmt='grid'))
        print(f'\nFound: {len(rows)} accounts')
    else:
        print('No results found.')
EOF
    ;;
    
  count)
    python << 'EOF'
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from tabulate import tabulate

settings = get_settings()
engine = create_engine(settings.database_url)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT type, COUNT(*) as count
        FROM accounts
        WHERE company_id = :company_id
        GROUP BY type
        ORDER BY type
    '''), {'company_id': '00000000-0000-0000-0000-000000000001'})
    
    rows = result.fetchall()
    print('\n=== ACCOUNT COUNT BY TYPE ===')
    print(tabulate(rows, headers=['Account Type', 'Count'], tablefmt='grid'))
    
    total = conn.execute(text('''
        SELECT COUNT(*) FROM accounts WHERE company_id = :company_id
    '''), {'company_id': '00000000-0000-0000-0000-000000000001'}).fetchone()[0]
    print(f'\nTotal Accounts: {total}')
EOF
    ;;
    
  *)
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  all            Show all accounts"
    echo "  assets         Show only asset accounts"
    echo "  liabilities    Show only liability accounts"
    echo "  other          Show only other type accounts"
    echo "  search <term>  Search accounts by name or number"
    echo "  count          Show summary count by account type"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 assets"
    echo "  $0 search Cash"
    echo "  $0 count"
    ;;
esac
