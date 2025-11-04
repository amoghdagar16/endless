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
          category: "",
          memo: draft.memo || "",
        });
        sessionStorage.removeItem("draftExpense");
        setMessage("Fields populated from parsed receipt!");
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <p className="text-gray-600 mt-1">Record and manage business expenses</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">New Expense</h2>

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
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">AI Suggestions</h3>
            <div className="text-sm space-y-1 text-blue-800">
              <div><strong>Vendor:</strong> {aiSuggestions.normalized_vendor}</div>
              <div><strong>Category:</strong> {aiSuggestions.category}</div>
              <div><strong>Memo:</strong> {aiSuggestions.memo}</div>
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            message.includes("Error") || message.includes("Issues")
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {message}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleRunAI}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? "Processing..." : "Run AI"}
          </button>
          {aiSuggestions && (
            <button
              onClick={handleApplySuggestions}
              className="btn btn-secondary"
            >
              Apply Suggestions
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary"
          >
            Save Expense
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Expenses (Last 20)</h2>
        <Table
          headers={["Date", "Vendor", "Amount", "Memo", "Status"]}
          rows={tableRows}
          emptyMessage="No expenses recorded yet"
        />
      </div>
    </div>
  );
}
