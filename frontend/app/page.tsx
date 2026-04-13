'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'
import {
  BarChart3,
  Zap,
  Shield,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Building2,
  FileText,
  CreditCard,
  Brain,
  Sun,
  Moon,
  ChevronRight,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react'

/* ── Feature cards data ── */
const features = [
  {
    icon: BarChart3,
    title: 'Real-time P&L',
    body: 'Live profit & loss, balance sheet, and cash flow — always up to date as you record transactions.',
    accent: '#2563eb',
  },
  {
    icon: Brain,
    title: 'AI Financial Copilot',
    body: 'Ask anything about your finances in plain English. Powered by GPT-4 with your actual company data.',
    accent: '#7c3aed',
  },
  {
    icon: CreditCard,
    title: 'Bank sync via Plaid',
    body: 'Connect your bank accounts and reconcile transactions automatically. No CSV exports needed.',
    accent: '#059669',
  },
  {
    icon: FileText,
    title: 'Invoices & bills',
    body: 'Create professional invoices, manage vendor bills, and track every payment with double-entry precision.',
    accent: '#d97706',
  },
  {
    icon: Shield,
    title: 'Role-based access',
    body: 'Owner, admin, accountant, and viewer roles. Your team gets exactly the access they need — nothing more.',
    accent: '#dc2626',
  },
  {
    icon: TrendingUp,
    title: 'Market intelligence',
    body: 'Benchmark your performance against industry peers. Real-time insights powered by Perplexity AI.',
    accent: '#0891b2',
  },
]

const steps = [
  {
    num: '01',
    title: 'Connect your accounts',
    body: 'Link bank accounts via Plaid or upload a CSV. Your chart of accounts is ready in minutes.',
  },
  {
    num: '02',
    title: 'Record transactions',
    body: 'Create invoices, log bills, record payments. Double-entry handled automatically in the background.',
  },
  {
    num: '03',
    title: 'Get instant clarity',
    body: 'Your dashboard, reports, and AI copilot update in real time. Close the month in minutes, not days.',
  },
]

const trustedBy = ['Seed-stage startups', 'Bootstrapped SaaS', 'E-commerce brands', 'Agencies', 'Consultancies']

export default function RootPage() {
  const router = useRouter()
  const { user, company, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isDark = theme === 'dark'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (loading) return
    if (user && company) {
      // Treat null/undefined onboarding_completed as completed to avoid false redirects
      // Only send to /onboarding if explicitly false
      router.push(company.onboarding_completed === false ? '/onboarding' : '/new-dashboard')
    }
  }, [router, user, company, loading])

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (user && company) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen dot-grid" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── NAV ── */}
      <header
        className="sticky top-0 z-50 h-14 flex items-center"
        style={{
          backgroundColor: isDark ? 'rgba(9,9,11,0.92)' : 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid var(--border-color)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-6xl mx-auto w-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              Fintra
            </span>
          </Link>

          {/* Nav center — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6">
            {['Features', 'How it works', 'Pricing'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-sm transition-colors"
                style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="btn btn-icon btn-ghost"
              style={{ width: 32, height: 32 }}
            >
              {isDark
                ? <Sun className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
                : <Moon className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
              }
            </button>

            <Link href="/login" className="btn btn-ghost btn-sm no-underline"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm no-underline"
              style={{ textDecoration: 'none' }}>
              Get started
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Hero background glow — strong enough to be visible over the dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse 90% 60% at 50% -5%, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0.06) 50%, transparent 100%)'
              : 'radial-gradient(ellipse 90% 60% at 50% -5%, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.04) 50%, transparent 100%)',
          }}
        />
        {/* Secondary warm glow for depth */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-20%', left: '50%', transform: 'translateX(-50%)',
            width: 800, height: 500,
            background: isDark
              ? 'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 mb-6 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent)',
                border: '1px solid rgba(37,99,235,0.2)',
              }}
            >
              <Sparkles className="h-3 w-3" />
              AI-powered finance OS
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl font-bold mb-5 animate-fade-up"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.04em',
              lineHeight: '1.05',
              animationDelay: '80ms',
            }}
          >
            Financial clarity
            <br />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
              without the complexity.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg mb-8 max-w-xl mx-auto animate-fade-up"
            style={{ color: 'var(--text-secondary)', lineHeight: '1.65', animationDelay: '160ms' }}
          >
            The accounting platform that actually makes sense. AI-guided bookkeeping,
            bank sync, invoices, and reports — all in one clean workspace.
          </p>

          {/* CTA pair */}
          <div className="flex items-center justify-center gap-3 flex-wrap animate-fade-up" style={{ animationDelay: '240ms' }}>
            <Link href="/signup" className="btn btn-primary btn-lg no-underline" style={{ textDecoration: 'none' }}>
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg no-underline" style={{ textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>

          {/* Social proof micro-text */}
          <p className="mt-6 text-xs animate-fade-up" style={{ color: 'var(--text-muted)', animationDelay: '320ms' }}>
            No credit card required · Free to start · Takes 5 minutes to set up
          </p>
        </div>

        {/* ── Fake dashboard preview ── */}
        <div className="max-w-5xl mx-auto mt-16 relative animate-fade-up" style={{ animationDelay: '400ms' }}>
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              border: '1px solid var(--border-color)',
              boxShadow: isDark
                ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
          >
            {/* Window chrome */}
            <div
              className="flex items-center gap-1.5 px-4 py-3"
              style={{ backgroundColor: isDark ? '#18181b' : '#f4f4f5', borderBottom: '1px solid var(--border-color)' }}
            >
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              <div className="ml-3 flex-1 max-w-[180px] h-5 rounded"
                style={{ backgroundColor: isDark ? '#27272a' : '#e4e4e7', fontSize: 11, display: 'flex', alignItems: 'center', paddingLeft: 8, color: 'var(--text-muted)' }}>
                app.fintra.com
              </div>
            </div>

            {/* Dashboard mockup */}
            <div
              className="p-6 grid grid-cols-4 gap-4"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              {/* KPI cards */}
              {[
                { label: 'Revenue', val: '$84,200', change: '+12.4%', pos: true },
                { label: 'Expenses', val: '$41,800', change: '+3.1%', pos: false },
                { label: 'Net profit', val: '$42,400', change: '+24.1%', pos: true },
                { label: 'Cash on hand', val: '$128,900', change: '+6.7%', pos: true },
              ].map(kpi => (
                <div key={kpi.label} className="card" style={{ padding: '14px 16px' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{kpi.val}</p>
                  <p className="text-xs mt-1" style={{ color: kpi.pos ? 'var(--neon-emerald)' : '#ef4444' }}>{kpi.change}</p>
                </div>
              ))}

              {/* Chart placeholder */}
              <div className="card col-span-3" style={{ padding: '16px', minHeight: 120 }}>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Revenue vs Expenses — Last 6 months</p>
                <div className="flex items-end gap-2 h-16">
                  {[60, 75, 55, 80, 70, 90].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                      <div className="w-full rounded-sm" style={{ height: `${h * 0.6}%`, backgroundColor: 'var(--accent)', opacity: 0.8 }} />
                      <div className="w-full rounded-sm" style={{ height: `${h * 0.35}%`, backgroundColor: 'var(--neon-emerald)', opacity: 0.6 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent activity */}
              <div className="card" style={{ padding: '16px', minHeight: 120 }}>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Recent</p>
                {[
                  { name: 'Stripe payout', amt: '+$4,200' },
                  { name: 'AWS invoice', amt: '-$890' },
                  { name: 'Client invoice', amt: '+$12,000' },
                ].map(item => (
                  <div key={item.name} className="flex justify-between items-center py-1">
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: item.amt.startsWith('+') ? 'var(--neon-emerald)' : 'var(--text-primary)', fontWeight: 500 }}>{item.amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gradient fade at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, transparent, var(--bg-primary))`,
            }}
          />
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section className="py-10 px-6" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
          <p className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Trusted by teams at</p>
          <div className="flex flex-wrap items-center gap-4 md:gap-8">
            {trustedBy.map(name => (
              <span key={name} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section heading */}
          <div className="max-w-xl mb-14">
            <p className="text-xs font-medium mb-3 uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              Features
            </p>
            <h2 className="text-3xl font-semibold mb-3" style={{ letterSpacing: '-0.03em' }}>
              Everything finance teams need.
              <br />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Nothing they don't.</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: 15 }}>
              Built for founders, finance leads, and accountants who want accuracy without the overhead of enterprise software.
            </p>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* 1 — Real-time P&L */}
            <div className="card overflow-hidden cursor-default" style={{ borderRadius: 14 }}>
              <div className="p-5 pb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#2563eb14' }}>
                  <BarChart3 className="h-4 w-4" style={{ color: '#2563eb' }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Real-time P&L</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Live profit & loss, balance sheet, and cash flow — always current.</p>
              </div>
              {/* Mini P&L mockup */}
              <div className="mx-5 mb-5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Income Statement · Apr 2025</span>
                </div>
                {[
                  { label: 'Revenue', val: '$84,200', color: 'var(--neon-emerald)' },
                  { label: 'Cost of goods', val: '−$22,100', color: 'var(--text-secondary)' },
                  { label: 'Gross profit', val: '$62,100', color: 'var(--text-primary)', bold: true },
                  { label: 'Operating expenses', val: '−$19,700', color: 'var(--text-secondary)' },
                  { label: 'Net profit', val: '$42,400', color: '#2563eb', bold: true },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontWeight: row.bold ? 600 : 400 }}>{row.label}</span>
                    <span className="text-[10px] font-mono" style={{ color: row.color, fontWeight: row.bold ? 700 : 500 }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2 — AI Copilot */}
            <div className="card overflow-hidden cursor-default" style={{ borderRadius: 14 }}>
              <div className="p-5 pb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#7c3aed14' }}>
                  <Brain className="h-4 w-4" style={{ color: '#7c3aed' }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>AI Financial Copilot</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Ask anything in plain English. Answers from your actual data.</p>
              </div>
              {/* Mini chat mockup */}
              <div className="mx-5 mb-5 rounded-lg overflow-hidden space-y-2 p-3" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex justify-end">
                  <span className="text-[10px] px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: '#7c3aed', color: '#fff', maxWidth: '80%' }}>Why did expenses spike in March?</span>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="h-4 w-4 rounded flex-shrink-0 flex items-center justify-center mt-0.5" style={{ backgroundColor: '#7c3aed14' }}>
                    <Sparkles className="h-2.5 w-2.5" style={{ color: '#7c3aed' }} />
                  </div>
                  <span className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Payroll jumped $8,200 due to 2 new hires. Software spend also rose 34% — mostly AWS.</span>
                </div>
              </div>
            </div>

            {/* 3 — Bank sync */}
            <div className="card overflow-hidden cursor-default" style={{ borderRadius: 14 }}>
              <div className="p-5 pb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#05966914' }}>
                  <CreditCard className="h-4 w-4" style={{ color: '#059669' }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Bank sync via Plaid</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Connect accounts and reconcile automatically. No CSV exports.</p>
              </div>
              {/* Mini bank feed */}
              <div className="mx-5 mb-5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {[
                  { name: 'Stripe payout', amt: '+$12,400', matched: true },
                  { name: 'AWS invoice', amt: '−$4,200', matched: true },
                  { name: 'Gusto payroll', amt: '−$28,400', matched: false },
                ].map(tx => (
                  <div key={tx.name} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tx.matched ? 'var(--neon-emerald)' : '#f59e0b' }} />
                      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{tx.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: tx.amt.startsWith('+') ? 'var(--neon-emerald)' : 'var(--text-primary)' }}>{tx.amt}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>1 pending match</span>
                  <span className="text-[9px] font-semibold" style={{ color: '#059669' }}>Review →</span>
                </div>
              </div>
            </div>

            {/* 4 — Invoices & bills */}
            <div className="card overflow-hidden cursor-default" style={{ borderRadius: 14 }}>
              <div className="p-5 pb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#d9770614' }}>
                  <FileText className="h-4 w-4" style={{ color: '#d97706' }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Invoices & bills</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Send invoices, pay bills, track AR/AP with double-entry precision.</p>
              </div>
              {/* Mini invoice list */}
              <div className="mx-5 mb-5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {[
                  { num: 'INV-042', client: 'Acme Corp', amt: '$8,500', status: 'Sent', statusColor: '#2563eb' },
                  { num: 'INV-041', client: 'Beta LLC', amt: '$3,200', status: 'Paid', statusColor: '#059669' },
                  { num: 'INV-040', client: 'Gamma Inc', amt: '$12,000', status: 'Overdue', statusColor: '#dc2626' },
                ].map(inv => (
                  <div key={inv.num} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>{inv.client}</p>
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{inv.num}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{inv.amt}</p>
                      <p className="text-[9px] font-medium" style={{ color: inv.statusColor }}>{inv.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5 — Role-based access */}
            <div className="card overflow-hidden cursor-default" style={{ borderRadius: 14 }}>
              <div className="p-5 pb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#dc262614' }}>
                  <Shield className="h-4 w-4" style={{ color: '#dc2626' }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Role-based access</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Owner, admin, accountant, viewer. Everyone gets exactly what they need.</p>
              </div>
              {/* Mini team roster */}
              <div className="mx-5 mb-5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {[
                  { initials: 'AK', name: 'Aiden K.', role: 'Owner', color: '#2563eb' },
                  { initials: 'SR', name: 'Sara R.', role: 'Accountant', color: '#059669' },
                  { initials: 'JM', name: 'Jake M.', role: 'Viewer', color: 'var(--text-muted)' },
                ].map(m => (
                  <div key={m.name} className="flex items-center gap-2.5 px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="h-5 w-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: m.color }}>
                      {m.initials}
                    </div>
                    <span className="text-[10px] flex-1" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${m.color}18`, color: m.color, fontWeight: 600 }}>{m.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6 — Market intelligence */}
            <div className="card overflow-hidden cursor-default" style={{ borderRadius: 14 }}>
              <div className="p-5 pb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#0891b214' }}>
                  <TrendingUp className="h-4 w-4" style={{ color: '#0891b2' }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Market intelligence</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Benchmark against peers. Insights powered by Perplexity AI.</p>
              </div>
              {/* Mini benchmark mockup */}
              <div className="mx-5 mb-5 rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {[
                  { label: 'Gross margin', yours: 74, industry: 61 },
                  { label: 'Burn rate', yours: 42, industry: 55 },
                  { label: 'AR days', yours: 18, industry: 32 },
                ].map(b => (
                  <div key={b.label}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                      <span className="text-[9px] font-semibold" style={{ color: '#0891b2' }}>You: {b.yours}% · Avg: {b.industry}%</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-1.5 rounded-full flex-1" style={{ backgroundColor: 'var(--border-color)' }}>
                        <div className="h-full rounded-full" style={{ width: `${b.yours}%`, backgroundColor: '#0891b2' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="py-20 px-6"
        style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-14">
            <p className="text-xs font-medium mb-3 uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              How it works
            </p>
            <h2 className="text-3xl font-semibold" style={{ letterSpacing: '-0.03em' }}>
              Up and running{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>in under 10 minutes.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Step 1 — Connect */}
            <div className="card overflow-hidden" style={{ borderRadius: 14 }}>
              {/* Mini bank connect mockup */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-5 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', fontSize: 9, color: '#fff', fontWeight: 700 }}>🏦</div>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>Connect via Plaid</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(5,150,105,0.12)', color: '#059669', fontWeight: 600 }}>Secure</span>
                </div>
                {['Chase Checking ···4821', 'Mercury Business ···3302'].map(acct => (
                  <div key={acct} className="flex items-center gap-2 px-2 py-1.5 rounded mb-1" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--neon-emerald)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{acct}</span>
                    <CheckCircle2 className="h-3 w-3 ml-auto" style={{ color: 'var(--neon-emerald)' }} />
                  </div>
                ))}
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--accent)', letterSpacing: '0.06em' }}>01</p>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Connect your accounts</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>Link bank accounts via Plaid or upload a CSV. Chart of accounts ready in minutes.</p>
              </div>
            </div>

            {/* Step 2 — Record */}
            <div className="card overflow-hidden" style={{ borderRadius: 14 }}>
              {/* Mini journal entry mockup */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Auto-generated journal</p>
                <div className="rounded overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                  <div className="flex justify-between px-2 py-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                    <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>ACCOUNT</span>
                    <div className="flex gap-4">
                      <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>DEBIT</span>
                      <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>CREDIT</span>
                    </div>
                  </div>
                  {[
                    { acct: 'Accounts Receivable', debit: '$8,500', credit: '—' },
                    { acct: 'Revenue', debit: '—', credit: '$8,500' },
                  ].map(row => (
                    <div key={row.acct} className="flex justify-between items-center px-2 py-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{row.acct}</span>
                      <div className="flex gap-4">
                        <span className="text-[10px] font-mono w-10 text-right" style={{ color: row.debit !== '—' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.debit}</span>
                        <span className="text-[10px] font-mono w-10 text-right" style={{ color: row.credit !== '—' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.credit}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 px-2 py-1">
                    <CheckCircle2 className="h-3 w-3" style={{ color: 'var(--neon-emerald)' }} />
                    <span className="text-[9px] font-medium" style={{ color: 'var(--neon-emerald)' }}>Balanced</span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--accent)', letterSpacing: '0.06em' }}>02</p>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Record transactions</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>Invoices, bills, payments. Double-entry handled automatically in the background.</p>
              </div>
            </div>

            {/* Step 3 — Clarity */}
            <div className="card overflow-hidden" style={{ borderRadius: 14 }}>
              {/* Mini dashboard KPI mockup */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Live dashboard</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Revenue', val: '$84,200', up: true },
                    { label: 'Net profit', val: '$42,400', up: true },
                    { label: 'AR outstanding', val: '$18,500', up: false },
                    { label: 'Cash on hand', val: '$128,900', up: true },
                  ].map(kpi => (
                    <div key={kpi.label} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <p className="text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                      <p className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{kpi.val}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <ArrowRight className={`h-2.5 w-2.5 ${kpi.up ? 'rotate-[-45deg]' : 'rotate-45'}`} style={{ color: kpi.up ? 'var(--neon-emerald)' : '#f87171' }} />
                        <span className="text-[8px]" style={{ color: kpi.up ? 'var(--neon-emerald)' : '#f87171' }}>{kpi.up ? '+12%' : '+5%'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--accent)', letterSpacing: '0.06em' }}>03</p>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Get instant clarity</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>Dashboard, reports, and AI copilot update in real time. Close the month in minutes.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-medium mb-3 uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                Built for accuracy
              </p>
              <h2 className="text-3xl font-semibold mb-4" style={{ letterSpacing: '-0.03em' }}>
                Double-entry bookkeeping.
                <br />
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Done automatically.</span>
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Every invoice, bill, and payment automatically creates balanced journal entries.
                Your chart of accounts stays clean. Your accountant stays happy.
              </p>

              <div className="space-y-3">
                {[
                  'Automatic journal entries on every transaction',
                  'Real-time trial balance and financial statements',
                  'Bank reconciliation with one-click matching',
                  'Multi-user with role-based access control',
                  'Period close with lock dates to prevent backdating',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--neon-emerald)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/signup" className="btn btn-primary no-underline" style={{ textDecoration: 'none' }}>
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right — AI chat preview */}
            <div
              className="rounded-2xl p-1"
              style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Chat header */}
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}
              >
                <div
                  className="h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-subtle)' }}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Ask Fintra AI</span>
                <span className="ml-auto badge badge-success">Live</span>
              </div>

              {/* Chat messages */}
              <div className="p-4 space-y-3">
                <div className="flex justify-end">
                  <div
                    className="rounded-xl px-3 py-2 text-xs max-w-[80%]"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    What were my top 3 expenses last month?
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div
                    className="h-6 w-6 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-subtle)' }}
                  >
                    <Sparkles className="h-3 w-3" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div
                    className="rounded-xl px-3 py-2.5 text-xs"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', lineHeight: 1.6 }}
                  >
                    Your top 3 expenses in March were:
                    <br />
                    1. <strong>Payroll</strong> — $28,400 (67% of expenses)
                    <br />
                    2. <strong>AWS / Infrastructure</strong> — $4,200
                    <br />
                    3. <strong>Software & SaaS</strong> — $2,100
                    <br /><br />
                    <span style={{ color: 'var(--text-muted)' }}>Payroll is up 8% vs February. Want me to break it down further?</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div
                    className="rounded-xl px-3 py-2 text-xs max-w-[80%]"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    Yes, show me the payroll breakdown
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-2"
                  style={{ color: 'var(--text-muted)', fontSize: 11 }}
                >
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1 h-1 rounded-full animate-pulse"
                        style={{ backgroundColor: 'var(--text-muted)', animationDelay: `${i*0.2}s` }} />
                    ))}
                  </div>
                  Fintra is thinking...
                </div>
              </div>

              {/* Input */}
              <div className="px-4 pb-4">
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <span className="flex-1 text-xs" style={{ color: 'var(--text-muted)' }}>Ask about your finances...</span>
                  <button
                    className="h-6 w-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <ArrowRight className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-2xl px-10 py-16 text-center relative overflow-hidden"
            style={{
              backgroundColor: isDark ? '#111113' : '#09090b',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Subtle gradient bg */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(37,99,235,0.15), transparent)',
              }}
            />

            <div className="relative">
              <p className="text-xs font-medium mb-4 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Ready to simplify your accounting?
              </p>
              <h2
                className="text-4xl font-semibold mb-4 text-white"
                style={{ letterSpacing: '-0.04em', lineHeight: 1.15 }}
              >
                Start your free account today.
              </h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
                No spreadsheets. No confusing double-entry setup. No legacy software.<br />
                Just clear, accurate financials — powered by AI.
              </p>

              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="btn btn-lg no-underline"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: 'none',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="btn btn-lg no-underline"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.8)',
                    textDecoration: 'none',
                  }}
                >
                  Sign in
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 mt-8">
                {[
                  { icon: Lock, text: 'No credit card required' },
                  { icon: Globe, text: 'Free to start' },
                  { icon: Zap, text: '5-minute setup' },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-1.5">
                    <item.icon className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 px-6"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Fintra</span>
          </div>

          <div className="flex items-center gap-6">
            {['Terms', 'Privacy', 'Security'].map(link => (
              <Link key={link} href={`/${link.toLowerCase()}`} className="text-xs no-underline transition-colors"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                {link}
              </Link>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © 2026 Fintra. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
