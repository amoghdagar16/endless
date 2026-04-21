'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { useTheme } from '@/contexts/ThemeContext'
import {
  ArrowRight, ArrowLeft, CheckCircle2, Sun, Moon, Loader2,
  Building2, Briefcase, ShoppingCart, Stethoscope, Code2,
  Wrench, UtensilsCrossed, Home, Megaphone, GraduationCap,
  HelpCircle, Check,
} from 'lucide-react'
import { useRef } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: 'SaaS / Software',           label: 'SaaS / Software',       icon: Code2 },
  { value: 'E-commerce / Retail',       label: 'E-commerce',            icon: ShoppingCart },
  { value: 'Professional Services',     label: 'Professional Services', icon: Briefcase },
  { value: 'Healthcare',                label: 'Healthcare',            icon: Stethoscope },
  { value: 'Construction',              label: 'Construction',          icon: Wrench },
  { value: 'Food & Beverage',           label: 'Food & Beverage',       icon: UtensilsCrossed },
  { value: 'Real Estate',               label: 'Real Estate',           icon: Home },
  { value: 'Marketing / Advertising',   label: 'Marketing',             icon: Megaphone },
  { value: 'Education',                 label: 'Education',             icon: GraduationCap },
  { value: 'Other',                     label: 'Other',                 icon: HelpCircle },
]

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor',    desc: 'Just you, no formal structure' },
  { value: 'llc',             label: 'LLC',                desc: 'Limited liability company' },
  { value: 's_corp',          label: 'S-Corporation',      desc: 'Pass-through taxation' },
  { value: 'corporation',     label: 'C-Corporation',      desc: 'Separate legal entity' },
  { value: 'partnership',     label: 'Partnership',        desc: 'Two or more owners' },
  { value: 'other',           label: 'Not sure yet',       desc: 'I\'ll figure this out later' },
]

