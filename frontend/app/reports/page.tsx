'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Loader2, ChevronDown, ChevronRight, Printer } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
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
        className={`rpt-section-title flex items-center gap-1 w-full text-left py-1.5 ${font} text-neutral-900 dark:text-white hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors`}
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
    <div className={`rpt-account-row flex justify-between py-0.5 text-sm ${screenPl} text-neutral-700 dark:text-neutral-300`}>
      <span>{code ? `${code} \u2013 ${name}` : name}</span>
      <span className={amount < 0 ? 'text-red-600 dark:text-red-400' : ''}>{fmt(amount)}</span>
    </div>
  )
}

function TotalRow({ label, amount, bold = false, doubleBorder = false, indent = 0 }: {
  label: string; amount: number; bold?: boolean; doubleBorder?: boolean; indent?: number
}) {
  const screenPl = indent === 1 ? 'pl-4' : indent === 2 ? 'pl-8' : ''
  const rptClass = doubleBorder ? 'rpt-total-grand' : bold ? 'rpt-total-section' : 'rpt-total-cat'
  return (
    <div className={`${rptClass} flex justify-between py-1 ${screenPl} ${bold ? 'font-bold' : 'font-semibold'} text-sm text-neutral-900 dark:text-white ${doubleBorder ? 'border-t-2 border-double border-neutral-400 dark:border-neutral-500 mt-1 pt-2' : 'border-t border-neutral-200 dark:border-neutral-700'}`}>
      <span>{label}</span>
      <span className={amount < 0 ? 'text-red-600 dark:text-red-400' : ''}>{fmt(amount)}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-neutral-500 dark:text-neutral-400">
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
            <p className="rpt-adj-label text-xs font-medium text-neutral-500 dark:text-neutral-400 pl-4 pt-1">Adjustments for changes in working capital:</p>
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
          <p className="rpt-empty-note text-xs text-neutral-400 pl-8 py-1">No investing activity</p>
        )}
        <TotalRow label="Net Cash from Investing Activities" amount={s.investing?.total || 0} indent={1} />
      </Section>

      <Section title="Financing Activities">
        {s.financing?.items?.map((a: any, i: number) => (
          <AccountRow key={i} code={a.account_code} name={a.account_name} amount={a.amount} indent={2} />
        ))}
        {(!s.financing?.items || s.financing.items.length === 0) && (
          <p className="rpt-empty-note text-xs text-neutral-400 pl-8 py-1">No financing activity</p>
        )}
        <TotalRow label="Net Cash from Financing Activities" amount={s.financing?.total || 0} indent={1} />
      </Section>

      <TotalRow label="Net Change in Cash" amount={s.net_change_in_cash || 0} bold />
      <div className="rpt-account-row flex justify-between py-0.5 text-sm text-neutral-700 dark:text-neutral-300">
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
      <div className="rpt-tb-header grid grid-cols-4 gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 border-b border-neutral-300 dark:border-neutral-600 pb-1 mb-1">
        <span>Account Code</span>
        <span>Account Name</span>
        <span className="text-right">Debit</span>
        <span className="text-right">Credit</span>
      </div>
      {data.accounts.map((a: any, i: number) => (
        <div key={i} className="rpt-tb-row grid grid-cols-4 gap-2 text-sm py-0.5 text-neutral-700 dark:text-neutral-300">
          <span className="font-mono">{a.account_code}</span>
          <span>{a.account_name}</span>
          <span className="text-right">{a.debit_total > 0 ? fmt(a.debit_total) : ''}</span>
          <span className="text-right">{a.credit_total > 0 ? fmt(a.credit_total) : ''}</span>
        </div>
      ))}
      <div className="rpt-tb-totals grid grid-cols-4 gap-2 text-sm font-bold py-1 border-t-2 border-double border-neutral-400 dark:border-neutral-500 mt-1 pt-2 text-neutral-900 dark:text-white">
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
  const { company } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('balance-sheet')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Date state
  const [asOfDate, setAsOfDate] = useState(todayStr())
  const [startDate, setStartDate] = useState(janFirstStr())
  const [endDate, setEndDate] = useState(todayStr())

  const needsRange = activeTab === 'profit-loss' || activeTab === 'cash-flow'

  const fetchReport = useCallback(async () => {
    if (!company?.id) return
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
  }, [company?.id, activeTab, asOfDate, startDate, endDate, needsRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  if (!company?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <BarChart3 className="h-16 w-16 text-neutral-400 dark:text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">No company set up</h2>
        <p className="text-neutral-600 dark:text-white/60 max-w-md mb-6">Finish onboarding to use Reports.</p>
        <a href="/onboarding" className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold text-white">Complete onboarding</a>
      </div>
    )
  }

  const dateSubtitle = needsRange
    ? `For the Period ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`
    : `As of ${formatDateDisplay(asOfDate)}`

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto print:p-0 print:max-w-none print:m-0">
      {/* Header — hidden in print */}
      <div className="print:hidden flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-fuchsia-500" />
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Reports</h1>
            <p className="text-sm text-neutral-500">Financial Statements</p>
          </div>
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
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
      <div className="print:hidden flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Controls — hidden in print */}
      <div className="print:hidden flex flex-wrap items-center gap-3">
        {needsRange ? (
          <>
            <label className="text-sm text-neutral-600 dark:text-neutral-400">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
            <label className="text-sm text-neutral-600 dark:text-neutral-400">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </>
        ) : (
          <>
            <label className="text-sm text-neutral-600 dark:text-neutral-400">As of</label>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </>
        )}
      </div>

      {/* Report Container */}
      <div className="rpt-container rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
        {/* Print Header — professional letterhead (visible only when printing) */}
        <div className="rpt-print-header hidden">
          <div className="rpt-print-company">{company?.name || 'Company'}</div>
          <div className="rpt-print-title">{TAB_TITLES[activeTab]}</div>
          <div className="rpt-print-date">{dateSubtitle}</div>
        </div>

        {/* Screen Title — hidden in print */}
        <div className="print:hidden mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{TAB_TITLES[activeTab]}</h2>
          <p className="text-xs text-neutral-500">{dateSubtitle}</p>
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
        <div className="rpt-footer mt-6 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400 flex justify-between">
          <span>Accrual Basis</span>
          <span>Generated {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
