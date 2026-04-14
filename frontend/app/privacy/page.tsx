'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function Privacy() {
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

        <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>Last updated: April 2026</p>

        <div className="space-y-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>1. Information We Collect</h2>
            <p>We collect information you provide directly, including:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Account information (name, email, password)</li>
              <li>Business information (company name, industry, financial data)</li>
              <li>Usage data (features used, actions taken within the app)</li>
              <li>Connected account data (bank transactions via Plaid, if enabled)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide, operate, and improve the Service</li>
              <li>Generate AI-powered financial insights specific to your business</li>
              <li>Send service-related communications (account confirmations, security alerts)</li>
              <li>Detect and prevent fraud or unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>3. Data Storage & Security</h2>
            <p>Your data is stored securely using Supabase (PostgreSQL) with row-level security policies ensuring strict company-level data isolation. All data is encrypted in transit via TLS and at rest. We implement role-based access controls so only authorized users within your organization can access your financial data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>4. Third-Party Services</h2>
            <p>We use the following third-party services to operate Fintra:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong style={{ color: 'var(--text-primary)' }}>Supabase</strong> — authentication and database</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Plaid</strong> — bank account connectivity (only if you connect a bank)</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>OpenAI</strong> — AI-powered insights and receipt parsing</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Perplexity</strong> — market intelligence and industry benchmarks</li>
            </ul>
            <p className="mt-2">Each provider has their own privacy policy governing their use of data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>5. Data Sharing</h2>
            <p>We do not sell your personal or financial data to third parties. We only share data with service providers as necessary to operate the Service, and only under strict confidentiality obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your financial data at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>7. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Upon account deletion, your data is removed within 30 days, except where retention is required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>8. Cookies</h2>
            <p>We use minimal cookies strictly necessary for authentication and session management. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or an in-app notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>10. Contact</h2>
            <p>For privacy-related questions or requests, contact us at <a href="mailto:privacy@fintra.app" style={{ color: 'var(--accent)' }}>privacy@fintra.app</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
