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
  AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'

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

export default function NewJournals() {
  const [isCreating, setIsCreating] = useState(false)
  const [journalEntry, setJournalEntry] = useState<JournalEntry>({
    date: new Date().toISOString().split('T')[0],
    memo: '',
    referenceNumber: '',
    lines: [],
    status: 'draft'
  })
  const [isOCRProcessing, setIsOCRProcessing] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [recentJournals, setRecentJournals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
    fetchRecentJournals()
  }, [])

  const fetchAccounts = async () => {
    try {
      // Mock accounts - replace with API call
      const mockAccounts = [
        { id: '1', code: '1000', name: 'Cash', type: 'asset' },
        { id: '2', code: '1200', name: 'Accounts Receivable', type: 'asset' },
        { id: '3', code: '2000', name: 'Accounts Payable', type: 'liability' },
        { id: '4', code: '4000', name: 'Sales Revenue', type: 'revenue' },
        { id: '5', code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
        { id: '6', code: '6000', name: 'Operating Expenses', type: 'expense' },
      ]
      setAccounts(mockAccounts)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const fetchRecentJournals = async () => {
    try {
      setLoading(true)
      // Mock data - replace with API call
      setRecentJournals([])
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
      const response = await api.post('/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const { extracted_data } = response.data

      // Auto-populate journal entry from OCR
      setJournalEntry({
        ...journalEntry,
        memo: extracted_data.memo || extracted_data.vendor || '',
        referenceNumber: extracted_data.invoice_number || '',
        date: extracted_data.date || journalEntry.date,
        attachedFile: file,
        lines: [
          {
            id: Date.now().toString(),
            accountId: '',
            accountName: '',
            description: extracted_data.vendor || 'Expense',
            debit: 0,
            credit: extracted_data.amount || 0
          },
          {
            id: (Date.now() + 1).toString(),
            accountId: '',
            accountName: '',
            description: 'Cash payment',
            debit: extracted_data.amount || 0,
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
    if (!isBalanced()) {
      alert('Journal entry must be balanced (debits = credits)')
      return
    }

    try {
      const payload = {
        ...journalEntry,
        status: postImmediately ? 'posted' : 'draft'
      }

      // Replace with actual API call
      console.log('Saving journal entry:', payload)

      alert(postImmediately ? 'Journal entry posted!' : 'Journal entry saved as draft!')
      setIsCreating(false)
      setJournalEntry({
        date: new Date().toISOString().split('T')[0],
        memo: '',
        referenceNumber: '',
        lines: [],
        status: 'draft'
      })
      fetchRecentJournals()
    } catch (error) {
      console.error('Failed to save journal entry:', error)
      alert('Failed to save journal entry. Please try again.')
    }
  }

  const { totalDebit, totalCredit } = calculateTotals()
  const balanced = isBalanced()

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journals</h1>
          <p className="text-gray-600 mt-1">Record and manage your transactions</p>
        </div>
        <div className="flex gap-3">
          <label className="btn btn-secondary cursor-pointer flex items-center gap-2">
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
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* OCR Processing Indicator */}
      {isOCRProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="font-medium text-blue-900">Processing document...</p>
            <p className="text-sm text-blue-700">Extracting transaction details with AI</p>
          </div>
        </div>
      )}

      {/* Journal Entry Form */}
      {isCreating && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">New Journal Entry</h2>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
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
                className="input"
              />
            </div>
            <div>
              <label className="label">Reference Number</label>
              <input
                type="text"
                value={journalEntry.referenceNumber}
                onChange={(e) => setJournalEntry({ ...journalEntry, referenceNumber: e.target.value })}
                placeholder="INV-001"
                className="input"
              />
            </div>
            <div className="col-span-1">
              <label className="label">Memo</label>
              <input
                type="text"
                value={journalEntry.memo}
                onChange={(e) => setJournalEntry({ ...journalEntry, memo: e.target.value })}
                placeholder="Description of transaction"
                className="input"
              />
            </div>
          </div>

          {/* Journal Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Transaction Lines</h3>
              <button onClick={addLine} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                + Add Line
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 text-sm font-medium text-gray-700 pb-2 border-b border-gray-200">
              <div className="col-span-3">Account</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Debit</div>
              <div className="col-span-2">Credit</div>
              <div className="col-span-1"></div>
            </div>

            {/* Lines */}
            {journalEntry.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3">
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                    className="input text-sm"
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
                    className="input text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.debit || ''}
                    onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="input text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.credit || ''}
                    onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="input text-sm"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeLine(line.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-12 gap-3 text-sm font-medium">
              <div className="col-span-7 text-right text-gray-700">Totals:</div>
              <div className="col-span-2">
                <div className={`px-3 py-2 rounded-lg ${totalDebit > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                  ${totalDebit.toFixed(2)}
                </div>
              </div>
              <div className="col-span-2">
                <div className={`px-3 py-2 rounded-lg ${totalCredit > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                  ${totalCredit.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Balance Status */}
            <div className="mt-3 flex items-center gap-2">
              {balanced ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Entry is balanced</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
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
              className="btn btn-secondary"
              disabled={!balanced}
            >
              Save as Draft
            </button>
            <button
              onClick={() => saveJournalEntry(true)}
              className="btn btn-primary"
              disabled={!balanced}
            >
              Post Entry
            </button>
          </div>
        </div>
      )}

      {/* Recent Journals */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Journal Entries</h2>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          </div>
        ) : recentJournals.length > 0 ? (
          <div className="space-y-2">
            {/* Journal list will go here */}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No journal entries yet</p>
            <p className="text-sm mt-1">Create your first entry to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
