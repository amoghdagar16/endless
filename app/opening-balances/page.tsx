"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAccounts, openingBalances } from "@/lib/api";
import type { Account } from "@/types";

interface AccountBalance {
  accountId: string;
  balance: number;
  memo?: string;
}

export default function OpeningBalancesPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all accounts
      const allAccounts = await fetchAccounts();

      // Filter to balance sheet accounts only (asset, liability, equity)
      const balanceSheetAccounts = allAccounts.filter(
        (acc) =>
          acc.isActive &&
          (acc.type === "asset" || acc.type === "liability" || acc.type === "equity")
      );

      setAccounts(balanceSheetAccounts);

      // Load existing opening balances if any
      const existingBalances = await openingBalances.get();

      if (existingBalances.exists && existingBalances.balances) {
        const balanceMap = new Map<string, number>();
        existingBalances.balances.forEach((b: any) => {
          balanceMap.set(b.accountId, b.balance);
        });
        setBalances(balanceMap);

        if (existingBalances.asOfDate) {
          setAsOfDate(existingBalances.asOfDate);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceChange = (accountId: string, value: string) => {
    const newBalances = new Map(balances);
    const numValue = parseFloat(value) || 0;
    if (numValue === 0) {
      newBalances.delete(accountId);
    } else {
      newBalances.set(accountId, numValue);
    }
    setBalances(newBalances);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all balances?")) {
      setBalances(new Map());
    }
  };

  const calculateTotals = () => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    accounts.forEach((account) => {
      const balance = balances.get(account.id) || 0;
      if (balance === 0) return;

      if (account.type === "asset") {
        totalAssets += balance;
      } else if (account.type === "liability") {
        totalLiabilities += balance;
      } else if (account.type === "equity") {
        totalEquity += balance;
      }
    });

    return { totalAssets, totalLiabilities, totalEquity };
  };

  const { totalAssets, totalLiabilities, totalEquity } = calculateTotals();
  const imbalance = totalAssets - (totalLiabilities + totalEquity);
  const isBalanced = Math.abs(imbalance) < 0.01;

  const handleSave = async () => {
    // Validation
    if (balances.size === 0) {
      alert("Please enter at least one opening balance");
      return;
    }

    if (!isBalanced) {
      alert(
        `Opening balances must be balanced.\n\n` +
          `Assets = Liabilities + Equity\n` +
          `${formatCurrency(totalAssets)} ≠ ${formatCurrency(totalLiabilities + totalEquity)}\n\n` +
          `Difference: ${formatCurrency(Math.abs(imbalance))}`
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const balancesArray: AccountBalance[] = Array.from(balances.entries()).map(
        ([accountId, balance]) => ({
          accountId,
          balance,
        })
      );

      await openingBalances.set({
        asOfDate,
        balances: balancesArray,
      });

      setSuccessMessage(
        `✅ Opening balances saved successfully! Transaction created for ${balancesArray.length} accounts.`
      );

      // Reload data to show updated balances
      setTimeout(() => {
        loadData();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save opening balances");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatAccountType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Opening Balances
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Set initial account balances for balance sheet accounts (Assets, Liabilities, Equity)
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
        >
          Back to Home
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* As-of Date */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 p-4">
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            As-of Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The date when these opening balances take effect
          </p>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
              Total Assets
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(totalAssets)}
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">
              Total Liabilities
            </div>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {formatCurrency(totalLiabilities)}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">
              Total Equity
            </div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatCurrency(totalEquity)}
            </div>
          </div>

          <div
            className={`rounded-lg p-4 ${
              isBalanced
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            <div
              className={`text-sm font-medium mb-1 ${
                isBalanced
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isBalanced ? "✓ Balanced" : "⚠ Imbalance"}
            </div>
            <div
              className={`text-2xl font-bold ${
                isBalanced
                  ? "text-green-900 dark:text-green-100"
                  : "text-red-900 dark:text-red-100"
              }`}
            >
              {formatCurrency(Math.abs(imbalance))}
            </div>
            {!isBalanced && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                Assets must equal Liabilities + Equity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balance Sheet Accounts Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Balance Sheet Accounts
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {accounts.length} accounts ({balances.size} with balances)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-border/70">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Opening Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-gray-50 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {account.number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.type === "asset"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : account.type === "liability"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                      }`}
                    >
                      {formatAccountType(account.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={balances.get(account.id) || ""}
                      onChange={(e) => handleBalanceChange(account.id, e.target.value)}
                      placeholder="0.00"
                      className="w-40 px-3 py-2 text-right border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {accounts.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg">No balance sheet accounts found</p>
            <p className="text-sm mt-2">
              Please import your chart of accounts first
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white dark:bg-neutral-900 rounded-lg border border-border/70 p-4">
        <button
          onClick={handleClearAll}
          disabled={balances.size === 0 || saving}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-border/70 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear All
        </button>

        <div className="flex gap-3">
          <Link
            href="/"
            className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={!isBalanced || balances.size === 0 || saving}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {saving ? "Saving..." : "Save Opening Balances"}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 How Opening Balances Work
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>
            Opening balances establish your starting point when you begin using the
            accounting system
          </li>
          <li>
            Only balance sheet accounts (Assets, Liabilities, Equity) can have opening
            balances
          </li>
          <li>
            The accounting equation must balance: <strong>Assets = Liabilities + Equity</strong>
          </li>
          <li>
            For Assets: enter positive values for debit balances, negative for credit
            balances
          </li>
          <li>
            For Liabilities & Equity: enter positive values for credit balances,
            negative for debit balances
          </li>
          <li>
            The system will create a posted transaction with source = "opening_balance"
          </li>
        </ul>
      </div>
    </div>
  );
}