'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Landmark, Plus, RefreshCw, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle2, X, ExternalLink, Search,
  ChevronDown, Loader2,
} from 'lucide-react'
import { usePlaidLink } from 'react-plaid-link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// ── Types ──────────────────────────────────────────────────────────

interface BankAccount {
  id: string
  name: string
  mask: string | null
  type: string
  institution_name: string | null
  balance_current: number
  balance_available: number | null
  linked_account_id: string | null
  accounts?: { id: string; account_code: string; account_name: string } | null
  pending_count: number
}

interface BankTransaction {
  id: string
  bank_account_id: string
  posted_date: string
  name: string
  merchant_name: string | null
  amount: number
  pending: boolean
  status: string
  is_outflow: boolean
  plaid_category: string[]
  user_selected_account_id: string | null
  memo: string | null
  bank_accounts?: { name: string; mask: string | null; institution_name: string | null } | null
}

interface GLAccount {
  id: string
  account_code: string
  account_name: string
  account_type: string
}

// ── Helpers ────────────────────────────────────────────────────────

const $ = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: 'var(--border-color)' }} />
}

// ── Account Card ───────────────────────────────────────────────────

function AccountCard({
  account, selected, onClick, onSync, syncing,
}: {
  account: BankAccount
  selected: boolean
  onClick: () => void
  onSync: (id: string) => void
  syncing: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const hasPending = account.pending_count > 0
  const isLinked = !!account.linked_account_id

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex-shrink-0 w-56 rounded-xl p-4 cursor-pointer transition-all"
      style={{
        background: selected ? 'var(--accent-subtle)' : 'var(--bg-card)',
        border: `2px solid ${selected ? 'var(--accent)' : hovered ? 'var(--border-color)' : 'var(--border-color)'}`,
        boxShadow: selected ? '0 0 20px rgba(59,130,246,0.08)' : 'none',
        transform: hovered && !selected ? 'translateY(-1px)' : 'none',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-medium truncate max-w-[130px]" style={{ color: 'var(--text-muted)' }}>
            {account.institution_name || 'Bank'}
          </p>
          <p className="text-sm font-semibold truncate max-w-[130px]" style={{ color: 'var(--text-primary)' }}>
            {account.name}{account.mask ? ` ···${account.mask}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {hasPending && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fbbf2420', color: '#fbbf24' }}>
              {account.pending_count}
            </span>
          )}
          {isLinked
            ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--neon-emerald)' }} />
            : <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
          }
        </div>
      </div>

      <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {$(account.balance_current)}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        Posted: {$(account.balance_current)}
      </p>

      <button
        onClick={(e) => { e.stopPropagation(); onSync(account.id) }}
        disabled={syncing}
        className="mt-3 flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-70"
        style={{ color: 'var(--accent)' }}
      >
        {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        Sync
      </button>
    </div>
  )
}

// ── Category Select ────────────────────────────────────────────────

function CategorySelect({
  value, glAccounts, onChange, placeholder = 'Select category',
}: {
  value: string | null
  glAccounts: GLAccount[]
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selected = glAccounts.find(a => a.id === value)
  const filtered = glAccounts.filter(a =>
    `${a.account_code} ${a.account_name}`.toLowerCase().includes(search.toLowerCase())
  )

  const grouped: Record<string, GLAccount[]> = {}
  filtered.forEach(a => {
    const g = a.account_type || 'other'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(a)
  })

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg min-w-[140px] max-w-[200px] transition-colors"
        style={{
          background: open ? 'var(--bg-secondary)' : 'transparent',
          border: '1px solid var(--border-color)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="truncate flex-1 text-left">
          {selected ? `${selected.account_code} ${selected.account_name}` : placeholder}
        </span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-72 rounded-xl overflow-hidden shadow-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', top: '100%', left: 0 }}
        >
          <div className="p-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..."
              className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {Object.entries(grouped).map(([type, accounts]) => (
              <div key={type}>
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium sticky top-0" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                  {type}
                </p>
                {accounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { onChange(a.id); setOpen(false); setSearch('') }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                    style={{ color: a.id === value ? 'var(--accent)' : 'var(--text-primary)', background: a.id === value ? 'rgba(0,255,255,0.05)' : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = a.id === value ? 'rgba(0,255,255,0.05)' : 'transparent')}
                  >
                    <span className="font-mono opacity-60 flex-shrink-0">{a.account_code}</span>
                    <span className="truncate">{a.account_name}</span>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No accounts found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Post Modal ─────────────────────────────────────────────────────

function PostModal({
  txn, glAccounts, bankGlId, onPost, onClose,
}: {
  txn: BankTransaction
  glAccounts: GLAccount[]
  bankGlId: string | null
  onPost: (txnId: string, accountId: string, memo: string, bankGlId: string) => void
  onClose: () => void
}) {
  const [accountId, setAccountId] = useState(txn.user_selected_account_id || '')
  const [selectedBankGlId, setSelectedBankGlId] = useState(bankGlId || '')
  const [memo, setMemo] = useState(txn.memo || txn.name)
  const [posting, setPosting] = useState(false)

  const cashAccounts = glAccounts.filter(a =>
    ['asset', 'bank', 'cash'].some(t => a.account_type?.toLowerCase().includes(t)) ||
    ['cash', 'checking', 'savings', 'bank'].some(w => a.account_name?.toLowerCase().includes(w))
  )

  async function handlePost() {
    if (!accountId || !selectedBankGlId) return
    setPosting(true)
    await onPost(txn.id, accountId, memo, selectedBankGlId)
    setPosting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Post Transaction to Journal</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>{txn.name}</span>
              <span className="font-semibold tabular-nums" style={{ color: txn.is_outflow ? '#f87171' : 'var(--neon-emerald)' }}>
                {txn.is_outflow ? '-' : '+'}{$(txn.amount)}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtDate(txn.posted_date)}</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Bank / Cash Account <span style={{ color: '#f87171' }}>*</span>
            </label>
            <CategorySelect
              value={selectedBankGlId}
              glAccounts={cashAccounts.length ? cashAccounts : glAccounts}
              onChange={setSelectedBankGlId}
              placeholder="Select bank GL account..."
            />
            {!selectedBankGlId && (
              <p className="text-xs mt-1" style={{ color: '#fbbf24' }}>Which cash/bank account does this transaction belong to?</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Category (GL Account) <span style={{ color: '#f87171' }}>*</span>
            </label>
            <CategorySelect
              value={accountId}
              glAccounts={glAccounts}
              onChange={setAccountId}
              placeholder="Select category..."
            />
            {!accountId && (
              <p className="text-xs mt-1" style={{ color: '#fbbf24' }}>
                {txn.is_outflow ? 'Debit this account, credit the bank' : 'Credit this account, debit the bank'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Memo</label>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>Cancel</button>
          <button
            onClick={handlePost}
            disabled={!accountId || !selectedBankGlId || posting}
            className="btn btn-primary flex-1"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Post to Journal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────

export default function BankingPage() {
  const { company, loading: authLoading, refreshUser } = useAuth()
  const co = company as any
  const [companyRetryCount, setCompanyRetryCount] = useState(0)

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'posted' | 'excluded'>('pending')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [txnLoading, setTxnLoading] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [postingTxn, setPostingTxn] = useState<BankTransaction | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Load initial data ──
  const loadAccounts = useCallback(async () => {
    if (!co?.id) return
    try {
      const res = await api.get('/bank/accounts')
      setAccounts(Array.isArray(res) ? res : [])
    } catch { setAccounts([]) }
  }, [co?.id])

  const loadTransactions = useCallback(async () => {
    if (!co?.id) return
    setTxnLoading(true)
    try {
      const params = new URLSearchParams({ status: tab, limit: '100' })
      if (selectedAccountId) params.set('bank_account_id', selectedAccountId)
      if (search) params.set('search', search)
      const res = await api.get(`/bank/transactions?${params}`)
      setTransactions(res.transactions || [])
    } catch { setTransactions([]) }
    finally { setTxnLoading(false) }
  }, [co?.id, tab, selectedAccountId, search])

  useEffect(() => {
    if (authLoading) return
    if (co?.id) return
    if (companyRetryCount >= 3) return
    refreshUser().finally(() => setCompanyRetryCount(c => c + 1))
  }, [authLoading, co?.id, companyRetryCount, refreshUser])

  useEffect(() => {
    if (!co?.id) { setLoading(false); return }
    Promise.all([
      loadAccounts(),
      api.get('/bank/gl-accounts').then(setGlAccounts).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [co?.id])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  // ── Plaid Link ──
  async function fetchLinkToken() {
    setLinkLoading(true)
    try {
      const res = await api.post('/bank/plaid/link-token')
      setLinkToken(res.link_token)
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to get link token', 'error')
    } finally {
      setLinkLoading(false)
    }
  }

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken || '',
    onSuccess: async (publicToken, metadata) => {
      try {
        await api.post('/bank/plaid/exchange-token', {
          public_token: publicToken,
          institution_name: metadata.institution?.name || 'Bank',
          institution_id: metadata.institution?.institution_id,
        })
        showToast('Bank connected successfully!')
        setLinkToken(null)
        await loadAccounts()
        await loadTransactions()
      } catch (e: any) {
        showToast(e?.response?.data?.detail || 'Failed to connect bank', 'error')
      }
    },
    onExit: () => setLinkToken(null),
  })

  useEffect(() => {
    if (linkToken && plaidReady) openPlaid()
  }, [linkToken, plaidReady])

  async function handleSync(bankAccountId: string) {
    setSyncingId(bankAccountId)
    try {
      // Get connections and find the one for this bank account
      const conns = await api.get('/bank/connections')
      // Sync all connections (simple approach — syncs are idempotent via cursor)
      for (const conn of conns) {
        await api.post(`/bank/plaid/sync/${conn.id}`).catch(() => {})
      }
      showToast('Transactions synced!')
      await loadAccounts()
      await loadTransactions()
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Sync failed', 'error')
    } finally {
      setSyncingId(null)
    }
  }

  async function handleCategorize(txnId: string, accountId: string) {
    await api.patch(`/bank/transactions/${txnId}`, { user_selected_account_id: accountId })
    setTransactions(ts => ts.map(t => t.id === txnId ? { ...t, user_selected_account_id: accountId } : t))
  }

  async function handleExclude(txnId: string) {
    await api.post(`/bank/transactions/${txnId}/exclude`)
    setTransactions(ts => ts.filter(t => t.id !== txnId))
    showToast('Transaction excluded')
  }

  async function handlePost(txnId: string, accountId: string, memo: string, bankGlId: string) {
    try {
      const res = await api.post(`/bank/transactions/${txnId}/post`, { account_id: accountId, bank_gl_id: bankGlId, memo })
      setTransactions(ts => ts.filter(t => t.id !== txnId))
      setPostingTxn(null)
      showToast(`Posted as ${res.journal_number}`)
      await loadAccounts()
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || JSON.stringify(e?.response?.data) || 'Failed to post'
      showToast(detail, 'error')
    }
  }

  // ── Render guards ──
  if (authLoading || (!co?.id && companyRetryCount < 3)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your banking workspace...</p>
      </div>
    )
  }

  if (!co?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <Landmark className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Complete onboarding to use Banking.</p>
      </div>
    )
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  return (
    <div className="flex flex-col min-h-screen" style={{ color: 'var(--text-primary)' }}>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg max-w-sm w-max"
          style={{
            background: toast.type === 'success' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
            border: `1px solid ${toast.type === 'success' ? 'var(--neon-emerald)' : '#f87171'}`,
            color: toast.type === 'success' ? 'var(--neon-emerald)' : '#f87171',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Banking</p>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Bank Transactions</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Connect your bank and automatically import transactions.</p>
          </div>
          <button
            onClick={fetchLinkToken}
            disabled={linkLoading}
            className="btn btn-primary"
          >
            {linkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Link Account
          </button>
        </div>

        {/* ── Account Cards ── */}
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="w-56 h-32 flex-shrink-0" />)}
          </div>
        ) : (
          <div className="relative">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl" style={{ border: '2px dashed var(--border-color)' }}>
                <Landmark className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No bank accounts connected</p>
                <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Link your bank to automatically import transactions</p>
                <button onClick={fetchLinkToken} className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Link Account
                </button>
              </div>
            ) : (
              <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                <div
                  onClick={() => setSelectedAccountId(null)}
                  className="flex-shrink-0 w-40 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-center items-center gap-2"
                  style={{
                    background: selectedAccountId === null ? 'var(--accent-subtle)' : 'var(--bg-card)',
                    border: `2px solid ${selectedAccountId === null ? 'var(--accent)' : 'var(--border-color)'}`,
                  }}
                >
                  <Landmark className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  <p className="text-sm font-semibold text-center" style={{ color: 'var(--text-primary)' }}>All Accounts</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{accounts.length} connected</p>
                </div>
                {accounts.map(acct => (
                  <AccountCard
                    key={acct.id}
                    account={acct}
                    selected={selectedAccountId === acct.id}
                    onClick={() => setSelectedAccountId(acct.id)}
                    onSync={handleSync}
                    syncing={syncingId === acct.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tabs + Search ── */}
        {accounts.length > 0 && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              {(['pending', 'posted', 'excluded'] as const).map((t, i) => {
                const labels = { pending: 'Pending', posted: 'Posted', excluded: 'Excluded' }
                const count = t === 'pending' ? accounts.reduce((s, a) => s + (a.pending_count || 0), 0) : null
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
                    style={{
                      background: tab === t ? 'var(--accent)' : 'var(--bg-card)',
                      color: tab === t ? '#fff' : 'var(--text-muted)',
                      borderLeft: i > 0 ? '1px solid var(--border-color)' : 'none',
                    }}
                  >
                    {labels[t]}
                    {count !== null && count > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Transactions Table ── */}
        {accounts.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
            {txnLoading ? (
              <div className="space-y-0">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--neon-emerald)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {tab === 'pending' ? 'All caught up — no pending transactions' : `No ${tab} transactions`}
                </p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    {['Date', 'Description', 'Account', 'Spent', 'Received', 'Category', 'Action'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${i >= 3 ? 'text-right' : ''}`}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <TransactionRow
                      key={txn.id}
                      txn={txn}
                      tab={tab}
                      glAccounts={glAccounts}
                      onCategorize={handleCategorize}
                      onExclude={handleExclude}
                      onPost={() => setPostingTxn(txn)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Post Modal ── */}
      {postingTxn && (
        <PostModal
          txn={postingTxn}
          glAccounts={glAccounts}
          bankGlId={accounts.find(a => a.id === postingTxn.bank_account_id)?.linked_account_id || null}
          onPost={handlePost}
          onClose={() => setPostingTxn(null)}
        />
      )}
    </div>
  )
}

// ── Transaction Row ────────────────────────────────────────────────

function TransactionRow({
  txn, tab, glAccounts, onCategorize, onExclude, onPost,
}: {
  txn: BankTransaction
  tab: string
  glAccounts: GLAccount[]
  onCategorize: (id: string, accountId: string) => void
  onExclude: (id: string) => void
  onPost: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--border-color)',
        background: hovered ? 'var(--bg-secondary)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Date */}
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {fmtDate(txn.posted_date)}
        {txn.pending && <span className="ml-1 text-[10px] px-1 py-0.5 rounded" style={{ background: '#fbbf2420', color: '#fbbf24' }}>Pending</span>}
      </td>

      {/* Description */}
      <td className="px-4 py-3 max-w-[200px]">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{txn.name}</p>
        {txn.merchant_name && txn.merchant_name !== txn.name && (
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{txn.merchant_name}</p>
        )}
      </td>

      {/* Account */}
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {txn.bank_accounts?.name}{txn.bank_accounts?.mask ? ` ···${txn.bank_accounts.mask}` : ''}
      </td>

      {/* Spent */}
      <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">
        {txn.is_outflow
          ? <span style={{ color: '#f87171' }}>{$(txn.amount)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>

      {/* Received */}
      <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">
        {!txn.is_outflow
          ? <span style={{ color: 'var(--neon-emerald)' }}>{$(txn.amount)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        {tab !== 'excluded' && tab !== 'posted' ? (
          <CategorySelect
            value={txn.user_selected_account_id}
            glAccounts={glAccounts}
            onChange={(id) => onCategorize(txn.id, id)}
          />
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {glAccounts.find(a => a.id === txn.user_selected_account_id)?.account_name || '—'}
          </span>
        )}
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        {tab === 'pending' && (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={onPost}
              className="btn btn-primary btn-xs"
            >
              Post
            </button>
            <button
              onClick={() => onExclude(txn.id)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
              title="Exclude"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {tab === 'posted' && (
          <span className="flex items-center gap-1 text-xs justify-end" style={{ color: 'var(--neon-emerald)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Posted
          </span>
        )}
        {tab === 'excluded' && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Excluded</span>
        )}
      </td>
    </tr>
  )
}
