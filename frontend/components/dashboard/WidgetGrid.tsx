'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import {
  RevenueVsExpensesWidget,
  ProfitMarginTrendWidget,
  TopExpenseCategoriesWidget,
  ReceivablesAgingWidget,
  ActionItemsWidget,
  RecentTransactionsWidget,
  AccountsPayableWidget,
  AccountsReceivableWidget,
  CashFlowWidget,
  InvoicesWidget,
  BillsWidget,
  DepositsWidget,
  ExpensesWidget,
  ProfitAndLossWidget,
  SalesWidget,
  AIAnalysisWidget,
  WIDGET_CATALOG,
} from './widgets'

interface WidgetPref {
  widget_id: string
  position: number
  is_visible: boolean
}

interface Props {
  prefs: WidgetPref[]
  dashboardData: any
  companyId: string | null
}

const WIDGET_TITLES: Record<string, string> = {
  revenue_vs_expenses: 'Revenue vs Expenses',
  profit_margin_trend: 'Profit Margin Trend',
  top_expense_categories: 'Top Expense Categories',
  receivables_aging: 'Receivables Aging',
  action_items: 'Action Items',
  recent_transactions: 'Recent Transactions',
  accounts_payable: 'Accounts Payable',
  accounts_receivable: 'Accounts Receivable',
  cash_flow: 'Cash Flow',
  invoices: 'Invoices',
  bills: 'Bills',
  deposits: 'Deposits',
  expenses: 'Expenses',
  profit_and_loss: 'Profit & Loss',
  sales: 'Sales',
  ai_analysis: 'AI Analysis',
}

function WidgetCard({ id, children, showViewAll, viewAllHref }: {
  id: string
  children: React.ReactNode
  showViewAll?: boolean
  viewAllHref?: string
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--neon-cyan)' : 'var(--border-color)'}`,
        borderRadius: 8,
        padding: 16,
        transition: 'opacity 0.5s ease, transform 0.5s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        boxShadow: hovered ? '0 0 20px rgba(0,255,255,0.06)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {WIDGET_TITLES[id] || id}
        </p>
        {showViewAll && viewAllHref && (
          <Link href={viewAllHref} className="text-xs font-medium" style={{ color: 'var(--neon-fuchsia)' }}>
            View all →
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

export function WidgetGrid({ prefs, dashboardData, companyId }: Props) {
  const visible = prefs.filter(p => p.is_visible).sort((a, b) => a.position - b.position)
  const wd = dashboardData?.widget_data || {}

  if (!dashboardData) return null

  function renderWidget(id: string) {
    switch (id) {
      case 'revenue_vs_expenses':
        return (
          <WidgetCard key={id} id={id}>
            <RevenueVsExpensesWidget monthlyData={dashboardData.monthly_data || []} />
          </WidgetCard>
        )
      case 'profit_margin_trend':
        return (
          <WidgetCard key={id} id={id}>
            <ProfitMarginTrendWidget monthlyData={dashboardData.monthly_data || []} />
          </WidgetCard>
        )
      case 'top_expense_categories':
        return (
          <WidgetCard key={id} id={id}>
            <TopExpenseCategoriesWidget categories={dashboardData.expense_categories || []} />
          </WidgetCard>
        )
      case 'receivables_aging':
        return (
          <WidgetCard key={id} id={id}>
            <ReceivablesAgingWidget aging={dashboardData.aging || {}} />
          </WidgetCard>
        )
      case 'action_items':
        return (
          <WidgetCard key={id} id={id}>
            <ActionItemsWidget items={dashboardData.action_items || []} />
          </WidgetCard>
        )
      case 'recent_transactions':
        return (
          <WidgetCard key={id} id={id} showViewAll viewAllHref="/new-journals">
            <RecentTransactionsWidget transactions={dashboardData.recent_transactions || []} />
          </WidgetCard>
        )
      case 'accounts_payable':
        return (
          <WidgetCard key={id} id={id}>
            <AccountsPayableWidget data={wd.accounts_payable ?? null} />
          </WidgetCard>
        )
      case 'accounts_receivable':
        return (
          <WidgetCard key={id} id={id}>
            <AccountsReceivableWidget data={wd.accounts_receivable ?? null} />
          </WidgetCard>
        )
      case 'cash_flow':
        return (
          <WidgetCard key={id} id={id}>
            <CashFlowWidget data={wd.cash_flow ?? null} />
          </WidgetCard>
        )
      case 'invoices':
        return (
          <WidgetCard key={id} id={id} showViewAll viewAllHref="/invoices">
            <InvoicesWidget data={wd.invoices ?? null} />
          </WidgetCard>
        )
      case 'bills':
        return (
          <WidgetCard key={id} id={id} showViewAll viewAllHref="/bills">
            <BillsWidget data={wd.bills ?? null} />
          </WidgetCard>
        )
      case 'deposits':
        return (
          <WidgetCard key={id} id={id}>
            <DepositsWidget data={wd.deposits ?? null} />
          </WidgetCard>
        )
      case 'expenses':
        return (
          <WidgetCard key={id} id={id}>
            <ExpensesWidget categories={wd.expenses ?? dashboardData.expense_categories ?? []} />
          </WidgetCard>
        )
      case 'profit_and_loss':
        return (
          <WidgetCard key={id} id={id}>
            <ProfitAndLossWidget data={wd.profit_and_loss ?? null} />
          </WidgetCard>
        )
      case 'sales':
        return (
          <WidgetCard key={id} id={id}>
            <SalesWidget data={wd.sales ?? null} />
          </WidgetCard>
        )
      case 'ai_analysis':
        return (
          <WidgetCard key={id} id={id}>
            <AIAnalysisWidget companyId={companyId} />
          </WidgetCard>
        )
      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {visible.map(p => renderWidget(p.widget_id))}
    </div>
  )
}
