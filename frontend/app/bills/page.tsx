'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Receipt, Loader2, Plus, X, Send, CheckCircle,
  ChevronDown, ChevronUp, UserPlus, Search,
  ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal,
  DollarSign, AlertCircle, TrendingDown, BarChart2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useCompanyReady } from '@/hooks/useCompanyReady'

interface Contact { id: string; display_name: string; email?: string; contact_type: string }
interface Account { id: string; account_code: string; account_name: string; account_type: string }
interface BillLine { key: string; line_number: number; description: string; amount: number; expense_account_id: string }

const INP = 'input'
const INP_S: React.CSSProperties = {}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    posted:  { backgroundColor: 'rgba(52,211,153,0.12)', color: 'var(--neon-emerald)', border: '1px solid rgba(52,211,153,0.25)' },
    paid:    { backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8',             border: '1px solid rgba(99,102,241,0.25)' },
    draft:   { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',  border: '1px solid var(--border-color)'   },
    void:    { backgroundColor: 'rgba(239,68,68,0.08)',  color: '#ef4444',             border: '1px solid rgba(239,68,68,0.2)'   },
    overdue: { backgroundColor: 'rgba(239,68,68,0.12)',  color: '#f87171',             border: '1px solid rgba(239,68,68,0.3)'   },
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={styles[status] || styles.draft}>
      {status}
    </span>
  )
}

