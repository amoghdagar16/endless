"use client";

import { useEffect, useState } from "react";
import { SkeletonKPI } from "@/components/Skeleton";
import { fetchAccounts } from "@/lib/api";
import type { Account, AccountType } from "@/types";
import Link from "next/link";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountStats, setAccountStats] = useState({
    total: 0,
    assets: 0,
    liabilities: 0,
    equity: 0,
    income: 0,
    expense: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await fetchAccounts();
      setAccounts(data);

      // Calculate account statistics
      const stats = {
        total: data.length,
        assets: data.filter((a) => a.type === 'asset').length,
        liabilities: data.filter((a) => a.type === 'liability').length,
        equity: data.filter((a) => a.type === 'equity').length,
        income: data.filter((a) => a.type === 'income').length,
        expense: data.filter((a) => a.type === 'expense').length,
      };
      setAccountStats(stats);

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome to your AI Accounting System
        </p>
      </div>

      {/* Account Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Accounts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{accountStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Assets</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{accountStats.assets}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Liabilities</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{accountStats.liabilities}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Account Breakdown */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Equity</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{accountStats.equity}</div>
          </div>
          <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Income</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{accountStats.income}</div>
          </div>
          <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Expense</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{accountStats.expense}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/accounts"
            className="border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg p-6 hover:border-brand-500 dark:hover:border-brand-500 transition-colors cursor-pointer group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">View Chart of Accounts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Browse all {accountStats.total} accounts</p>
            </div>
          </Link>

          <Link 
            href="/documents"
            className="border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg p-6 hover:border-brand-500 dark:hover:border-brand-500 transition-colors cursor-pointer group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Scan Documents</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Extract data with OCR</p>
            </div>
          </Link>

          <Link 
            href="/journals"
            className="border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg p-6 hover:border-brand-500 dark:hover:border-brand-500 transition-colors cursor-pointer group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Journal Entries</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Record transactions</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

