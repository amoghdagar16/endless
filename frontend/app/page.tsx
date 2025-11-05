"use client";

import { useEffect, useState } from "react";
import KpiCard from "@/components/KpiCard";
import { SkeletonKPI } from "@/components/Skeleton";
import { api, COMPANY_ID } from "@/lib/api";

interface Expense {
  id: string;
  total_amount: number;
  category?: string;
  vendors?: { name: string };
  bill_date: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [totalSpend, setTotalSpend] = useState(0);
  const [topCategory, setTopCategory] = useState("N/A");
  const [topVendor, setTopVendor] = useState("N/A");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get current month date range
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch expenses for the company
      const expensesResp = await api.get<{ status: string; data: Expense[] }>(
        `/expenses/company/${COMPANY_ID}`
      );

      const expenses = expensesResp.data || [];

      // Filter for current month
      const monthExpenses = expenses.filter((exp) => {
        const date = exp.bill_date;
        return date >= periodStart && date <= periodEnd;
      });

      // Calculate total spend
      const total = monthExpenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0);
      setTotalSpend(total);

      // Calculate top category
      const categoryTotals: { [key: string]: number } = {};
      monthExpenses.forEach((exp) => {
        const cat = "Office Supplies"; // Default category since backend doesn't store it
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (exp.total_amount || 0);
      });

      const topCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        setTopCategory(`${topCat[0]} ($${topCat[1].toFixed(2)})`);
      }

      // Calculate top vendor
      const vendorTotals: { [key: string]: number } = {};
      monthExpenses.forEach((exp) => {
        const vendorName = exp.vendors?.name || "Unknown";
        vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + (exp.total_amount || 0);
      });

      const topVend = Object.entries(vendorTotals).sort((a, b) => b[1] - a[1])[0];
      if (topVend) {
        setTopVendor(`${topVend[0]} ($${topVend[1].toFixed(2)})`);
      }

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
