'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Upload,
  Save,
  X,
  Check,
  Camera,
  FileText,
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface JournalLine {
  id: string
  accountId: string
  accountName: string
  description: string
  debit: number
  credit: number
}

interface JournalEntry {
  id?: string
  date: string
  memo: string
  referenceNumber: string
  lines: JournalLine[]
  attachedFile?: File
  status: 'draft' | 'posted'
}

const createEmptyEntry = (): JournalEntry => ({
  date: new Date().toISOString().split('T')[0],
  memo: '',
  referenceNumber: '',
  lines: [],
  status: 'draft'
})

export default function NewJournals() {
  const { company, loading: authLoading } = useAuth()
  const companyId = company?.id || null
  const [isCreating, setIsCreating] = useState(false)
  const [journalEntry, setJournalEntry] = useState<JournalEntry>(createEmptyEntry())
  const [isOCRProcessing, setIsOCRProcessing] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [recentJournals, setRecentJournals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const resetEntry = () => setJournalEntry(createEmptyEntry())

  useEffect(() => {
    if (authLoading) return
    if (companyId) {
      fetchAccounts(companyId)
      fetchRecentJournals(companyId)
    } else {
      setLoading(false)
    }
  }, [companyId, authLoading])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const fetchAccounts = async (targetCompanyId: string) => {
    try {
      const response = await api.get(`/accounts/company/${targetCompanyId}`)
      const accountsData = response.map((acc: any) => ({
        id: acc.id,
        code: acc.account_code,
        name: acc.account_name,
        type: acc.account_type
      }))
      setAccounts(accountsData)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const fetchRecentJournals = async (targetCompanyId: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/journals/company/${targetCompanyId}?limit=10`)
      setRecentJournals(response)
    } catch (error) {
      console.error('Failed to fetch journals:', error)
    } finally {
      setLoading(false)
    }
  }

  const addLine = () => {
    const newLine: JournalLine = {
      id: Date.now().toString(),
      accountId: '',
      accountName: '',
      description: '',
      debit: 0,
      credit: 0
    }
    setJournalEntry({
      ...journalEntry,
      lines: [...journalEntry.lines, newLine]
    })
  }

  const updateLine = (lineId: string, field: string, value: any) => {
    setJournalEntry({
      ...journalEntry,
      lines: journalEntry.lines.map(line => {
        if (line.id === lineId) {
          // If account changes, update account name
          if (field === 'accountId') {
            const account = accounts.find(a => a.id === value)
            return { ...line, accountId: value, accountName: account?.name || '' }
          }
          if (field === 'debit') {
            const cleanedValue = value === '' ? '' : Number(value)
            return {
              ...line,
              debit: cleanedValue,
              credit: cleanedValue ? 0 : line.credit
            }
          }
          if (field === 'credit') {
            const cleanedValue = value === '' ? '' : Number(value)
            return {
              ...line,
              credit: cleanedValue,
              debit: cleanedValue ? 0 : line.debit
            }
          }
          return { ...line, [field]: value }
        }
        return line
      })
    })
  }

  const removeLine = (lineId: string) => {
    setJournalEntry({
      ...journalEntry,
      lines: journalEntry.lines.filter(line => line.id !== lineId)
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsOCRProcessing(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.postFormData<{
        parsed_fields: { vendor?: string; date?: string; total?: string; amount?: number; memo?: string; invoice_number?: string }
      }>('/parse/', formData)

      const pf = response?.parsed_fields || {}
      const amount = typeof pf.amount === 'number' ? pf.amount : (typeof pf.total === 'string' ? parseFloat(pf.total.replace(/[,$]/g, '')) || 0 : 0)
      const dateNorm = pf.date ? (pf.date.includes('-') && pf.date.length >= 10 ? pf.date : (() => {
        const parts = pf.date!.split(/[/-]/)
        const [m, d, y] = parts
        if (!y) return journalEntry.date
        const yy = y.length === 2 ? `20${y}` : y
        return `${yy}-${(m || '').padStart(2, '0')}-${(d || '').padStart(2, '0')}`
      })()) : journalEntry.date

      setJournalEntry({
        ...journalEntry,
        memo: pf.memo || pf.vendor || '',
        referenceNumber: pf.invoice_number || '',
        date: dateNorm,
        attachedFile: file,
        lines: [
          {
            id: Date.now().toString(),
            accountId: '',
            accountName: '',
            description: pf.vendor || 'Expense',
            debit: 0,
            credit: amount
          },
          {
            id: (Date.now() + 1).toString(),
            accountId: '',
            accountName: '',
            description: 'Cash payment',
            debit: amount,
            credit: 0
          }
        ]
      })

      setIsCreating(true)
    } catch (error) {
      console.error('OCR processing failed:', error)
      alert('Failed to process document. Please try again.')
    } finally {
      setIsOCRProcessing(false)
    }
  }

  const calculateTotals = () => {
    const totalDebit = journalEntry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    const totalCredit = journalEntry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    return { totalDebit, totalCredit }
  }

  const isBalanced = () => {
    const { totalDebit, totalCredit } = calculateTotals()
    return Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0
  }

  const saveJournalEntry = async (postImmediately = false) => {
    if (!companyId) {
      alert('Company not ready yet. Please wait a moment and try again.')
      return
    }
    if (!isBalanced()) {
      alert('Journal entry must be balanced (debits = credits)')
      return
    }

    if (journalEntry.lines.some(line => !line.accountId)) {
      alert('Please select accounts for every line before saving.')
      return
    }

    try {
      setSaving(true)
      const payload = {
        company_id: companyId,
        entry_date: journalEntry.date,
        memo: journalEntry.memo,
        reference: journalEntry.referenceNumber,
        lines: journalEntry.lines.map(line => ({
          account_id: line.accountId,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          description: line.description || undefined
        }))
      }

      await api.post('/journals/', payload)

      setToast({
        type: 'success',
        message: postImmediately ? 'Journal entry posted successfully.' : 'Journal draft saved.'
      })
      setIsCreating(false)
      resetEntry()
      fetchRecentJournals(companyId)
    } catch (error: any) {
      console.error('Failed to save journal entry:', error)
      const detail = error?.response?.data?.detail
      setToast({
        type: 'error',
        message: typeof detail === 'string'
          ? detail
          : 'Failed to save journal entry. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteJournalEntry = async (journalId: string) => {
    if (!companyId) return
    if (!confirm('Delete this journal entry? This will reverse the account balances.')) return
    try {
      await api.delete(`/journals/${journalId}`)
      setToast({ type: 'success', message: 'Journal entry deleted.' })
      fetchRecentJournals(companyId)
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      setToast({
        type: 'error',
        message: typeof detail === 'string' ? detail : 'Failed to delete journal entry.',
      })
    }
  }

  const { totalDebit, totalCredit } = calculateTotals()
  const balanced = isBalanced()

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No company set up yet</h2>
        <p className="text-gray-600 dark:text-white/60 max-w-md mb-6">
          Finish onboarding and link your company to use journals.
        </p>
        <a
          href="/onboarding"
          className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold text-white"
        >
          Complete onboarding
        </a>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 bg-gray-50 dark:bg-slate-950">
        <p className="text-gray-600 dark:text-white/70 text-center max-w-md">
          No company linked to your account. Complete onboarding to create journal entries.
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
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-white/60">Double-entry studio</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">Journal entries</h1>
          <p className="text-gray-600 dark:text-white/60 mt-1">Build entries manually or import from documents.</p>
        </div>
        <div className="flex gap-3">
          <label className="px-4 py-2 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium flex items-center gap-2 cursor-pointer text-gray-700 dark:text-white">
            <Upload className="w-4 h-4" />
            Upload Receipt
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isOCRProcessing}
            />
          </label>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold flex items-center gap-2 shadow-[0_10px_35px_rgba(129,80,255,0.4)] text-white"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* OCR Processing Indicator */}
      {isOCRProcessing && (
        <div className="border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 bg-gray-50 dark:bg-white/5">
          <Loader2 className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-200 animate-spin" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Processing document...</p>
            <p className="text-sm text-gray-700 dark:text-white/70">Extracting transaction details with AI</p>
          </div>
        </div>
      )}

      {/* Journal Entry Form */}
      {isCreating && (
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Journal Entry</h2>
            <button onClick={() => setIsCreating(false)} className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Entry Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Date</label>
              <input
                type="date"
                value={journalEntry.date}
                onChange={(e) => setJournalEntry({ ...journalEntry, date: e.target.value })}
                className="mt-2 w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Reference Number</label>
              <input
                type="text"
                value={journalEntry.referenceNumber}
                onChange={(e) => setJournalEntry({ ...journalEntry, referenceNumber: e.target.value })}
                placeholder="INV-001"
                className="mt-2 w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-white/60">Memo</label>
              <input
                type="text"
                value={journalEntry.memo}
                onChange={(e) => setJournalEntry({ ...journalEntry, memo: e.target.value })}
                placeholder="Description of transaction"
                className="mt-2 w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              />
            </div>
          </div>

          {/* Journal Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">Transaction Lines</h3>
              <button onClick={addLine} className="text-sm text-fuchsia-600 dark:text-fuchsia-300 hover:text-fuchsia-700 dark:hover:text-fuchsia-200 font-medium">
                + Add Line
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-600 dark:text-white/50 pb-2 border-b border-gray-200 dark:border-white/10 uppercase tracking-wide bg-gray-50 dark:bg-transparent">
              <div className="col-span-3">Account</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2 text-right">Debit</div>
              <div className="col-span-2 text-right">Credit</div>
              <div className="col-span-1"></div>
            </div>

            {/* Lines */}
            {journalEntry.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3">
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  >
                    <option value="">Select account...</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder="Line description"
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.debit || ''}
                    onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 text-right focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.credit || ''}
                    onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full rounded-2xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 text-right focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeLine(line.id)}
                    className="text-rose-500 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-white/10 pt-4">
            <div className="grid grid-cols-12 gap-3 text-sm font-medium">
              <div className="col-span-7 text-right text-gray-700 dark:text-white/70">Totals:</div>
              <div className="col-span-2">
                <div className={`px-3 py-2 rounded-lg text-right ${totalDebit > 0 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60'}`}>
                  ${totalDebit.toFixed(2)}
                </div>
              </div>
              <div className="col-span-2">
                <div className={`px-3 py-2 rounded-lg text-right ${totalCredit > 0 ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60'}`}>
                  ${totalCredit.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Balance Status */}
            <div className="mt-3 flex items-center gap-2">
              {balanced ? (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Entry is balanced</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => saveJournalEntry(false)}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-medium text-gray-700 dark:text-white/80 transition hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={saving}
              title="Drafts still require balanced debits & credits"
            >
              Save as Draft
            </button>
            <button
              onClick={() => saveJournalEntry(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                balanced && !saving
                  ? 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white shadow-[0_20px_60px_rgba(129,80,255,0.45)] hover:shadow-[0_25px_70px_rgba(129,80,255,0.6)]'
                  : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/40 border border-gray-300 dark:border-white/15'
              }`}
              disabled={saving}
              title={balanced ? '' : 'Balance debits and credits to post'}
            >
              {saving ? 'Posting…' : 'Post Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Journals */}
      <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Journal Entries</h2>
          <span className="text-xs text-gray-500 dark:text-white/50 uppercase tracking-widest">{recentJournals.length} entries</span>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 dark:text-white/50 animate-spin mx-auto" />
          </div>
        ) : recentJournals.length > 0 ? (
          <div className="space-y-3">
            {recentJournals.map(journal => (
              <div key={journal.id} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-white/60">{journal.entry_date ? new Date(journal.entry_date).toLocaleDateString() : '—'}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{journal.journal_number || 'Pending #'}</p>
                    <p className="text-sm text-gray-600 dark:text-white/60 mt-1">{journal.memo || 'No memo provided'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">${journal.total_debit?.toLocaleString() || '0.00'}</p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          journal.status === 'posted'
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70'
                        }`}
                      >
                        {journal.status || 'draft'}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteJournalEntry(journal.id)}
                      className="p-2 rounded-xl text-gray-400 dark:text-white/30 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {journal.journal_lines && journal.journal_lines.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-white/10 pt-3 space-y-2">
                    {journal.journal_lines.slice(0, 3).map((line: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-700 dark:text-white/70">
                        <span>{line.accounts?.account_name || line.description}</span>
                        <div className="flex gap-6">
                          <span className="w-24 text-right">{line.debit ? `$${line.debit.toFixed(2)}` : '—'}</span>
                          <span className="w-24 text-right">{line.credit ? `$${line.credit.toFixed(2)}` : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600 dark:text-white/60">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-white/30" />
            <p>No journal entries yet</p>
            <p className="text-sm mt-1 text-gray-500 dark:text-white/40">Create your first entry to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
