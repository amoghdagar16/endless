"use client";

import { useState, useEffect } from "react";
import Table from "@/components/Table";
import { api } from "@/lib/api";

export default function JournalsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const companies = await api.get('/companies/')
        if (companies.data && companies.data.length > 0) {
          setCompanyId(companies.data[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch company:', error)
      }
    }
    fetchCompany()
  }, []);

  useEffect(() => {
    if (companyId) {
      loadJournals();
    }
  }, [companyId]);

  const loadJournals = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/journals/company/${companyId}`);
      setJournals(response || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Journal Entries</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Double-entry accounting records</p>
          </div>
        </div>

        {error ? (
          <div className="m-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
            {error}
          </div>
        ) : journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No Journal Entries Yet</p>
            <p className="text-xs max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              Journal entries are created automatically when you record transactions.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {journals.map((journal) => (
              <div key={journal.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{journal.journal_number}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{journal.entry_date}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{journal.memo}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ${journal.total_debit?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs mt-1" style={{ color: journal.is_balanced ? 'var(--neon-emerald)' : '#f59e0b' }}>
                      {journal.is_balanced ? '✓ Balanced' : '⚠ Unbalanced'}
                    </div>
                  </div>
                </div>
                {journal.journal_lines && journal.journal_lines.length > 0 && (
                  <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Lines</div>
                    {journal.journal_lines.map((line: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs pl-2" style={{ color: 'var(--text-secondary)' }}>
                        <div>{line.accounts?.account_name || line.description}</div>
                        <div className="flex gap-6">
                          <div className="w-20 text-right">{line.debit > 0 ? `$${line.debit.toFixed(2)}` : '—'}</div>
                          <div className="w-20 text-right">{line.credit > 0 ? `$${line.credit.toFixed(2)}` : '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>About Journal Entries</h3>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              Journal entries follow double-entry accounting. Each transaction automatically creates:
            </p>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>· A debit entry for the expense category</li>
              <li>· A credit entry for the payment method</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
