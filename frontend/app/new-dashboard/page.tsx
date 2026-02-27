'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

type MonthlyTrendPoint = { month: string; income: number; expenses: number }

interface RecentTransaction {
  id: string
  journal_number: string
  entry_date: string
  memo: string
  total_debit: number
  total_credit: number
  status: string
}

interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netPosition: number
  transactionCount: number
  topVendor: string
  healthScore: number
  monthlyTrend: MonthlyTrendPoint[]
  categoryBreakdown: Array<{ name: string; value: number }>
  recentTransactions: RecentTransaction[]
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

export default function NewDashboard() {
  const { company, loading: authLoading, refreshUser } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const companyId = company?.id || null
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const fetchDashboardData = useCallback(async (targetCompanyId: string) => {
    try {
      setLoading(true)

      const statsResponse = await api.get(`/dashboard/stats/${targetCompanyId}`)
      const trendResponse = await api.get(`/dashboard/monthly-trend/${targetCompanyId}`)
      const breakdownResponse = await api.get(`/dashboard/category-breakdown/${targetCompanyId}`)
      const transactionsResponse = await api.get(`/dashboard/recent-transactions/${targetCompanyId}`)

      setStats({
        totalIncome: statsResponse.total_income || 0,
        totalExpenses: statsResponse.total_expenses || 0,
        netPosition: statsResponse.net_position || 0,
        transactionCount: statsResponse.transaction_count || 0,
        topVendor: statsResponse.top_vendor || 'N/A',
        healthScore: statsResponse.health_score || 0,
        monthlyTrend: trendResponse || [],
        categoryBreakdown: breakdownResponse || [],
        recentTransactions: transactionsResponse || []
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setStats({
        totalIncome: 0,
        totalExpenses: 0,
        netPosition: 0,
        transactionCount: 0,
        topVendor: 'N/A',
        healthScore: 0,
        monthlyTrend: [],
        categoryBreakdown: [],
        recentTransactions: []
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAISummary = useCallback(async (targetCompanyId: string) => {
    try {
      setLoadingSummary(true)
      const response = await api.post('/ai/query', {
        company_id: targetCompanyId,
        question: 'Give me a brief summary of my business financial health'
      })
      setAiSummary(response.answer || 'No summary available')
    } catch (error) {
      console.error('Failed to fetch AI summary:', error)
      setAiSummary('AI summary unavailable')
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return

    // If no company yet, try to refresh
    if (!companyId && retryCount < 3) {
      console.log('No company found, refreshing user data...')
      refreshUser().then(() => {
        setRetryCount(prev => prev + 1)
      })
      return
    }

    // If we have company, fetch data
    if (companyId) {
      fetchDashboardData(companyId)
      fetchAISummary(companyId)
    } else {
      // After 3 retries, give up and show empty state
      setLoading(false)
    }
  }, [companyId, authLoading, retryCount, fetchDashboardData, fetchAISummary, refreshUser])

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return 0
      return 100
    }
    return ((current - previous) / Math.abs(previous)) * 100
  }

  const getLatestAndPrevious = (key: 'income' | 'expenses'): [number, number] => {
    const series = stats?.monthlyTrend || []
    if (series.length === 0) {
      const fallback = key === 'income' ? stats?.totalIncome ?? 0 : stats?.totalExpenses ?? 0
      return [fallback, fallback]
    }
    if (series.length === 1) {
      const current = series[0][key] || 0
      return [current, current]
    }
    const current = series[series.length - 1]?.[key] || 0
    const previous = series[series.length - 2]?.[key] || 0
    return [current, previous]
  }

  const formatPercentChange = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    const formatted = Math.abs(safeValue).toFixed(1)
    const sign = safeValue >= 0 ? '+' : '-'
    return `${sign}${formatted}%`
  }

  const buildChangeMeta = (value: number, goodWhenPositive: boolean = true) => {
    const isPositive = value >= 0
    return {
      Icon: isPositive ? ArrowUpRight : ArrowDownRight,
      colorClass: isPositive === goodWhenPositive ? 'text-green-600' : 'text-red-600',
      label: formatPercentChange(value)
    }
  }

  const [incomeChangeMeta, expenseChangeMeta, netPositionChangeMeta] = useMemo(() => {
    if (!stats) {
      return [buildChangeMeta(0), buildChangeMeta(0, false), buildChangeMeta(0)]
    }

    const [currentIncome, previousIncome] = getLatestAndPrevious('income')
    const [currentExpenses, previousExpenses] = getLatestAndPrevious('expenses')

    const incomeChange = getPercentChange(currentIncome, previousIncome)
    const expenseChange = getPercentChange(currentExpenses, previousExpenses)
    const netPositionChange = getPercentChange(
      currentIncome - currentExpenses,
      previousIncome - previousExpenses
    )

    return [
      buildChangeMeta(incomeChange),
      buildChangeMeta(expenseChange, false),
      buildChangeMeta(netPositionChange)
    ]
  }, [stats])

  if (!companyId && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <p className="text-center max-w-md" style={{ color: 'var(--text-muted)' }}>
          No company linked to your account. Complete onboarding to see your dashboard.
        </p>
        <a
          href="/onboarding"
          className="px-4 py-2 rounded-full font-medium transition-colors"
          style={{ backgroundColor: 'var(--neon-fuchsia)', color: 'white' }}
        >
          Go to onboarding
        </a>
      </div>
    )
  }

  if (!companyId || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--neon-fuchsia)' }} />
      </div>
    )
  }

  if (!stats) return null

  const IncomeChangeIcon = incomeChangeMeta.Icon
  const ExpenseChangeIcon = expenseChangeMeta.Icon
  const NetChangeIcon = netPositionChangeMeta.Icon
  const hasTransactions = stats.recentTransactions.length > 0

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)'
  }

  const tooltipStyle = {
    backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    color: 'var(--text-primary)'
  }

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
          Financial cockpit
        </p>
        <h1 className="text-3xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
          Live performance overview
        </h1>
        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
          Dashboard blending ledgers with AI insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <div className="rounded-3xl p-6 backdrop-blur-xl transition-all hover:scale-[1.02]" style={cardStyle}>
          <div className="flex items-center justify-between mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)' }}
            >
              <TrendingUp className="w-6 h-6" style={{ color: 'var(--neon-emerald)' }} />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${incomeChangeMeta.colorClass}`}>
              <IncomeChangeIcon className="w-4 h-4" />
              {incomeChangeMeta.label}
            </span>
          </div>
          <p className="text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Income</p>
          <p className="text-3xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
            ${stats.totalIncome.toLocaleString()}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="rounded-3xl p-6 backdrop-blur-xl transition-all hover:scale-[1.02]" style={cardStyle}>
          <div className="flex items-center justify-between mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(251, 113, 133, 0.15)' }}
            >
              <TrendingDown className="w-6 h-6 text-rose-400" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${expenseChangeMeta.colorClass}`}>
              <ExpenseChangeIcon className="w-4 h-4" />
              {expenseChangeMeta.label}
            </span>
          </div>
          <p className="text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Expenses</p>
          <p className="text-3xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
            ${stats.totalExpenses.toLocaleString()}
          </p>
        </div>

        {/* Net Position */}
        <div className="rounded-3xl p-6 backdrop-blur-xl transition-all hover:scale-[1.02]" style={cardStyle}>
          <div className="flex items-center justify-between mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(34, 211, 238, 0.15)' }}
            >
              <DollarSign className="w-6 h-6" style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${netPositionChangeMeta.colorClass}`}>
              <NetChangeIcon className="w-4 h-4" />
              {netPositionChangeMeta.label}
            </span>
          </div>
          <p className="text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>Net Position</p>
          <p className="text-3xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
            ${stats.netPosition.toLocaleString()}
          </p>
        </div>

        {/* Health Score */}
        <div className="rounded-3xl p-6 backdrop-blur-xl transition-all hover:scale-[1.02]" style={cardStyle}>
          <div className="flex items-center justify-between mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(217, 70, 239, 0.15)' }}
            >
              <Activity className="w-6 h-6" style={{ color: 'var(--neon-fuchsia)' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--neon-fuchsia)' }}>Good</span>
          </div>
          <p className="text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>Health Score</p>
          <p className="text-3xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
            {stats.healthScore}/100
          </p>
        </div>
      </div>

      {/* AI Summary */}
      <div className="relative overflow-hidden rounded-3xl p-6" style={cardStyle}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(217,70,239,0.1), transparent, rgba(34,211,238,0.1))'
          }}
        />
        <div className="flex items-start gap-4 relative">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: '1px solid var(--border-color)'
            }}
          >
            <Activity className="w-5 h-5" style={{ color: 'var(--neon-fuchsia)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              AI financial summary
            </h3>
            {loadingSummary ? (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing your finances...</span>
              </div>
            ) : (
              <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{aiSummary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend */}
        <div className="rounded-3xl p-6 backdrop-blur-xl" style={cardStyle}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Income vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 4 }} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} dot={{ fill: '#fb7185', r: 4 }} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-3xl p-6 backdrop-blur-xl" style={cardStyle}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Expense Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-3xl backdrop-blur-xl p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Transactions</h3>
          <button className="text-sm font-medium" style={{ color: 'var(--neon-fuchsia)' }}>
            View all →
          </button>
        </div>
        {hasTransactions ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <th className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>Date</th>
                  <th className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>Journal #</th>
                  <th className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>Memo</th>
                  <th className="px-4 py-3 text-right" style={{ borderBottom: '1px solid var(--border-color)' }}>Total</th>
                  <th className="px-4 py-3 text-right" style={{ borderBottom: '1px solid var(--border-color)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions.map((txn) => (
                  <tr key={txn.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {txn.entry_date ? new Date(txn.entry_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {txn.journal_number || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {txn.memo || 'No memo provided'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ${(txn.total_debit || txn.total_credit || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: txn.status === 'posted'
                            ? 'rgba(52, 211, 153, 0.15)'
                            : txn.status === 'draft'
                              ? 'rgba(251, 191, 36, 0.15)'
                              : 'var(--bg-muted)',
                          color: txn.status === 'posted'
                            ? 'var(--neon-emerald)'
                            : txn.status === 'draft'
                              ? '#fbbf24'
                              : 'var(--text-muted)'
                        }}
                      >
                        {txn.status ? txn.status.replace('_', ' ') : 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Receipt className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <p>No recent transactions</p>
            <p className="text-sm mt-1" style={{ opacity: 0.7 }}>Start by creating a journal entry</p>
          </div>
        )}
      </div>
    </div>
  )
}
