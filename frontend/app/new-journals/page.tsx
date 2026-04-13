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
  const { company } = useAuth()
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
    if (!companyId) {
      setLoading(false)
      return
    }
    fetchAccounts(companyId)
    fetchRecentJournals(companyId)
  }, [companyId])

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
            const cleanedValue = value === '' ? 0 : Number(value)
            return {
              ...line,
              debit: cleanedValue,
              credit: cleanedValue ? 0 : line.credit
            }
          }
          if (field === 'credit') {
            const cleanedValue = value === '' ? 0 : Number(value)
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

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-3">
        <FileText className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No company set up</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Finish onboarding and link your company to use journals.
        </p>
        <a href="/onboarding" className="btn btn-primary btn-sm">Complete onboarding</a>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Double-entry Studio</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Journal entries</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Build entries manually or import from documents.</p>
        </div>
        <div className="flex gap-2">
          <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
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
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Entry
          </button>
        </div>
      </div>

      {toast && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: toast.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: toast.type === 'success' ? 'var(--neon-emerald)' : '#dc2626',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* OCR Processing Indicator */}
      {isOCRProcessing && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Processing document...</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Extracting transaction details with AI</p>
          </div>
        </div>
      )}

      {/* Journal Entry Form */}
      {isCreating && (
        <div className="panel space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>New Journal Entry</h2>
            <button onClick={() => setIsCreating(false)} className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Entry Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={journalEntry.date}
                onChange={(e) => setJournalEntry({ ...journalEntry, date: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Reference Number</label>
              <input
                type="text"
                value={journalEntry.referenceNumber}
                onChange={(e) => setJournalEntry({ ...journalEntry, referenceNumber: e.target.value })}
                placeholder="INV-001"
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Memo</label>
              <input
                type="text"
                value={journalEntry.memo}
                onChange={(e) => setJournalEntry({ ...journalEntry, memo: e.target.value })}
                placeholder="Description of transaction"
                className="input w-full"
              />
            </div>
          </div>

          {/* Journal Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Transaction Lines</h3>
              <button onClick={addLine} className="text-sm font-medium" style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                + Add Line
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 text-xs font-semibold pb-2 uppercase tracking-wide" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
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
                    className="input w-full"
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
                    className="input w-full"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.debit || ''}
                    onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="input w-full text-right"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.credit || ''}
                    onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="input w-full text-right"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeLine(line.id)}
                    className="btn btn-icon btn-ghost"
                    style={{ width: 28, height: 28, color: '#ef4444' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="grid grid-cols-12 gap-3 text-sm font-medium">
              <div className="col-span-7 text-right" style={{ color: 'var(--text-secondary)' }}>Totals:</div>
              <div className="col-span-2">
                <div className="px-3 py-2 rounded-lg text-right text-sm" style={{
                  backgroundColor: totalDebit > 0 ? 'rgba(16,185,129,0.08)' : 'var(--bg-muted)',
                  color: totalDebit > 0 ? 'var(--neon-emerald)' : 'var(--text-muted)',
                }}>
                  ${totalDebit.toFixed(2)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="px-3 py-2 rounded-lg text-right text-sm" style={{
                  backgroundColor: totalCredit > 0 ? 'rgba(239,68,68,0.06)' : 'var(--bg-muted)',
                  color: totalCredit > 0 ? '#ef4444' : 'var(--text-muted)',
                }}>
                  ${totalCredit.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Balance Status */}
            <div className="mt-3 flex items-center gap-2">
              {balanced ? (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--neon-emerald)' }}>
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Entry is balanced</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#f59e0b' }}>
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">
                    Out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => saveJournalEntry(false)}
              className="btn btn-secondary btn-sm"
              disabled={saving}
              title="Drafts still require balanced debits & credits"
            >
              Save as Draft
            </button>
            <button
              onClick={() => saveJournalEntry(true)}
              className={`btn btn-sm ${balanced && !saving ? 'btn-primary' : 'btn-secondary'}`}
              disabled={saving}
              title={balanced ? '' : 'Balance debits and credits to post'}
            >
              {saving ? 'Posting…' : 'Post Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Journals */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Journal Entries</h2>
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{recentJournals.length} entries</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : recentJournals.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {recentJournals.map(journal => (
              <div key={journal.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{journal.entry_date ? new Date(journal.entry_date).toLocaleDateString() : '—'}</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{journal.journal_number || 'Pending #'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{journal.memo || 'No memo provided'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>${journal.total_debit?.toLocaleString() || '0.00'}</p>
                      <span className={journal.status === 'posted' ? 'badge badge-success' : 'badge badge-neutral'}>
                        {journal.status || 'draft'}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteJournalEntry(journal.id)}
                      className="btn btn-icon btn-ghost"
                      style={{ width: 32, height: 32 }}
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
                {journal.journal_lines && journal.journal_lines.length > 0 && (
                  <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--border-color)' }}>
                    {journal.journal_lines.slice(0, 3).map((line: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>{line.accounts?.account_name || line.description}</span>
                        <div className="flex gap-6">
                          <span className="w-20 text-right">{line.debit ? `$${line.debit.toFixed(2)}` : '—'}</span>
                          <span className="w-20 text-right">{line.credit ? `$${line.credit.toFixed(2)}` : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <FileText className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No journal entries yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create your first entry to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
