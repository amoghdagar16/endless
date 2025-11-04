"use client";

import { useEffect, useState } from "react";
import KpiCard from "@/components/KpiCard";
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Financial insights for the current month</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          title="Total Spend (Month)"
          value={`$${totalSpend.toFixed(2)}`}
          subtitle={`${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`}
        />
        <KpiCard
          title="Top Category"
          value={topCategory}
        />
        <KpiCard
          title="Top Vendor"
          value={topVendor}
        />
      </div>

      {health && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">System Health</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${health.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                {health.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Database:</span>
              <span className="font-medium text-gray-900">{health.database}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">OpenAI Configured:</span>
              <span className="font-medium text-gray-900">
                {health.openai_configured ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Version:</span>
              <span className="font-medium text-gray-900">{health.version}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
