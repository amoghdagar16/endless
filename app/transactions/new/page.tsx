"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { simpleTransactions } from "@/lib/api";
import type { SimpleTransactionCreate } from "@/types";

export default function NewTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<SimpleTransactionCreate>({
    vendorName: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    amount: 0,
    description: '',
    reference: '',
  });

  const handleChange = (field: keyof SimpleTransactionCreate, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.vendorName.trim()) {
      setError('Vendor name is required');
      return;
    }
    
    if (!formData.date) {
      setError('Date is required');
      return;
    }
    
    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const transaction = await simpleTransactions.create({
        ...formData,
        reference: formData.reference || null,
      });
      
      // Redirect to transactions list
      router.push('/transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/transactions"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Transactions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">New Transaction</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter transaction details. An accountant will review and assign accounts.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Vendor Name */}
              <div>
                <label htmlFor="vendorName" className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="vendorName"
                  value={formData.vendorName}
                  onChange={(e) => handleChange('vendorName', e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Office Depot, Amazon, Starbucks"
                  autoComplete="off"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="amount"
                    value={formData.amount || ''}
                    onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Office supplies for Q4"
                  required
                />
              </div>

              {/* Reference (Optional) */}
              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  id="reference"
                  value={formData.reference || ''}
                  onChange={(e) => handleChange('reference', e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Invoice #12345"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end gap-4">
              <Link
                href="/transactions"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your transaction will be saved as a draft</li>
            <li>• An accountant will review and assign the appropriate accounts</li>
            <li>• Once reviewed, the transaction will be posted to your books</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
