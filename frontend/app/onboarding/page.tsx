"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  industry?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setCompanyId } = useAuth();
  const [step, setStep] = useState<'select' | 'create'>('select');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const resp = await api.get<{ status: string; data: Company[] }>('/companies/');
      setCompanies(resp.data || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setCompanyId(companyId);
    router.push('/');
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const resp = await api.post<{ status: string; data: Company[] }>('/companies/', {
        name: companyName,
        industry: industry || 'General',
      });

      const newCompany = resp.data[0];
      setCompanyId(newCompany.id);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-950">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-950 p-4">
      <div className="card w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xl font-bold text-white">MiniBooks</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {step === 'select' ? 'Select your company' : 'Create a new company'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {step === 'select' 
              ? companies.length > 0 
                ? 'Choose a company to get started'
                : 'Create your first company to begin'
              : 'Set up your company details'
            }
          </p>
        </div>

        {step === 'select' ? (
          <div className="space-y-4">
            {companies.length > 0 ? (
              <>
                <div className="space-y-2">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company.id)}
                      className="w-full p-4 text-left bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{company.name}</div>
                          {company.industry && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{company.industry}</div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                  <button
                    onClick={() => setStep('create')}
                    className="btn btn-secondary w-full"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create new company
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <button
                  onClick={() => setStep('create')}
                  className="btn btn-primary"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create your first company
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateCompany} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc"
                required
              />
            </div>

            <div>
              <label className="label">Industry (Optional)</label>
              <select
                className="input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Select industry</option>
                <option value="Technology">Technology</option>
                <option value="Retail">Retail</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Services">Services</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="btn btn-secondary flex-1"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={creating}
                className="btn btn-primary flex-1"
              >
                {creating ? 'Creating...' : 'Create company'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
