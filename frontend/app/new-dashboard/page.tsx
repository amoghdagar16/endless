'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netPosition: number
  transactionCount: number
  topVendor: string
  healthScore: number
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>
  categoryBreakdown: Array<{ name: string; value: number }>
  recentTransactions: Array<any>
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

export default function NewDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    fetchAISummary()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual API
      const mockStats: DashboardStats = {
        totalIncome: 125430.50,
        totalExpenses: 87234.20,
        netPosition: 38196.30,
        transactionCount: 234,
        topVendor: 'AWS',
        healthScore: 82,
        monthlyTrend: [
          { month: 'Jan', income: 15000, expenses: 12000 },
          { month: 'Feb', income: 18000, expenses: 13500 },
          { month: 'Mar', income: 22000, expenses: 15000 },
          { month: 'Apr', income: 20000, expenses: 14200 },
          { month: 'May', income: 25000, expenses: 16500 },
          { month: 'Jun', income: 25430, expenses: 16034 },
        ],
        categoryBreakdown: [
          { name: 'Software', value: 35 },
          { name: 'Marketing', value: 25 },
          { name: 'Operations', value: 20 },
          { name: 'Payroll', value: 15 },
          { name: 'Other', value: 5 },
        ],
        recentTransactions: []
      }
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAISummary = async () => {
    try {
      setLoadingSummary(true)
      const response = await api.post('/ai/query', {
        query: 'Give me a brief summary of my business financial health this month'
      })
      setAiSummary(response.data.response || 'No summary available')
    } catch (error) {
      setAiSummary('AI summary unavailable. Your business is performing well with healthy cash flow.')
    } finally {
      setLoadingSummary(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const netPositionChange = ((stats.netPosition / stats.totalIncome) * 100).toFixed(1)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Your financial overview at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="flex items-center text-green-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              12.5%
            </span>
          </div>
          <p className="text-gray-600 text-sm">Total Income</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${stats.totalIncome.toLocaleString()}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <span className="flex items-center text-red-600 text-sm font-medium">
              <ArrowDownRight className="w-4 h-4" />
              8.2%
            </span>
          </div>
          <p className="text-gray-600 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${stats.totalExpenses.toLocaleString()}
          </p>
        </div>

        {/* Net Position */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="flex items-center text-blue-600 text-sm font-medium">
              {netPositionChange}%
            </span>
          </div>
          <p className="text-gray-600 text-sm">Net Position</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${stats.netPosition.toLocaleString()}
          </p>
        </div>

        {/* Health Score */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-purple-600 text-sm font-medium">Good</span>
          </div>
          <p className="text-gray-600 text-sm">Health Score</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.healthScore}/100</p>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Financial Summary</h3>
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing your finances...</span>
              </div>
            ) : (
              <p className="text-gray-700 leading-relaxed">{aiSummary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                name="Income"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 4 }}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
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
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </button>
        </div>
        <div className="text-center py-12 text-gray-500">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No recent transactions</p>
          <p className="text-sm mt-1">Start by creating a journal entry</p>
        </div>
      </div>
    </div>
  )
}
