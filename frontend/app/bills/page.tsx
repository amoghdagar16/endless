'use client'

import { useState, useEffect } from 'react'
import {
  Receipt,
  Loader2,
  Plus,
  X,
  Send,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  UserPlus,
  FileText,
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

interface BillLine {
  key: string
  line_number: number
  description: string
  amount: number
  expense_account_id: string
}

export default function BillsPage() {
  const { company } = useAuth()
  const companyId = company?.id || null

  const [bills, setBills] = useState<any[]>([])
  const [vendors, setVendors] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Create bill form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<BillLine[]>([])
  const [saving, setSaving] = useState(false)

  // Quick-add vendor
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [newVendorEmail, setNewVendorEmail] = useState('')
  const [addingVendor, setAddingVendor] = useState(false)

  // Expanded bill detail
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<any>(null)

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

  const expenseAccounts = accounts.filter(a => a.account_type === 'expense')

  const fetchBills = async () => {
    const data = await api.get('/bills/').catch(() => [])
    setBills(Array.isArray(data) ? data : [])
  }

  const fetchVendors = async () => {
    const data = await api.get('/contacts/?contact_type=vendor').catch(() => [])
    setVendors(Array.isArray(data) ? data : [])
  }

  // --- Quick-add vendor ---
  const handleAddVendor = async () => {
    if (!newVendorName.trim()) return
    setAddingVendor(true)
    try {
      const v = await api.post('/contacts/', {
        contact_type: 'vendor',
        display_name: newVendorName.trim(),
        email: newVendorEmail.trim() || undefined,
      })
      await fetchVendors()
      setSelectedVendorId(v.id)
      setShowAddVendor(false)
      setNewVendorName('')
      setNewVendorEmail('')
      setToast({ type: 'success', message: `Vendor "${v.display_name}" created.` })
    } catch {
      setToast({ type: 'error', message: 'Failed to create vendor.' })
    } finally {
      setAddingVendor(false)
    }
  }

  // --- Lines ---
  const addLine = () => {
    setLines([...lines, {
      key: Date.now().toString(),
      line_number: lines.length + 1,
      description: '',
      amount: 0,
      expense_account_id: expenseAccounts[0]?.id || '',
    }])
  }

  const updateLine = (key: string, field: string, value: any) => {
    setLines(lines.map(l => l.key === key ? { ...l, [field]: value } : l))
  }

  const removeLine = (key: string) => {
    setLines(lines.filter(l => l.key !== key).map((l, i) => ({ ...l, line_number: i + 1 })))
  }

  const billTotal = lines.reduce((s, l) => s + (l.amount || 0), 0)

  // --- Create bill ---
  const handleCreateBill = async () => {
    if (!selectedVendorId) { setToast({ type: 'error', message: 'Select a vendor.' }); return }
    if (lines.length === 0) { setToast({ type: 'error', message: 'Add at least one line item.' }); return }
    for (const l of lines) {
      if (!l.expense_account_id) { setToast({ type: 'error', message: `Line ${l.line_number} needs an expense account.` }); return }
      if (l.amount <= 0) { setToast({ type: 'error', message: `Line ${l.line_number} needs an amount > 0.` }); return }
    }
    setSaving(true)
    try {
      await api.post('/bills/', {
        vendor_id: selectedVendorId,
        bill_date: billDate,
        due_date: dueDate || billDate,
        memo: memo || undefined,
        lines: lines.map(l => ({
          line_number: l.line_number,
          description: l.description,
          amount: l.amount,
          expense_account_id: l.expense_account_id,
        })),
      })
      setToast({ type: 'success', message: 'Bill created as draft.' })
      resetForm()
      await fetchBills()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.detail || 'Failed to create bill.' })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setShowCreateForm(false)
    setSelectedVendorId('')
    setBillDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setMemo('')
    setLines([])
  }

  // --- Post bill ---
  const handlePostBill = async (billId: string) => {
    try {
      await api.patch(`/bills/${billId}`, { status: 'posted' })
      setToast({ type: 'success', message: 'Bill posted — journal entry created automatically.' })
      await fetchBills()
      if (expandedId === billId) {
        const detail = await api.get(`/bills/${billId}`).catch(() => null)
        setExpandedDetail(detail)
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.detail || 'Failed to post bill.' })
    }
  }

  // --- Expand bill ---
  const toggleExpand = async (billId: string) => {
    if (expandedId === billId) {
      setExpandedId(null)
      setExpandedDetail(null)
      return
    }
    setExpandedId(billId)
    setExpandedDetail(null)
    try {
      const detail = await api.get(`/bills/${billId}`)
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
        <Receipt className="h-16 w-16 text-neutral-400 dark:text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">No company set up</h2>
        <p className="text-neutral-600 dark:text-white/60 max-w-md mb-6">Finish onboarding to use Bills.</p>
        <a href="/onboarding" className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold text-white">Complete onboarding</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 space-y-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-white/60">Accounts Payable</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">Bills</h1>
          <p className="text-gray-600 dark:text-white/60 mt-1">Enter bills from vendors and track what you owe</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold flex items-center gap-2 shadow-[0_10px_35px_rgba(129,80,255,0.4)] text-white"
        >
          <Plus className="w-4 h-4" /> New Bill
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

      {/* Create Bill Form */}
      {showCreateForm && (
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Bill</h2>
            <button onClick={resetForm} className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Vendor picker */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Vendor</label>
            <div className="flex gap-2">
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="flex-1 rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              >
                <option value="">Select vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.display_name}{v.email ? ` (${v.email})` : ''}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddVendor(!showAddVendor)}
                className="px-3 py-2 rounded-2xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium text-gray-700 dark:text-white/80 hover:border-fuchsia-400 flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" /> New
              </button>
            </div>

            {/* Quick-add vendor inline */}
            {showAddVendor && (
              <div className="flex gap-2 items-end p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-white/50">Name</label>
                  <input
                    value={newVendorName}
                    onChange={e => setNewVendorName(e.target.value)}
                    placeholder="Office Depot"
                    className="mt-1 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-white/50">Email (optional)</label>
                  <input
                    value={newVendorEmail}
                    onChange={e => setNewVendorEmail(e.target.value)}
                    placeholder="ap@officedepot.com"
                    className="mt-1 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <button
                  onClick={handleAddVendor}
                  disabled={addingVendor || !newVendorName.trim()}
                  className="px-3 py-1.5 rounded-xl bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-40"
                >
                  {addingVendor ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </div>

          {/* Date / Due / Memo */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Bill Date</label>
              <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
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
              <div className="col-span-5">Description</div>
              <div className="col-span-3">Expense Account</div>
              <div className="col-span-3 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map(line => (
              <div key={line.key} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <input type="text" value={line.description} onChange={e => updateLine(line.key, 'description', e.target.value)}
                    placeholder="What was purchased"
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-3">
                  <select value={line.expense_account_id} onChange={e => updateLine(line.key, 'expense_account_id', e.target.value)}
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  >
                    <option value="">Select...</option>
                    {expenseAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="number" step="0.01" min="0" value={line.amount}
                    onChange={e => updateLine(line.key, 'amount', Number(e.target.value) || 0)}
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => removeLine(line.key)} className="text-rose-500 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {lines.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-white/40 text-center py-4">Click "+ Add Line" to add expense items to this bill.</p>
            )}
          </div>

          {/* Total + actions */}
          <div className="border-t border-gray-200 dark:border-white/10 pt-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              Total: <span className="text-fuchsia-600 dark:text-fuchsia-300">${billTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={resetForm}
                className="px-4 py-2 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium text-gray-700 dark:text-white/80"
              >
                Cancel
              </button>
              <button onClick={handleCreateBill} disabled={saving}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(129,80,255,0.4)] disabled:opacity-40"
              >
                {saving ? 'Creating...' : 'Create Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill list */}
      <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Bills</h2>
          <span className="text-xs text-gray-500 dark:text-white/50 uppercase tracking-widest">{bills.length} bills</span>
        </div>

        {bills.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-white/60">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-white/30" />
            <p>No bills yet</p>
            <p className="text-sm mt-1 text-gray-500 dark:text-white/40">Create a vendor and enter a bill to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map(bill => (
              <div key={bill.id} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-hidden">
                {/* Bill row */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.07] transition"
                  onClick={() => toggleExpand(bill.id)}
                >
                  <div>
                    <p className="text-sm text-gray-500 dark:text-white/60">{bill.bill_date ? new Date(bill.bill_date + 'T00:00:00').toLocaleDateString() : '—'}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{bill.bill_number}</p>
                    <p className="text-sm text-gray-600 dark:text-white/60">{bill.contacts?.display_name || 'Vendor'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">${Number(bill.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                          bill.status === 'posted' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                          : bill.status === 'paid' ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70'
                        }`}>
                          {bill.status}
                        </span>
                        {bill.balance_due > 0 && bill.status !== 'draft' && (
                          <span className="text-xs text-gray-500 dark:text-white/50">
                            Due: ${Number(bill.balance_due).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedId === bill.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === bill.id && (
                  <div className="border-t border-gray-200 dark:border-white/10 p-4 space-y-4">
                    {!expandedDetail ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                    ) : (
                      <>
                        {/* Lines */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase">
                            <div className="col-span-1">#</div>
                            <div className="col-span-7">Description</div>
                            <div className="col-span-4 text-right">Amount</div>
                          </div>
                          {(expandedDetail.bill_lines || []).map((line: any) => (
                            <div key={line.id || line.line_number} className="grid grid-cols-12 gap-2 text-sm text-gray-700 dark:text-white/70">
                              <div className="col-span-1">{line.line_number}</div>
                              <div className="col-span-7">{line.description || '—'}</div>
                              <div className="col-span-4 text-right">${Number(line.amount || 0).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>

                        {bill.memo && <p className="text-sm text-gray-500 dark:text-white/50">Memo: {bill.memo}</p>}

                        {bill.linked_journal_entry_id && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Journal entry linked
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {bill.status === 'draft' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePostBill(bill.id) }}
                              className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Post Bill
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
