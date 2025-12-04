'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Upload,
  Download,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  Loader2,
  FolderTree
} from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  subtype: string
  balance: number
  parentId?: string
  children?: Account[]
  isExpanded?: boolean
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingCSV, setUploadingCSV] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      // Mock data - replace with API call
      const mockAccounts: Account[] = [
        {
          id: '1',
          code: '1000',
          name: 'Assets',
          type: 'asset',
          subtype: 'parent',
          balance: 250000,
          children: [
            { id: '1.1', code: '1010', name: 'Cash', type: 'asset', subtype: 'bank', balance: 50000, parentId: '1' },
            { id: '1.2', code: '1020', name: 'Accounts Receivable', type: 'asset', subtype: 'current_asset', balance: 80000, parentId: '1' },
            { id: '1.3', code: '1030', name: 'Inventory', type: 'asset', subtype: 'inventory', balance: 120000, parentId: '1' },
          ]
        },
        {
          id: '2',
          code: '2000',
          name: 'Liabilities',
          type: 'liability',
          subtype: 'parent',
          balance: 120000,
          children: [
            { id: '2.1', code: '2010', name: 'Accounts Payable', type: 'liability', subtype: 'current_liability', balance: 45000, parentId: '2' },
            { id: '2.2', code: '2020', name: 'Credit Card', type: 'liability', subtype: 'credit_card', balance: 15000, parentId: '2' },
            { id: '2.3', code: '2030', name: 'Long-term Debt', type: 'liability', subtype: 'long_term_liability', balance: 60000, parentId: '2' },
          ]
        },
        {
          id: '3',
          code: '3000',
          name: 'Equity',
          type: 'equity',
          subtype: 'parent',
          balance: 130000,
          children: [
            { id: '3.1', code: '3010', name: 'Owner\'s Equity', type: 'equity', subtype: 'owner_equity', balance: 100000, parentId: '3' },
            { id: '3.2', code: '3020', name: 'Retained Earnings', type: 'equity', subtype: 'retained_earnings', balance: 30000, parentId: '3' },
          ]
        },
        {
          id: '4',
          code: '4000',
          name: 'Revenue',
          type: 'revenue',
          subtype: 'parent',
          balance: 500000,
          children: [
            { id: '4.1', code: '4010', name: 'Sales Revenue', type: 'revenue', subtype: 'income', balance: 450000, parentId: '4' },
            { id: '4.2', code: '4020', name: 'Other Income', type: 'revenue', subtype: 'other_income', balance: 50000, parentId: '4' },
          ]
        },
        {
          id: '5',
          code: '5000',
          name: 'Expenses',
          type: 'expense',
          subtype: 'parent',
          balance: 370000,
          children: [
            { id: '5.1', code: '5010', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cost_of_goods_sold', balance: 200000, parentId: '5' },
            { id: '5.2', code: '5020', name: 'Payroll', type: 'expense', subtype: 'operating_expense', balance: 100000, parentId: '5' },
            { id: '5.3', code: '5030', name: 'Rent', type: 'expense', subtype: 'operating_expense', balance: 40000, parentId: '5' },
            { id: '5.4', code: '5040', name: 'Marketing', type: 'expense', subtype: 'operating_expense', balance: 30000, parentId: '5' },
          ]
        },
      ]
      setAccounts(mockAccounts)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCSV(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Chart of Accounts uploaded successfully!')
      fetchAccounts()
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      alert('Failed to upload CSV. Please try again.')
    } finally {
      setUploadingCSV(false)
    }
  }

  const exportToCSV = () => {
    // Generate CSV export
    let csv = 'Account Code,Account Name,Type,Subtype,Balance\n'
    const flattenAccounts = (accts: Account[]): Account[] => {
      return accts.reduce((acc, account) => {
        acc.push(account)
        if (account.children) {
          acc.push(...flattenAccounts(account.children))
        }
        return acc
      }, [] as Account[])
    }

    const allAccounts = flattenAccounts(accounts)
    allAccounts.forEach(account => {
      csv += `${account.code},"${account.name}",${account.type},${account.subtype},${account.balance}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chart-of-accounts.csv'
    a.click()
  }

  const toggleExpand = (accountId: string) => {
    setAccounts(prevAccounts =>
      prevAccounts.map(account => {
        if (account.id === accountId) {
          return { ...account, isExpanded: !account.isExpanded }
        }
        return account
      })
    )
  }

  const getTypeColor = (type: string) => {
    const colors = {
      asset: 'text-green-700 bg-green-50',
      liability: 'text-red-700 bg-red-50',
      equity: 'text-blue-700 bg-blue-50',
      revenue: 'text-purple-700 bg-purple-50',
      expense: 'text-orange-700 bg-orange-50',
    }
    return colors[type as keyof typeof colors] || 'text-gray-700 bg-gray-50'
  }

  const filteredAccounts = filter === 'all'
    ? accounts
    : accounts.filter(a => a.type === filter)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your account structure and balances</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="btn btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <label className="btn btn-secondary cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {uploadingCSV ? 'Uploading...' : 'Upload CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
              disabled={uploadingCSV}
            />
          </label>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Account
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === type
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Accounts Tree */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div className="col-span-1">Code</div>
            <div className="col-span-4">Account Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Subtype</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-1"></div>
          </div>

          {/* Accounts */}
          {filteredAccounts.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredAccounts.map(account => (
                <div key={account.id}>
                  {/* Parent Account */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="col-span-1 font-mono text-sm text-gray-900">{account.code}</div>
                    <div className="col-span-4 flex items-center gap-2">
                      {account.children && account.children.length > 0 && (
                        <button
                          onClick={() => toggleExpand(account.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {account.isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <span className="font-medium text-gray-900">{account.name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(account.type)}`}>
                        {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {account.subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-900">
                      ${account.balance.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-end gap-2">
                      <button className="text-gray-400 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Child Accounts */}
                  {account.isExpanded && account.children?.map(child => (
                    <div
                      key={child.id}
                      className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="col-span-1 font-mono text-sm text-gray-700 pl-8">{child.code}</div>
                      <div className="col-span-4 pl-8 text-sm text-gray-900">{child.name}</div>
                      <div className="col-span-2">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(child.type)}`}>
                          {child.type.charAt(0).toUpperCase() + child.type.slice(1)}
                        </span>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600">
                        {child.subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="col-span-2 text-right text-sm font-medium text-gray-900">
                        ${child.balance.toLocaleString()}
                      </div>
                      <div className="col-span-1 flex justify-end gap-2">
                        <button className="text-gray-400 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FolderTree className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No accounts found</p>
              <p className="text-sm mt-1">Upload a CSV or create your first account</p>
            </div>
          )}
        </div>
      )}

      {/* CSV Upload Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">CSV Upload Format</h3>
        <p className="text-sm text-blue-700 mb-3">
          Your CSV file should have the following columns:
        </p>
        <code className="block bg-white px-4 py-2 rounded-lg text-sm text-gray-800 border border-blue-200">
          Account Code, Account Name, Type, Subtype, Opening Balance
        </code>
        <p className="text-xs text-blue-600 mt-2">
          Types: asset, liability, equity, revenue, expense
        </p>
      </div>
    </div>
  )
}
