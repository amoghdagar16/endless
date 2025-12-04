"use client";

import { useEffect, useState } from "react";
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
  ResponsiveContainer,
  Legend
} from "recharts";
import KpiCard from "@/components/KpiCard";
import { SkeletonKPI } from "@/components/Skeleton";
import { api, getCompanyId } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Expense {
  id: string;
  total_amount: number;
  category?: string;
  vendors?: { name: string };
  bill_date: string;
}

interface TrendDataPoint {
  month: string;
  amount: number;
}

interface CategoryDataPoint {
  name: string;
  value: number;
}

interface VendorDataPoint {
  name: string;
  amount: number;
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [totalSpend, setTotalSpend] = useState(0);
  const [topCategory, setTopCategory] = useState("N/A");
  const [topVendor, setTopVendor] = useState("N/A");

  // Chart data state
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDataPoint[]>([]);
  const [vendorData, setVendorData] = useState<VendorDataPoint[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [companyId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Use companyId from AuthContext (which is synced with database)
      const cid = companyId || getCompanyId();

      if (!cid) {
        console.warn("No company ID found");
        setLoading(false);
        return;
      }

      // Get current month date range
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch expenses for the company
      const expensesResp = await api.get<{ status: string; data: Expense[] }>(
        `/expenses/company/${cid}`
      );

      const expenses = expensesResp.data || [];

      // Filter for current month (for total spend KPI)
      const monthExpenses = expenses.filter((exp) => {
        const date = exp.bill_date;
        return date >= periodStart && date <= periodEnd;
      });

      // Calculate total spend for current month
      const total = monthExpenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0);
      setTotalSpend(total);

      // Calculate top category - use ALL expenses (not just current month) for better insights
      const categoryTotals: { [key: string]: number } = {};
      expenses.forEach((exp) => {
        const cat = exp.category || "Uncategorized";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (exp.total_amount || 0);
      });

      const topCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        setTopCategory(`${topCat[0]} ($${topCat[1].toFixed(2)})`);
      }

      // Calculate top vendor - use ALL expenses (not just current month) for better insights
      const vendorTotals: { [key: string]: number } = {};
      expenses.forEach((exp) => {
        const vendorName = exp.vendors?.name || "Unknown";
        vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + (exp.total_amount || 0);
      });

      const topVend = Object.entries(vendorTotals).sort((a, b) => b[1] - a[1])[0];
      if (topVend) {
        setTopVendor(`${topVend[0]} ($${topVend[1].toFixed(2)})`);
      }

      // Process data for 6-month trend chart
      const monthlyTrends: { [key: string]: number } = {};
      const last6Months: string[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        const monthLabel = date.toLocaleDateString('default', { month: 'short', year: '2-digit' });
        last6Months.push(monthLabel);
        monthlyTrends[monthLabel] = 0;
      }

      expenses.forEach((exp) => {
        const expDate = new Date(exp.bill_date);
        const monthLabel = expDate.toLocaleDateString('default', { month: 'short', year: '2-digit' });
        if (monthLabel in monthlyTrends) {
          monthlyTrends[monthLabel] += exp.total_amount || 0;
        }
      });

      const trendChartData: TrendDataPoint[] = last6Months.map(month => ({
        month,
        amount: monthlyTrends[month] || 0
      }));
      setTrendData(trendChartData);

      // Process data for category pie chart - use ALL expenses
      const categoryChartData: CategoryDataPoint[] = Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8 categories
      setCategoryData(categoryChartData);

      // Process data for top vendors bar chart
      const vendorChartData: VendorDataPoint[] = Object.entries(vendorTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 vendors
      setVendorData(vendorChartData);

      // Fetch health status
      const healthResp = await api.get<any>("/status/healthz");
      setHealth(healthResp);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Total Spend"
          value={`$${totalSpend.toFixed(2)}`}
          subtitle={`${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`}
          icon={(
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        />
        <KpiCard
          title="Top Category"
          value={topCategory}
          icon={(
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          )}
        />
        <KpiCard
          title="Top Vendor"
          value={topVendor}
          icon={(
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6-Month Spending Trend */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">6-Month Spending Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ fill: '#4f46e5', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Category Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Vendors Bar Chart */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Top 5 Vendors</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={vendorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
              }}
            />
            <Bar dataKey="amount" fill="#06b6d4" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* System Health */}
      {health && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">System Health</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              health.status === 'healthy'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              {health.status}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Database</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{health.database}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">OpenAI</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {health.openai_configured ? (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Not Set
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Version</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">{health.version}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Timestamp</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
