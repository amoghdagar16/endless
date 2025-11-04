"use client";

import { useState, useEffect } from "react";
import Table from "@/components/Table";
import { api, COMPANY_ID } from "@/lib/api";

export default function JournalsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadJournals();
  }, []);

  const loadJournals = async () => {
    try {
      setLoading(true);
      // Note: If a specific journal endpoint exists, use it here
      // For now, we'll show a placeholder message
      setError("");
      // Placeholder: In a real app, you'd fetch from /journals/company/{company_id}
      setJournals([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading journals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Journals</h1>
        <p className="text-gray-600 mt-1">View journal entries and accounting records</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Journal Entries</h2>

        {error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : journals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Journal entries are automatically created when expenses are recorded.</p>
            <p className="text-sm mt-2">
              Note: Journal listing endpoint coming soon. Journals are being created in the background.
            </p>
          </div>
        ) : (
          <Table
            headers={["Date", "Description", "Debit", "Credit", "Status"]}
            rows={journals.map((j) => [
              j.entry_date,
              j.memo,
              j.debit ? `$${j.debit.toFixed(2)}` : "-",
              j.credit ? `$${j.credit.toFixed(2)}` : "-",
              j.status,
            ])}
            emptyMessage="No journal entries found"
          />
        )}
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">About Journal Entries</h3>
        <p className="text-sm text-blue-800">
          Journal entries follow double-entry accounting principles. Each expense automatically creates:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
          <li>A debit entry for the expense category</li>
          <li>A credit entry for the payment method</li>
        </ul>
      </div>
    </div>
  );
}
