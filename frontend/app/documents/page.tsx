"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface ParsedFields {
  vendor?: string;
  date?: string;
  amount?: string;
  description?: string;
  category?: string;
  memo?: string;
  confidence?: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedFields, setParsedFields] = useState<ParsedFields | null>(null);
  const [sampleText, setSampleText] = useState("");
  const [error, setError] = useState("");
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsedFields(null);
      setSampleText("");
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use AI-enhanced endpoint
      const resp = await api.postFormData<any>("/parse/ai", formData);

      setParsedFields(resp.parsed_fields || {});
      setSampleText(resp.sample_text || "");
      setAiEnhanced(resp.ai_enhanced || false);
      setMessage(resp.message || "");
    } catch (err: any) {
      setError(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftExpense = () => {
    if (parsedFields) {
      // Store AI-enhanced parsed fields in sessionStorage
      sessionStorage.setItem("draftExpense", JSON.stringify({
        vendor_name: parsedFields.vendor || "",
        amount: parsedFields.amount || "",
        date: parsedFields.date || new Date().toISOString().split('T')[0],
        category: parsedFields.category || "",
        memo: parsedFields.memo || parsedFields.description || "",
      }));
      router.push("/expenses");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Receipt</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI-powered OCR extracts and enhances expense data automatically
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-lg text-xs font-medium text-brand-700 dark:text-brand-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            OCR + AI
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Select File (PNG, JPG, PDF, CSV)</label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                cursor-pointer"
            />
          </div>

          {file && (
            <div className="text-sm text-gray-600">
              Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="btn btn-primary"
            aria-label="Upload and parse receipt"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {loading ? "Processing with AI..." : "Upload & Parse"}
          </button>

          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
              aiEnhanced
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
            }`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {parsedFields && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI-Enhanced Results</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {aiEnhanced ? "Cleaned and categorized by AI" : "Basic OCR extraction"}
              </p>
            </div>
            {parsedFields.confidence && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                parsedFields.confidence === 'high'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : parsedFields.confidence === 'medium'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  parsedFields.confidence === 'high' ? 'bg-green-500'
                  : parsedFields.confidence === 'medium' ? 'bg-yellow-500'
                  : 'bg-red-500'
                }`}></div>
                {parsedFields.confidence} confidence
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Vendor</div>
              <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 text-sm font-medium text-gray-900 dark:text-white">
                {parsedFields.vendor || "Not detected"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Amount</div>
              <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 text-sm font-medium text-gray-900 dark:text-white">
                {parsedFields.amount ? `$${parsedFields.amount}` : "Not detected"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Date</div>
              <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 text-sm font-medium text-gray-900 dark:text-white">
                {parsedFields.date || "Not detected"}
              </div>
            </div>

            {parsedFields.category && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Category</div>
                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800 text-sm font-medium text-brand-900 dark:text-brand-100">
                  {parsedFields.category}
                </div>
              </div>
            )}

            {parsedFields.memo && (
              <div className="md:col-span-2 space-y-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Memo</div>
                <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 text-sm text-gray-900 dark:text-white">
                  {parsedFields.memo}
                </div>
              </div>
            )}
          </div>

          {sampleText && (
            <div className="mt-4">
              <div className="label">Sample Text (first 500 chars)</div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono overflow-x-auto">
                {sampleText}
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleDraftExpense}
              className="btn btn-primary"
            >
              Draft Expense with These Fields
            </button>
          </div>
        </div>
      )}

      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Supported Formats</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Images: PNG, JPG (OCR extraction using EasyOCR)</li>
          <li>Documents: PDF (text and image extraction)</li>
          <li>Spreadsheets: CSV (structured data parsing)</li>
        </ul>
      </div>
    </div>
  );
}
