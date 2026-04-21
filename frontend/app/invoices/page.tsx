'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText, Loader2, Plus, X, Send, CheckCircle,
  ChevronDown, ChevronUp, Trash2, UserPlus, GripVertical, HelpCircle,
  Search, ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal,
  DollarSign, AlertCircle, TrendingUp, BarChart2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  display_name: string
  email?: string
  address?: string
  contact_type: string
}

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: string
  account_subtype?: string
}

interface InvoiceLine {
  key: string
  line_number: number
  product_service: string
  description: string
  quantity: number
  rate: number
  taxable: boolean
  revenue_account_id: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TERMS_OPTIONS = [
  { value: 'due_on_receipt', label: 'Due on receipt', days: 0  },
  { value: 'net_15',         label: 'Net 15',         days: 15 },
  { value: 'net_30',         label: 'Net 30',         days: 30 },
  { value: 'net_60',         label: 'Net 60',         days: 60 },
]

const TAX_RATE_OPTIONS = [
  { value: '',     label: 'No tax (0%)'            },
  { value: 'auto', label: 'Automatic Calculation'  },
  { value: '5',    label: '5%'                     },
  { value: '7',    label: '7%'                     },
  { value: '8',    label: '8%'                     },
  { value: '10',   label: '10%'                    },
  { value: '13',   label: '13%'                    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function calcDueDate(invoiceDate: string, terms: string) {
  const t = TERMS_OPTIONS.find(x => x.value === terms)
  return addDays(invoiceDate, t?.days ?? 30)
}

function newLine(num: number, defaultAccountId: string): InvoiceLine {
  return {
    key: `${Date.now()}-${Math.random()}`,
    line_number: num,
    product_service: '',
    description: '',
    quantity: 1,
    rate: 0,
    taxable: false,
    revenue_account_id: defaultAccountId,
  }
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const INP = 'input'
const INP_S: React.CSSProperties = {}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    posted:  { backgroundColor: 'rgba(52,211,153,0.12)', color: 'var(--neon-emerald)', border: '1px solid rgba(52,211,153,0.25)' },
    paid:    { backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8',             border: '1px solid rgba(99,102,241,0.25)' },
    draft:   { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',  border: '1px solid var(--border-color)'   },
    sent:    { backgroundColor: 'rgba(59,130,246,0.1)',  color: 'var(--accent)',    border: '1px solid rgba(59,130,246,0.2)'  },
    void:    { backgroundColor: 'rgba(239,68,68,0.08)',  color: '#ef4444',             border: '1px solid rgba(239,68,68,0.2)'   },
    overdue: { backgroundColor: 'rgba(239,68,68,0.12)',  color: '#f87171',             border: '1px solid rgba(239,68,68,0.3)'   },
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={styles[status] || styles.draft}>
      {status}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { user, company, loading: authLoading, refreshUser } = useAuth()
  const companyId = company?.id || null
  const isViewer = (user?.role || '').toLowerCase() === 'viewer'
  const [companyRetryCount, setCompanyRetryCount] = useState(0)

  // data
  const [invoices,   setInvoices]   = useState<any[]>([])
  const [customers,  setCustomers]  = useState<Contact[]>([])
  const [accounts,   setAccounts]   = useState<Account[]>([])
  const [loading,    setLoading]    = useState(true)

  // ui state
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ ok: boolean; msg: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<any>(null)

  // ── invoice form state ──
  const today = new Date().toISOString().split('T')[0]

  const [customerId,      setCustomerId]      = useState('')
  const [customerEmail,   setCustomerEmail]   = useState('')
  const [billTo,          setBillTo]          = useState('')
  const [locationOfSale,  setLocationOfSale]  = useState('')
  const [terms,           setTerms]           = useState('net_30')
  const [invoiceDate,     setInvoiceDate]     = useState(today)
  const [dueDate,         setDueDate]         = useState(addDays(today, 30))
  const [lines,           setLines]           = useState<InvoiceLine[]>([])
  const [taxRateKey,      setTaxRateKey]      = useState('')
  const [paymentNote,     setPaymentNote]     = useState('')
  const [noteToCustomer,  setNoteToCustomer]  = useState('')
  const [internalNotes,   setInternalNotes]   = useState('')
  const [memoOnStatement, setMemoOnStatement] = useState('')

  // payment modal
  const [payModal, setPayModal] = useState<{ invoiceId: string; invoiceNumber: string; total: number; balanceDue: number; customerId: string } | null>(null)
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], depositAccountId: '', memo: '' })
  const [paying, setPaying] = useState(false)

  // list filters & ui
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortField, setSortField] = useState('invoice_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const PAGE_SIZE = 25

  // quick-add customer
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)

  // ─── Load data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return
    if (companyId) return
    if (companyRetryCount >= 3) return
    refreshUser().finally(() => setCompanyRetryCount(c => c + 1))
  }, [authLoading, companyId, companyRetryCount, refreshUser])

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    Promise.all([
      api.get('/invoices/').catch(() => []),
      api.get('/contacts/?contact_type=customer').catch(() => []),
      api.get(`/accounts/company/${companyId}`).catch(() => []),
    ]).then(([inv, cust, accts]) => {
      setInvoices(Array.isArray(inv) ? inv : [])
      setCustomers(Array.isArray(cust) ? cust : [])
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

  // ─── Derived ──────────────────────────────────────────────────────────────

  const bankAccounts = accounts.filter(a => a.account_type === 'asset' && ['bank', 'cash', 'current_asset'].includes(a.account_subtype || ''))
  const revenueAccounts    = accounts.filter(a => a.account_type === 'revenue')
  const defaultAccountId   = revenueAccounts[0]?.id || ''
  const selectedCustomer   = customers.find(c => c.id === customerId)
  const subtotal           = lines.reduce((s, l) => s + l.quantity * l.rate, 0)
  const taxableSubtotal    = lines.filter(l => l.taxable).reduce((s, l) => s + l.quantity * l.rate, 0)
  const taxRate            = taxRateKey && taxRateKey !== 'auto' ? Number(taxRateKey) : 0
  const salesTax           = taxableSubtotal * taxRate / 100
  const invoiceTotal       = subtotal + salesTax

  const todayStr = new Date().toISOString().split('T')[0]
  const isOverdue = (inv: any) =>
    inv.due_date && inv.due_date < todayStr && !['paid', 'void'].includes(inv.status)

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: invoices.length, overdue: 0 }
    invoices.forEach(inv => {
      c[inv.status] = (c[inv.status] || 0) + 1
      if (isOverdue(inv)) c.overdue = (c.overdue || 0) + 1
    })
    return c
  }, [invoices])

  const summaryStats = useMemo(() => {
    const mo = new Date().toISOString().slice(0, 7)
    const outstanding = invoices.filter(i => !['paid','void'].includes(i.status)).reduce((s, i) => s + Number(i.balance_due || 0), 0)
    const overdue = invoices.filter(i => isOverdue(i)).reduce((s, i) => s + Number(i.balance_due || 0), 0)
    const paidThisMonth = invoices.filter(i => i.status === 'paid' && (i.updated_at || '').startsWith(mo)).reduce((s, i) => s + Number(i.total || 0), 0)
    const avg = invoices.length ? invoices.reduce((s, i) => s + Number(i.total || 0), 0) / invoices.length : 0
    return { outstanding, overdue, paidThisMonth, avg }
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    let r = [...invoices]
    if (statusFilter === 'overdue') r = r.filter(i => isOverdue(i))
    else if (statusFilter !== 'all') r = r.filter(i => i.status === statusFilter)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      r = r.filter(i =>
        (i.invoice_number || '').toLowerCase().includes(q) ||
        (i.contacts?.display_name || '').toLowerCase().includes(q) ||
        (i.memo || '').toLowerCase().includes(q)
      )
    }
    r.sort((a, b) => {
      let av: any, bv: any
      if (sortField === 'invoice_date') { av = a.invoice_date; bv = b.invoice_date }
      else if (sortField === 'due_date') { av = a.due_date; bv = b.due_date }
      else if (sortField === 'invoice_number') { av = a.invoice_number; bv = b.invoice_number }
      else if (sortField === 'customer') { av = a.contacts?.display_name; bv = b.contacts?.display_name }
      else if (sortField === 'total') { av = Number(a.total); bv = Number(b.total) }
      else if (sortField === 'balance_due') { av = Number(a.balance_due); bv = Number(b.balance_due) }
      else { av = a.invoice_date; bv = b.invoice_date }
      if (av === bv) return 0
      return (av < bv ? -1 : 1) * (sortDir === 'asc' ? 1 : -1)
    })
    return r
  }, [invoices, statusFilter, debouncedSearch, sortField, sortDir])

  const pageCount = Math.ceil(filteredInvoices.length / PAGE_SIZE)
  const pagedInvoices = filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const allPageSelected = pagedInvoices.length > 0 && pagedInvoices.every(i => selectedIds.has(i.id))
  const toggleAll = () => {
    if (allPageSelected) setSelectedIds(s => { const n = new Set(s); pagedInvoices.forEach(i => n.delete(i.id)); return n })
    else setSelectedIds(s => { const n = new Set(s); pagedInvoices.forEach(i => n.add(i.id)); return n })
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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const openForm = () => {
    if (isViewer) {
      setToast({ ok: false, msg: 'Viewer access is read-only. You cannot create invoices.' })
      return
    }
    setLines([newLine(1, defaultAccountId)])
    setShowForm(true)
  }

  // Sync default account into lines when accounts load and form is open
  useEffect(() => {
    if (!defaultAccountId || !showForm) return
    setLines(ls => ls.map(l => l.revenue_account_id ? l : { ...l, revenue_account_id: defaultAccountId }))
  }, [defaultAccountId, showForm])

  const addLine = () => setLines(ls => [...ls, newLine(ls.length + 1, defaultAccountId)])
  const clearLines = () => setLines([newLine(1, defaultAccountId)])

  const removeLine = (key: string) =>
    setLines(ls => ls.filter(l => l.key !== key).map((l, i) => ({ ...l, line_number: i + 1 })))

  const updateLine = (key: string, field: string, value: any) =>
    setLines(ls => ls.map(l => l.key === key ? { ...l, [field]: value } : l))

  const handleTermsChange = (t: string) => {
    setTerms(t)
    setDueDate(calcDueDate(invoiceDate, t))
  }

  const handleInvoiceDateChange = (d: string) => {
    setInvoiceDate(d)
    setDueDate(calcDueDate(d, terms))
  }

  const handleCustomerChange = (id: string) => {
    setCustomerId(id)
    const c = customers.find(x => x.id === id)
    setCustomerEmail(c?.email || '')
    setBillTo(c ? c.display_name + (c.address ? '\n' + c.address : '') : '')
  }

  const handleAddCustomer = async () => {
    if (isViewer) {
      setToast({ ok: false, msg: 'Viewer access is read-only. You cannot add customers.' })
      return
    }
    if (!newName.trim()) return
    setAddingCustomer(true)
    try {
      const c = await api.post('/contacts/', {
        contact_type: 'customer',
        display_name: newName.trim(),
        email: newEmail.trim() || undefined,
      })
      const data = await api.get('/contacts/?contact_type=customer').catch(() => [])
      setCustomers(Array.isArray(data) ? data : [])
      handleCustomerChange(c.id)
      setShowAddCustomer(false)
      setNewName(''); setNewEmail('')
      setToast({ ok: true, msg: `Customer "${c.display_name}" added.` })
    } catch {
      setToast({ ok: false, msg: 'Failed to create customer.' })
    } finally { setAddingCustomer(false) }
  }

  const resetForm = () => {
    setShowForm(false)
    setCustomerId(''); setCustomerEmail(''); setBillTo(''); setLocationOfSale('')
    setTerms('net_30'); setInvoiceDate(today); setDueDate(addDays(today, 30))
    setLines([newLine(1, defaultAccountId)])
    setTaxRateKey(''); setPaymentNote('')
    setNoteToCustomer(''); setInternalNotes(''); setMemoOnStatement('')
    setShowAddCustomer(false)
  }

  const handleCreate = async () => {
    if (isViewer) {
      setToast({ ok: false, msg: 'Viewer access is read-only. You cannot create invoices.' })
      return
    }
    if (!customerId) { setToast({ ok: false, msg: 'Please select a customer.' }); return }
    const validLines = lines.filter(l => l.rate > 0)
    if (!validLines.length) { setToast({ ok: false, msg: 'Add at least one line item with a rate.' }); return }
    // Auto-fill missing revenue account with the default (first available)
    const filledLines = validLines.map(l => ({
      ...l,
      revenue_account_id: l.revenue_account_id || defaultAccountId,
    }))
    for (const l of filledLines) {
      if (!l.revenue_account_id) {
        setToast({ ok: false, msg: 'No revenue accounts found. Make sure your Chart of Accounts is set up.' }); return
      }
    }
    setSaving(true)
    try {
      await api.post('/invoices/', {
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        memo: noteToCustomer || memoOnStatement || undefined,
        lines: filledLines.map((l, i) => ({
          line_number: i + 1,
          description: [l.product_service, l.description].filter(Boolean).join(' — ') || undefined,
          quantity: l.quantity,
          unit_price: l.rate,
          revenue_account_id: l.revenue_account_id,
        })),
      })
      setToast({ ok: true, msg: 'Invoice saved as draft.' })
      resetForm()
      const data = await api.get('/invoices/').catch(() => [])
      setInvoices(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to create invoice.' })
    } finally { setSaving(false) }
  }

  const handlePost = async (id: string) => {
    if (isViewer) {
      setToast({ ok: false, msg: 'Viewer access is read-only. You cannot post invoices.' })
      return
    }
    try {
      await api.patch(`/invoices/${id}`, { status: 'posted' })
      setToast({ ok: true, msg: 'Invoice posted — journal entry created automatically.' })
      const data = await api.get('/invoices/').catch(() => [])
      setInvoices(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to post invoice.' })
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setExpandedDetail(null); return }
    setExpandedId(id); setExpandedDetail(null)
    try { setExpandedDetail(await api.get(`/invoices/${id}`)) } catch { setExpandedDetail(null) }
  }

  const openPayModal = (inv: any) => {
    setPayModal({ invoiceId: inv.id, invoiceNumber: inv.invoice_number, total: Number(inv.total || 0), balanceDue: Number(inv.balance_due || 0), customerId: inv.customer_id || '' })
    setPayForm({ amount: String(Number(inv.balance_due || 0).toFixed(2)), date: new Date().toISOString().split('T')[0], depositAccountId: bankAccounts[0]?.id || '', memo: '' })
  }

  const handleRecordPayment = async () => {
    if (isViewer) {
      setToast({ ok: false, msg: 'Viewer access is read-only. You cannot record payments.' })
      return
    }
    if (!payModal) return
    const amt = Number(payForm.amount)
    if (!amt || amt <= 0) { setToast({ ok: false, msg: 'Enter a valid amount.' }); return }
    if (!payForm.depositAccountId) { setToast({ ok: false, msg: 'Select a deposit account.' }); return }
    if (amt > payModal.balanceDue + 0.01) { setToast({ ok: false, msg: `Amount exceeds balance due ($${fmt(payModal.balanceDue)}).` }); return }
    setPaying(true)
    try {
      const payment = await api.post('/payments/', {
        customer_id: payModal.customerId || undefined,
        payment_date: payForm.date,
        amount: amt,
        deposit_account_id: payForm.depositAccountId,
        memo: payForm.memo || undefined,
      })
      await api.post(`/payments/${payment.id}/apply`, { invoice_id: payModal.invoiceId, amount_applied: amt })
      setToast({ ok: true, msg: `Payment of $${fmt(amt)} recorded and applied to ${payModal.invoiceNumber}.` })
      setPayModal(null)
      const data = await api.get('/invoices/').catch(() => [])
      setInvoices(Array.isArray(data) ? data : [])
      if (expandedId === payModal.invoiceId) {
        try { setExpandedDetail(await api.get(`/invoices/${payModal.invoiceId}`)) } catch { setExpandedDetail(null) }
      }
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to record payment.' })
    } finally { setPaying(false) }
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  if (authLoading || (!companyId && companyRetryCount < 3)) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  if (!companyId) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <FileText className="h-16 w-16 mb-4" style={{ color: 'var(--text-muted)' }} />
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No company set up</h2>
      <p className="text-sm max-w-md mb-6" style={{ color: 'var(--text-secondary)' }}>
        Complete onboarding before creating invoices.
      </p>
      <Link href="/onboarding" className="btn btn-primary">
        Complete onboarding
      </Link>
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Accounts Receivable</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Send invoices and track what customers owe you.</p>
        </div>
        {!showForm && !isViewer && (
          <button
            onClick={openForm}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${toast.ok ? 'badge badge-success' : 'badge badge-danger'}`} style={{ display: 'block' }}>
          {toast.msg}
        </div>
      )}

      {isViewer && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
          Viewer mode: invoices are read-only for your role.
        </div>
      )}

      {/* ══════════════════════════════════════════════
          INVOICE EDITOR
      ══════════════════════════════════════════════ */}
      {showForm && (
        <div className="panel">

          {/* ── 1. Invoice document header ── */}
          <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-widest" style={{ color: 'var(--accent)' }}>
                INVOICE
              </h2>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Balance due:{' '}
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  ${fmt(invoiceTotal)}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-10">
              {/* ── Left: Customer ── */}
              <div className="space-y-4">
                {/* Customer dropdown + add button */}
                <div className="flex gap-2">
                  <select
                    value={customerId}
                    onChange={e => handleCustomerChange(e.target.value)}
                    className={INP + ' flex-1'}
                    style={{ ...INP_S, fontWeight: customerId ? '600' : '400' }}
                  >
                    <option value="">Add customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.display_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddCustomer(s => !s)}
                    title="New customer"
                    className="btn btn-secondary btn-icon flex-shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick-add customer panel */}
                {showAddCustomer && (
                  <div className="panel p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      New customer
                    </p>
                    <input className={INP} style={INP_S} placeholder="Name *"
                      value={newName} onChange={e => setNewName(e.target.value)} />
                    <input className={INP} style={INP_S} type="email" placeholder="Email (optional)"
                      value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={handleAddCustomer} disabled={addingCustomer || !newName.trim()}
                        className="btn btn-primary">
                        {addingCustomer ? 'Adding…' : 'Add'}
                      </button>
                      <button onClick={() => setShowAddCustomer(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Fields shown only when customer is selected */}
                {customerId && (
                  <>
                    <input type="email" className={INP} style={INP_S} placeholder="Enter customer email"
                      value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />

                    <button className="text-xs font-semibold transition hover:opacity-70 block"
                      style={{ color: 'var(--accent)' }}>
                      Cc / Bcc
                    </button>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>Bill to</p>
                      <textarea rows={3} className={INP} style={{ ...INP_S, resize: 'none' } as any}
                        placeholder={selectedCustomer?.display_name || 'Customer name and address'}
                        value={billTo} onChange={e => setBillTo(e.target.value)} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>
                        Location of sale{' '}
                        <span className="font-normal normal-case">(hidden)</span>
                      </p>
                      <textarea rows={2} className={INP} style={{ ...INP_S, resize: 'none' } as any}
                        placeholder="Shipping / sale address"
                        value={locationOfSale} onChange={e => setLocationOfSale(e.target.value)} />
                    </div>

                    <div className="flex gap-5">
                      <button className="text-xs font-semibold transition hover:opacity-70"
                        style={{ color: 'var(--accent)' }}>Edit Customer</button>
                      <button className="text-xs font-semibold transition hover:opacity-70"
                        style={{ color: 'var(--accent)' }}>Add shipping info</button>
                    </div>
                  </>
                )}
              </div>

              {/* ── Right: Invoice meta ── */}
              <div className="space-y-3">
                {[
                  {
                    label: 'Invoice no.',
                    node: (
                      <input className={INP} style={{ ...INP_S, color: 'var(--text-muted)' }}
                        placeholder="Auto-generated" disabled value="" />
                    ),
                  },
                  {
                    label: 'Terms',
                    node: (
                      <select className={INP} style={INP_S} value={terms} onChange={e => handleTermsChange(e.target.value)}>
                        {TERMS_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    ),
                  },
                  {
                    label: 'Invoice date',
                    node: (
                      <input type="date" className={INP} style={INP_S}
                        value={invoiceDate} onChange={e => handleInvoiceDateChange(e.target.value)} />
                    ),
                  },
                  {
                    label: 'Due date',
                    node: (
                      <input type="date" className={INP} style={INP_S}
                        value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    ),
                  },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-4">
                    <label className="text-sm font-medium w-28 shrink-0 text-right"
                      style={{ color: 'var(--text-secondary)' }}>
                      {row.label}
                    </label>
                    <div className="flex-1">{row.node}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 2. Product or service ── */}
          <div className="px-8 py-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Product or service
            </h3>

            {/* Table header */}
            <div
              className="grid gap-2 mb-2 px-2 text-xs font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: '20px 24px minmax(0,1fr) minmax(0,1.4fr) 72px 88px 88px 36px 32px',
                color: 'var(--text-muted)',
              }}
            >
              <div />
              <div className="text-center">#</div>
              <div>Product / service</div>
              <div>Description</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Rate</div>
              <div className="text-right">Amount</div>
              <div className="text-center">Tax</div>
              <div />
            </div>

            {/* Line rows */}
            <div className="space-y-2">
              {lines.map(line => (
                <div key={line.key}>
                  <div
                    className="grid gap-2 items-center px-2 py-2.5 rounded-lg"
                    style={{
                      gridTemplateColumns: '20px 24px minmax(0,1fr) minmax(0,1.4fr) 72px 88px 88px 36px 32px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {/* Drag */}
                    <GripVertical className="w-4 h-4 cursor-grab" style={{ color: 'var(--text-muted)' }} />
                    {/* # */}
                    <span className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                      {line.line_number}
                    </span>
                    {/* Product/service */}
                    <input className={INP} style={INP_S} placeholder="Product or service"
                      value={line.product_service}
                      onChange={e => updateLine(line.key, 'product_service', e.target.value)} />
                    {/* Description */}
                    <input className={INP} style={INP_S} placeholder="Description"
                      value={line.description}
                      onChange={e => updateLine(line.key, 'description', e.target.value)} />
                    {/* Qty */}
                    <input type="number" min="1" step="1" className={INP + ' text-right'} style={INP_S}
                      value={line.quantity}
                      onChange={e => updateLine(line.key, 'quantity', Math.max(1, Number(e.target.value) || 1))} />
                    {/* Rate */}
                    <input type="number" min="0" step="0.01" className={INP + ' text-right'} style={INP_S}
                      value={line.rate}
                      onChange={e => updateLine(line.key, 'rate', Number(e.target.value) || 0)} />
                    {/* Amount */}
                    <div className="text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                      ${fmt(line.quantity * line.rate)}
                    </div>
                    {/* Tax checkbox */}
                    <div className="flex justify-center">
                      <input type="checkbox" className="w-4 h-4 cursor-pointer accent-blue-600"
                        checked={line.taxable}
                        onChange={e => updateLine(line.key, 'taxable', e.target.checked)} />
                    </div>
                    {/* Delete */}
                    <button onClick={() => removeLine(line.key)}
                      className="flex justify-center transition hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Revenue account selector (below each line, compact) */}
                  {revenueAccounts.length > 1 && (
                    <div className="flex items-center gap-2 ml-12 mt-1">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Account:</span>
                      <select
                        value={line.revenue_account_id}
                        onChange={e => updateLine(line.key, 'revenue_account_id', e.target.value)}
                        className="select input-sm"
                      >
                        <option value="">Select account…</option>
                        {revenueAccounts.map(a => (
                          <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add / Clear buttons */}
            <div className="flex gap-3 mt-5">
              <button onClick={addLine} className="btn btn-secondary btn-sm">
                <Plus className="w-4 h-4" /> Add product or service
              </button>
              <button onClick={clearLines} className="btn btn-ghost btn-sm">Clear all lines</button>
            </div>
          </div>

          {/* ── 3. Customer payment options + Totals ── */}
          <div className="grid grid-cols-2" style={{ borderBottom: '1px solid var(--border-color)' }}>

            {/* Left: payment options */}
            <div className="px-8 py-6" style={{ borderRight: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Customer payment options
                </span>
                <button className="text-xs font-semibold transition hover:opacity-70"
                  style={{ color: 'var(--accent)' }}>
                  Edit
                </button>
              </div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold mb-4"
                style={{
                  backgroundColor: 'rgba(59,130,246,0.1)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}>
                BANK
              </div>
              <textarea rows={3} className={INP} style={{ ...INP_S, resize: 'none', marginTop: '8px' } as any}
                placeholder="Tell your customer how you want to get paid."
                value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
            </div>

            {/* Right: Totals */}
            <div className="px-8 py-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span style={{ color: 'var(--text-primary)' }}>${fmt(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Taxable subtotal</span>
                <span style={{ color: 'var(--text-primary)' }}>${fmt(taxableSubtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  Select sales tax rate
                </span>
                <select className="select flex-1 min-w-0"
                  value={taxRateKey} onChange={e => setTaxRateKey(e.target.value)}>
                  {TAX_RATE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  Sales tax
                  <HelpCircle className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </span>
                <span style={{ color: 'var(--text-primary)' }}>${fmt(salesTax)}</span>
              </div>

              <div className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid var(--border-color)' }}>
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Invoice total
                </span>
                <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                  ${fmt(invoiceTotal)}
                </span>
              </div>

              <button className="text-xs font-semibold transition hover:opacity-70"
                style={{ color: 'var(--accent)' }}>
                Edit totals
              </button>
            </div>
          </div>

          {/* ── 4. Notes ── */}
          <div className="px-8 py-6 space-y-5" style={{ borderBottom: '1px solid var(--border-color)' }}>

            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Note to customer
              </p>
              <textarea rows={3} className={INP} style={{ ...INP_S, resize: 'none' } as any}
                placeholder="Thank you for your business."
                value={noteToCustomer} onChange={e => setNoteToCustomer(e.target.value)} />
            </div>

            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Internal customer notes{' '}
                <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(hidden)</span>
              </p>
              <textarea rows={3} className={INP} style={{ ...INP_S, resize: 'none' } as any}
                placeholder="Add notes about this customer. This is only visible to you."
                value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
            </div>

            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Memo on statement{' '}
                <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(hidden)</span>
              </p>
              <textarea rows={2} className={INP} style={{ ...INP_S, resize: 'none' } as any}
                placeholder="This memo will not show up on your invoice, but will appear on the statement."
                value={memoOnStatement} onChange={e => setMemoOnStatement(e.target.value)} />
            </div>

            {/* Attachments */}
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Attachments</p>
              <div className="flex items-center justify-center py-5 px-4 rounded-xl border-2 border-dashed"
                style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Drag files here or{' '}
                  <button className="font-semibold transition hover:opacity-70" style={{ color: 'var(--accent)' }}>
                    browse
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* ── 5. Footer ── */}
          <div className="px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button className="text-sm font-semibold transition hover:opacity-70"
                style={{ color: 'var(--accent)' }}>
                Print or download
              </button>
              <button className="text-sm font-semibold transition hover:opacity-70"
                style={{ color: 'var(--accent)' }}>
                Make recurring
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={resetForm} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving
                  ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
                  : 'Save'}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn btn-success"
              >
                Review and send
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUMMARY STATS
      ══════════════════════════════════════════════ */}
      {!showForm && invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Outstanding', value: summaryStats.outstanding, icon: DollarSign, color: 'var(--accent)' },
            { label: 'Overdue Amount', value: summaryStats.overdue, icon: AlertCircle, color: '#ef4444' },
            { label: 'Paid This Month', value: summaryStats.paidThisMonth, icon: CheckCircle, color: 'var(--neon-emerald)' },
            { label: 'Avg Invoice Value', value: summaryStats.avg, icon: BarChart2, color: 'var(--accent)' },
          ].map(stat => (
            <div key={stat.label} className="panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                ${fmt(stat.value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          INVOICE LIST
      ══════════════════════════════════════════════ */}
      <div className="panel">

        {/* ── Status tabs ── */}
        <div className="flex items-center gap-1 px-4 pt-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'draft', label: 'Draft' },
            { key: 'sent', label: 'Sent' },
            { key: 'posted', label: 'Posted' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'paid', label: 'Paid' },
            { key: 'void', label: 'Void' },
          ].map(tab => {
            const active = statusFilter === tab.key
            const count = statusCounts[tab.key] || 0
            return (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className="relative shrink-0 px-4 py-2.5 text-sm font-medium transition-all"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-1px' }}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input pl-9"
              placeholder="Search invoices…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1) }}
              className="btn btn-secondary btn-sm"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>

        {/* ── Bulk action bar ── */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5"
            style={{ backgroundColor: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              {selectedIds.size} selected
            </span>
            <button className="btn btn-secondary btn-xs">Export Selected</button>
            <button onClick={() => setSelectedIds(new Set())} className="btn btn-ghost btn-xs ml-auto">Clear</button>
          </div>
        )}

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            {invoices.length === 0 ? (
              <>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No invoices yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Create your first invoice to start tracking what customers owe you.</p>
                {!isViewer && (
                  <button onClick={openForm}
                    className="btn btn-primary">
                    <Plus className="w-4 h-4" /> Create Invoice
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No invoices match your filters.</p>
            )}
          </div>
        ) : (
          <>
            {/* ── Table header ── */}
            <div className="grid items-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: '36px 1fr 1.5fr 100px 100px 110px 110px 90px 48px',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-color)',
              }}>
              <div className="flex justify-center">
                <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-cyan-400"
                  checked={allPageSelected} onChange={toggleAll} />
              </div>
              <button className="flex items-center gap-1 text-left hover:opacity-80 transition" onClick={() => sortToggle('invoice_number')}>
                Invoice # <SortIcon field="invoice_number" />
              </button>
              <button className="flex items-center gap-1 text-left hover:opacity-80 transition" onClick={() => sortToggle('customer')}>
                Customer <SortIcon field="customer" />
              </button>
              <button className="flex items-center gap-1 hover:opacity-80 transition" onClick={() => sortToggle('invoice_date')}>
                Date <SortIcon field="invoice_date" />
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

            {/* ── Table rows ── */}
            {pagedInvoices.map(inv => {
              const overdue = isOverdue(inv)
              const selected = selectedIds.has(inv.id)
              return (
                <div key={inv.id}>
                  <div
                    className="grid items-center px-4 py-3.5 cursor-pointer transition hover:bg-[rgba(59,130,246,0.04)]"
                    style={{
                      gridTemplateColumns: '36px 1fr 1.5fr 100px 100px 110px 110px 90px 48px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: selected ? 'rgba(59,130,246,0.06)' : undefined,
                    }}
                    onClick={() => toggleExpand(inv.id)}
                  >
                    <div className="flex justify-center" onClick={e => { e.stopPropagation(); toggleOne(inv.id) }}>
                      <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-cyan-400"
                        checked={selected} onChange={() => toggleOne(inv.id)} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                      {inv.invoice_number}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {inv.contacts?.display_name || '—'}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {inv.invoice_date ? new Date(inv.invoice_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    <span className="text-sm" style={{ color: overdue ? '#ef4444' : 'var(--text-secondary)' }}>
                      {inv.due_date ? new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    <span className="text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                      ${fmt(Number(inv.total || 0))}
                    </span>
                    <span className="text-sm font-semibold text-right" style={{ color: Number(inv.balance_due) > 0 ? (overdue ? '#ef4444' : 'var(--text-primary)') : 'var(--neon-emerald)' }}>
                      {Number(inv.balance_due) === 0 ? '—' : `$${fmt(Number(inv.balance_due))}`}
                    </span>
                    <StatusBadge status={overdue ? 'overdue' : inv.status} />
                    <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedId === inv.id && (
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
                              <div className="col-span-5">Description</div>
                              <div className="col-span-2 text-right">Qty</div>
                              <div className="col-span-2 text-right">Rate</div>
                              <div className="col-span-2 text-right">Amount</div>
                            </div>
                            {(expandedDetail.invoice_lines || []).map((l: any) => (
                              <div key={l.id || l.line_number} className="grid grid-cols-12 gap-2 text-sm py-1.5"
                                style={{ color: 'var(--text-secondary)' }}>
                                <div className="col-span-1">{l.line_number}</div>
                                <div className="col-span-5">{l.description || '—'}</div>
                                <div className="col-span-2 text-right">{l.quantity}</div>
                                <div className="col-span-2 text-right">${Number(l.unit_price || 0).toFixed(2)}</div>
                                <div className="col-span-2 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                                  ${Number(l.amount || 0).toFixed(2)}
                                </div>
                              </div>
                            ))}
                            <div className="grid grid-cols-12 gap-2 text-sm pt-3 mt-2 font-bold"
                              style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                              <div className="col-span-10 text-right">Total</div>
                              <div className="col-span-2 text-right">${Number(inv.total || 0).toFixed(2)}</div>
                            </div>
                          </div>
                          {inv.memo && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Note: {inv.memo}</p>}
                          {inv.linked_journal_entry_id && (
                            <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--neon-emerald)' }}>
                              <CheckCircle className="w-3.5 h-3.5" /> Journal entry auto-created
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            {!isViewer && inv.status === 'draft' && (
                              <button
                                onClick={e => { e.stopPropagation(); handlePost(inv.id) }}
                                className="btn btn-success">
                                <Send className="w-3.5 h-3.5" /> Post Invoice
                              </button>
                            )}
                            {!isViewer && ['posted', 'sent'].includes(inv.status) && Number(inv.balance_due) > 0 && (
                              <button
                                onClick={e => { e.stopPropagation(); openPayModal(inv) }}
                                className="btn btn-success">
                                <DollarSign className="w-3.5 h-3.5" /> Record Payment
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

            {/* ── Pagination ── */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition hover:opacity-80 disabled:opacity-30"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                    Previous
                  </button>
                  {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-xl text-xs font-medium transition"
                      style={{
                        backgroundColor: page === p ? 'rgba(59,130,246,0.12)' : 'var(--bg-primary)',
                        color: page === p ? 'var(--accent)' : 'var(--text-secondary)',
                        border: page === p ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-color)',
                      }}>
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={page === pageCount}
                    onClick={() => setPage(p => p + 1)}
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

      {/* ══ PAYMENT MODAL ══ */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setPayModal(null) }}>
          <div className="w-full max-w-md panel">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Record Payment</h2>
              <button onClick={() => setPayModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>Invoice</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{payModal.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>Invoice total</span>
                  <span style={{ color: 'var(--text-secondary)' }}>${fmt(payModal.total)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1" style={{ borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Balance due</span>
                  <span style={{ color: 'var(--accent)' }}>${fmt(payModal.balanceDue)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Payment Date</label>
                <input type="date" className={INP} style={INP_S} value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                  <input type="number" min="0.01" step="0.01" className={INP + ' pl-7'} style={INP_S}
                    value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Deposit To</label>
                <select className={INP} style={INP_S} value={payForm.depositAccountId} onChange={e => setPayForm(f => ({ ...f, depositAccountId: e.target.value }))}>
                  <option value="">Select account…</option>
                  {(bankAccounts.length > 0 ? bankAccounts : accounts.filter(a => a.account_type === 'asset')).map(a => (
                    <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Memo</label>
                <input className={INP} style={INP_S} placeholder="Reference # or note" value={payForm.memo} onChange={e => setPayForm(f => ({ ...f, memo: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setPayModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleRecordPayment} disabled={paying}
                className="btn btn-success">
                {paying ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Recording…</span> : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
