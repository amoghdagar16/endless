'use client'

import { useState, useEffect } from 'react'
import {
  CalendarCheck, Loader2, CheckCircle, XCircle, AlertCircle,
  Clock, ChevronRight, FileText, Scale, TrendingUp, TrendingDown,
  BookOpen, Lock, ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function StepCard({
  num, title, description, status, children, action,
}: {
  num: number
  title: string
  description: string
  status: 'pass' | 'fail' | 'warn' | 'pending' | 'info'
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  const colors = {
    pass:    { border: 'var(--neon-emerald)', bg: 'rgba(52,211,153,0.04)',  icon: <CheckCircle className="w-5 h-5" style={{ color: 'var(--neon-emerald)' }} /> },
    fail:    { border: '#ef4444',             bg: 'rgba(239,68,68,0.04)',    icon: <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} /> },
    warn:    { border: '#f59e0b',             bg: 'rgba(245,158,11,0.04)',   icon: <AlertCircle className="w-5 h-5" style={{ color: '#f59e0b' }} /> },
    pending: { border: 'var(--border-color)', bg: 'transparent',            icon: <Clock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /> },
    info:    { border: 'var(--accent)',       bg: 'var(--accent-subtle)',    icon: <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} /> },
  }
  const c = colors[status]
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)`, borderLeft: `3px solid ${c.border}` }}>
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{num}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {c.icon}
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{description}</p>
          {children}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthLabel(y: number, m: number) { return `${MONTHS[m - 1]} ${y}` }

export default function MonthEndPage() {
  const { company } = useAuth()
  const companyId = company?.id || null

  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [checklist, setChecklist] = useState<any>(null)
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [closing, setClosing] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)
  const [closedPeriods, setClosedPeriods] = useState<any[]>([])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!companyId) return
    api.get('/accounting-periods/').catch(() => []).then((data: any) => {
      setClosedPeriods(Array.isArray(data) ? data.filter((p: any) => p.is_closed) : [])
    })
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    runChecklist()
  }, [companyId, selYear, selMonth])

  const runChecklist = async () => {
    if (!companyId) return
    setLoadingCheck(true)
    setChecklist(null)
    try {
      const startDate = `${selYear}-${String(selMonth).padStart(2, '0')}-01`
      const endDate = new Date(selYear, selMonth, 0).toISOString().split('T')[0]

      const [invoices, bills, journals, accounts] = await Promise.all([
        api.get('/invoices/').catch(() => []),
        api.get('/bills/').catch(() => []),
        api.get('/journals/').catch(() => []),
        api.get(`/accounts/company/${companyId}`).catch(() => []),
      ])

      const invArr = Array.isArray(invoices) ? invoices : []
      const billArr = Array.isArray(bills) ? bills : []
      const jeArr = Array.isArray(journals) ? journals : []

      const inPeriod = (dateStr: string) => dateStr >= startDate && dateStr <= endDate

      const draftInvoices = invArr.filter((i: any) => i.status === 'draft' && inPeriod(i.invoice_date || ''))
      const draftBills = billArr.filter((b: any) => b.status === 'draft' && inPeriod(b.bill_date || ''))
      const draftJournals = jeArr.filter((j: any) => j.status === 'draft' && inPeriod(j.entry_date || ''))

      const totalOutstandingAR = invArr.filter((i: any) => !['paid','void'].includes(i.status)).reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0)
      const totalOutstandingAP = billArr.filter((b: any) => !['paid','void'].includes(b.status)).reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0)

      const acctArr = Array.isArray(accounts) ? accounts : []
      const totalDebit = acctArr.filter((a: any) => ['asset','expense'].includes(a.account_type)).reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0)
      const totalCredit = acctArr.filter((a: any) => ['liability','equity','revenue'].includes(a.account_type)).reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0)
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

      const periodIncome = jeArr.filter((j: any) => j.status === 'posted' && inPeriod(j.entry_date || '') && j.source === 'invoice').reduce((s: number, j: any) => s + Number(j.total_credit || 0), 0)
      const periodExpenses = jeArr.filter((j: any) => j.status === 'posted' && inPeriod(j.entry_date || '') && j.source === 'bill').reduce((s: number, j: any) => s + Number(j.total_debit || 0), 0)

      setChecklist({
        period: { start: startDate, end: endDate },
        draftInvoices, draftBills, draftJournals,
        totalOutstandingAR, totalOutstandingAP,
        isBalanced, totalDebit, totalCredit,
        periodIncome, periodExpenses,
        netIncome: periodIncome - periodExpenses,
      })
    } catch (e) {
      setChecklist({ error: true })
    } finally { setLoadingCheck(false) }
  }

  const handleClose = async () => {
    if (!companyId || !checklist) return
    const blockingFail = (checklist.draftInvoices?.length > 0 || checklist.draftBills?.length > 0) && !checklist.isBalanced
    if (checklist.draftJournals?.length > 0) {
      setToast({ ok: false, msg: 'Post or delete all draft journal entries before closing.' }); return
    }
    setClosing(true)
    try {
      await api.post('/accounting-periods/', {
        period_start: checklist.period.start,
        period_end: checklist.period.end,
        is_closed: true,
      }).catch(() => {})
      setToast({ ok: true, msg: `${monthLabel(selYear, selMonth)} has been closed successfully.` })
      setClosedPeriods(p => [...p, { period_start: checklist.period.start, period_end: checklist.period.end, is_closed: true }])
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to close period.' })
    } finally { setClosing(false) }
  }

  const isClosed = closedPeriods.some(p => p.period_start?.startsWith(`${selYear}-${String(selMonth).padStart(2, '0')}`))

  if (!companyId) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <CalendarCheck className="h-16 w-16 mb-4" style={{ color: 'var(--text-muted)' }} />
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No company set up</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Finish onboarding to use Month-end close.</p>
      <a href="/onboarding" className="btn btn-primary">
        Complete onboarding
      </a>
    </div>
  )

  const steps = checklist ? [
    {
      title: 'Review Draft Transactions',
      description: 'All transactions for the period should be posted before closing.',
      status: (checklist.draftInvoices?.length === 0 && checklist.draftBills?.length === 0 && checklist.draftJournals?.length === 0) ? 'pass' : 'fail' as any,
      content: checklist.draftInvoices?.length > 0 || checklist.draftBills?.length > 0 || checklist.draftJournals?.length > 0 ? (
        <div className="space-y-1.5">
          {checklist.draftInvoices?.length > 0 && (
            <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
              <span style={{ color: '#f87171' }}>{checklist.draftInvoices.length} draft invoice(s)</span>
              <a href="/invoices" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Review →</a>
            </div>
          )}
          {checklist.draftBills?.length > 0 && (
            <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
              <span style={{ color: '#f87171' }}>{checklist.draftBills.length} draft bill(s)</span>
              <a href="/bills" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Review →</a>
            </div>
          )}
          {checklist.draftJournals?.length > 0 && (
            <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
              <span style={{ color: '#f87171' }}>{checklist.draftJournals.length} draft journal entries</span>
              <a href="/new-journals" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Review →</a>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--neon-emerald)' }}>All transactions are posted for this period.</p>
      ),
    },
    {
      title: 'Bank Reconciliation',
      description: 'Match your bank statement to journal entries.',
      status: 'info' as any,
      content: <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Use the <a href="/banking" className="font-semibold" style={{ color: 'var(--accent)' }}>Banking</a> section to reconcile transactions. This step is informational.
      </p>,
    },
    {
      title: 'Verify Trial Balance',
      description: 'Debits must equal credits across all accounts.',
      status: checklist.isBalanced ? 'pass' : 'fail' as any,
      content: (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Total Debits (assets + expenses)</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${fmt(checklist.totalDebit)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Total Credits (liabilities + equity + revenue)</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${fmt(checklist.totalCredit)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold pt-1" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Difference</span>
            <span style={{ color: checklist.isBalanced ? 'var(--neon-emerald)' : '#ef4444' }}>
              ${fmt(Math.abs(checklist.totalDebit - checklist.totalCredit))}
              {checklist.isBalanced ? ' ✓ Balanced' : ' ✗ Not balanced'}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Review AR Aging',
      description: 'Check outstanding customer balances.',
      status: 'info' as any,
      content: (
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Total outstanding AR</span>
          <span className="font-semibold" style={{ color: checklist.totalOutstandingAR > 0 ? '#f59e0b' : 'var(--neon-emerald)' }}>
            ${fmt(checklist.totalOutstandingAR)}
          </span>
        </div>
      ),
    },
    {
      title: 'Review AP Aging',
      description: 'Check outstanding vendor balances.',
      status: 'info' as any,
      content: (
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Total outstanding AP</span>
          <span className="font-semibold" style={{ color: checklist.totalOutstandingAP > 0 ? '#f59e0b' : 'var(--neon-emerald)' }}>
            ${fmt(checklist.totalOutstandingAP)}
          </span>
        </div>
      ),
    },
    {
      title: 'Review P&L',
      description: `Income vs expenses for ${monthLabel(selYear, selMonth)}.`,
      status: 'info' as any,
      content: (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Revenue (invoice postings)</span>
            <span className="font-semibold" style={{ color: 'var(--neon-emerald)' }}>${fmt(checklist.periodIncome)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Expenses (bill postings)</span>
            <span className="font-semibold" style={{ color: '#f87171' }}>${fmt(checklist.periodExpenses)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold pt-1" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Net Income</span>
            <span style={{ color: checklist.netIncome >= 0 ? 'var(--neon-emerald)' : '#ef4444' }}>${fmt(checklist.netIncome)}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Post Adjusting Entries',
      description: 'Record accruals, depreciation, or other adjustments.',
      status: 'pending' as any,
      content: <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Review and post any adjusting entries needed for this period.</p>,
      action: (
        <a href="/new-journals"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
          <BookOpen className="w-3.5 h-3.5" /> Create Adjusting Entry
        </a>
      ),
    },
  ] : []

  const passCount = steps.filter(s => s.status === 'pass' || s.status === 'info').length
  const canClose = checklist && !checklist.error && checklist.isBalanced && checklist.draftJournals?.length === 0

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Accounting</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Month-end Close</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Guided checklist to close your books each month</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} className="select" style={{ width: 'auto' }}>
            {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))} className="select" style={{ width: 'auto' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <button onClick={runChecklist} className="btn btn-secondary btn-sm">
            Refresh
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${toast.ok ? 'badge badge-success' : 'badge badge-danger'}`} style={{ display: 'block' }}>
          {toast.msg}
        </div>
      )}

      {/* Closed banner */}
      {isClosed && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-lg"
          style={{ backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
          <Lock className="w-5 h-5" style={{ color: 'var(--neon-emerald)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--neon-emerald)' }}>
            {monthLabel(selYear, selMonth)} is closed and locked.
          </p>
        </div>
      )}

      {loadingCheck ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : checklist?.error ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
          Failed to load checklist. Please try again.
        </div>
      ) : checklist ? (
        <>
          {/* Progress bar */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {monthLabel(selYear, selMonth)} — Close Checklist
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {passCount}/{steps.length} steps complete
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${(passCount / steps.length) * 100}%`, background: 'var(--accent)' }} />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <StepCard key={i} num={i + 1} title={step.title} description={step.description} status={step.status} action={step.action}>
                {step.content}
              </StepCard>
            ))}
          </div>

          {/* Close period */}
          {!isClosed && (
            <div className="panel p-6">
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Close {monthLabel(selYear, selMonth)}</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {canClose
                  ? 'All blocking checks passed. You can safely close this period.'
                  : 'Fix the failing checks above before closing this period. At minimum, the trial balance must be balanced and all draft journal entries posted.'}
              </p>
              {!canClose && (
                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: '#f59e0b' }}>
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {!checklist.isBalanced && 'Trial balance is unbalanced. '}
                    {checklist.draftJournals?.length > 0 && `${checklist.draftJournals.length} draft journal(s) need posting.`}
                  </span>
                </div>
              )}
              <button
                onClick={handleClose}
                disabled={!canClose || closing}
                className={`btn btn-lg ${canClose ? 'btn-primary' : 'btn-secondary'}`}>
                {closing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Closing…</>
                  : <><Lock className="w-4 h-4" /> Close {monthLabel(selYear, selMonth)}</>}
              </button>
            </div>
          )}

          {/* History */}
          {closedPeriods.length > 0 && (
            <div className="panel p-5">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Closed Periods</h3>
              <div className="space-y-2">
                {closedPeriods.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{p.period_start} – {p.period_end}</span>
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--neon-emerald)' }}>
                      <Lock className="w-3.5 h-3.5" /> Closed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
