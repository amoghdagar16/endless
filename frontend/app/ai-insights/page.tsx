'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Brain,
  ChevronRight,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react'

interface Insight {
  id: string
  type: 'prediction' | 'anomaly' | 'recommendation' | 'summary'
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  date: string
  actionable?: boolean
}

export default function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      setLoading(false)
      // Mock insights - replace with API call
      const mockInsights: Insight[] = [
        {
          id: '1',
          type: 'prediction',
          title: 'Expense Trend Alert',
          description: 'Your software expenses are trending 15% higher than last quarter. Expected to reach $12,500 next month.',
          severity: 'warning',
          date: new Date().toISOString(),
          actionable: true
        },
        {
          id: '2',
          type: 'recommendation',
          title: 'Optimize Vendor Payments',
          description: 'You could save approximately $450/month by consolidating payments to your top 3 vendors to take advantage of early payment discounts.',
          severity: 'info',
          date: new Date().toISOString(),
          actionable: true
        },
        {
          id: '3',
          type: 'anomaly',
          title: 'Unusual Transaction Detected',
          description: 'A payment of $5,000 to "XYZ Corp" was detected. This is 200% higher than your average transaction with this vendor.',
          severity: 'critical',
          date: new Date().toISOString(),
          actionable: true
        },
        {
          id: '4',
          type: 'summary',
          title: 'Monthly Financial Summary',
          description: 'Your business generated $25,430 in revenue with $16,034 in expenses this month, resulting in a net profit of $9,396 (36.9% margin).',
          severity: 'info',
          date: new Date().toISOString(),
          actionable: false
        },
        {
          id: '5',
          type: 'prediction',
          title: 'Cash Flow Forecast',
          description: 'Based on current trends, you\'re projected to have $45,000 in available cash by end of next month. This is healthy for your business size.',
          severity: 'info',
          date: new Date().toISOString(),
          actionable: false
        }
      ]
      setInsights(mockInsights)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    const icons = {
      prediction: TrendingUp,
      anomaly: AlertTriangle,
      recommendation: Lightbulb,
      summary: Activity
    }
    return icons[type as keyof typeof icons] || Brain
  }

  const getInsightColor = (severity: string) => {
    const colors = {
      info: 'bg-blue-50 border-blue-200 text-blue-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      critical: 'bg-red-50 border-red-200 text-red-700'
    }
    return colors[severity as keyof typeof colors]
  }

  const getIconBgColor = (type: string) => {
    const colors = {
      prediction: 'bg-purple-100 text-purple-600',
      anomaly: 'bg-red-100 text-red-600',
      recommendation: 'bg-green-100 text-green-600',
      summary: 'bg-blue-100 text-blue-600'
    }
    return colors[type as keyof typeof colors]
  }

  const filteredInsights = selectedType === 'all'
    ? insights
    : insights.filter(i => i.type === selectedType)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
            <p className="text-gray-600">Smart financial analysis and recommendations</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Predictions</p>
              <p className="text-xl font-bold text-gray-900">
                {insights.filter(i => i.type === 'prediction').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recommendations</p>
              <p className="text-xl font-bold text-gray-900">
                {insights.filter(i => i.type === 'recommendation').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Anomalies</p>
              <p className="text-xl font-bold text-gray-900">
                {insights.filter(i => i.type === 'anomaly').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Summaries</p>
              <p className="text-xl font-bold text-gray-900">
                {insights.filter(i => i.type === 'summary').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'prediction', 'recommendation', 'anomaly', 'summary'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedType === type
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.map(insight => {
          const Icon = getInsightIcon(insight.type)
          return (
            <div
              key={insight.id}
              className={`rounded-xl border-2 p-6 ${getInsightColor(insight.severity)}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconBgColor(insight.type)}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-700">{insight.description}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {new Date(insight.date).toLocaleDateString()}
                    </span>
                  </div>

                  {insight.actionable && (
                    <button className="mt-3 text-sm font-medium text-gray-900 hover:text-gray-700 flex items-center gap-1">
                      Take action
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredInsights.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No insights available</p>
          <p className="text-sm mt-1">Add more transactions to generate AI insights</p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-start gap-4">
          <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">How AI Insights Work</h3>
            <p className="text-sm text-gray-700">
              Our AI analyzes your financial data to identify trends, predict future expenses, detect anomalies, and provide actionable recommendations to improve your business finances. The more data you add, the smarter the insights become.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