export default function BillsPage() {
  const { companyId, companyLoading, companyMissing } = useCompanyReady()

  const [bills, setBills] = useState<any[]>([])
  const [vendors, setVendors] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<BillLine[]>([])
  const [saving, setSaving] = useState(false)

  const [showAddVendor, setShowAddVendor] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [newVendorEmail, setNewVendorEmail] = useState('')
  const [addingVendor, setAddingVendor] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<any>(null)

  // list filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortField, setSortField] = useState('bill_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const PAGE_SIZE = 25

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    Promise.all([
      api.get('/bills/').catch(() => []),
      api.get('/contacts/?contact_type=vendor').catch(() => []),
      api.get(`/accounts/company/${companyId}`).catch(() => []),
    ]).then(([b, vend, accts]) => {
      setBills(Array.isArray(b) ? b : [])
      setVendors(Array.isArray(vend) ? vend : [])
      setAccounts(Array.isArray(accts) ? accts : [])
    }).finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const expenseAccounts = accounts.filter(a => a.account_type === 'expense')
  const billTotal = lines.reduce((s, l) => s + (l.amount || 0), 0)

  const fetchBills = async () => {
    const data = await api.get('/bills/').catch(() => [])
    setBills(Array.isArray(data) ? data : [])
  }

  const handleAddVendor = async () => {
    if (!newVendorName.trim()) return
    setAddingVendor(true)
    try {
      const v = await api.post('/contacts/', {
        contact_type: 'vendor',
        display_name: newVendorName.trim(),
        ...(newVendorEmail.trim() ? { email: newVendorEmail.trim() } : {}),
      })
      const data = await api.get('/contacts/?contact_type=vendor').catch(() => [])
      setVendors(Array.isArray(data) ? data : [])
      setSelectedVendorId(v.id)
      setShowAddVendor(false)
      setNewVendorName(''); setNewVendorEmail('')
      setToast({ ok: true, msg: `Vendor "${v.display_name}" created.` })
    } catch {
      setToast({ ok: false, msg: 'Failed to create vendor.' })
    } finally { setAddingVendor(false) }
  }

  const addLine = () => {
    setLines(ls => [...ls, {
      key: `${Date.now()}-${Math.random()}`,
      line_number: ls.length + 1,
      description: '',
      amount: 0,
      expense_account_id: expenseAccounts[0]?.id || '',
    }])
  }

  const updateLine = (key: string, field: string, value: any) =>
    setLines(ls => ls.map(l => l.key === key ? { ...l, [field]: value } : l))

  const removeLine = (key: string) =>
    setLines(ls => ls.filter(l => l.key !== key).map((l, i) => ({ ...l, line_number: i + 1 })))

  const handleCreateBill = async () => {
    if (!selectedVendorId) { setToast({ ok: false, msg: 'Select a vendor.' }); return }
    if (lines.length === 0) { setToast({ ok: false, msg: 'Add at least one line item.' }); return }
    for (const l of lines) {
      if (!l.expense_account_id) { setToast({ ok: false, msg: `Line ${l.line_number} needs an expense account.` }); return }
      if (l.amount <= 0) { setToast({ ok: false, msg: `Line ${l.line_number} needs an amount > 0.` }); return }
    }
    setSaving(true)
    try {
      await api.post('/bills/', {
        vendor_id: selectedVendorId,
        bill_date: billDate,
        due_date: dueDate || billDate,
        ...(memo ? { memo } : {}),
        lines: lines.map(l => ({
          line_number: l.line_number,
          description: l.description,
          amount: l.amount,
          expense_account_id: l.expense_account_id,
        })),
      })
      setToast({ ok: true, msg: 'Bill created as draft.' })
      resetForm()
      await fetchBills()
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to create bill.' })
    } finally { setSaving(false) }
  }

  const resetForm = () => {
    setShowCreateForm(false)
    setSelectedVendorId(''); setBillDate(new Date().toISOString().split('T')[0])
    setDueDate(''); setMemo(''); setLines([])
    setShowAddVendor(false)
  }

  const handlePostBill = async (billId: string) => {
    try {
      await api.patch(`/bills/${billId}`, { status: 'posted' })
      setToast({ ok: true, msg: 'Bill posted — journal entry created automatically.' })
      await fetchBills()
      if (expandedId === billId) {
        const detail = await api.get(`/bills/${billId}`).catch(() => null)
        setExpandedDetail(detail)
      }
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to post bill.' })
    }
  }

  const toggleExpand = async (billId: string) => {
    if (expandedId === billId) { setExpandedId(null); setExpandedDetail(null); return }
    setExpandedId(billId); setExpandedDetail(null)
    try { setExpandedDetail(await api.get(`/bills/${billId}`)) } catch { setExpandedDetail(null) }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const isOverdue = (b: any) => b.due_date && b.due_date < todayStr && !['paid', 'void'].includes(b.status)

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: bills.length, overdue: 0 }
    bills.forEach(b => {
      c[b.status] = (c[b.status] || 0) + 1
      if (isOverdue(b)) c.overdue = (c.overdue || 0) + 1
    })
    return c
  }, [bills])

  const summaryStats = useMemo(() => {
    const mo = new Date().toISOString().slice(0, 7)
    const outstanding = bills.filter(b => !['paid','void'].includes(b.status)).reduce((s, b) => s + Number(b.balance_due || 0), 0)
    const overdue = bills.filter(b => isOverdue(b)).reduce((s, b) => s + Number(b.balance_due || 0), 0)
    const paidThisMonth = bills.filter(b => b.status === 'paid' && (b.updated_at || '').startsWith(mo)).reduce((s, b) => s + Number(b.total || 0), 0)
    const avg = bills.length ? bills.reduce((s, b) => s + Number(b.total || 0), 0) / bills.length : 0
    return { outstanding, overdue, paidThisMonth, avg }
  }, [bills])

  const filteredBills = useMemo(() => {
    let r = [...bills]
    if (statusFilter === 'overdue') r = r.filter(b => isOverdue(b))
    else if (statusFilter !== 'all') r = r.filter(b => b.status === statusFilter)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      r = r.filter(b =>
        (b.bill_number || '').toLowerCase().includes(q) ||
        (b.contacts?.display_name || '').toLowerCase().includes(q) ||
        (b.memo || '').toLowerCase().includes(q)
      )
    }
    r.sort((a, b) => {
      let av: any, bv: any
      if (sortField === 'bill_date') { av = a.bill_date; bv = b.bill_date }
      else if (sortField === 'due_date') { av = a.due_date; bv = b.due_date }
      else if (sortField === 'bill_number') { av = a.bill_number; bv = b.bill_number }
      else if (sortField === 'vendor') { av = a.contacts?.display_name; bv = b.contacts?.display_name }
      else if (sortField === 'total') { av = Number(a.total); bv = Number(b.total) }
      else if (sortField === 'balance_due') { av = Number(a.balance_due); bv = Number(b.balance_due) }
      else { av = a.bill_date; bv = b.bill_date }
      if (av === bv) return 0
      return (av < bv ? -1 : 1) * (sortDir === 'asc' ? 1 : -1)
    })
    return r
  }, [bills, statusFilter, debouncedSearch, sortField, sortDir])

  const pageCount = Math.ceil(filteredBills.length / PAGE_SIZE)
  const pagedBills = filteredBills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const allPageSelected = pagedBills.length > 0 && pagedBills.every(b => selectedIds.has(b.id))
  const toggleAll = () => {
    if (allPageSelected) setSelectedIds(s => { const n = new Set(s); pagedBills.forEach(b => n.delete(b.id)); return n })
    else setSelectedIds(s => { const n = new Set(s); pagedBills.forEach(b => n.add(b.id)); return n })
  }
  const toggleOne = (id: string) =>
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const sortToggle = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
  }

  if (companyLoading || loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  if (companyMissing) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <Receipt className="h-16 w-16 mb-4" style={{ color: 'var(--text-muted)' }} />
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No company set up</h2>
      <p className="text-sm max-w-md mb-6" style={{ color: 'var(--text-secondary)' }}>Complete onboarding before creating bills.</p>
      <Link href="/onboarding" className="btn btn-primary">
        Complete onboarding
      </Link>
    </div>
  )

  return (
    <div className="p-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Accounts Payable</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Bills</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Enter bills from vendors and track what you owe</p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => { setShowCreateForm(true); addLine() }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> New Bill
          </button>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${toast.ok ? 'badge badge-success' : 'badge badge-danger'}`} style={{ display: 'block' }}>
          {toast.msg}
        </div>
      )}

      {/* ══ CREATE FORM ══ */}
      {showCreateForm && (
        <div className="panel">
          <div className="px-8 pt-6 pb-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h2 className="text-xl font-black tracking-widest" style={{ color: 'var(--accent)' }}>BILL</h2>
            <button onClick={resetForm} style={{ color: 'var(--text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-8 py-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="grid grid-cols-2 gap-10">
              {/* Left: vendor */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}
                    className={INP + ' flex-1'} style={{ ...INP_S, fontWeight: selectedVendorId ? '600' : '400' }}>
                    <option value="">Select vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.display_name}</option>)}
                  </select>
                  <button onClick={() => setShowAddVendor(s => !s)} title="New vendor"
                    className="btn btn-secondary btn-icon flex-shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
                {showAddVendor && (
                  <div className="panel p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>New vendor</p>
                    <input className={INP} style={INP_S} placeholder="Name *" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} />
                    <input className={INP} style={INP_S} type="email" placeholder="Email (optional)" value={newVendorEmail} onChange={e => setNewVendorEmail(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={handleAddVendor} disabled={addingVendor || !newVendorName.trim()}
                        className="btn btn-primary">
                        {addingVendor ? 'Adding…' : 'Add'}
                      </button>
                      <button onClick={() => setShowAddVendor(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: bill meta */}
              <div className="space-y-3">
                {[
                  { label: 'Bill date', node: <input type="date" className={INP} style={INP_S} value={billDate} onChange={e => setBillDate(e.target.value)} /> },
                  { label: 'Due date', node: <input type="date" className={INP} style={INP_S} value={dueDate} onChange={e => setDueDate(e.target.value)} /> },
                  { label: 'Memo', node: <input className={INP} style={INP_S} placeholder="Optional note" value={memo} onChange={e => setMemo(e.target.value)} /> },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-4">
                    <label className="text-sm font-medium w-24 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>{row.label}</label>
                    <div className="flex-1">{row.node}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="px-8 py-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Expense lines</h3>
            <div className="grid gap-2 mb-2 px-2 text-xs font-semibold uppercase tracking-wider"
              style={{ gridTemplateColumns: '24px minmax(0,2fr) minmax(0,1.5fr) 100px 32px', color: 'var(--text-muted)' }}>
              <div className="text-center">#</div>
              <div>Description</div>
              <div>Expense Account</div>
              <div className="text-right">Amount</div>
              <div />
            </div>
            <div className="space-y-2">
              {lines.map(line => (
                <div key={line.key} className="grid gap-2 items-center px-2 py-2.5 rounded-lg"
                  style={{ gridTemplateColumns: '24px minmax(0,2fr) minmax(0,1.5fr) 100px 32px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <span className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>{line.line_number}</span>
                  <input className={INP} style={INP_S} placeholder="What was purchased" value={line.description} onChange={e => updateLine(line.key, 'description', e.target.value)} />
                  <select className={INP} style={INP_S} value={line.expense_account_id} onChange={e => updateLine(line.key, 'expense_account_id', e.target.value)}>
                    <option value="">Select account…</option>
                    {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
                  </select>
                  <input type="number" min="0" step="0.01" className={INP + ' text-right'} style={INP_S}
                    value={line.amount} onChange={e => updateLine(line.key, 'amount', Number(e.target.value) || 0)} />
                  <button onClick={() => removeLine(line.key)} className="flex justify-center transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addLine} className="btn btn-secondary btn-sm">
                <Plus className="w-4 h-4" /> Add line
              </button>
            </div>
          </div>

          {/* Totals + footer */}
          <div className="px-8 py-5 flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Total: <span className="text-xl font-black ml-1" style={{ color: 'var(--text-primary)' }}>${fmt(billTotal)}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={resetForm} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreateBill} disabled={saving}
                className="btn btn-primary">
                {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span> : 'Save Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SUMMARY STATS ══ */}
      {!showCreateForm && bills.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Outstanding', value: summaryStats.outstanding, icon: DollarSign, color: 'var(--accent)' },
            { label: 'Overdue Amount', value: summaryStats.overdue, icon: AlertCircle, color: '#ef4444' },
            { label: 'Paid This Month', value: summaryStats.paidThisMonth, icon: CheckCircle, color: 'var(--neon-emerald)' },
            { label: 'Avg Bill Value', value: summaryStats.avg, icon: BarChart2, color: 'var(--accent)' },
          ].map(stat => (
            <div key={stat.label} className="panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>${fmt(stat.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══ BILL LIST ══ */}
      <div className="panel">

        {/* Status tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'draft', label: 'Draft' },
            { key: 'posted', label: 'Posted' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'paid', label: 'Paid' },
            { key: 'void', label: 'Void' },
          ].map(tab => {
            const active = statusFilter === tab.key
            const count = statusCounts[tab.key] || 0
            return (
              <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className="relative shrink-0 px-4 py-2.5 text-sm font-medium transition-all"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-1px' }}>
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input pl-9"
              placeholder="Search bills…" value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {(search || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1) }} className="btn btn-secondary btn-sm">Clear filters</button>
          )}
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {filteredBills.length} {filteredBills.length === 1 ? 'bill' : 'bills'}
          </span>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5"
            style={{ backgroundColor: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{selectedIds.size} selected</span>
            <button className="btn btn-secondary btn-xs">Export Selected</button>
            <button onClick={() => setSelectedIds(new Set())} className="btn btn-ghost btn-xs ml-auto">Clear</button>
          </div>
        )}

        {filteredBills.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            {bills.length === 0 ? (
              <>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No bills yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Enter a bill from a vendor to start tracking what you owe.</p>
                <button onClick={() => { setShowCreateForm(true); addLine() }}
                  className="btn btn-primary">
                  <Plus className="w-4 h-4" /> Create Bill
                </button>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No bills match your filters.</p>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid items-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{ gridTemplateColumns: '36px 1fr 1.5fr 100px 100px 110px 110px 90px 48px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex justify-center">
                <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-blue-600" checked={allPageSelected} onChange={toggleAll} />
              </div>
              <button className="flex items-center gap-1 text-left hover:opacity-80 transition" onClick={() => sortToggle('bill_number')}>
                Bill # <SortIcon field="bill_number" />
              </button>
              <button className="flex items-center gap-1 text-left hover:opacity-80 transition" onClick={() => sortToggle('vendor')}>
                Vendor <SortIcon field="vendor" />
              </button>
              <button className="flex items-center gap-1 hover:opacity-80 transition" onClick={() => sortToggle('bill_date')}>
                Date <SortIcon field="bill_date" />
              </button>
              <button className="flex items-center gap-1 hover:opacity-80 transition" onClick={() => sortToggle('due_date')}>
                Due <SortIcon field="due_date" />
              </button>
              <button className="flex items-center gap-1 justify-end hover:opacity-80 transition w-full" onClick={() => sortToggle('total')}>
                Total <SortIcon field="total" />
              </button>
              <button className="flex items-center gap-1 justify-end hover:opacity-80 transition w-full" onClick={() => sortToggle('balance_due')}>
                Balance <SortIcon field="balance_due" />
              </button>
              <div>Status</div>
              <div />
            </div>

            {/* Table rows */}
            {pagedBills.map(bill => {
              const overdue = isOverdue(bill)
              const selected = selectedIds.has(bill.id)
              return (
                <div key={bill.id}>
                  <div
                    className="grid items-center px-4 py-3.5 cursor-pointer transition hover:bg-[rgba(59,130,246,0.04)]"
                    style={{ gridTemplateColumns: '36px 1fr 1.5fr 100px 100px 110px 110px 90px 48px', borderBottom: '1px solid var(--border-color)', backgroundColor: selected ? 'rgba(59,130,246,0.06)' : undefined }}
                    onClick={() => toggleExpand(bill.id)}
                  >
                    <div className="flex justify-center" onClick={e => { e.stopPropagation(); toggleOne(bill.id) }}>
                      <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-blue-600" checked={selected} onChange={() => toggleOne(bill.id)} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{bill.bill_number}</span>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{bill.contacts?.display_name || '—'}</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {bill.bill_date ? new Date(bill.bill_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    <span className="text-sm" style={{ color: overdue ? '#ef4444' : 'var(--text-secondary)' }}>
                      {bill.due_date ? new Date(bill.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    <span className="text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>${fmt(Number(bill.total || 0))}</span>
                    <span className="text-sm font-semibold text-right" style={{ color: Number(bill.balance_due) > 0 ? (overdue ? '#ef4444' : 'var(--text-primary)') : 'var(--neon-emerald)' }}>
                      {Number(bill.balance_due) === 0 ? '—' : `$${fmt(Number(bill.balance_due))}`}
                    </span>
                    <StatusBadge status={overdue ? 'overdue' : bill.status} />
                    <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedId === bill.id && (
                    <div className="px-6 pb-6 pt-4 space-y-4"
                      style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(59,130,246,0.04)' }}>
                      {!expandedDetail ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wider pb-2 mb-2"
                              style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                              <div className="col-span-1">#</div>
                              <div className="col-span-7">Description</div>
                              <div className="col-span-4 text-right">Amount</div>
                            </div>
                            {(expandedDetail.bill_lines || []).map((l: any) => (
                              <div key={l.id || l.line_number} className="grid grid-cols-12 gap-2 text-sm py-1.5" style={{ color: 'var(--text-secondary)' }}>
                                <div className="col-span-1">{l.line_number}</div>
                                <div className="col-span-7">{l.description || '—'}</div>
                                <div className="col-span-4 text-right font-medium" style={{ color: 'var(--text-primary)' }}>${Number(l.amount || 0).toFixed(2)}</div>
                              </div>
                            ))}
                            <div className="grid grid-cols-12 gap-2 text-sm pt-3 mt-2 font-bold"
                              style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                              <div className="col-span-8 text-right">Total</div>
                              <div className="col-span-4 text-right">${Number(bill.total || 0).toFixed(2)}</div>
                            </div>
                          </div>
                          {bill.memo && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memo: {bill.memo}</p>}
                          {bill.linked_journal_entry_id && (
                            <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--neon-emerald)' }}>
                              <CheckCircle className="w-3.5 h-3.5" /> Journal entry auto-created
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            {bill.status === 'draft' && (
                              <button onClick={e => { e.stopPropagation(); handlePostBill(bill.id) }}
                                                className="btn btn-primary">
                                <Send className="w-3.5 h-3.5" /> Post Bill
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredBills.length)} of {filteredBills.length}
                </span>
                <div className="flex items-center gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition hover:opacity-80 disabled:opacity-30"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                    Previous
                  </button>
                  {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-xl text-xs font-medium transition"
                      style={{ backgroundColor: page === p ? 'var(--accent-subtle)' : 'var(--bg-primary)', color: page === p ? 'var(--accent)' : 'var(--text-secondary)', border: page === p ? '1px solid var(--accent)' : '1px solid var(--border-color)' }}>
                      {p}
                    </button>
                  ))}
                  <button disabled={page === pageCount} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition hover:opacity-80 disabled:opacity-30"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
