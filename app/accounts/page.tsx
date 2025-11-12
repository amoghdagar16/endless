"use client";

import { useState, useEffect } from "react";
import { fetchAccounts, fetchAccountsHierarchy, importCOA, exportAccountsCSV, downloadTemplate, createAccount, updateAccount, deleteAccount, deleteAllAccounts } from "@/lib/api";
import type { Account, AccountHierarchy, AccountType } from "@/types";
import Table from "@/components/Table";
import { Skeleton } from "@/components/Skeleton";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [hierarchyAccounts, setHierarchyAccounts] = useState<AccountHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flat' | 'hierarchy'>('flat');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [accountForm, setAccountForm] = useState({
    number: '',
    name: '',
    type: 'asset' as AccountType,
    detail_type: '',
    parentNumber: '',
    isActive: true,
    openingBalance: '',
    openingBalanceDate: '',
  });

  useEffect(() => {
    loadAccounts();
  }, [viewMode]);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError(null);
      if (viewMode === 'flat') {
        const data = await fetchAccounts();
        setAccounts(data);
      } else {
        const data = await fetchAccountsHierarchy();
        setHierarchyAccounts(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(file: File) {
    try {
      setImporting(true);
      setImportMessage(null);
      const result = await importCOA(file, false);
      
      if ('inserted' in result) {
        setImportMessage({ 
          type: 'success', 
          text: `Successfully imported ${result.inserted} accounts` 
        });
        setTimeout(() => {
          setShowImportModal(false);
          loadAccounts(); // Reload the accounts
        }, 1500);
      }
    } catch (err) {
      console.error('Import error:', err);
      setImportMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Import failed' 
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    try {
      const blob = await exportAccountsCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chart_of_accounts_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export accounts');
    }
  }

  async function handleDownloadTemplate(format: 'csv' | 'xlsx') {
    try {
      const blob = await downloadTemplate(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coa_template.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download template error:', err);
      alert('Failed to download template');
    }
  }

  function openAddAccountModal() {
    setEditingAccount(null);
    setAccountForm({
      number: '',
      name: '',
      type: 'asset',
      detail_type: '',
      parentNumber: '',
      isActive: true,
      openingBalance: '',
      openingBalanceDate: '',
    });
    setShowAccountModal(true);
  }

  function openEditAccountModal(account: Account) {
    setEditingAccount(account);
    setAccountForm({
      number: account.number,
      name: account.name,
      type: account.type as AccountType,
      detail_type: account.detail_type || '',
      parentNumber: account.parentNumber || '',
      isActive: account.isActive,
      openingBalance: account.openingBalance?.toString() || '',
      openingBalanceDate: account.openingBalanceDate || '',
    });
    setShowAccountModal(true);
  }

  async function handleSaveAccount() {
    try {
      if (editingAccount) {
        // Update existing account
        const updateData = {
          number: accountForm.number,
          name: accountForm.name,
          type: accountForm.type,
          detailType: accountForm.detail_type || undefined,
          parentNumber: accountForm.parentNumber || undefined,
          isActive: accountForm.isActive,
          openingBalance: accountForm.openingBalance ? parseFloat(accountForm.openingBalance) : undefined,
          openingBalanceDate: accountForm.openingBalanceDate || undefined,
        };
        await updateAccount(editingAccount.id, updateData);
      } else {
        // Create new account
        const accountData = {
          number: accountForm.number,
          name: accountForm.name,
          type: accountForm.type,
          detail_type: accountForm.detail_type || null,
          parentId: null,
          parentNumber: accountForm.parentNumber || null,
          isActive: accountForm.isActive,
          openingBalance: accountForm.openingBalance ? parseFloat(accountForm.openingBalance) : null,
          openingBalanceDate: accountForm.openingBalanceDate || null,
        };
        await createAccount(accountData);
      }
      setShowAccountModal(false);
      setEditingAccount(null);
      loadAccounts();
    } catch (err) {
      console.error('Save account error:', err);
      alert(err instanceof Error ? err.message : 'Failed to save account');
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await deleteAccount(id);
      loadAccounts();
    } catch (err) {
      console.error('Delete account error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete account');
    }
  }

  async function handleDeleteAllAccounts() {
    if (!confirm('⚠️ WARNING: This will delete ALL accounts and ALL transactions. This action cannot be undone. Are you absolutely sure?')) return;

    try {
      setLoading(true);
      const result = await deleteAllAccounts();
      alert(`Successfully deleted:\n- ${result.deleted.accounts} accounts\n- ${result.deleted.transactions} transactions\n- ${result.deleted.transaction_lines} transaction lines`);
      loadAccounts();
    } catch (err) {
      console.error('Delete all accounts error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete all accounts');
      setLoading(false);
    }
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.number.includes(searchTerm);
    const matchesType = filterType === 'all' || account.type === filterType;
    return matchesSearch && matchesType;
  });

  const tableHeaders = ['Number', 'Name', 'Type', 'Detail Type', 'Parent', 'Opening Balance', 'Status', 'Actions'];
  const tableRows = filteredAccounts.map(account => [
    account.number,
    account.name,
    <span className="capitalize">{account.type}</span>,
    account.detail_type ? <span className="text-gray-600 dark:text-gray-400">{account.detail_type}</span> : '-',
    account.parentNumber ? <span className="text-gray-600 dark:text-gray-400">{account.parentNumber}</span> : '-',
    account.openingBalance !== null && account.openingBalance !== undefined
      ? <span className="text-gray-900 dark:text-gray-100 font-medium">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(account.openingBalance)}
        </span>
      : <span className="text-gray-400 dark:text-gray-600">-</span>,
    <span key={account.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      account.isActive
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }`}>
      {account.isActive ? 'Active' : 'Inactive'}
    </span>,
    <div key={`actions-${account.id}`} className="flex gap-2">
      <button
        onClick={() => openEditAccountModal(account)}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Edit
      </button>
      <button
        onClick={() => handleDeleteAccount(account.id)}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Delete
      </button>
    </div>
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your chart of accounts and account hierarchy
        </p>
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={openAddAccountModal}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            + Add Account
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Import COA
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-200 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
          >
            Export CSV
          </button>
          <div className="relative group">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Download Template ▾
            </button>
            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 hidden group-hover:block z-10">
              <button
                onClick={() => handleDownloadTemplate('csv')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-t-lg"
              >
                📄 CSV Template
              </button>
              <button
                onClick={() => handleDownloadTemplate('xlsx')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-b-lg"
              >
                📊 Excel Template
              </button>
            </div>
          </div>
          <button
            onClick={handleDeleteAllAccounts}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Delete all accounts and transactions"
          >
            🗑️ Delete All
          </button>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex gap-2 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'flat'
                  ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'hierarchy'
                  ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tree View
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'flat' && (
        <>
          {/* Search and Filter */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 mb-6 flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by number or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as AccountType | 'all')}
                className="appearance-none pl-10 pr-10 py-2.5 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white font-medium cursor-pointer hover:border-gray-400 dark:hover:border-neutral-600 transition-all"
                style={{ minWidth: '180px' }}
              >
                <option value="all">All Types</option>
                <option value="asset">💰 Assets</option>
                <option value="liability">📊 Liabilities</option>
                <option value="equity">🏦 Equity</option>
                <option value="income">💵 Income</option>
                <option value="expense">💳 Expenses</option>
                <option value="other">📋 Other</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Table View */}
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              Error: {error}
            </div>
          ) : (
            <div>
              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-neutral-800">
                <Table headers={tableHeaders} rows={tableRows} />
              </div>
              <div className="mt-4 px-2 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredAccounts.length} of {accounts.length} accounts
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'hierarchy' && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-6">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              Error: {error}
            </div>
          ) : (
            <AccountTree accounts={hierarchyAccounts} />
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Import Chart of Accounts</h3>
            
            {importMessage && (
              <div className={`mb-4 p-3 rounded-lg border ${
                importMessage.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}>
                {importMessage.text}
              </div>
            )}

            {importing && (
              <div className="mb-4 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Importing accounts...</span>
                </div>
              </div>
            )}

            <input
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-brand-500 transition-colors"
              disabled={importing}
            />

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Upload a CSV or Excel file with columns: number, name, type, detail_type, parent_number, is_active
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportMessage(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
                disabled={importing}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Form Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={accountForm.number}
                  onChange={(e) => setAccountForm({ ...accountForm, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                  placeholder="Assets"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Type *
                </label>
                <div className="relative">
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as AccountType })}
                    className="appearance-none w-full pl-3 pr-10 py-2.5 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white font-medium cursor-pointer hover:border-gray-400 dark:hover:border-neutral-600 transition-all"
                  >
                    <option value="asset">💰 Asset</option>
                    <option value="liability">📊 Liability</option>
                    <option value="equity">🏦 Equity</option>
                    <option value="income">💵 Income</option>
                    <option value="expense">💳 Expense</option>
                    <option value="other">📋 Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Detail Type
                </label>
                <input
                  type="text"
                  value={accountForm.detail_type}
                  onChange={(e) => setAccountForm({ ...accountForm, detail_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                  placeholder="group, bank, ar, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Account Number
                </label>
                <input
                  type="text"
                  value={accountForm.parentNumber}
                  onChange={(e) => setAccountForm({ ...accountForm, parentNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                  placeholder="Leave empty for top-level"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accountForm.isActive}
                    onChange={(e) => setAccountForm({ ...accountForm, isActive: e.target.checked })}
                    className="mr-2 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active Account
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opening Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={accountForm.openingBalance}
                  onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opening Balance Date
                </label>
                <input
                  type="date"
                  value={accountForm.openingBalanceDate}
                  onChange={(e) => setAccountForm({ ...accountForm, openingBalanceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveAccount}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
              >
                {editingAccount ? 'Update Account' : 'Create Account'}
              </button>
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tree View Component
function AccountTree({ accounts }: { accounts: AccountHierarchy[] }) {
  return (
    <div className="space-y-1">
      {accounts.map((account) => (
        <AccountTreeNode key={account.id} account={account} level={0} />
      ))}
    </div>
  );
}

function AccountTreeNode({ account, level }: { account: AccountHierarchy; level: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-md cursor-pointer"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="text-gray-400 dark:text-gray-600 w-4">
            {expanded ? '▼' : '►'}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400 min-w-[80px]">
          {account.number}
        </span>
        <span className="text-gray-900 dark:text-white font-medium">
          {account.name}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
          {account.type}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {account.children.map((child) => (
            <AccountTreeNode key={child.id} account={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
