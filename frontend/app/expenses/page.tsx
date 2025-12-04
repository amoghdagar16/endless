"use client";

import { useState, useEffect } from "react";
import Table from "@/components/Table";
import { api, getCompanyId } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ExpenseFormData {
  vendor_name: string;
  amount: string;
  date: string;
  category: string;
  memo: string;
}

interface AISuggestions {
  normalized_vendor?: string;
  category?: string;
  memo?: string;
}

interface Expense {
  id: string;
  bill_date: string;
  total_amount: number;
  memo?: string;
  status: string;
  vendors?: { name: string };
  category?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  budget_amount?: number;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ExpenseFormData>({
    vendor_name: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    category: "",
    memo: "",
  });

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editFormData, setEditFormData] = useState<ExpenseFormData>({
    vendor_name: "",
    amount: "",
    date: "",
    category: "",
    memo: "",
  });

  // Category management modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    budget_amount: '',
  });
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    loadExpenses();
    loadCategories();

    // Check for draft expense from parser
    const draftData = sessionStorage.getItem("draftExpense");
    if (draftData) {
      try {
        const draft = JSON.parse(draftData);
        setFormData({
          vendor_name: draft.vendor_name || "",
          amount: draft.amount || "",
          date: draft.date || new Date().toISOString().split('T')[0],
          category: draft.category || "",
          memo: draft.memo || "",
        });
        sessionStorage.removeItem("draftExpense");
        setMessage("Fields populated from AI-enhanced receipt parsing!");
      } catch (e) {
        console.error("Error parsing draft expense:", e);
      }
    }
  }, []);

  const loadExpenses = async () => {
    try {
      const companyId = getCompanyId();
      if (!companyId) {
        console.warn("No company ID found");
        return;
      }

      const resp = await api.get<{ status: string; data: Expense[] }>(
        `/expenses/company/${companyId}`
      );
      setExpenses(resp.data || []);
    } catch (error) {
      console.error("Error loading expenses:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const companyId = getCompanyId();
      if (!companyId) {
        console.warn("No company ID found");
        return;
      }

      const resp = await api.get<{ status: string; data: Category[] }>(
        `/categories/company/${companyId}`
      );
      setCategories(resp.data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCategory(true);
    setMessage('');

    try {
      const companyId = getCompanyId();
      if (!companyId) {
        setMessage('Error: No company ID found');
        return;
      }

      const data = {
        company_id: companyId,
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim(),
        budget_amount: categoryFormData.budget_amount ? parseFloat(categoryFormData.budget_amount) : null,
      };

      await api.post('/categories/', data);
      setMessage('Category created successfully!');
      setShowCategoryModal(false);
      setCategoryFormData({ name: '', description: '', budget_amount: '' });
      await loadCategories();
      // Auto-select the newly created category
      setFormData({ ...formData, category: data.name });
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'An error occurred';
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleRunAI = async () => {
    setLoading(true);
    setMessage("");
    try {
      const companyId = getCompanyId();
      const resp = await api.post<any>("/ai/overlook_expense", {
        company_id: companyId,
        vendor_name: formData.vendor_name,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category,
        memo: formData.memo,
      });

      if (!resp.valid) {
        setMessage(`Issues: ${resp.issues.join(", ")}`);
      } else {
        setAiSuggestions(resp.suggestions);
        setMessage("AI suggestions ready! Click 'Apply Suggestions' to use them.");
      }
    } catch (error: any) {
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestions = () => {
    if (aiSuggestions) {
      setFormData({
        ...formData,
        vendor_name: aiSuggestions.normalized_vendor || formData.vendor_name,
        category: aiSuggestions.category || formData.category,
        memo: aiSuggestions.memo || formData.memo,
      });
      setMessage("Suggestions applied to form!");
      setAiSuggestions(null);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    try {
      const companyId = getCompanyId();
      if (!companyId) {
        setMessage("Error: No company selected. Please select a company first.");
        setLoading(false);
        return;
      }

      // Use authenticated user's ID, or null if not available
      const userId = user?.id || null;

      await api.post("/expenses/manual_entry", {
        company_id: companyId,
        user_id: userId,
        vendor_name: formData.vendor_name,
        amount: parseFloat(formData.amount),
        category: formData.category,
        payment_method: "credit_card",
        memo: formData.memo,
        date: formData.date,
      });

      setMessage("Expense saved successfully!");
      setFormData({
        vendor_name: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        category: "",
        memo: "",
      });
      setAiSuggestions(null);
      
      // Refresh the expenses list immediately
      await loadExpenses();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || "Unknown error";
      setMessage(`Error: ${errorMsg}`);
      // Still try to refresh in case the expense was partially created
      await loadExpenses();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditFormData({
      vendor_name: expense.vendors?.name || "",
      amount: expense.total_amount.toString(),
      date: expense.bill_date,
      category: expense.category || "",
      memo: expense.memo || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    setLoading(true);
    try {
      await api.patch(`/expenses/${editingExpense.id}`, {
        vendor_name: editFormData.vendor_name,
        amount: parseFloat(editFormData.amount),
        date: editFormData.date,
        category: editFormData.category,
        memo: editFormData.memo,
      });

      setMessage("Expense updated successfully!");
      setShowEditModal(false);
      setEditingExpense(null);
      await loadExpenses();
    } catch (error: any) {
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId: string, vendorName: string) => {
    if (!confirm(`Are you sure you want to delete the expense for "${vendorName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/expenses/${expenseId}`);
      setMessage("Expense deleted successfully!");
      await loadExpenses();
    } catch (error: any) {
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Expense</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter expense details and get AI-powered suggestions</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-xs font-medium text-brand-700 dark:text-brand-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI-Powered
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Vendor Name</label>
            <input
              type="text"
              className="input"
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              placeholder="Office Supplies Inc"
            />
          </div>

          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              className="input"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="150.00"
              step="0.01"
            />
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={formData.category}
              onChange={(e) => {
                if (e.target.value === '__create_new__') {
                  setShowCategoryModal(true);
                } else if (e.target.value === '__manage__') {
                  window.location.href = '/settings/categories';
                } else {
                  setFormData({ ...formData, category: e.target.value });
                }
              }}
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                  {cat.budget_amount && ` ($${cat.budget_amount.toFixed(0)} budget)`}
                </option>
              ))}
              <option value="__create_new__">+ Create new category</option>
              <option value="__manage__">⚙️ Manage categories</option>
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No categories found. Click "+ Create new category" in the dropdown to get started.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="label">Memo</label>
            <input
              type="text"
              className="input"
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="Paper and pens"
            />
          </div>
        </div>

        {aiSuggestions && (
          <div className="mt-5 p-4 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-brand-900/20 dark:to-blue-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="font-semibold text-brand-900 dark:text-brand-100">AI Suggestions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase tracking-wide">Vendor</div>
                <div className="text-brand-900 dark:text-brand-100 font-medium">{aiSuggestions.normalized_vendor}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase tracking-wide">Category</div>
                <div className="text-brand-900 dark:text-brand-100 font-medium">{aiSuggestions.category}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase tracking-wide">Memo</div>
                <div className="text-brand-900 dark:text-brand-100 font-medium">{aiSuggestions.memo}</div>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
            message.includes("Error") || message.includes("Issues")
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
              : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
          }`}>
            {message.includes("Error") || message.includes("Issues") ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <span>{message}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleRunAI}
            disabled={loading || !formData.vendor_name || !formData.amount}
            className="btn btn-secondary"
            aria-label="Get AI suggestions for this expense"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {loading ? "Processing..." : "Run AI"}
          </button>
          {aiSuggestions && (
            <button
              onClick={handleApplySuggestions}
              className="btn btn-secondary"
              aria-label="Apply AI suggestions to form"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Apply Suggestions
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !formData.vendor_name || !formData.amount}
            className="btn btn-primary"
            aria-label="Save expense"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Expense
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Expenses</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last 20 recorded expenses</p>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {expenses.length} total
          </div>
        </div>

        {/* Custom table with actions */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Memo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                      <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">No expenses recorded yet. Create your first expense above!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.slice(0, 20).map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{expense.bill_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{expense.vendors?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">${expense.total_amount?.toFixed(2) || "0.00"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{expense.memo || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        expense.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : expense.status === 'void'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="Edit expense"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id, expense.vendors?.name || "Unknown")}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          title="Delete expense"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingExpense && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Expense</h3>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Vendor Name</label>
                    <input
                      type="text"
                      className="input"
                      value={editFormData.vendor_name}
                      onChange={(e) => setEditFormData({ ...editFormData, vendor_name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Amount</label>
                    <input
                      type="number"
                      className="input"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Date</label>
                    <input
                      type="date"
                      className="input"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Category</label>
                    <select
                      className="input"
                      value={editFormData.category}
                      onChange={(e) => {
                        if (e.target.value === '__create_new__') {
                          setShowCategoryModal(true);
                        } else if (e.target.value === '__manage__') {
                          window.location.href = '/settings/categories';
                        } else {
                          setEditFormData({ ...editFormData, category: e.target.value });
                        }
                      }}
                    >
                      <option value="">Select a category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                          {cat.budget_amount && ` ($${cat.budget_amount.toFixed(0)} budget)`}
                        </option>
                      ))}
                      <option value="__create_new__">+ Create new category</option>
                      <option value="__manage__">⚙️ Manage categories</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Memo</label>
                    <input
                      type="text"
                      className="input"
                      value={editFormData.memo}
                      onChange={(e) => setEditFormData({ ...editFormData, memo: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExpense(null);
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Category
              </h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryFormData({ name: '', description: '', budget_amount: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-5">
              <div>
                <label className="label">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="Office Supplies"
                  required
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  e.g., Office Supplies, Travel, Marketing
                </p>
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="General office supplies and equipment"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="label">Monthly Budget (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    className="input pl-8"
                    value={categoryFormData.budget_amount}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, budget_amount: e.target.value })}
                    placeholder="500.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set a monthly spending limit for this category
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setCategoryFormData({ name: '', description: '', budget_amount: '' });
                  }}
                  disabled={savingCategory}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !categoryFormData.name.trim()}
                  className="btn btn-primary flex-1"
                >
                  {savingCategory ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
