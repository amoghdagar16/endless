"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface ParsedFields {
  vendor?: string;
  date?: string;
  amount?: string;
  description?: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedFields, setParsedFields] = useState<ParsedFields | null>(null);
  const [sampleText, setSampleText] = useState("");
  const [error, setError] = useState("");

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

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await api.postFormData<any>("/parse/", formData);

      setParsedFields(resp.parsed_fields || {});
      setSampleText(resp.sample_text || "");
    } catch (err: any) {
      setError(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftExpense = () => {
    if (parsedFields) {
      // Store parsed fields in sessionStorage
      sessionStorage.setItem("draftExpense", JSON.stringify({
        vendor_name: parsedFields.vendor || "",
        amount: parsedFields.amount || "",
        date: parsedFields.date || new Date().toISOString().split('T')[0],
        memo: parsedFields.description || "",
      }));
      router.push("/expenses");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Smart Parser</h1>
        <p className="text-gray-600 mt-1">Upload receipts and extract expense data automatically</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Upload Receipt</h2>

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
          >
            {loading ? "Processing..." : "Upload & Parse"}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {parsedFields && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Extracted Fields</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="label">Vendor</div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                {parsedFields.vendor || "Not detected"}
              </div>
            </div>

            <div>
              <div className="label">Amount</div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                {parsedFields.amount ? `$${parsedFields.amount}` : "Not detected"}
              </div>
            </div>

            <div>
              <div className="label">Date</div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                {parsedFields.date || "Not detected"}
              </div>
            </div>

            <div>
              <div className="label">Description</div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                {parsedFields.description || "Not detected"}
              </div>
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
