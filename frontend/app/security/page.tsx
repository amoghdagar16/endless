'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Lock, Database, EyeOff } from 'lucide-react'

export default function Security() {
  return (
    <div className="min-h-screen dot-grid" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mb-10 text-sm no-underline"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Fintra
        </Link>

        <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>Security</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
          How Fintra protects your data in web and installed PWA modes.
        </p>

        <div className="space-y-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}>
          <section>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ShieldCheck className="h-4 w-4" /> Platform Security
            </h2>
            <p>
              Fintra enforces authenticated access for all company-scoped data, with role-based authorization checks on both UI and API routes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Lock className="h-4 w-4" /> Transport & Session Security
            </h2>
            <p>
              Sessions are managed through Supabase Auth with secure token refresh and route-level redirects for protected pages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Database className="h-4 w-4" /> Data Isolation
            </h2>
            <p>
              Company data is isolated by policy and scoped by authenticated user identity to prevent cross-company access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <EyeOff className="h-4 w-4" /> Caching in PWA Mode
            </h2>
            <p>
              Dynamic API payloads are fetched network-only in PWA mode to avoid stale cached responses for authenticated, company-specific features.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
