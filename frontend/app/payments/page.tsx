'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, CreditCard, Loader2, X, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface Payment {
  id: string
  payment_date: string
  amount: number
  memo: string | null
  status: string
  contacts?: { display_name: string } | null
  deposit_account_id: string | null
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    applied: { bg: 'rgba(52,211,153,0.15)', color: 'var(--neon-emerald)' },
    unapplied: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    partial: { bg: 'rgba(59,130,246,0.12)', color: 'var(--accent)' },
    voided: { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  }
  const s = styles[status] || { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={s}>
      {status}
    </span>
  )
}

const PAGE_SIZE = 25

export default function PaymentsPage() {
  const { company } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchPayments = useCallback(async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const data = await api.get('/payments/')
      setPayments(Array.isArray(data) ? data : [])
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [company?.id])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    return payments.filter(p =>
      !q ||
      p.contacts?.display_name?.toLowerCase().includes(q) ||
      p.memo?.toLowerCase().includes(q) ||
      p.payment_date?.includes(q)
    )
  }, [payments, debouncedSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalApplied = useMemo(() => payments.filter(p => p.status === 'applied').reduce((s, p) => s + p.amount, 0), [payments])
  const totalUnapplied = useMemo(() => payments.filter(p => p.status === 'unapplied').reduce((s, p) => s + p.amount, 0), [payments])

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Receivables</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Payments</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Customer payments and invoice applications.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Received', value: payments.reduce((s, p) => s + p.amount, 0), accent: 'var(--text-primary)' },
          { label: 'Applied', value: totalApplied, accent: 'var(--neon-emerald)' },
          { label: 'Unapplied', value: totalUnapplied, accent: 'var(--neon-amber)' },
        ].map(card => (
          <div key={card.label} className="panel p-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
            <p className="text-2xl font-semibold tabular-nums" style={{ color: card.accent }}>
              ${card.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search payments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{filtered.length} payment{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="w-12 h-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'No payments match your search' : 'No payments yet'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Record payments from the Invoices page
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-left" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {['Date', 'Customer', 'Memo', 'Amount', 'Status'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 ${i >= 3 ? 'text-right' : ''}`} style={{ borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {p.contacts?.display_name || <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {p.memo || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={p.status || 'unapplied'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Page {page} of {pageCount}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="btn btn-secondary btn-sm"
                  >
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
