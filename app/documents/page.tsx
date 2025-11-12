"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setParsedFields(null);
      setSampleText("");
      setError("");
      console.log("File selected:", selectedFile.name);
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
      // Simulate OCR processing for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Demo parsed data
      setParsedFields({
        vendor: "Sample Vendor",
        date: new Date().toISOString().split('T')[0],
        amount: "99.99",
        description: "Parsed from uploaded file",
        category: "Office Supplies",
        memo: `Extracted from ${file.name}`,
      });
      setAiEnhanced(true);
      setMessage("✨ Successfully parsed receipt! (Demo mode - OCR service integration pending)");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(`Upload failed: ${err.message}`);
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
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-neutral-700 rounded-lg cursor-pointer bg-white dark:bg-neutral-800 focus:outline-none hover:border-gray-400 dark:hover:border-neutral-600 file:cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 dark:file:bg-brand-900/30 file:text-brand-700 dark:file:text-brand-300 hover:file:bg-brand-100 dark:hover:file:bg-brand-900/50 transition-all"
            />
            {!file && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                no file selected
              </p>
            )}
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing with AI...
              </>
            ) : (
              "Upload & Parse"
            )}
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
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Vendor</label>
              <input
                type="text"
                value={parsedFields.vendor || ""}
                onChange={(e) => setParsedFields({ ...parsedFields, vendor: e.target.value })}
                className="w-full p-3 bg-white dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                placeholder="Enter vendor name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400 font-medium">$</span>
                <input
                  type="text"
                  value={parsedFields.amount || ""}
                  onChange={(e) => setParsedFields({ ...parsedFields, amount: e.target.value })}
                  className="w-full pl-7 pr-3 py-3 bg-white dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={parsedFields.date || ""}
                onChange={(e) => setParsedFields({ ...parsedFields, date: e.target.value })}
                className="w-full p-3 bg-white dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Category</label>
              <input
                type="text"
                value={parsedFields.category || ""}
                onChange={(e) => setParsedFields({ ...parsedFields, category: e.target.value })}
                className="w-full p-3 bg-white dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                placeholder="Enter category"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Memo</label>
              <textarea
                value={parsedFields.memo || ""}
                onChange={(e) => setParsedFields({ ...parsedFields, memo: e.target.value })}
                rows={3}
                className="w-full p-3 bg-white dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
                placeholder="Enter memo or description"
              />
            </div>
          </div>

          {sampleText && (
            <div className="mt-4">
              <div className="label">Sample Text (first 500 chars)</div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono overflow-x-auto">
                {sampleText}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-300 dark:bg-neutral-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed transition-all duration-200 font-medium"
              title="Journal entry creation coming soon"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Draft Expense with These Fields
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              💡 Expense creation will be enabled once journal entry functionality is implemented
            </p>
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
