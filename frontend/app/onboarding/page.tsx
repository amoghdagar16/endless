'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { useTheme } from '@/contexts/ThemeContext'
import { Building2, Users, TrendingUp, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Sun, Moon } from 'lucide-react'

const INDUSTRIES = [
  'SaaS / Software',
  'E-commerce / Retail',
  'Professional Services',
  'Healthcare',
  'Manufacturing',
  'Food & Beverage',
  'Real Estate',
  'Construction',
  'Marketing / Advertising',
  'Education',
  'Consulting',
  'Other'
]

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 's_corp', label: 'S-Corporation' },
  { value: 'corporation', label: 'C-Corporation' },
  { value: 'partnership', label: 'Partnership' }
]

const GROWTH_STAGES = [
  { value: 'startup', label: 'Startup (0-2 years)', description: 'Just getting started' },
  { value: 'growth', label: 'Growth (2-5 years)', description: 'Scaling up' },
  { value: 'mature', label: 'Mature (5+ years)', description: 'Established business' },
  { value: 'enterprise', label: 'Enterprise', description: 'Large organization' }
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

const STEP_INFO = [
  { title: 'Company Basics', subtitle: 'Tell us about your business', icon: Building2 },
  { title: 'Business Profile', subtitle: 'Help us understand your size', icon: Users },
  { title: 'Market Context', subtitle: 'Enable AI-powered insights', icon: TrendingUp },
  { title: 'All Set!', subtitle: 'Your profile is complete', icon: CheckCircle2 }
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, company: authCompany, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [step, setStep] = useState(0) // 0 = landing, 1–4 = form steps
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [companyId, setCompanyId] = useState('')
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    // Step 1: Company Basics
    name: '',
    industry: '',
    website: '',
    location_city: '',
    location_state: '',
    location_country: 'USA',

    // Step 2: Business Profile
    business_type: '',
    founded_year: new Date().getFullYear(),
    employee_count: 1,
    annual_revenue: 0,

    // Step 3: Market Context
    growth_stage: '',
    target_market: 'B2B',
    primary_products: [] as string[],
    competitors: [] as string[],

    // Tracking
    onboarding_completed: false,
    onboarding_step: 1
  })

  const [productInput, setProductInput] = useState('')
  const [competitorInput, setCompetitorInput] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const response = await api.get('/companies/')
        if (response.data && response.data.length > 0) {
          const company = response.data[0]
          if (company.onboarding_completed) {
            router.replace('/new-dashboard')
            return
          }
          setCompanyId(company.id)
          setFormData(prev => ({
            ...prev,
            ...company,
            primary_products: company.primary_products || [],
            competitors: company.competitors || []
          }))
          if (!company.onboarding_completed && company.onboarding_step) {
            setStep(Math.min(company.onboarding_step, 3))
          }
        } else if (authCompany?.id) {
          // Auth has company but API returned [] (e.g. race) — use auth company so we PATCH, not POST
          setCompanyId(authCompany.id)
          setFormData(prev => ({
            ...prev,
            ...authCompany,
            primary_products: authCompany.primary_products || [],
            competitors: authCompany.competitors || []
          }))
        }
        // No company = first time; stay on step 0 (landing)
      } catch (error) {
        console.error('Failed to load company data:', error)
        if (authCompany?.id) {
          setCompanyId(authCompany.id)
        }
      } finally {
        setInitialLoading(false)
      }
    }

    if (user) {
      loadCompanyData()
    } else {
      setInitialLoading(false)
    }
  }, [user, authCompany?.id])

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('') // Clear errors on input change
  }, [])

  const addProduct = useCallback(() => {
    if (productInput.trim()) {
      setFormData(prev => ({
        ...prev,
        primary_products: [...prev.primary_products, productInput.trim()]
      }))
      setProductInput('')
    }
  }, [productInput])

  const removeProduct = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      primary_products: prev.primary_products.filter((_, i) => i !== index)
    }))
  }, [])

  const addCompetitor = useCallback(() => {
    if (competitorInput.trim()) {
      setFormData(prev => ({
        ...prev,
        competitors: [...prev.competitors, competitorInput.trim()]
      }))
      setCompetitorInput('')
    }
  }, [competitorInput])

  const removeCompetitor = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }))
  }, [])

  const saveProgress = async (
    targetStep: number,
    isComplete: boolean = false
  ): Promise<{ success: boolean; companyId?: string }> => {
    try {
      setLoading(true)
      setError('')

      const updateData = {
        ...formData,
        onboarding_step: targetStep,
        onboarding_completed: isComplete
      }

      // Use existing company if we have it (auth or state) so we always PATCH, never create a duplicate
      const existingId = companyId || authCompany?.id
      let resolvedCompanyId: string | undefined = existingId || undefined

      if (existingId) {
        await api.patch(`/companies/${existingId}`, updateData)
        resolvedCompanyId = existingId
        if (!companyId) setCompanyId(existingId)
      } else {
        // POST auto-links user to company on the backend
        const response = await api.post('/companies/', updateData)
        const data = response?.data
        if (response?.status === 'success' && Array.isArray(data) && data.length > 0) {
          const newCompanyId = data[0].id
          if (!newCompanyId) throw new Error('Company created but no id returned')
          setCompanyId(newCompanyId)
          resolvedCompanyId = newCompanyId
        } else {
          throw new Error(typeof response?.detail === 'string' ? response.detail : 'Failed to create company')
        }
      }

      return { success: true, companyId: resolvedCompanyId }
    } catch (error: any) {
      console.error('Failed to save progress:', error)
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg || String(detail) : detail
      setError(message || error?.message || 'Failed to save. Please try again.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const startOnboarding = () => {
    setStep(1)
    setError('')
  }

  const nextStep = async () => {
    const nextStepNum = step + 1
    setStep(nextStepNum)

    const result = await saveProgress(nextStepNum)
    if (!result.success) {
      setStep(step)
    }
  }

  const prevStep = () => {
    if (step === 1) {
      setStep(0) // Back to landing
    } else {
      setStep(step - 1)
    }
    setError('')
  }

  const completeOnboarding = async () => {
    setLoading(true)
    const result = await saveProgress(4, true)
    if (result.success) {
      await refreshUser()
      router.push('/new-dashboard')
    }
    setLoading(false)
  }

  const canProceed = useCallback(() => {
    if (step === 0) return true
    switch (step) {
      case 1:
        return !!(formData.name && formData.industry && formData.location_city && formData.location_state)
      case 2:
        return !!(formData.business_type && formData.growth_stage)
      case 3:
      case 4:
        return true
      default:
        return false
    }
  }, [step, formData])

  const StepIcon = step >= 1 ? (STEP_INFO[step - 1]?.icon || Building2) : Building2

  if (!mounted || initialLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--neon-emerald)' }}></div>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--neon-cyan)', animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--neon-fuchsia)', animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Neon background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/4 h-96 w-96 rounded-full blur-[200px] transition-opacity duration-500"
          style={{ backgroundColor: 'var(--neon-fuchsia)', opacity: 'var(--glow-opacity)' }}
        />
        <div
          className="absolute top-1/3 right-0 h-80 w-80 rounded-full blur-[180px] transition-opacity duration-500"
          style={{ backgroundColor: 'var(--neon-cyan)', opacity: 'var(--glow-opacity)' }}
        />
        <div
          className="absolute bottom-10 left-10 h-72 w-72 rounded-full blur-[160px] transition-opacity duration-500"
          style={{ backgroundColor: 'var(--neon-emerald)', opacity: 'var(--glow-opacity)' }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg transition-colors z-50"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" style={{ color: 'var(--neon-cyan)' }} />
        ) : (
          <Moon className="w-5 h-5" style={{ color: 'var(--neon-fuchsia)' }} />
        )}
      </button>

      <div
        className="max-w-2xl w-full rounded-2xl backdrop-blur-xl p-8 md:p-10 relative z-10 border transition-all"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          boxShadow: theme === 'dark'
            ? '0 0 60px rgba(217, 70, 239, 0.15), 0 0 100px rgba(34, 211, 238, 0.1)'
            : '0 20px 60px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Step 0: Onboarding landing page */}
        {step === 0 && (
          <div className="text-center py-6">
            <div
              className="inline-flex p-4 rounded-2xl mb-6"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(34, 211, 238, 0.15)',
                border: '1px solid var(--neon-cyan)'
              }}
            >
              <Building2 className="w-12 h-12" style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Set up your company
            </h1>
            <p className="text-base mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
              A few quick steps to connect your business to Endless. We’ll link your account and company so you can use the full app.
            </p>
            <button
              type="button"
              onClick={startOnboarding}
              className="px-8 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(90deg, var(--neon-fuchsia), var(--neon-cyan))',
                boxShadow: '0 10px 40px rgba(217, 70, 239, 0.3)'
              }}
            >
              Get started
            </button>
          </div>
        )}

        {/* Steps 1–4: Form */}
        {step >= 1 && (
          <>
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{
                  background: i <= step
                    ? 'linear-gradient(90deg, var(--neon-cyan), var(--neon-fuchsia))'
                    : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(34, 211, 238, 0.15)',
                border: '1px solid var(--neon-cyan)'
              }}
            >
              <StepIcon className="w-6 h-6" style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {STEP_INFO[step - 1]?.title}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Step {step} of 4 • {STEP_INFO[step - 1]?.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-6 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ef4444'
            }}
          >
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Company Name <span style={{ color: 'var(--neon-fuchsia)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Acme Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Website <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional - improves AI accuracy)</span>
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Industry <span style={{ color: 'var(--neon-fuchsia)' }}>*</span>
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    City <span style={{ color: 'var(--neon-fuchsia)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location_city}
                    onChange={(e) => handleInputChange('location_city', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="San Francisco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    State <span style={{ color: 'var(--neon-fuchsia)' }}>*</span>
                  </label>
                  <select
                    value={formData.location_state}
                    onChange={(e) => handleInputChange('location_state', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">State</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Your location helps us provide relevant industry benchmarks and tax information. Adding your website helps our AI identify your business accurately for online presence insights.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Business Type <span style={{ color: 'var(--neon-fuchsia)' }}>*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BUSINESS_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleInputChange('business_type', type.value)}
                      className="p-3 rounded-lg text-sm font-medium transition-all text-left"
                      style={{
                        backgroundColor: formData.business_type === type.value
                          ? theme === 'dark' ? 'rgba(34, 211, 238, 0.15)' : 'rgba(34, 211, 238, 0.2)'
                          : 'var(--bg-primary)',
                        border: formData.business_type === type.value
                          ? '1px solid var(--neon-cyan)'
                          : '1px solid var(--border-color)',
                        color: formData.business_type === type.value
                          ? 'var(--neon-cyan)'
                          : 'var(--text-primary)'
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Founded Year</label>
                  <input
                    type="number"
                    value={formData.founded_year}
                    onChange={(e) => handleInputChange('founded_year', parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Employees</label>
                  <input
                    type="number"
                    value={formData.employee_count}
                    onChange={(e) => handleInputChange('employee_count', parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Annual Revenue (USD)</label>
                <input
                  type="number"
                  value={formData.annual_revenue || ''}
                  onChange={(e) => handleInputChange('annual_revenue', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="100000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Growth Stage <span style={{ color: 'var(--neon-fuchsia)' }}>*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GROWTH_STAGES.map(stage => (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => handleInputChange('growth_stage', stage.value)}
                      className="p-3 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: formData.growth_stage === stage.value
                          ? theme === 'dark' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(52, 211, 153, 0.2)'
                          : 'var(--bg-primary)',
                        border: formData.growth_stage === stage.value
                          ? '1px solid var(--neon-emerald)'
                          : '1px solid var(--border-color)'
                      }}
                    >
                      <div className="text-sm font-medium" style={{
                        color: formData.growth_stage === stage.value ? 'var(--neon-emerald)' : 'var(--text-primary)'
                      }}>
                        {stage.label}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stage.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div
                className="p-4 rounded-lg mb-4"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(217, 70, 239, 0.1)' : 'rgba(217, 70, 239, 0.1)',
                  border: '1px solid var(--neon-fuchsia)'
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--neon-fuchsia)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--neon-fuchsia)' }}>AI-Powered Insights</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This optional step unlocks personalized competitor analysis and growth recommendations.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Target Market</label>
                <div className="grid grid-cols-3 gap-2">
                  {['B2B', 'B2C', 'B2B2C'].map(market => (
                    <button
                      key={market}
                      type="button"
                      onClick={() => handleInputChange('target_market', market)}
                      className="p-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: formData.target_market === market
                          ? theme === 'dark' ? 'rgba(34, 211, 238, 0.15)' : 'rgba(34, 211, 238, 0.2)'
                          : 'var(--bg-primary)',
                        border: formData.target_market === market
                          ? '1px solid var(--neon-cyan)'
                          : '1px solid var(--border-color)',
                        color: formData.target_market === market ? 'var(--neon-cyan)' : 'var(--text-primary)'
                      }}
                    >
                      {market}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Products/Services <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addProduct())}
                    className="flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="e.g., Cloud software, Consulting"
                  />
                  <button
                    type="button"
                    onClick={addProduct}
                    className="px-4 py-3 rounded-lg font-medium transition-all"
                    style={{
                      background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-fuchsia))',
                      color: 'white'
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.primary_products.map((product, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(34, 211, 238, 0.15)',
                        color: 'var(--neon-cyan)',
                        border: '1px solid var(--neon-cyan)'
                      }}
                    >
                      {product}
                      <button onClick={() => removeProduct(i)} className="hover:opacity-70">&times;</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Competitors <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional - for AI analysis)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
                    className="flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="e.g., Competitor Inc."
                  />
                  <button
                    type="button"
                    onClick={addCompetitor}
                    className="px-4 py-3 rounded-lg font-medium transition-all"
                    style={{
                      background: 'linear-gradient(135deg, var(--neon-emerald), var(--neon-cyan))',
                      color: 'white'
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.competitors.map((competitor, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(52, 211, 153, 0.15)',
                        color: 'var(--neon-emerald)',
                        border: '1px solid var(--neon-emerald)'
                      }}
                    >
                      {competitor}
                      <button onClick={() => removeCompetitor(i)} className="hover:opacity-70">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="flex justify-center">
                <div
                  className="p-5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-emerald), var(--neon-cyan))',
                    boxShadow: theme === 'dark' ? '0 0 40px rgba(52, 211, 153, 0.4)' : '0 0 30px rgba(52, 211, 153, 0.3)'
                  }}
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  You're all set, {formData.name}!
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Your company profile is complete. Here's what you've unlocked:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: '📊', title: 'Industry Benchmarks', desc: 'Compare to peers' },
                  { icon: '🎯', title: 'Competitor Analysis', desc: 'Market positioning' },
                  { icon: '📈', title: 'Growth Insights', desc: 'AI recommendations' },
                  { icon: '📋', title: 'Tax Updates', desc: 'State requirements' }
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{feature.title}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{feature.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          {step >= 1 && step < 4 && (
            <button
              onClick={prevStep}
              className="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step < 4 && (
            <button
              onClick={nextStep}
              className="ml-auto px-6 py-2.5 rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              style={{
                background: canProceed()
                  ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-fuchsia))'
                  : 'rgba(128, 128, 128, 0.3)',
                color: 'white',
                boxShadow: canProceed() && theme === 'dark' ? '0 0 20px rgba(34, 211, 238, 0.2)' : 'none'
              }}
              disabled={!canProceed() || loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={completeOnboarding}
              className="w-full px-6 py-3.5 rounded-lg font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--neon-emerald), var(--neon-cyan))',
                color: 'white',
                boxShadow: theme === 'dark' ? '0 0 30px rgba(52, 211, 153, 0.3)' : '0 4px 20px rgba(52, 211, 153, 0.2)'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Setting up your dashboard...
                </>
              ) : (
                <>
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Required fields note */}
        {step < 4 && !canProceed() && (
          <p className="text-xs text-center mt-4" style={{ color: 'var(--neon-fuchsia)' }}>
            Please fill in all required fields marked with *
          </p>
        )}
          </>
        )}
      </div>
    </div>
  )
}
