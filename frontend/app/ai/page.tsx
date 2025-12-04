"use client";

import { useState } from "react";
import { api, COMPANY_ID } from "@/lib/api";

export default function AIConsolePage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<{ expense_count?: number; total_amount?: number } | null>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setMetadata(null);

    try {
      const resp = await api.post<{ answer: string; expense_count: number; total_amount?: number }>(
        "/ai/query",
        {
          company_id: COMPANY_ID,
          question: query,
        }
      );

      setAnswer(resp.answer);
      setMetadata({
        expense_count: resp.expense_count,
        total_amount: resp.total_amount,
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message;
      if (errorMsg.includes("OPENAI_API_KEY")) {
        setError("AI assistant requires OpenAI API key. Please configure OPENAI_API_KEY in your backend .env file.");
      } else {
        setError(`Error: ${errorMsg}`);
      }
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="What is my total spending this month?"
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Cmd/Ctrl + Enter to submit
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAsk}
              disabled={loading || !query.trim()}
              className="btn btn-primary"
            >
              {loading ? "Thinking..." : "Ask AI"}
            </button>
            {!loading && !query && (
              <>
                <button
                  onClick={() => setQuery("What's my biggest expense this month?")}
                  className="btn btn-secondary text-xs"
                >
                  Quick: Biggest expense?
                </button>
                <button
                  onClick={() => setQuery("Which vendor am I spending the most with?")}
                  className="btn btn-secondary text-xs"
                >
                  Quick: Top vendor?
                </button>
                <button
                  onClick={() => setQuery("Any suggestions to reduce my costs?")}
                  className="btn btn-secondary text-xs"
                >
                  Quick: Cost savings?
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {answer && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-green-900">AI Accountant Response</h3>
            {metadata && (
              <div className="text-xs text-green-700">
                Based on {metadata.expense_count} expense{metadata.expense_count !== 1 ? 's' : ''}
                {metadata.total_amount !== undefined && ` • $${metadata.total_amount.toFixed(2)} total`}
              </div>
            )}
          </div>
          <div className="text-sm text-green-800 whitespace-pre-wrap leading-relaxed">
            {answer}
          </div>
        </div>
      )}

      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Your AI Accountant Companion</h3>
        <p className="text-sm text-blue-800 mb-3">
          Ask me anything about your financial data! I'm powered by OpenAI and can help you:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Analyze spending patterns and trends</li>
          <li>Identify top vendors and categories</li>
          <li>Get insights on cost-saving opportunities</li>
          <li>Understand cash flow and budget allocation</li>
          <li>Receive personalized financial recommendations</li>
        </ul>
        <div className="mt-4 pt-4 border-t border-blue-300">
          <p className="text-xs text-blue-700 font-medium mb-2">Example questions:</p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• "What's my biggest expense category this month?"</li>
            <li>• "Which vendor am I spending the most with?"</li>
            <li>• "Are my expenses trending up or down?"</li>
            <li>• "What's my average daily spending?"</li>
            <li>• "Any suggestions to reduce costs?"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
