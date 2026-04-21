'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BarChart3, Loader2, ChevronDown, ChevronRight, Printer } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useCompanyReady } from '@/hooks/useCompanyReady'
import {
  BalanceSheetPDF,
  ProfitLossPDF,
  CashFlowPDF,
  TrialBalancePDF,
} from '@/components/ReportPDF'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'balance-sheet' | 'profit-loss' | 'cash-flow' | 'trial-balance'

interface CategoryData {
  accounts: { account_code: string; account_name: string; net_balance: number }[]
  total: number
}

interface SectionData {
  categories: Record<string, CategoryData>
  total: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n < 0) return `($${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function janFirstStr() {
  const y = new Date().getFullYear()
  return `${y}-01-01`
}

type Preset = { label: string; range?: [string, string]; asOf?: string }

function getPresets(): Preset[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const firstOfMonth = new Date(y, m, 1)
  const lastOfMonth = new Date(y, m + 1, 0)
  const firstOfLastMonth = new Date(y, m - 1, 1)
  const lastOfLastMonth = new Date(y, m, 0)

  const quarterStart = new Date(y, Math.floor(m / 3) * 3, 1)
  const quarterEnd = new Date(y, Math.floor(m / 3) * 3 + 3, 0)
  const lastQStart = new Date(y, Math.floor(m / 3) * 3 - 3, 1)
  const lastQEnd = new Date(y, Math.floor(m / 3) * 3, 0)

  return [
    { label: 'This Month', range: [ymd(firstOfMonth), ymd(lastOfMonth)], asOf: ymd(lastOfMonth) },
    { label: 'Last Month', range: [ymd(firstOfLastMonth), ymd(lastOfLastMonth)], asOf: ymd(lastOfLastMonth) },
    { label: 'This Quarter', range: [ymd(quarterStart), ymd(quarterEnd)], asOf: ymd(quarterEnd) },
    { label: 'Last Quarter', range: [ymd(lastQStart), ymd(lastQEnd)], asOf: ymd(lastQEnd) },
    { label: 'YTD', range: [`${y}-01-01`, ymd(now)], asOf: ymd(now) },
    { label: 'Last Year', range: [`${y - 1}-01-01`, `${y - 1}-12-31`], asOf: `${y - 1}-12-31` },
  ]
}

function formatDateDisplay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Collapsible Section Component
// ---------------------------------------------------------------------------

function Section({ title, children, level = 1 }: { title: string; children: React.ReactNode; level?: number }) {
  const [open, setOpen] = useState(true)
  const screenPl = level === 1 ? 'pl-0' : level === 2 ? 'pl-4' : 'pl-8'
  const font = level === 1 ? 'font-bold text-base' : 'font-semibold text-sm'
  return (
    <div className={screenPl} data-report-level={level}>
      <button
        onClick={() => setOpen(!open)}
        className={`rpt-section-title flex items-center gap-1 w-full text-left py-1.5 ${font} transition-colors`}
        style={{ color: 'var(--text-primary)' }}
        data-report-level={level}
      >
        <span className="rpt-chevron">{open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}</span>
        {title}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

function AccountRow({ code, name, amount, indent = 3 }: { code: string; name: string; amount: number; indent?: number }) {
  const screenPl = indent === 2 ? 'pl-8' : indent === 3 ? 'pl-12' : 'pl-4'
  return (
    <div className={`rpt-account-row flex justify-between py-0.5 text-sm ${screenPl}`} style={{ color: 'var(--text-secondary)' }}>
      <span>{code ? `${code} \u2013 ${name}` : name}</span>
      <span style={amount < 0 ? { color: 'var(--neon-red, #f87171)' } : {}}>{fmt(amount)}</span>
    </div>
  )
}

function TotalRow({ label, amount, bold = false, doubleBorder = false, indent = 0 }: {
  label: string; amount: number; bold?: boolean; doubleBorder?: boolean; indent?: number
}) {
  const screenPl = indent === 1 ? 'pl-4' : indent === 2 ? 'pl-8' : ''
  const rptClass = doubleBorder ? 'rpt-total-grand' : bold ? 'rpt-total-section' : 'rpt-total-cat'
  return (
    <div
      className={`${rptClass} flex justify-between py-1 ${screenPl} ${bold ? 'font-bold' : 'font-semibold'} text-sm ${doubleBorder ? 'mt-1 pt-2' : ''}`}
      style={{
        color: 'var(--text-primary)',
        borderTop: doubleBorder ? '2px double var(--border-color)' : '1px solid var(--border-color)',
      }}
    >
      <span>{label}</span>
      <span style={amount < 0 ? { color: '#f87171' } : {}}>{fmt(amount)}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
      <BarChart3 className="h-12 w-12 mb-3 opacity-40" />
      <p className="text-sm">No posted transactions for this period</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section Renderer (Balance Sheet / P&L categories)
// ---------------------------------------------------------------------------

function SectionBlock({ title, data }: { title: string; data: SectionData }) {
  if (!data || Object.keys(data.categories || {}).length === 0) return null
  return (
    <Section title={title}>
      {Object.entries(data.categories).map(([catName, cat]) => (
        <Section key={catName} title={catName} level={2}>
          {cat.accounts.map((a, i) => (
            <AccountRow key={i} code={a.account_code} name={a.account_name} amount={a.net_balance} />
          ))}
          <TotalRow label={`Total ${catName}`} amount={cat.total} indent={2} />
        </Section>
      ))}
      <TotalRow label={`Total ${title}`} amount={data.total} bold />
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Report Renderers
// ---------------------------------------------------------------------------

function BalanceSheetReport({ data }: { data: any }) {
  if (!data?.sections) return <EmptyState />
  const { assets, liabilities, equity, liabilities_and_equity_total } = data.sections
  const hasData = (assets?.total || 0) !== 0 || (liabilities?.total || 0) !== 0 || (equity?.total || 0) !== 0
  if (!hasData) return <EmptyState />
  return (
    <div className="rpt-body space-y-4">
      <SectionBlock title="Assets" data={assets} />
      <SectionBlock title="Liabilities" data={liabilities} />
      <SectionBlock title="Equity" data={equity} />
      <TotalRow label="Total Liabilities & Equity" amount={liabilities_and_equity_total || 0} bold doubleBorder />
    </div>
  )
}

function ProfitLossReport({ data }: { data: any }) {
  if (!data?.sections) return <EmptyState />
  const s = data.sections
  const hasData = (s.revenue?.total || 0) !== 0 || (s.operating_expenses?.total || 0) !== 0
  if (!hasData) return <EmptyState />
  return (
    <div className="rpt-body space-y-4">
      <SectionBlock title="Revenue" data={s.revenue} />
      {s.cost_of_goods_sold?.total !== 0 && s.cost_of_goods_sold?.total != null && (
        <SectionBlock title="Cost of Goods Sold" data={s.cost_of_goods_sold} />
      )}
      <TotalRow label="Gross Profit" amount={s.gross_profit || 0} bold />
      <SectionBlock title="Operating Expenses" data={s.operating_expenses} />
      {s.other_expenses?.total !== 0 && s.other_expenses?.total != null && (
        <SectionBlock title="Other Expenses" data={s.other_expenses} />
      )}
      <TotalRow label="Total Expenses" amount={s.total_expenses || 0} />
      <TotalRow label="Net Income" amount={s.net_income || 0} bold doubleBorder />
    </div>
  )
}

function CashFlowReport({ data }: { data: any }) {
  if (!data?.sections) return <EmptyState />
  const s = data.sections
  return (
    <div className="rpt-body space-y-4">
      <Section title="Operating Activities">
        <AccountRow code="" name="Net Income" amount={s.operating?.net_income || 0} indent={2} />
        {s.operating?.adjustments?.length > 0 && (
          <div className="pl-4">
            <p className="rpt-adj-label text-xs font-medium pl-4 pt-1" style={{ color: 'var(--text-muted)' }}>Adjustments for changes in working capital:</p>
            {s.operating.adjustments.map((a: any, i: number) => (
              <AccountRow key={i} code={a.account_code} name={a.account_name} amount={a.amount} indent={3} />
            ))}
          </div>
        )}
        <TotalRow label="Net Cash from Operating Activities" amount={s.operating?.total || 0} indent={1} />
      </Section>

      <Section title="Investing Activities">
        {s.investing?.items?.map((a: any, i: number) => (
          <AccountRow key={i} code={a.account_code} name={a.account_name} amount={a.amount} indent={2} />
        ))}
        {(!s.investing?.items || s.investing.items.length === 0) && (
          <p className="rpt-empty-note text-xs pl-8 py-1" style={{ color: 'var(--text-muted)' }}>No investing activity</p>
        )}
        <TotalRow label="Net Cash from Investing Activities" amount={s.investing?.total || 0} indent={1} />
      </Section>

      <Section title="Financing Activities">
        {s.financing?.items?.map((a: any, i: number) => (
          <AccountRow key={i} code={a.account_code} name={a.account_name} amount={a.amount} indent={2} />
        ))}
        {(!s.financing?.items || s.financing.items.length === 0) && (
          <p className="rpt-empty-note text-xs pl-8 py-1" style={{ color: 'var(--text-muted)' }}>No financing activity</p>
        )}
        <TotalRow label="Net Cash from Financing Activities" amount={s.financing?.total || 0} indent={1} />
      </Section>

      <TotalRow label="Net Change in Cash" amount={s.net_change_in_cash || 0} bold />
      <div className="rpt-account-row flex justify-between py-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span>Beginning Cash</span>
        <span>{fmt(s.beginning_cash || 0)}</span>
      </div>
      <TotalRow label="Ending Cash" amount={s.ending_cash || 0} bold doubleBorder />
    </div>
  )
}

function TrialBalanceReport({ data }: { data: any }) {
  if (!data?.accounts || data.accounts.length === 0) return <EmptyState />
  return (
    <div className="rpt-body">
      <div className="rpt-tb-header grid grid-cols-4 gap-2 text-xs font-semibold pb-1 mb-1" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
        <span>Account Code</span>
        <span>Account Name</span>
        <span className="text-right">Debit</span>
        <span className="text-right">Credit</span>
      </div>
      {data.accounts.map((a: any, i: number) => (
        <div key={i} className="rpt-tb-row grid grid-cols-4 gap-2 text-sm py-0.5" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono">{a.account_code}</span>
          <span>{a.account_name}</span>
          <span className="text-right">{a.debit_total > 0 ? fmt(a.debit_total) : ''}</span>
          <span className="text-right">{a.credit_total > 0 ? fmt(a.credit_total) : ''}</span>
        </div>
      ))}
      <div className="rpt-tb-totals grid grid-cols-4 gap-2 text-sm font-bold py-1 mt-1 pt-2" style={{ borderTop: '2px double var(--border-color)', color: 'var(--text-primary)' }}>
        <span></span>
        <span>Totals</span>
        <span className="text-right">{fmt(data.total_debits)}</span>
        <span className="text-right">{fmt(data.total_credits)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const TABS: { key: Tab; label: string }[] = [
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'profit-loss', label: 'Profit & Loss' },
  { key: 'cash-flow', label: 'Cash Flow' },
  { key: 'trial-balance', label: 'Trial Balance' },
]

const TAB_TITLES: Record<Tab, string> = {
  'balance-sheet': 'Balance Sheet',
  'profit-loss': 'Profit & Loss Statement',
  'cash-flow': 'Statement of Cash Flows',
  'trial-balance': 'Trial Balance',
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { company, companyId, companyLoading, companyMissing } = useCompanyReady()
  const canAccessReports = ['owner', 'admin', 'accountant'].includes((user?.role || '').toLowerCase())
  const [activeTab, setActiveTab] = useState<Tab>('balance-sheet')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Date state
  const [asOfDate, setAsOfDate] = useState(todayStr())
  const [startDate, setStartDate] = useState(janFirstStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [activePreset, setActivePreset] = useState<string | null>('YTD')

  const PRESETS = getPresets()

  function applyPreset(p: Preset) {
    setActivePreset(p.label)
    if (needsRange && p.range) {
      setStartDate(p.range[0])
      setEndDate(p.range[1])
    } else if (!needsRange && p.asOf) {
      setAsOfDate(p.asOf)
    }
  }

  const needsRange = activeTab === 'profit-loss' || activeTab === 'cash-flow'

  const fetchReport = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setData(null)
    try {
      const params = needsRange
        ? `?start_date=${startDate}&end_date=${endDate}`
        : `?as_of_date=${asOfDate}`
      const result = await api.get(`/reports/${activeTab}${params}`)
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [companyId, activeTab, asOfDate, startDate, endDate, needsRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  if (companyLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  if (companyMissing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <BarChart3 className="h-16 w-16 mb-4" style={{ color: 'var(--text-muted)' }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No company set up</h2>
        <p className="max-w-md mb-6" style={{ color: 'var(--text-secondary)' }}>Finish onboarding to use Reports.</p>
        <Link href="/onboarding" className="btn btn-primary">Complete onboarding</Link>
      </div>
    )
  }

  if (!canAccessReports) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <BarChart3 className="h-16 w-16 mb-4" style={{ color: 'var(--text-muted)' }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Reports access restricted</h2>
        <p className="max-w-md mb-6" style={{ color: 'var(--text-secondary)' }}>
          Statements are available for owner, admin, and accountant roles only.
        </p>
      </div>
    )
  }

  const dateSubtitle = needsRange
    ? `For the Period ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`
    : `As of ${formatDateDisplay(asOfDate)}`

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto print:p-0 print:max-w-none print:m-0">
      {/* Header — hidden in print */}
      <div className="print:hidden flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Financial Statements</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reports</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Balance sheet, P&L, cash flow, and trial balance.</p>
        </div>
        {data && !loading && (
          <PDFDownloadLink
            document={
              activeTab === 'balance-sheet' ? (
                <BalanceSheetPDF data={data} company={company?.name || ''} asOfDate={asOfDate} />
              ) : activeTab === 'profit-loss' ? (
                <ProfitLossPDF data={data} company={company?.name || ''} startDate={startDate} endDate={endDate} />
              ) : activeTab === 'cash-flow' ? (
                <CashFlowPDF data={data} company={company?.name || ''} startDate={startDate} endDate={endDate} />
              ) : (
                <TrialBalancePDF data={data} company={company?.name || ''} asOfDate={asOfDate} />
              )
            }
            fileName={`${company?.name || 'report'}-${activeTab}-${needsRange ? endDate : asOfDate}.pdf`}
            className="btn btn-secondary btn-sm"
          >
            {({ loading: pdfLoading }) => (
              <>
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                {pdfLoading ? 'Preparing…' : 'Export PDF'}
              </>
            )}
          </PDFDownloadLink>
        )}
      </div>

      {/* Tab Bar — hidden in print */}
      <div className="print:hidden flex gap-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              borderColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Controls — hidden in print */}
      <div className="print:hidden space-y-3">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{
                border: '1px solid var(--border-color)',
                background: activePreset === p.label ? 'var(--accent-subtle)' : 'var(--bg-card)',
                color: activePreset === p.label ? 'var(--accent)' : 'var(--text-muted)',
                borderColor: activePreset === p.label ? 'var(--accent)' : 'var(--border-color)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        <div className="flex flex-wrap items-center gap-3">
          {needsRange ? (
            <>
              <label className="text-sm" style={{ color: 'var(--text-muted)' }}>From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setActivePreset(null) }}
                className="px-3 py-1.5 text-sm rounded-lg"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
              <label className="text-sm" style={{ color: 'var(--text-muted)' }}>To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setActivePreset(null) }}
                className="px-3 py-1.5 text-sm rounded-lg"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
            </>
          ) : (
            <>
              <label className="text-sm" style={{ color: 'var(--text-muted)' }}>As of</label>
              <input
                type="date"
                value={asOfDate}
                onChange={e => { setAsOfDate(e.target.value); setActivePreset(null) }}
                className="px-3 py-1.5 text-sm rounded-lg"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Report Container */}
      <div className="rpt-container rounded-xl p-6" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        {/* Print Header — professional letterhead (visible only when printing) */}
        <div className="rpt-print-header hidden">
          <div className="rpt-print-company">{company?.name || 'Company'}</div>
          <div className="rpt-print-title">{TAB_TITLES[activeTab]}</div>
          <div className="rpt-print-date">{dateSubtitle}</div>
        </div>

        {/* Screen Title — hidden in print */}
        <div className="print:hidden mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{TAB_TITLES[activeTab]}</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{dateSubtitle}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 print:hidden">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            {activeTab === 'balance-sheet' && <BalanceSheetReport data={data} />}
            {activeTab === 'profit-loss' && <ProfitLossReport data={data} />}
            {activeTab === 'cash-flow' && <CashFlowReport data={data} />}
            {activeTab === 'trial-balance' && <TrialBalanceReport data={data} />}
          </>
        )}

        {/* Footer */}
        <div className="rpt-footer mt-6 pt-3 text-xs flex justify-between" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <span>Accrual Basis</span>
          <span>Generated {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
