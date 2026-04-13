"use client";

import { useState, useEffect } from "react";
import Table from "@/components/Table";
import { api, COMPANY_ID } from "@/lib/api";

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

export default function ExpensesPage() {
  const [formData, setFormData] = useState<ExpenseFormData>({
    vendor_name: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    category: "",
    memo: "",
  });

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadExpenses();

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
      const resp = await api.get<{ status: string; data: any[] }>(
        `/expenses/company/${COMPANY_ID}`
      );
      setExpenses(resp.data || []);
    } catch (error) {
      console.error("Error loading expenses:", error);
    }
  };

  const handleRunAI = async () => {
    setLoading(true);
    setMessage("");
    try {
      const resp = await api.post<any>("/ai/overlook_expense", {
        company_id: COMPANY_ID,
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
      // For now, use a placeholder user_id - in production this would come from auth
      await api.post("/expenses/manual_entry", {
        company_id: COMPANY_ID,
        user_id: "00000000-0000-0000-0000-000000000000", // Placeholder
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
      await loadExpenses();
    } catch (error: any) {
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tableRows = expenses.slice(0, 20).map((exp) => [
    exp.bill_date,
    exp.vendors?.name || "Unknown",
    `$${exp.total_amount?.toFixed(2) || "0.00"}`,
    exp.memo || "-",
    exp.status || "draft",
  ]);

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
            <input
              type="text"
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Office Supplies"
            />
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
        <Table
          headers={["Date", "Vendor", "Amount", "Memo", "Status"]}
          rows={tableRows}
          emptyMessage="No expenses recorded yet. Create your first expense above!"
          emptyIcon={(
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        />
      </div>
    </div>
  );
}
