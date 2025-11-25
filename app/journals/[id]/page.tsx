"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { transactions, fetchAccounts } from "@/lib/api";
import type { Transaction, Account, TransactionLineCreate } from "@/types";

export default function JournalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [postConfirm, setPostConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedLines, setEditedLines] = useState<TransactionLineCreate[]>([]);
  const [editedDescription, setEditedDescription] = useState("");
  const [editedReference, setEditedReference] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTransaction();
    loadAccounts();
  }, [id]);

  const loadAccounts = async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactions.get(id);
      setTransaction(data);
      setEditedDescription(data.description);
      setEditedReference(data.reference || "");
      setEditedDate(data.date);
      setEditedLines(data.lines.map(line => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo || ""
      })));
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (transaction) {
      setEditedDescription(transaction.description);
      setEditedReference(transaction.reference || "");
      setEditedDate(transaction.date);
      setEditedLines(transaction.lines.map(line => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo || ""
      })));
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    // Validation
    const totalDebit = editedLines.reduce((sum, line) => sum + (parseFloat(line.debit.toString()) || 0), 0);
    const totalCredit = editedLines.reduce((sum, line) => sum + (parseFloat(line.credit.toString()) || 0), 0);
    
    if (totalDebit !== totalCredit) {
      alert(`Debits ($${totalDebit.toFixed(2)}) must equal credits ($${totalCredit.toFixed(2)})`);
      return;
    }
    
    // Check all lines have accounts
    for (let i = 0; i < editedLines.length; i++) {
      if (!editedLines[i].accountId) {
        alert(`Line ${i + 1}: Please select an account`);
        return;
      }
    }

    try {
      setSaving(true);
      await transactions.update(id, {
        date: editedDate,
        description: editedDescription,
        reference: editedReference || null,
        lines: editedLines
      });
      alert('✅ Transaction updated successfully!');
      await loadTransaction();
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleLineChange = (index: number, field: keyof TransactionLineCreate, value: any) => {
    const newLines = [...editedLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setEditedLines(newLines);
  };

  const handleAddLine = () => {
    setEditedLines([...editedLines, { accountId: '', debit: 0, credit: 0, memo: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (editedLines.length > 2) {
      const newLines = editedLines.filter((_, i) => i !== index);
      setEditedLines(newLines);
    }
  };

  const calculateEditedTotals = () => {
    const totalDebit = editedLines.reduce((sum, line) => sum + (parseFloat(line.debit.toString()) || 0), 0);
    const totalCredit = editedLines.reduce((sum, line) => sum + (parseFloat(line.credit.toString()) || 0), 0);
    return { totalDebit, totalCredit };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    // Parse as local date to avoid timezone shifts
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    // For ISO datetime strings, new Date() works correctly
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
          {transaction.status === 'draft' && !isEditing && (
            <>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
              >
                Edit
              </button>
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
          {isEditing && (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
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
        
        {/* Show vendor info if it's from a simple transaction */}
        {transaction.source === 'simple_entry' && transaction.vendorName && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  Simple Transaction Entry
                </h3>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Vendor:</strong> {transaction.vendorName}
                  {transaction.amount && (
                    <span className="ml-4">
                      <strong>Original Amount:</strong> {formatCurrency(transaction.amount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Editable fields when in edit mode */}
        {isEditing && (
          <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  value={editedReference}
                  onChange={(e) => setEditedReference(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional reference number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Transaction description"
                required
              />
            </div>
          </div>
        )}
        
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
        {!isEditing ? (
          // View Mode
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
        ) : (
          // Edit Mode
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Memo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Debit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Credit
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editedLines.map((line, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select Account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.number} - {account.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={line.memo || ''}
                          onChange={(e) => handleLineChange(index, 'memo', e.target.value)}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional memo"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {editedLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-semibold">
                      Totals:
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${calculateEditedTotals().totalDebit !== calculateEditedTotals().totalCredit ? 'text-red-600' : 'text-gray-900'}`}>
                        ${calculateEditedTotals().totalDebit.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${calculateEditedTotals().totalDebit !== calculateEditedTotals().totalCredit ? 'text-red-600' : 'text-gray-900'}`}>
                        ${calculateEditedTotals().totalCredit.toFixed(2)}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleAddLine}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Line
              </button>
            </div>

            {/* Balance Status */}
            <div className="mt-6 space-y-2">
              <div className={`text-sm ${calculateEditedTotals().totalDebit === calculateEditedTotals().totalCredit ? 'text-green-600' : 'text-red-600'}`}>
                {calculateEditedTotals().totalDebit === calculateEditedTotals().totalCredit ? '✓ Debits equal credits' : '✗ Debits must equal credits'}
              </div>
              {transaction.amount && (
                <div className={`text-sm ${calculateEditedTotals().totalDebit === transaction.amount ? 'text-green-600' : 'text-orange-600'}`}>
                  {calculateEditedTotals().totalDebit === transaction.amount ? '✓ Totals match original amount' : '⚠ Totals should match original amount ($' + transaction.amount.toFixed(2) + ')'}
                </div>
              )}
            </div>
          </div>
        )}
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
