'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
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

        <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>Last updated: April 2026</p>

        <div className="space-y-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>1. Acceptance of Terms</h2>
            <p>By accessing or using Fintra ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>2. Description of Service</h2>
            <p>Fintra is an AI-powered accounting and financial management platform designed for small and medium-sized businesses. The Service includes features such as invoicing, expense tracking, bank reconciliation, journal entries, and AI-assisted financial insights.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>3. Account Registration</h2>
            <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information during registration.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Transmit fraudulent, misleading, or inaccurate financial data</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>5. Data & Privacy</h2>
            <p>Your use of the Service is also governed by our <Link href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>. By using the Service, you consent to the collection and use of your data as described therein.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>6. Intellectual Property</h2>
            <p>All content, features, and functionality of the Service — including but not limited to software, text, graphics, and logos — are owned by Fintra and are protected by intellectual property laws.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>7. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. Fintra does not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. Financial data and AI-generated insights are provided for informational purposes only and do not constitute professional financial or accounting advice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Fintra shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>9. Termination</h2>
            <p>We reserve the right to suspend or terminate your access to the Service at any time for violations of these Terms or for any other reason at our sole discretion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>11. Contact</h2>
            <p>For questions about these Terms, please contact us at <a href="mailto:legal@fintra.app" style={{ color: 'var(--accent)' }}>legal@fintra.app</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