// Steps shown in left sidebar
const STEPS = [
  { num: 1, label: 'Business name' },
  { num: 2, label: 'Industry' },
  { num: 3, label: 'Business type' },
  { num: 4, label: 'Contact info' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [step, setStep] = useState(1)       // 1–4 = forms, 5 = done
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState('')
  const initialLoadDone = useRef(false)
  const onboardingDraftKey = user ? `fintra_onboarding_draft_${user.id}` : ''

  const [form, setForm] = useState({
    name: '',
    industry: '',
    business_type: '',
    email: '',
    phone: '',
    website: '',
    onboarding_completed: false,
    onboarding_step: 1,
  })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // Wait for auth to finish resolving before doing anything
    if (authLoading) return
    // Auth is settled — if no user, nothing to load
    if (!user) { setInitLoading(false); return }
    // Only run the company fetch once
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    const load = async () => {
      // Restore local draft immediately for fast, resilient reloads.
      if (onboardingDraftKey) {
        try {
          const raw = localStorage.getItem(onboardingDraftKey)
          if (raw) {
            const draft = JSON.parse(raw)
            if (draft?.form) {
              setForm(prev => ({ ...prev, ...draft.form }))
            }
            if (draft?.step) {
              setStep(Math.min(Math.max(Number(draft.step), 1), 4))
            }
          }
        } catch {
          // ignore invalid draft
        }
      }
      try {
        const res = await api.get('/companies/')
        if (res.data?.length > 0) {
          const co = res.data[0]
          // Already completed onboarding — send them straight to the dashboard
          if (co.onboarding_completed) { router.replace('/new-dashboard'); return }
          setCompanyId(co.id)
          setForm(prev => ({ ...prev, ...co }))
          if (co.onboarding_step) {
            setStep(prev => Math.max(prev, Math.min(Number(co.onboarding_step), 4)))
          }
        }
      } catch (e) { console.error(e) }
      finally { setInitLoading(false) }
    }
    load()
  }, [authLoading, user, onboardingDraftKey])

  useEffect(() => {
    if (!onboardingDraftKey || !mounted) return
    try {
      localStorage.setItem(
        onboardingDraftKey,
        JSON.stringify({
          step,
          form,
          ts: Date.now(),
        })
      )
    } catch {
      // ignore storage failures
    }
  }, [onboardingDraftKey, step, form, mounted])

  const set = useCallback((k: string, v: any) => {
    setForm(p => ({ ...p, [k]: v }))
    setError('')
  }, [])

  const canProceed = useCallback(() => {
    if (step === 1) return !!form.name.trim()
    if (step === 2) return !!form.industry
    if (step === 3) return !!form.business_type
    return true // step 4 is all optional
  }, [step, form])

  const save = async (targetStep: number, complete = false): Promise<boolean> => {
    setLoading(true); setError('')
    try {
      const raw = { ...form, onboarding_step: targetStep, onboarding_completed: complete }
      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      )
      if (companyId) {
        await api.patch(`/companies/${companyId}`, payload)
      } else {
        const normalizedName = (form.name || '').trim()
        if (normalizedName) {
          try {
            const lookupRes = await api.get<{ data?: Array<{ id: string; onboarding_completed?: boolean }> }>(
              '/companies/lookup',
              { name: normalizedName }
            )
            const existingCompany = lookupRes?.data?.[0]
            if (existingCompany?.id && user) {
              // Existing company already onboarded: join and continue directly to app.
              if (existingCompany.onboarding_completed) {
                await api.post('/companies/request-join', {
                  company_id: existingCompany.id,
                  company_name: normalizedName,
                  note: 'Requested from onboarding flow',
                })
                setError('Join request sent. An owner/admin will authorize your access by email.')
                return false
              }

              await api.patch(`/users/${user.id}`, { company_id: existingCompany.id })
              setCompanyId(existingCompany.id)
            }
          } catch {
            // Fallback to normal create flow if lookup fails.
          }
        }

        const res = await api.post('/companies/', payload)
        if (res.status === 'success' && res.data?.[0]?.id) {
          const id = res.data[0].id
          setCompanyId(id)
          if (user) await api.patch(`/users/${user.id}`, { company_id: id })
        } else throw new Error('Failed to create company')
      }
      return true
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to save. Please try again.')
      return false
    } finally { setLoading(false) }
  }

  const next = async () => {
    const ok = await save(step + 1)
    if (ok) setStep(s => s + 1)
  }

  const skip = async () => {
    setError('')
    const ok = await save(step + 1)
    if (ok) setStep(s => s + 1)
  }

  const prev = () => {
    setError('')
    setStep(s => Math.max(1, s - 1))
  }

  const finish = async () => {
    setFinishing(true)
    const ok = await save(5, true)
    if (ok) {
      if (user && companyId) {
        // Ensure the authenticated user row is linked to the onboarded company.
        // This prevents post-onboarding pages from failing auth-scoped company checks.
        try {
          await api.patch(`/users/${user.id}`, { company_id: companyId })
        } catch {
          // Non-fatal: company patch already tries to link user server-side.
        }
      }
      if (onboardingDraftKey) {
        try { localStorage.removeItem(onboardingDraftKey) } catch { /* ignore */ }
      }
      await refreshUser()
      router.replace('/new-dashboard')
    } else {
      setFinishing(false)
    }
  }

  const inp = `w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all`
  const inpStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  const userName = user?.full_name?.split(' ')[0] || 'there'

  if (!mounted || authLoading || initLoading) return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (step === 5) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--neon-emerald)' }} />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {form.name} is ready.
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your chart of accounts is being set up for {form.industry || 'your industry'}. This takes just a moment.
            </p>
          </div>

          <div className="space-y-2 text-left">
            {[
              { label: 'Chart of accounts provisioned', done: true },
              { label: 'Company profile saved', done: true },
              { label: 'AI copilot ready', done: true },
              { label: 'Reports & dashboards enabled', done: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                  <Check className="w-3 h-3" style={{ color: 'var(--neon-emerald)' }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
              </div>
            ))}
          </div>

          <button onClick={finish} disabled={finishing} className="btn btn-primary btn-lg w-full">
            {finishing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Taking you to your dashboard...</>
              : <>Go to dashboard <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    )
  }

  // ── Main layout ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* Theme toggle */}
      <button onClick={toggleTheme} className="fixed top-4 right-4 z-50 btn btn-secondary btn-icon"
        style={{ width: 36, height: 36 }}>
        {theme === 'dark'
          ? <Sun className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          : <Moon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
      </button>

      {/* ── Left sidebar ── */}
      <aside className="hidden md:flex flex-col w-72 flex-shrink-0 p-8 justify-between"
        style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>

        {/* Logo */}
        <div>
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent)' }}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Fintra</span>
          </div>

          <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
            Company setup
          </p>

          {/* Step list */}
          <div className="space-y-1">
            {STEPS.map(s => {
              const done = step > s.num
              const active = step === s.num
              return (
                <div key={s.num} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: done ? 'var(--neon-emerald)' : active ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: done || active ? '#fff' : 'var(--text-muted)',
                      border: done || active ? 'none' : '1px solid var(--border-color)',
                    }}>
                    {done ? <Check className="w-3 h-3" /> : s.num}
                  </div>
                  <span className="text-sm font-medium"
                    style={{ color: active ? 'var(--accent)' : done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          All fields except your business name are optional. You can update everything from your profile later.
        </p>
      </aside>

      {/* ── Right content ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-lg">

          {/* Mobile progress */}
          <div className="flex gap-1.5 mb-8 md:hidden">
            {STEPS.map(s => (
              <div key={s.num} className="flex-1 h-1 rounded-full"
                style={{
                  backgroundColor: step >= s.num ? 'var(--accent)' : 'var(--border-color)',
                  transition: 'background-color 0.3s',
                }} />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* ── Step 1: Business name ── */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Step 1 of 4</p>
                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  What's your business called?
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This will appear on your invoices and reports.
                </p>
              </div>

              <div>
                <input
                  className={inp}
                  style={{ ...inpStyle, fontSize: 18, fontWeight: 500, padding: '16px 20px' }}
                  placeholder="e.g. Acme Inc."
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canProceed() && next()}
                  autoFocus
                />
              </div>

              <button onClick={next} disabled={!canProceed() || loading}
                className="btn btn-primary btn-lg w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* ── Step 2: Industry ── */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Step 2 of 4</p>
                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  What industry are you in?
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  We'll pre-build your chart of accounts to match.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {INDUSTRIES.map(ind => {
                  const selected = form.industry === ind.value
                  return (
                    <button
                      key={ind.value}
                      onClick={() => set('industry', ind.value)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-color)'}`,
                        color: selected ? 'var(--accent)' : 'var(--text-primary)',
                      }}
                    >
                      <ind.icon className="w-4 h-4 flex-shrink-0" style={{ color: selected ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <span className="text-sm font-medium">{ind.label}</span>
                      {selected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={prev} className="btn btn-secondary">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={next} disabled={!canProceed() || loading} className="btn btn-primary flex-1">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
              <button onClick={skip} disabled={loading} className="w-full text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Skip for now
              </button>
            </div>
          )}

          {/* ── Step 3: Business type ── */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Step 3 of 4</p>
                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  How is your business structured?
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This helps us configure your tax settings correctly.
                </p>
              </div>

              <div className="space-y-2">
                {BUSINESS_TYPES.map(bt => {
                  const selected = form.business_type === bt.value
                  return (
                    <button
                      key={bt.value}
                      onClick={() => set('business_type', bt.value)}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-color)'}`,
                      }}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>{bt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{bt.desc}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{
                          border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-color)'}`,
                          backgroundColor: selected ? 'var(--accent)' : 'transparent',
                        }}>
                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={prev} className="btn btn-secondary">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={next} disabled={!canProceed() || loading} className="btn btn-primary flex-1">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
              <button onClick={skip} disabled={loading} className="w-full text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Skip for now
              </button>
            </div>
          )}

          {/* ── Step 4: Contact info ── */}
          {step === 4 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Step 4 of 4</p>
                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Last step — contact details
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  These appear on your invoices. All optional — you can add them later.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Business email</label>
                  <input className={inp} style={inpStyle} type="email" placeholder="hello@acme.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone number</label>
                  <input className={inp} style={inpStyle} type="tel" placeholder="+1 (555) 000-0000"
                    value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Website</label>
                  <input className={inp} style={inpStyle} type="url" placeholder="https://acme.com"
                    value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={prev} className="btn btn-secondary">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={finish} disabled={finishing || loading} className="btn btn-primary flex-1">
                  {finishing || loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your account...</>
                    : <>Finish setup <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
              <button onClick={finish} disabled={finishing} className="w-full text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {finishing ? 'Setting up...' : 'Skip and go to dashboard'}
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
