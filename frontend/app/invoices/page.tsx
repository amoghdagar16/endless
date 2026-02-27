'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Loader2,
  Plus,
  X,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface Contact {
  id: string
  display_name: string
  email?: string
  contact_type: string
}

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: string
}

interface InvoiceLine {
  key: string
  line_number: number
  description: string
  quantity: number
  unit_price: number
  revenue_account_id: string
}

export default function InvoicesPage() {
  const { company } = useAuth()
  const companyId = company?.id || null

  const [invoices, setInvoices] = useState<any[]>([])
  const [customers, setCustomers] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Create invoice form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [saving, setSaving] = useState(false)

  // Quick-add customer
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)

  // Expanded invoice detail
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<any>(null)

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

  const revenueAccounts = accounts.filter(a => a.account_type === 'revenue')

  const fetchInvoices = async () => {
    const data = await api.get('/invoices/').catch(() => [])
    setInvoices(Array.isArray(data) ? data : [])
  }

  const fetchCustomers = async () => {
    const data = await api.get('/contacts/?contact_type=customer').catch(() => [])
    setCustomers(Array.isArray(data) ? data : [])
  }

  // --- Quick-add customer ---
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return
    setAddingCustomer(true)
    try {
      const c = await api.post('/contacts/', {
        contact_type: 'customer',
        display_name: newCustomerName.trim(),
        email: newCustomerEmail.trim() || undefined,
      })
      await fetchCustomers()
      setSelectedCustomerId(c.id)
      setShowAddCustomer(false)
      setNewCustomerName('')
      setNewCustomerEmail('')
      setToast({ type: 'success', message: `Customer "${c.display_name}" created.` })
    } catch {
      setToast({ type: 'error', message: 'Failed to create customer.' })
    } finally {
      setAddingCustomer(false)
    }
  }

  // --- Lines ---
  const addLine = () => {
    setLines([...lines, {
      key: Date.now().toString(),
      line_number: lines.length + 1,
      description: '',
      quantity: 1,
      unit_price: 0,
      revenue_account_id: revenueAccounts[0]?.id || '',
    }])
  }

  const updateLine = (key: string, field: string, value: any) => {
    setLines(lines.map(l => l.key === key ? { ...l, [field]: value } : l))
  }

  const removeLine = (key: string) => {
    setLines(lines.filter(l => l.key !== key).map((l, i) => ({ ...l, line_number: i + 1 })))
  }

  const lineTotal = (l: InvoiceLine) => l.quantity * l.unit_price
  const invoiceTotal = lines.reduce((s, l) => s + lineTotal(l), 0)

  // --- Create invoice ---
  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) { setToast({ type: 'error', message: 'Select a customer.' }); return }
    if (lines.length === 0) { setToast({ type: 'error', message: 'Add at least one line item.' }); return }
    for (const l of lines) {
      if (!l.revenue_account_id) { setToast({ type: 'error', message: `Line ${l.line_number} needs a revenue account.` }); return }
      if (l.unit_price <= 0) { setToast({ type: 'error', message: `Line ${l.line_number} needs a price > 0.` }); return }
    }
    setSaving(true)
    try {
      await api.post('/invoices/', {
        customer_id: selectedCustomerId,
        invoice_date: invoiceDate,
        due_date: dueDate || invoiceDate,
        memo: memo || undefined,
        lines: lines.map(l => ({
          line_number: l.line_number,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          revenue_account_id: l.revenue_account_id,
        })),
      })
      setToast({ type: 'success', message: 'Invoice created as draft.' })
      resetForm()
      await fetchInvoices()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.detail || 'Failed to create invoice.' })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setShowCreateForm(false)
    setSelectedCustomerId('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setMemo('')
    setLines([])
  }

  // --- Post invoice ---
  const handlePostInvoice = async (invoiceId: string) => {
    try {
      await api.patch(`/invoices/${invoiceId}`, { status: 'posted' })
      setToast({ type: 'success', message: 'Invoice posted — journal entry created automatically.' })
      await fetchInvoices()
      if (expandedId === invoiceId) {
        const detail = await api.get(`/invoices/${invoiceId}`).catch(() => null)
        setExpandedDetail(detail)
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.detail || 'Failed to post invoice.' })
    }
  }

  // --- Expand invoice ---
  const toggleExpand = async (invoiceId: string) => {
    if (expandedId === invoiceId) {
      setExpandedId(null)
      setExpandedDetail(null)
      return
    }
    setExpandedId(invoiceId)
    setExpandedDetail(null)
    try {
      const detail = await api.get(`/invoices/${invoiceId}`)
      setExpandedDetail(detail)
    } catch {
      setExpandedDetail(null)
    }
  }

  // --- Loading / no company guards ---
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <FileText className="h-16 w-16 text-neutral-400 dark:text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">No company set up</h2>
        <p className="text-neutral-600 dark:text-white/60 max-w-md mb-6">Finish onboarding to use Invoices.</p>
        <a href="/onboarding" className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold text-white">Complete onboarding</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 space-y-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-white/60">Accounts Receivable</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">Invoices</h1>
          <p className="text-gray-600 dark:text-white/60 mt-1">Send invoices and track what customers owe you</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold flex items-center gap-2 shadow-[0_10px_35px_rgba(129,80,255,0.4)] text-white"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-200'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Create Invoice Form */}
      {showCreateForm && (
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Invoice</h2>
            <button onClick={resetForm} className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Customer picker */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Customer</label>
            <div className="flex gap-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="flex-1 rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name}{c.email ? ` (${c.email})` : ''}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddCustomer(!showAddCustomer)}
                className="px-3 py-2 rounded-2xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium text-gray-700 dark:text-white/80 hover:border-fuchsia-400 flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" /> New
              </button>
            </div>

            {/* Quick-add customer inline */}
            {showAddCustomer && (
              <div className="flex gap-2 items-end p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-white/50">Name</label>
                  <input
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    placeholder="Acme Corp"
                    className="mt-1 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-white/50">Email (optional)</label>
                  <input
                    value={newCustomerEmail}
                    onChange={e => setNewCustomerEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    className="mt-1 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <button
                  onClick={handleAddCustomer}
                  disabled={addingCustomer || !newCustomerName.trim()}
                  className="px-3 py-1.5 rounded-xl bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-40"
                >
                  {addingCustomer ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </div>

          {/* Date / Due / Memo */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Memo</label>
              <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="Optional note"
                className="mt-2 w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">Line Items</h3>
              <button onClick={addLine} className="text-sm text-fuchsia-600 dark:text-fuchsia-300 hover:text-fuchsia-700 dark:hover:text-fuchsia-200 font-medium">
                + Add Line
              </button>
            </div>

            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-600 dark:text-white/50 pb-2 border-b border-gray-200 dark:border-white/10 uppercase tracking-wide">
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Revenue Account</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map(line => (
              <div key={line.key} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4">
                  <input type="text" value={line.description} onChange={e => updateLine(line.key, 'description', e.target.value)}
                    placeholder="Service description"
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-2">
                  <select value={line.revenue_account_id} onChange={e => updateLine(line.key, 'revenue_account_id', e.target.value)}
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  >
                    <option value="">Select...</option>
                    {revenueAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" step="1" min="1" value={line.quantity}
                    onChange={e => updateLine(line.key, 'quantity', Number(e.target.value) || 1)}
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-2">
                  <input type="number" step="0.01" min="0" value={line.unit_price}
                    onChange={e => updateLine(line.key, 'unit_price', Number(e.target.value) || 0)}
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-1 text-right text-sm font-medium text-gray-900 dark:text-white">
                  ${lineTotal(line).toFixed(2)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => removeLine(line.key)} className="text-rose-500 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {lines.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-white/40 text-center py-4">Click "+ Add Line" to add items to this invoice.</p>
            )}
          </div>

          {/* Total + actions */}
          <div className="border-t border-gray-200 dark:border-white/10 pt-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              Total: <span className="text-fuchsia-600 dark:text-fuchsia-300">${invoiceTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={resetForm}
                className="px-4 py-2 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium text-gray-700 dark:text-white/80"
              >
                Cancel
              </button>
              <button onClick={handleCreateInvoice} disabled={saving}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(129,80,255,0.4)] disabled:opacity-40"
              >
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Invoices</h2>
          <span className="text-xs text-gray-500 dark:text-white/50 uppercase tracking-widest">{invoices.length} invoices</span>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-white/60">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-white/30" />
            <p>No invoices yet</p>
            <p className="text-sm mt-1 text-gray-500 dark:text-white/40">Create a customer and invoice to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-hidden">
                {/* Invoice row */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.07] transition"
                  onClick={() => toggleExpand(inv.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-white/60">{inv.invoice_date ? new Date(inv.invoice_date + 'T00:00:00').toLocaleDateString() : '—'}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{inv.invoice_number}</p>
                      <p className="text-sm text-gray-600 dark:text-white/60">{inv.contacts?.display_name || 'Customer'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">${Number(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'posted' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                          : inv.status === 'paid' ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70'
                        }`}>
                          {inv.status}
                        </span>
                        {inv.balance_due > 0 && inv.status !== 'draft' && (
                          <span className="text-xs text-gray-500 dark:text-white/50">
                            Due: ${Number(inv.balance_due).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedId === inv.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === inv.id && (
                  <div className="border-t border-gray-200 dark:border-white/10 p-4 space-y-4">
                    {!expandedDetail ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                    ) : (
                      <>
                        {/* Lines */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase">
                            <div className="col-span-1">#</div>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2 text-right">Qty</div>
                            <div className="col-span-2 text-right">Price</div>
                            <div className="col-span-2 text-right">Amount</div>
                          </div>
                          {(expandedDetail.invoice_lines || []).map((line: any) => (
                            <div key={line.id || line.line_number} className="grid grid-cols-12 gap-2 text-sm text-gray-700 dark:text-white/70">
                              <div className="col-span-1">{line.line_number}</div>
                              <div className="col-span-5">{line.description || '—'}</div>
                              <div className="col-span-2 text-right">{line.quantity}</div>
                              <div className="col-span-2 text-right">${Number(line.unit_price || 0).toFixed(2)}</div>
                              <div className="col-span-2 text-right">${Number(line.amount || 0).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>

                        {inv.memo && <p className="text-sm text-gray-500 dark:text-white/50">Memo: {inv.memo}</p>}

                        {inv.linked_journal_entry_id && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Journal entry linked
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {inv.status === 'draft' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePostInvoice(inv.id) }}
                              className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Post Invoice
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
