"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyReady } from "@/hooks/useCompanyReady";
import { Loader2, Sparkles, Target, BarChart3, Globe, Zap, RefreshCw, TrendingUp } from "lucide-react";

interface InsightCard {
  title: string;
  content: string;
  category: "benchmark" | "growth" | "competitive" | "financial";
  icon: React.ReactNode;
}

const CACHE_KEY_PREFIX = 'ai_insights_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedInsights {
  insights: InsightCard[];
  accountCount: number;
  journalCount: number;
  timestamp: number;
}

export default function AIConsolePage() {
  const { user } = useAuth();
  const { companyId, companyLoading, companyMissing } = useCompanyReady();
  const canAccessAI = ["owner", "admin", "accountant"].includes((user?.role || "").toLowerCase());
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [accountCount, setAccountCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (companyId) {
      // Try to load from cache first
      const cached = loadFromCache(companyId);
      if (cached) {
        setInsights(cached.insights);
        setAccountCount(cached.accountCount);
        setJournalCount(cached.journalCount);
        setLastUpdated(new Date(cached.timestamp));
      } else {
        // No cache or expired, load fresh insights
        loadInsights();
      }
    }
  }, [companyId]);

  const loadFromCache = (companyId: string): CachedInsights | null => {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${companyId}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed: CachedInsights = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired (older than 24 hours)
      if (now - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error("Failed to load from cache:", error);
      return null;
    }
  };

  const saveToCache = (companyId: string, data: CachedInsights) => {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${companyId}`;
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save to cache:", error);
    }
  };

  const clearCache = () => {
    if (!companyId) return;
    const cacheKey = `${CACHE_KEY_PREFIX}${companyId}`;
    localStorage.removeItem(cacheKey);
  };

  const loadInsights = async (forceRefresh = false) => {
    if (!companyId) return;

    // If not forcing refresh, check cache first
    if (!forceRefresh) {
      const cached = loadFromCache(companyId);
      if (cached) {
        setInsights(cached.insights);
        setAccountCount(cached.accountCount);
        setJournalCount(cached.journalCount);
        setLastUpdated(new Date(cached.timestamp));
        return;
      }
    }

    setLoading(true);

    try {
      // Load multiple insights in parallel
      const [benchmarkResult, growthResult, competitiveResult] = await Promise.all([
        // Industry benchmarks
        api.post<{ answer: string; account_count: number; journal_count: number }>("/ai/query", {
          company_id: companyId,
          question: "What are the industry benchmarks for my business?"
        }).catch(() => null),

        // Growth recommendations
        api.post<{ answer: string; account_count: number; journal_count: number }>("/ai/query", {
          company_id: companyId,
          question: "How can I grow my business?"
        }).catch(() => null),

        // Online presence
        api.post<{ answer: string; account_count: number; journal_count: number }>("/ai/query", {
          company_id: companyId,
          question: "Can you find my online reviews and presence?"
        }).catch(() => null)
      ]);

      const newInsights: InsightCard[] = [];
      let newAccountCount = 0;
      let newJournalCount = 0;

      if (benchmarkResult) {
        newInsights.push({
          title: "Industry Benchmarks",
          content: benchmarkResult.answer,
          category: "benchmark",
          icon: <BarChart3 className="w-5 h-5" />
        });
        newAccountCount = benchmarkResult.account_count;
        newJournalCount = benchmarkResult.journal_count;
      }

      if (growthResult) {
        newInsights.push({
          title: "Growth Opportunities",
          content: growthResult.answer,
          category: "growth",
          icon: <TrendingUp className="w-5 h-5" />
        });
      }

      if (competitiveResult) {
        newInsights.push({
          title: "Online Presence & Reputation",
          content: competitiveResult.answer,
          category: "competitive",
          icon: <Globe className="w-5 h-5" />
        });
      }

      const now = Date.now();
      setInsights(newInsights);
      setAccountCount(newAccountCount);
      setJournalCount(newJournalCount);
      setLastUpdated(new Date(now));

      // Save to cache
      saveToCache(companyId, {
        insights: newInsights,
        accountCount: newAccountCount,
        journalCount: newJournalCount,
        timestamp: now
      });

    } catch (error: any) {
      console.error("Failed to load insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (companyLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (companyMissing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <Target className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Complete Onboarding First</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>Set up your company profile to unlock AI insights.</p>
        <Link href="/onboarding" className="btn btn-primary btn-sm">Complete onboarding</Link>
      </div>
    );
  }

  if (!canAccessAI) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <Target className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>AI Access Restricted</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Ask AI is available for owner, admin, and accountant roles only.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Sparkles className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              Powered by Perplexity AI
            </p>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Business Intelligence</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Web-powered insights about your industry, competitors, and growth opportunities.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Accounts</p>
              <p className="text-xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{accountCount || '—'}</p>
            </div>
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Journal Entries</p>
              <p className="text-xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{journalCount || '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          {loading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--accent)' }} />
              Loading fresh insights from AI...
            </div>
          ) : lastUpdated ? (
            <div className="flex items-center gap-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Last updated: {lastUpdated.toLocaleDateString()} at {lastUpdated.toLocaleTimeString()}
              </p>
              <span className="badge badge-success">Cached (24h)</span>
            </div>
          ) : (
            <div />
          )}

          <button
            onClick={() => { clearCache(); loadInsights(true); }}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            title="Clear cache and fetch fresh insights from AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Insights
          </button>
        </div>
      </div>

      {/* AI Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && insights.length === 0 ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="panel p-5 space-y-3">
              <div className="skeleton h-5 w-1/3 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-5/6 rounded" />
              <div className="skeleton h-4 w-4/6 rounded" />
            </div>
          ))
        ) : (
          insights.map((insight, idx) => (
            <div key={idx} className="panel overflow-hidden">
              <div className="panel-header">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    {insight.icon}
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{insight.title}</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {insight.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Info Card */}
      <div className="panel p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Need More Insights?</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          Use the <strong style={{ color: 'var(--text-primary)' }}>Fintra Copilot</strong> button (bottom right) to ask specific questions about your finances,
          competitors, growth strategies, or anything else.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {['"How can I reduce expenses?"', '"Find my competitors\' reviews"', '"What\'s my cash flow trend?"'].map(q => (
            <span key={q} className="px-3 py-1.5 text-xs rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
              {q}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
