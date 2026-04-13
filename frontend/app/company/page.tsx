'use client'

import { motion } from 'framer-motion'
import { Sparkles, Zap, Layers3, BookOpen, Shield, BarChart3 } from 'lucide-react'

const pillars = [
  {
    title: 'Living Ledger',
    description: 'Real-time journal entries with automatic double-entry validation. AI-assisted categorization and smart reconciliation workflows.',
    icon: Layers3
  },
  {
    title: 'Neural Copilot',
    description: 'Contextual AI that analyzes your chart of accounts, identifies anomalies, and surfaces actionable insights for financial decisions.',
    icon: Sparkles
  },
  {
    title: 'Unified Surfaces',
    description: 'Seamless integration between accounting, reporting, and collaboration. One interface for your entire finance workflow.',
    icon: Zap
  }
]

const capabilities = [
  {
    title: 'Journal Management',
    description: 'Create, review, and post journal entries with full audit trail support.',
    icon: BookOpen
  },
  {
    title: 'Financial Reports',
    description: 'Generate balance sheets, income statements, and cash flow reports on demand.',
    icon: BarChart3
  },
  {
    title: 'Compliance Ready',
    description: 'Built-in controls and validations to maintain GAAP compliance.',
    icon: Shield
  }
]

export default function CompanyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ color: 'var(--text-primary)' }}>
      <div className="relative z-10 px-6 lg:px-16 py-16 space-y-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <p
            className="text-xs uppercase tracking-[0.5em] mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            About Fintra Finance OS
          </p>
          <h1 className="text-4xl lg:text-5xl font-semibold leading-tight mb-6">
            Modern accounting infrastructure for{' '}
            <span className="text-gradient-neon">growing businesses</span>
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Fintra Finance OS combines traditional accounting principles with AI-powered automation.
            Manage your chart of accounts, journal entries, and financial reports in one
            unified platform designed for clarity and control.
          </p>
        </motion.div>

        {/* Core Pillars */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Core Platform</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((pillar, idx) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="panel p-6 space-y-4"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(37,99,235,0.2)' }}
                >
                  <pillar.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{pillar.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {capabilities.map((cap, idx) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className="rounded-xl p-5 space-y-3"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <cap.icon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                <h3 className="font-semibold">{cap.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {cap.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tech Stack Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="panel p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)'
          }}
        >
          <h2 className="text-xl font-semibold">Built With</h2>
          <div className="flex flex-wrap gap-3">
            {['Next.js', 'FastAPI', 'Supabase', 'OpenAI', 'TypeScript', 'Tailwind CSS'].map(tech => (
              <span
                key={tech}
                className="badge badge-neutral px-3 py-1 text-sm"
                style={{
                  backgroundColor: 'var(--bg-muted)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            A modern full-stack architecture combining React frontend with Python backend,
            connected to Supabase for real-time data and authentication.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
