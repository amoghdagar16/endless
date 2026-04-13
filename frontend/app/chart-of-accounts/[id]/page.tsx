'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface RegisterLine {
  id: string
  journal_entry_id: string
  journal_number: string
  entry_date: string
  memo: string
  debit: number
  credit: number
  running_balance: number
  status: string
}

interface AccountInfo {
  id: string
  account_code: string
  account_name: string
  account_type: string
  account_subtype: string
  current_balance: number
}

function fmt(n: number) {
  if (n === 0) return ''
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtBalance(n: number) {
  const abs = `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return n < 0 ? `(${abs})` : abs
}

export default function AccountRegisterPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useAuth()
  const accountId = params?.id as string

  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [lines, setLines] = useState<RegisterLine[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchRegister = useCallback(async () => {
    if (!accountId || !company?.id) return
    setLoading(true)
    try {
      const params: string[] = []
      if (startDate) params.push(`start_date=${startDate}`)
      if (endDate) params.push(`end_date=${endDate}`)
      const qs = params.length ? `?${params.join('&')}` : ''
      const result = await api.get(`/accounts/${accountId}/register${qs}`)
      setAccount(result.account)
      setLines(result.lines || [])
    } catch {
      setLines([])
    } finally {
      setLoading(false)
    }
  }, [accountId, company?.id, startDate, endDate])

  useEffect(() => {
    fetchRegister()
  }, [fetchRegister])

  const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }

  if (!company?.id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/chart-of-accounts')}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>Account Register</p>
            {account ? (
              <>
                <h1 className="text-2xl font-semibold mt-1">{account.account_name}</h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {account.account_code} · {account.account_type?.charAt(0).toUpperCase()}{account.account_type?.slice(1)}
                  {account.account_subtype ? ` / ${account.account_subtype.replace(/_/g, ' ')}` : ''}
                </p>
              </>
            ) : (
              <h1 className="text-2xl font-semibold mt-1">Loading…</h1>
            )}
          </div>
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: 'var(--text-muted)' }}>From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
          />
          <label className="text-sm" style={{ color: 'var(--text-muted)' }}>To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Balance summary */}
      {account && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Current Balance', value: fmtBalance(account.current_balance || 0), accent: 'var(--accent)' },
            { label: 'Total Debits', value: fmt(lines.reduce((s, l) => s + l.debit, 0)) || '$0.00', accent: 'var(--neon-emerald)' },
            { label: 'Total Credits', value: fmt(lines.reduce((s, l) => s + l.credit, 0)) || '$0.00', accent: 'var(--neon-emerald)' },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              <p className="text-2xl font-semibold" style={{ color: card.accent }}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Register table */}
      <div className="panel">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No transactions</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>No posted journal lines for this account</p>
          </div>
        ) : (
          <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                {['Date', 'Journal #', 'Memo', 'Debit', 'Credit', 'Balance', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 ${i >= 3 ? 'text-right' : ''}`}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr key={line.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {line.entry_date ? new Date(line.entry_date + 'T00:00:00').toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {line.journal_number || '—'}
                  </td>
                  <td className="px-4 py-3 max-w-[240px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {line.memo || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: line.debit > 0 ? 'var(--neon-emerald)' : 'var(--text-muted)' }}>
                    {fmt(line.debit) || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: line.credit > 0 ? 'var(--neon-emerald)' : 'var(--text-muted)' }}>
                    {fmt(line.credit) || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: line.running_balance < 0 ? '#f87171' : 'var(--text-primary)' }}>
                    {fmtBalance(line.running_balance)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: line.status === 'posted' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                        color: line.status === 'posted' ? 'var(--neon-emerald)' : '#fbbf24',
                      }}
                    >
                      {line.status || 'unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
