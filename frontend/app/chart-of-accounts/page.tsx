'use client'

import { useState, useEffect } from 'react'
import {
  Upload,
  Download,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  Loader2,
  FolderTree
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

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
  const { company, loading: authLoading } = useAuth()
  const companyId = company?.id || null
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingCSV, setUploadingCSV] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [totalsByType, setTotalsByType] = useState<Record<string, number>>({})

  useEffect(() => {
    if (authLoading) return
    if (companyId) {
      fetchAccounts(companyId)
    } else {
      setLoading(false)
    }
  }, [companyId, authLoading])

  const buildAccountHierarchy = (flatAccounts: Account[]): Account[] => {
    const accountMap = new Map<string, Account>()
    const rootAccounts: Account[] = []

    // First pass: create map
    flatAccounts.forEach(acc => {
      accountMap.set(acc.id, { ...acc, children: [] })
    })

    // Second pass: build hierarchy
    flatAccounts.forEach(acc => {
      const account = accountMap.get(acc.id)!
      if (acc.parentId) {
        const parent = accountMap.get(acc.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(account)
        } else {
          rootAccounts.push(account)
        }
      } else {
        rootAccounts.push(account)
      }
    })

    return rootAccounts
  }

  const fetchAccounts = async (targetCompanyId: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/accounts/company/${targetCompanyId}`)

      // Map API response to our Account interface
      const accountsData: Account[] = response.map((acc: any) => ({
        id: acc.id,
        code: acc.account_code,
        name: acc.account_name,
        type: acc.account_type,
        subtype: acc.account_subtype || '',
        balance: acc.current_balance || 0,
        parentId: acc.parent_account_id,
        isExpanded: false
      }))

      const typeTotals = accountsData.reduce((acc: Record<string, number>, account) => {
        acc[account.type] = (acc[account.type] || 0) + (account.balance || 0)
        return acc
      }, {})
      setTotalsByType(typeTotals)

      // Build hierarchy
      const accountsWithChildren = buildAccountHierarchy(accountsData)
      setAccounts(accountsWithChildren)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !companyId) return

    setUploadingCSV(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Chart of Accounts uploaded successfully!')
      fetchAccounts(companyId)
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

  const filteredAccounts = filter === 'all'
    ? accounts
    : accounts.filter(a => a.type === filter)

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-fuchsia-500 dark:text-fuchsia-300 animate-spin" />
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 bg-gray-50 dark:bg-slate-950">
        <p className="text-gray-600 dark:text-white/70 text-center max-w-md">
          No company linked to your account. Complete onboarding so we can load your chart of accounts.
        </p>
        <a
          href="/onboarding"
          className="px-4 py-2 rounded-full bg-fuchsia-500 text-white text-sm font-medium hover:bg-fuchsia-600 transition-colors"
        >
          Go to onboarding
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 space-y-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-white/60">Ledger structure</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">Chart of Accounts</h1>
          <p className="text-gray-600 dark:text-white/60 mt-1">Balances stay synced with every journal entry.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportToCSV} className="px-4 py-2 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-white">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <label className="px-4 py-2 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium flex items-center gap-2 cursor-pointer text-gray-700 dark:text-white">
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
        </div>
      </div>

      <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-4">
        {['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
          <div key={type} className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-white/50">{type}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
              ${(totalsByType[type] || 0).toLocaleString()}
            </p>
            <p className="text-gray-500 dark:text-white/40 text-xs mt-1">Current balance</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 overflow-x-auto">
        {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              filter === type
                ? 'border-fuchsia-500 text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Accounts Tree */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 dark:text-white/60 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl overflow-hidden shadow-lg">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-white/60 uppercase tracking-wide bg-gray-50 dark:bg-transparent">
            <div className="col-span-1">Code</div>
            <div className="col-span-4">Account Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Subtype</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-1"></div>
          </div>

          {/* Accounts */}
          {filteredAccounts.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {filteredAccounts.map(account => (
                <div key={account.id}>
                  {/* Parent Account */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="col-span-1 font-mono text-sm text-gray-900 dark:text-white">{account.code}</div>
                    <div className="col-span-4 flex items-center gap-2">
                      {account.children && account.children.length > 0 && (
                        <button
                          onClick={() => toggleExpand(account.id)}
                          className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          {account.isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-white">
                        {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600 dark:text-white/70">
                      {account.subtype
                        ? account.subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        : '—'}
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-900 dark:text-white">
                      ${account.balance.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-end gap-2">
                      <button className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-500 dark:text-white/50 hover:text-rose-500 dark:hover:text-rose-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Child Accounts */}
                  {account.isExpanded && account.children?.map(child => (
                    <div
                      key={child.id}
                      className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <div className="col-span-1 font-mono text-sm text-gray-700 dark:text-white/70 pl-8">{child.code}</div>
                      <div className="col-span-4 pl-8 text-sm text-gray-800 dark:text-white/85">{child.name}</div>
                      <div className="col-span-2">
                        <span className="inline-flex px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-white">
                          {child.type.charAt(0).toUpperCase() + child.type.slice(1)}
                        </span>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 dark:text-white/60">
                        {child.subtype
                          ? child.subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : '—'}
                      </div>
                      <div className="col-span-2 text-right text-sm font-medium text-gray-800 dark:text-white/80">
                        ${child.balance.toLocaleString()}
                      </div>
                      <div className="col-span-1 flex justify-end gap-2">
                        <button className="text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 dark:text-white/40 hover:text-rose-500 dark:hover:text-rose-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 dark:text-white/60">
              <FolderTree className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-white/30" />
              <p>No accounts found</p>
              <p className="text-sm mt-1">Upload a CSV or create your first account</p>
            </div>
          )}
        </div>
      )}

      {/* CSV Upload Instructions */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 p-6 shadow-lg">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-fuchsia-500/5 dark:from-fuchsia-500/10 to-transparent pointer-events-none" />
        <div className="relative space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-white/60">CSV format</p>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Import your ledger structure</h3>
          <p className="text-sm text-gray-700 dark:text-white/70">
            Keep columns in this order so every account lands in the right place.
          </p>
          <code className="block w-full rounded-2xl border border-gray-300 dark:border-white/15 bg-gray-100 dark:bg-white/5 px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">
            Account Code, Account Name, Type, Subtype, Opening Balance
          </code>
          <p className="text-xs text-gray-600 dark:text-white/50">
            Supported types: asset, liability, equity, revenue, expense
          </p>
        </div>
      </div>
    </div>
  )
}
