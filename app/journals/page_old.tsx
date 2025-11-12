"use client";

import { useState, useEffect } from 'react';

interface TransactionLine {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string | null;
}

interface Transaction {
  id: string;
  companyId: string;
  date: string;
  description: string;
  reference: string | null;
  source: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  lines: TransactionLine[];
}

export default function JournalsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  const companyId = "00000000-0000-0000-0000-000000000001";

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/v1/transactions', {
        headers: {
          'X-Company-Id': companyId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/v1/accounts', {
        headers: {
          'X-Company-Id': companyId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const createTransaction = async (formData: any) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': companyId,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create transaction');
      }

      await fetchTransactions();
      setShowCreateForm(false);
      alert('Transaction created successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create transaction');
    }
  };

  const postTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to post this transaction? It cannot be undone.')) {
      return;
    }

    try {
      setPosting(transactionId);
      const response = await fetch(`http://127.0.0.1:8000/v1/transactions/${transactionId}/post`, {
        method: 'POST',
        headers: {
          'X-Company-Id': companyId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to post transaction');
      }

      // Refresh the list
      await fetchTransactions();
      alert('Transaction posted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post transaction');
    } finally {
      setPosting(null);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  return (
    "use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transactions } from "@/lib/api";
import { fetchAccounts } from "@/lib/api";
import type { Transaction, TransactionFilters, Account } from "@/types";

export default function JournalsPage() {
  const router = useRouter();
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [postConfirm, setPostConfirm] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    status: '',
    dateFrom: '',
    dateTo: '',
    accountId: '',
    page: 1,
    perPage: 50,
  });
  
  // Pagination
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadAccounts = async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactions.list(filters);
      setTransactionList(response.transactions);
      setTotal(response.total);
      setCurrentPage(response.page);
      setPerPage(response.perPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      accountId: '',
      page: 1,
      perPage: 50,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await transactions.delete(id);
      setDeleteConfirm(null);
      loadTransactions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  const handlePost = async (id: string) => {
    try {
      await transactions.post(id);
      setPostConfirm(null);
      loadTransactions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post transaction');
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
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Journal Entries
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your journal entries and transactions
          </p>
        </div>
        <Link
          href="/journals/new"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          New Journal Entry
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account
            </label>
            <select
              value={filters.accountId}
              onChange={(e) => handleFilterChange('accountId', e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number} - {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-border/70 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading transactions...
          </div>
        ) : transactionList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No transactions found. Create your first journal entry!
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-border/70">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {transactionList.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                      onClick={() => router.push(`/journals/${transaction.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {transaction.reference || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(transaction.totalDebit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.status === 'posted'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}
                        >
                          {transaction.status === 'posted' ? 'Posted' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/journals/${transaction.id}`}
                            className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300"
                          >
                            View
                          </Link>
                          {transaction.status === 'draft' && (
                            <>
                              <Link
                                href={`/journals/${transaction.id}/edit`}
                                className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => setPostConfirm(transaction.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              >
                                Post
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(transaction.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-border/70 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, total)} of {total} transactions
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, currentPage - 1) }))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-border/70 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, currentPage + 1) }))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-border/70 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
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
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
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
                onClick={() => setPostConfirm(null)}
                className="px-4 py-2 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePost(postConfirm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

      {loading ? (
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-12 shadow-sm text-center">
          <div className="text-gray-600 dark:text-gray-400">Loading transactions...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 shadow-sm">
          <div className="text-red-600 dark:text-red-400">Error: {error}</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-12 shadow-sm text-center">
          <div className="text-gray-600 dark:text-gray-400">No transactions found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {transaction.description}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          transaction.status === 'posted'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {transaction.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(transaction.date).toLocaleDateString()} 
                      {transaction.reference && ` • Ref: ${transaction.reference}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      ${transaction.totalDebit.toLocaleString()}
                    </div>
                    {transaction.status === 'draft' && (
                      <button
                        onClick={() => postTransaction(transaction.id)}
                        disabled={posting === transaction.id}
                        className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {posting === transaction.id ? 'Posting...' : 'Post'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-neutral-700 pt-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                        <th className="pb-2">Account</th>
                        <th className="pb-2 text-right">Debit</th>
                        <th className="pb-2 text-right">Credit</th>
                        <th className="pb-2">Memo</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {transaction.lines.map((line) => (
                        <tr key={line.id} className="border-t border-gray-100 dark:border-neutral-800">
                          <td className="py-2 text-gray-900 dark:text-white">
                            {line.accountNumber} - {line.accountName}
                          </td>
                          <td className="py-2 text-right text-gray-900 dark:text-white">
                            {line.debit > 0 ? `$${line.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 text-right text-gray-900 dark:text-white">
                            {line.credit > 0 ? `$${line.credit.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">
                            {line.memo || '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 dark:border-neutral-600 font-semibold">
                        <td className="py-2 text-gray-900 dark:text-white">Total</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">
                          ${transaction.totalDebit.toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">
                          ${transaction.totalCredit.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Transaction Modal */}
      {showCreateForm && (
        <CreateTransactionModal
          accounts={accounts}
          onClose={() => setShowCreateForm(false)}
          onSubmit={createTransaction}
        />
      )}
    </div>
  );
}

function CreateTransactionModal({ accounts, onClose, onSubmit }: any) {
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([
    { accountId: '', debit: 0, credit: 0, memo: '' },
    { accountId: '', debit: 0, credit: 0, memo: '' },
  ]);

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0, memo: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isBalanced) {
      alert('Transaction must be balanced (debits must equal credits)');
      return;
    }

    const formData = {
      date,
      description,
      reference: reference || undefined,
      lines: lines.map(line => ({
        accountId: line.accountId,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        memo: line.memo || undefined,
      })),
    };

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">New Journal Entry</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                placeholder="JE-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                placeholder="Enter description"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h3>
              <div className={`text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                Debits: ${totalDebit.toFixed(2)} | Credits: ${totalCredit.toFixed(2)} 
                {!isBalanced && totalDebit !== totalCredit && (
                  <span className="ml-2">| Difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select account...</option>
                      {accounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
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
                      onChange={(e) => {
                        updateLine(index, 'debit', e.target.value);
                        if (Number(e.target.value) > 0) {
                          updateLine(index, 'credit', 0);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                      placeholder="Debit"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ''}
                      onChange={(e) => {
                        updateLine(index, 'credit', e.target.value);
                        if (Number(e.target.value) > 0) {
                          updateLine(index, 'debit', 0);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                      placeholder="Credit"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={line.memo}
                      onChange={(e) => updateLine(index, 'memo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                      placeholder="Memo (optional)"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 2}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              + Add Line
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isBalanced}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
