"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { simpleTransactions, transactions, fetchAccounts } from "@/lib/api";
import type { SimpleTransaction, Account, TransactionLineCreate } from "@/types";

export default function ConvertToJournalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<SimpleTransaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [lines, setLines] = useState<TransactionLineCreate[]>([
    { accountId: '', debit: 0, credit: 0, memo: '' },
    { accountId: '', debit: 0, credit: 0, memo: '' },
  ]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [txnData, accountsData] = await Promise.all([
        simpleTransactions.get(id),
        fetchAccounts(),
      ]);
      setTransaction(txnData);
      setAccounts(accountsData);
      
      // Pre-populate memo with description
      setLines([
        { accountId: '', debit: txnData.amount, credit: 0, memo: txnData.description },
        { accountId: '', debit: 0, credit: txnData.amount, memo: txnData.description },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index: number, field: keyof TransactionLineCreate, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0, memo: transaction?.description || '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 2) {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
    }
  };

  const calculateTotals = () => {
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit.toString()) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit.toString()) || 0), 0);
    return { totalDebit, totalCredit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const { totalDebit, totalCredit } = calculateTotals();
    
    if (totalDebit !== totalCredit) {
      setError(`Debits ($${totalDebit.toFixed(2)}) must equal credits ($${totalCredit.toFixed(2)})`);
      return;
    }
    
    if (transaction && totalDebit !== transaction.amount) {
      setError(`Line totals ($${totalDebit.toFixed(2)}) must match transaction amount ($${transaction.amount.toFixed(2)})`);
      return;
    }
    
    // Check all lines have accounts
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].accountId) {
        setError(`Line ${i + 1}: Please select an account`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      
      await simpleTransactions.convertToJournal(id, lines);
      
      alert('✅ Transaction converted to journal entry successfully!');
      router.push('/journals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert transaction');
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading transaction...</div>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
        <Link
          href="/transactions"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Transactions
        </Link>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = totalDebit === totalCredit;
  const matchesAmount = totalDebit === transaction.amount;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/transactions"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Transactions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Convert to Journal Entry</h1>
          <p className="mt-2 text-sm text-gray-600">
            Assign accounts to complete this transaction
          </p>
        </div>

        {/* Transaction Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Vendor:</span>
              <span className="ml-2 font-medium">{transaction.vendorName}</span>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="ml-2 font-medium">{formatDate(transaction.date)}</span>
            </div>
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-2 font-medium">{formatCurrency(transaction.amount)}</span>
            </div>
            <div>
              <span className="text-gray-600">Reference:</span>
              <span className="ml-2 font-medium">{transaction.reference || '-'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Description:</span>
              <p className="mt-1 font-medium">{transaction.description}</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Journal Entry Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Journal Entry Lines</h2>
          
          <form onSubmit={handleSubmit}>
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
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional memo"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {lines.length > 2 && (
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
                      <div className={`font-semibold ${!isBalanced ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(totalDebit)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${!isBalanced ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(totalCredit)}
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
              <div className={`text-sm ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {isBalanced ? '✓ Debits equal credits' : '✗ Debits must equal credits'}
              </div>
              <div className={`text-sm ${matchesAmount ? 'text-green-600' : 'text-orange-600'}`}>
                {matchesAmount ? '✓ Totals match transaction amount' : '⚠ Totals should match transaction amount'}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end gap-4">
              <Link
                href="/transactions"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !isBalanced || !matchesAmount}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Converting...' : 'Convert & Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
