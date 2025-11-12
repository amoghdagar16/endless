"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { transactions } from "@/lib/api";
import type { Transaction } from "@/types";

export default function JournalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [postConfirm, setPostConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [id]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactions.get(id);
      setTransaction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await transactions.delete(id);
      alert('✅ Transaction deleted successfully!');
      router.push('/journals');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete transaction');
      setActionLoading(false);
    }
  };

  const handlePost = async () => {
    try {
      setActionLoading(true);
      await transactions.post(id);
      alert('✅ Transaction posted successfully!');
      loadTransaction(); // Reload to show updated status
      setPostConfirm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post transaction');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading transaction...</div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error || 'Transaction not found'}
        </div>
        <Link
          href="/journals"
          className="inline-block px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
        >
          Back to Journal Entries
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/journals"
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Journal Entry {transaction.reference ? `- ${transaction.reference}` : `#${transaction.id.slice(0, 8)}`}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatDate(transaction.date)}
            </p>
          </div>
          <span
            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
              transaction.status === 'posted'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}
          >
            {transaction.status === 'posted' ? 'Posted' : 'Draft'}
          </span>
        </div>

        <div className="flex gap-2">
          {transaction.status === 'draft' && (
            <>
              <Link
                href={`/journals/${id}/edit`}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
              >
                Edit
              </Link>
              <button
                onClick={() => setPostConfirm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Post
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transaction Details Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transaction Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Date</div>
            <div className="text-gray-900 dark:text-white font-medium">
              {formatDate(transaction.date)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Reference</div>
            <div className="text-gray-900 dark:text-white font-medium">
              {transaction.reference || '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Source</div>
            <div className="text-gray-900 dark:text-white font-medium capitalize">
              {transaction.source}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
            <div className="text-gray-900 dark:text-white font-medium capitalize">
              {transaction.status}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Debits</div>
            <div className="text-gray-900 dark:text-white font-medium">
              {formatCurrency(transaction.totalDebit)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Credits</div>
            <div className="text-gray-900 dark:text-white font-medium">
              {formatCurrency(transaction.totalCredit)}
            </div>
          </div>
          <div className="col-span-2 md:col-span-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">Description</div>
            <div className="text-gray-900 dark:text-white font-medium">
              {transaction.description}
            </div>
          </div>
          {transaction.createdAt && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Created At</div>
              <div className="text-gray-900 dark:text-white text-sm">
                {formatDateTime(transaction.createdAt)}
              </div>
            </div>
          )}
          {transaction.updatedAt && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Updated At</div>
              <div className="text-gray-900 dark:text-white text-sm">
                {formatDateTime(transaction.updatedAt)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/70">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Line Items
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Credit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Memo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {transaction.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div className="font-medium">{line.accountNumber}</div>
                    <div className="text-gray-500 dark:text-gray-400">{line.accountName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                    {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                    {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {line.memo || '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-neutral-800 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(transaction.totalDebit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(transaction.totalCredit)}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Transaction
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Confirmation Modal */}
      {postConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Post Transaction
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to post this transaction? Once posted, it cannot be edited or deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPostConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
