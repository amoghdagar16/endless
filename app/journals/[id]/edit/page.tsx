"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { transactions, fetchAccounts } from "@/lib/api";
import type { Account, TransactionLineCreate } from "@/types";

export default function EditJournalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<TransactionLineCreate[]>([]);

  useEffect(() => {
    loadAccounts();
    loadTransaction();
  }, [id]);

  const loadAccounts = async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data.filter(acc => acc.isActive));
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const transaction = await transactions.get(id);

      // Check if transaction is posted
      if (transaction.status === 'posted') {
        setError('Cannot edit a posted transaction');
        setLoading(false);
        return;
      }

      // Pre-fill form
      setDate(transaction.date);
      setReference(transaction.reference || '');
      setDescription(transaction.description);
      setLines(transaction.lines.map(line => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo || '',
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0, memo: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof TransactionLineCreate, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async () => {
    // Validation
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    if (lines.length < 2) {
      alert('Transaction must have at least 2 lines');
      return;
    }

    if (!isBalanced) {
      alert('Transaction must be balanced (debits must equal credits)');
      return;
    }

    // Check all lines have accounts
    const hasEmptyAccounts = lines.some(line => !line.accountId);
    if (hasEmptyAccounts) {
      alert('All lines must have an account selected');
      return;
    }

    // Check all lines have either debit or credit
    const hasInvalidAmounts = lines.some(line => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      return debit === 0 && credit === 0;
    });
    if (hasInvalidAmounts) {
      alert('All lines must have either a debit or credit amount');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updateData = {
        date,
        description: description.trim(),
        reference: reference.trim() || undefined,
        lines: lines.map(line => ({
          accountId: line.accountId,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          memo: line.memo?.trim() || undefined,
        })),
      };

      await transactions.update(id, updateData);
      alert('✅ Transaction updated successfully!');
      router.push(`/journals/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
      alert(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading transaction...</div>
      </div>
    );
  }

  if (error && lines.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Link
          href={`/journals/${id}`}
          className="inline-block px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
        >
          Back to Transaction
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Journal Entry
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Modify journal entry details and line items
          </p>
        </div>
        <Link
          href={`/journals/${id}`}
          className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
        >
          Cancel
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 p-6">
        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="JE-001"
              className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        {/* Balance Indicator */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Line Items
            </h3>
            <div className={`text-sm font-medium ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <span className="mr-4">Debits: ${totalDebit.toFixed(2)}</span>
              <span className="mr-4">Credits: ${totalCredit.toFixed(2)}</span>
              {difference > 0 && (
                <span>Difference: ${difference.toFixed(2)}</span>
              )}
              {isBalanced && (
                <span className="ml-2">✓ Balanced</span>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-3 mb-4">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-4">
                <select
                  value={line.accountId}
                  onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                  className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-sm text-gray-900 dark:text-white"
                  required
                >
                  <option value="" className="text-gray-900">Select account...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} className="text-gray-900">
                      {account.number} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit || ''}
                  onFocus={() => {
                    // Clear credit when focusing on debit
                    if (Number(line.credit) > 0) {
                      updateLine(index, 'credit', 0);
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateLine(index, 'debit', value);
                  }}
                  placeholder="Debit"
                  className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit || ''}
                  onFocus={() => {
                    // Clear debit when focusing on credit
                    if (Number(line.debit) > 0) {
                      updateLine(index, 'debit', 0);
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateLine(index, 'credit', value);
                  }}
                  placeholder="Credit"
                  className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="col-span-3">
                <input
                  type="text"
                  value={line.memo || ''}
                  onChange={(e) => updateLine(index, 'memo', e.target.value)}
                  placeholder="Memo (optional)"
                  className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  disabled={lines.length <= 2}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove line"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Line Button */}
        <button
          type="button"
          onClick={addLine}
          className="mb-6 px-4 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors border border-border/70"
        >
          + Add Line
        </button>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/70">
          <Link
            href={`/journals/${id}`}
            className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !isBalanced}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
