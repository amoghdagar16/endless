#!/usr/bin/env python3
"""
Script to view Chart of Accounts from the database in tabular format.

Usage:
    python view_accounts.py [options]

Options:
    --limit N       Show only first N records (default: all)
    --type TYPE     Filter by account type (asset, liability, equity, income, expense, other)
    --search TEXT   Search in account name or number
"""

import sys
import argparse
from sqlalchemy import create_engine, text
from tabulate import tabulate

# Add backend to path
sys.path.insert(0, 'backend')
from app.core.settings import get_settings


def view_accounts(limit=None, account_type=None, search=None):
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    print('=' * 140)
    print('CHART OF ACCOUNTS - DATABASE VIEW')
    print('=' * 140)
    
    # Build query
    query = '''
        SELECT 
            a.number,
            a.name,
            a.type,
            a.detail_type,
            p.number as parent_number,
            a.is_active,
            a.opening_balance,
            a.opening_balance_date
        FROM accounts a
        LEFT JOIN accounts p ON p.id = a.parent_id
        WHERE a.company_id = :company_id
    '''
    
    params = {'company_id': '00000000-0000-0000-0000-000000000001'}
    
    if account_type:
        query += ' AND a.type = :account_type'
        params['account_type'] = account_type.lower()
    
    if search:
        query += ' AND (a.name ILIKE :search OR a.number LIKE :search)'
        params['search'] = f'%{search}%'
    
    query += ' ORDER BY a.number'
    
    if limit:
        query += f' LIMIT {limit}'
    
    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        rows = result.fetchall()
        
        if not rows:
            print('No records found.')
            return
        
        headers = ['Number', 'Name', 'Type', 'Detail Type', 'Parent', 'Active', 'Opening Bal', 'Bal Date']
        
        # Format rows for display
        formatted_rows = []
        for row in rows:
            formatted_rows.append([
                row[0],
                row[1][:50] if row[1] else '',  # Truncate long names
                row[2],
                (row[3] or '')[:20],  # Truncate detail type
                row[4] or '-',
                '✓' if row[5] else '✗',
                f'{row[6]:.2f}' if row[6] else '-',
                str(row[7]) if row[7] else '-'
            ])
        
        print(tabulate(formatted_rows, headers=headers, tablefmt='grid'))
        print(f'\nTotal Records: {len(rows)}')
        
        # Summary by type
        summary_query = '''
            SELECT type, COUNT(*) as count
            FROM accounts
            WHERE company_id = :company_id
            GROUP BY type
            ORDER BY type
        '''
        result = conn.execute(text(summary_query), {'company_id': '00000000-0000-0000-0000-000000000001'})
        summary_rows = result.fetchall()
        
        print('\nSUMMARY BY TYPE:')
        print(tabulate(summary_rows, headers=['Account Type', 'Count'], tablefmt='simple'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='View Chart of Accounts from database')
    parser.add_argument('--limit', type=int, help='Limit number of records shown')
    parser.add_argument('--type', type=str, help='Filter by account type')
    parser.add_argument('--search', type=str, help='Search in account name or number')
    
    args = parser.parse_args()
    
    view_accounts(limit=args.limit, account_type=args.type, search=args.search)
