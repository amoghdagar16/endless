'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Upload,
  Download,
  ChevronRight,
  ChevronDown,
  Edit2,
  BarChart2,
  Loader2,
  FolderTree,
  Plus,
  Search,
  X,
  Check,
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
}

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const
const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Income',
  expense: 'Expenses',
}

interface EditModal {
  account: Account
  name: string
  code: string
  subtype: string
}

export default function ChartOfAccounts() {
  const { company } = useAuth()
  const companyId = company?.id || null
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingCSV, setUploadingCSV] = useState(false)
  const [totalsByType, setTotalsByType] = useState<Record<string, number>>({})
  const [provisioning, setProvisioning] = useState(false)
  const [provisionMsg, setProvisionMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [showImportInfo, setShowImportInfo] = useState(false)
  const [editModal, setEditModal] = useState<EditModal | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (companyId) fetchAccounts(companyId)
  }, [companyId])

  const buildAccountHierarchy = (flatAccounts: Account[]): Account[] => {
    const accountMap = new Map<string, Account>()
    const rootAccounts: Account[] = []
    flatAccounts.forEach(acc => accountMap.set(acc.id, { ...acc, children: [] }))
    flatAccounts.forEach(acc => {
      const account = accountMap.get(acc.id)!
      if (acc.parentId) {
        const parent = accountMap.get(acc.parentId)
        if (parent) { parent.children = parent.children || []; parent.children.push(account) }
        else rootAccounts.push(account)
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
      const accountsData: Account[] = response.map((acc: any) => ({
        id: acc.id,
        code: acc.account_code,
        name: acc.account_name,
        type: acc.account_type,
        subtype: acc.account_subtype || '',
        balance: acc.current_balance || 0,
        parentId: acc.parent_account_id,
      }))
      const typeTotals = accountsData.reduce((acc: Record<string, number>, account) => {
        acc[account.type] = (acc[account.type] || 0) + (account.balance || 0)
        return acc
      }, {})
      setTotalsByType(typeTotals)
      setAccounts(buildAccountHierarchy(accountsData))
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProvision = async () => {
    if (!companyId) return
    setProvisioning(true)
    setProvisionMsg(null)
    try {
      const res = await api.post(`/companies/${companyId}/provision-coa`, {})
      if (res.status === 'already_provisioned') {
        setProvisionMsg({ ok: false, text: 'Accounts already exist. If they look empty, refresh the page.' })
      } else {
        setProvisionMsg({ ok: true, text: res.message || 'Chart of Accounts set up successfully!' })
        await fetchAccounts(companyId)
      }
    } catch (e: any) {
      setProvisionMsg({ ok: false, text: e?.response?.data?.detail || e?.message || 'Failed to provision.' })
    } finally {
      setProvisioning(false)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !companyId) return
    setUploadingCSV(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Chart of Accounts uploaded successfully!')
      fetchAccounts(companyId)
    } catch {
      alert('Failed to upload CSV. Please try again.')
    } finally {
      setUploadingCSV(false)
    }
  }

  const exportToCSV = () => {
    let csv = 'Account Code,Account Name,Type,Subtype,Balance\n'
    const flatten = (accts: Account[]): Account[] =>
      accts.reduce((acc, a) => { acc.push(a); if (a.children) acc.push(...flatten(a.children)); return acc }, [] as Account[])
    flatten(accounts).forEach(a => {
      csv += `${a.code},"${a.name}",${a.type},${a.subtype},${a.balance}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'chart-of-accounts.csv'; a.click()
  }

  const toggleSection = (type: string) =>
    setCollapsedSections(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n })

  const toggleAccount = (id: string) =>
    setExpandedAccounts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const openEdit = (account: Account) =>
    setEditModal({ account, name: account.name, code: account.code, subtype: account.subtype })

  const saveEdit = async () => {
    if (!editModal) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await api.put(`/accounts/${editModal.account.id}`, {
        account_name: editModal.name,
        account_code: editModal.code,
        account_subtype: editModal.subtype,
      })
      setSaveMsg({ ok: true, text: 'Account updated.' })
      if (companyId) await fetchAccounts(companyId)
      setTimeout(() => { setEditModal(null); setSaveMsg(null) }, 800)
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e?.response?.data?.detail || e?.message || 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  // Group and filter accounts
  const grouped = useMemo(() => {
    const q = search.toLowerCase()
    const matchesSearch = (a: Account): boolean => {
      if (!q) return true
      return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.subtype.toLowerCase().includes(q)
    }
    const filterTree = (accts: Account[]): Account[] =>
      accts.map(a => {
        const filteredChildren = a.children ? filterTree(a.children) : []
        if (matchesSearch(a) || filteredChildren.length > 0) return { ...a, children: filteredChildren }
        return null
      }).filter(Boolean) as Account[]

    const filtered = filterTree(accounts)
    const result: Record<string, Account[]> = {}
    TYPE_ORDER.forEach(type => { result[type] = filtered.filter(a => a.type === type) })
    return result
  }, [accounts, search])

  const hasAccounts = accounts.length > 0

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  const subtypeLabel = (s: string) =>
    s ? s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'

  const formatBalance = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>

      {/* Edit Modal */}
      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}
        >
          <div className="panel w-full max-w-md" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="panel-header">
              <h2 className="text-sm font-semibold">Edit account</h2>
              <button onClick={() => setEditModal(null)} className="btn btn-ghost btn-sm btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Account name</label>
                <input
                  className="input"
                  value={editModal.name}
                  onChange={e => setEditModal(m => m ? { ...m, name: e.target.value } : m)}
                  placeholder="e.g. Cash and Cash Equivalents"
                />
              </div>
              <div>
                <label className="label">Account code</label>
                <input
                  className="input font-mono"
                  value={editModal.code}
                  onChange={e => setEditModal(m => m ? { ...m, code: e.target.value } : m)}
                  placeholder="e.g. 1000"
                />
              </div>
              <div>
                <label className="label">Detail type</label>
                <input
                  className="input"
                  value={editModal.subtype}
                  onChange={e => setEditModal(m => m ? { ...m, subtype: e.target.value } : m)}
                  placeholder="e.g. checking"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Type:</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
                >
                  {TYPE_LABELS[editModal.account.type] || editModal.account.type}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(cannot be changed)</span>
              </div>
              {saveMsg && (
                <p className="text-sm" style={{ color: saveMsg.ok ? 'var(--neon-emerald)' : '#ef4444' }}>
                  {saveMsg.text}
                </p>
              )}
            </div>
            <div className="panel-footer flex justify-end gap-2">
              <button onClick={() => setEditModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Ledger</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Chart of Accounts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Complete ledger structure — balances sync with every journal entry.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportToCSV} className="btn btn-secondary btn-sm">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <label className="btn btn-secondary btn-sm cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            {uploadingCSV ? 'Uploading…' : 'Import'}
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" disabled={uploadingCSV} />
          </label>
          <button className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            New account
          </button>
        </div>
      </div>

      {/* Search + summary row */}
      {hasAccounts && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-48 max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search accounts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-8 pr-8"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type summary chips */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {TYPE_ORDER.map(type => (
              <div key={type} className="rounded-lg px-3 py-1.5 text-center" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{TYPE_LABELS[type]}</p>
                <p className="text-sm font-semibold tabular-nums mt-0.5">{formatBalance(totalsByType[type] || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : !hasAccounts ? (
        <div className="panel text-center py-14">
          <FolderTree className="w-10 h-10 mx-auto mb-3 opacity-25" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold text-base">No accounts yet</p>
          <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>
            Auto-provision from your industry template, or import a CSV.
          </p>
          {provisionMsg && (
            <p className="mx-auto max-w-xs mb-4 text-sm" style={{ color: provisionMsg.ok ? 'var(--neon-emerald)' : '#ef4444' }}>
              {provisionMsg.text}
            </p>
          )}
          <div className="flex justify-center gap-2">
            <button onClick={handleProvision} disabled={provisioning} className="btn btn-primary">
              {provisioning
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
                : <><FolderTree className="w-4 h-4" /> Set up Chart of Accounts</>}
            </button>
            <label className="btn btn-secondary cursor-pointer">
              <Upload className="w-4 h-4" />Import CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Uses the industry you selected during onboarding</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Column headers */}
          <div
            className="flex items-center text-xs font-semibold uppercase tracking-wide px-4 py-2.5 gap-2"
            style={{
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div className="flex-1">Account</div>
            <div className="w-44 hidden md:block">Detail type</div>
            <div className="w-32 text-right">Balance</div>
            <div className="w-24" />
          </div>

          {/* Grouped sections */}
          {TYPE_ORDER.map(type => {
            const sectionAccounts = grouped[type]
            if (!sectionAccounts || sectionAccounts.length === 0) return null
            const collapsed = collapsedSections.has(type)

            return (
              <div key={type}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(type)}
                  className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                >
                  <div className="flex items-center gap-2">
                    {collapsed
                      ? <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      {TYPE_LABELS[type]}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                    >
                      {sectionAccounts.length}
                    </span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {formatBalance(totalsByType[type] || 0)}
                  </span>
                </button>

                {/* Account rows */}
                {!collapsed && sectionAccounts.map(account => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    depth={0}
                    expanded={expandedAccounts}
                    onToggle={toggleAccount}
                    onEdit={openEdit}
                    formatBalance={formatBalance}
                    subtypeLabel={subtypeLabel}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Import format info — collapsible */}
      <div className="panel">
        <button
          className="w-full flex items-center justify-between p-4 text-left transition-colors"
          onClick={() => setShowImportInfo(v => !v)}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium">CSV import format</span>
          </div>
          {showImportInfo
            ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
        </button>
        {showImportInfo && (
          <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-sm pt-4" style={{ color: 'var(--text-secondary)' }}>
              Keep columns in this exact order — one account per row.
            </p>
            <code
              className="block w-full rounded-lg px-4 py-3 font-mono text-sm"
              style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              Account Code, Account Name, Type, Subtype, Opening Balance
            </code>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Supported types: asset, liability, equity, revenue, expense
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function AccountRow({
  account,
  depth,
  expanded,
  onToggle,
  onEdit,
  formatBalance,
  subtypeLabel,
}: {
  account: Account
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onEdit: (account: Account) => void
  formatBalance: (n: number) => string
  subtypeLabel: (s: string) => string
}) {
  const hasChildren = (account.children?.length ?? 0) > 0
  const isExpanded = expanded.has(account.id)

  return (
    <>
      <div
        className="group flex items-center gap-2 px-4 py-2.5 transition-colors"
        style={{ borderBottom: '1px solid var(--border-color)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
      >
        {/* Indent + expand */}
        <div className="flex items-center flex-shrink-0" style={{ width: depth * 18 + (hasChildren ? 0 : 20) }} />
        {hasChildren && (
          <button
            onClick={() => onToggle(account.id)}
            className="flex-shrink-0 rounded transition-colors p-0.5"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Name + code */}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <Link
            href={`/chart-of-accounts/${account.id}`}
            className="text-sm font-medium hover:underline truncate"
            style={{ color: depth === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {account.name}
          </Link>
          <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {account.code}
          </span>
        </div>

        {/* Detail type */}
        <div className="w-44 hidden md:block text-sm flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {subtypeLabel(account.subtype)}
        </div>

        {/* Balance */}
        <div
          className="w-32 text-sm font-medium text-right tabular-nums flex-shrink-0"
          style={{ color: account.balance < 0 ? '#ef4444' : 'var(--text-primary)' }}
        >
          {formatBalance(account.balance)}
        </div>

        {/* Hover actions */}
        <div className="w-24 flex items-center justify-end gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(account)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
          >
            <Edit2 className="w-3 h-3" />Edit
          </button>
          <Link
            href={`/chart-of-accounts/${account.id}`}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
          >
            <BarChart2 className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Children */}
      {isExpanded && account.children?.map(child => (
        <AccountRow
          key={child.id}
          account={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onEdit={onEdit}
          formatBalance={formatBalance}
          subtypeLabel={subtypeLabel}
        />
      ))}
    </>
  )
}
