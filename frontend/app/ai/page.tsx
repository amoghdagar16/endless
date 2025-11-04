"use client";

import { useState } from "react";
import { api, COMPANY_ID } from "@/lib/api";

export default function AIConsolePage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // For now, fetch expenses and provide a local summary
      // In the future, this will call /rag/query
      const resp = await api.get<{ status: string; data: any[] }>(
        `/expenses/company/${COMPANY_ID}`
      );

      const expenses = resp.data || [];
      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0);

      // Simple local "AI" response
      const summary = `Based on your data:
- Total expenses recorded: ${totalExpenses}
- Total amount: $${totalAmount.toFixed(2)}
- Average expense: $${totalExpenses > 0 ? (totalAmount / totalExpenses).toFixed(2) : "0.00"}

Your query: "${query}"

(Note: This is a local summary. Full RAG query integration coming soon.)`;

      setAnswer(summary);
    } catch (error: any) {
      setAnswer(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Console</h1>
        <p className="text-gray-600 mt-1">Ask questions about your financial data</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Ask a Question</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Your Question</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What is my total spending this month?"
            />
          </div>

          <button
            onClick={handleAsk}
            disabled={loading || !query.trim()}
            className="btn btn-primary"
          >
            {loading ? "Thinking..." : "Ask AI"}
          </button>
        </div>
      </div>

      {answer && (
        <div className="card bg-green-50 border-green-200">
          <h3 className="font-semibold text-green-900 mb-3">AI Response</h3>
          <div className="text-sm text-green-800 whitespace-pre-wrap">
            {answer}
          </div>
        </div>
      )}

      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">AI Capabilities</h3>
        <p className="text-sm text-blue-800 mb-2">
          The AI console can help you understand your financial data:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Query expense trends and patterns</li>
          <li>Get spending insights by category or vendor</li>
          <li>Analyze financial health indicators</li>
          <li>Receive proactive recommendations</li>
        </ul>
        <p className="text-xs text-blue-700 mt-3">
          Note: Currently showing local summaries. Full RAG integration with vector search coming soon.
        </p>
      </div>
    </div>
  );
}
