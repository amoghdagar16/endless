'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  LogOut,
  Save,
  Upload,
  AlertCircle,
  Globe,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Package,
  Zap
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'

export default function Profile() {
  const { user, supabaseUser, company, signOut, refreshUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>(
    tabFromUrl === 'company' ? 'company' : 'personal'
  )
  const [loading, setLoading] = useState(false)
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    avatar: ''
  })

  const [companyInfo, setCompanyInfo] = useState({
    // Basic Info
    name: '',
    industry: '',
    website: '',

    // Location (from onboarding)
    location_city: '',
    location_state: '',
    location_country: 'USA',
    location_zip: '',

    // Business Profile (from onboarding)
    business_type: '',
    employee_count: 0,
    annual_revenue: 0,
    founded_year: new Date().getFullYear(),
    growth_stage: '',

    // Market Context (from onboarding)
    target_market: '',
    primary_products: [] as string[],
    competitors: [] as string[],

    // Legacy fields
    email: '',
    phone: '',
    taxId: '',
    fiscalYearEnd: ''
  })

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'company' || tab === 'personal') setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      setPersonalInfo({
        fullName: user.full_name || '',
        email: user.email || '',
        phone: '',
        role: user.role || '',
        avatar: ''
      })
    }

    if (company) {
      setCompanyInfo({
        // Basic Info
        name: company.name || '',
        industry: company.industry || '',
        website: company.website || '',

        // Location (from onboarding)
        location_city: company.location_city || '',
        location_state: company.location_state || '',
        location_country: company.location_country || 'USA',
        location_zip: company.location_zip || '',

        // Business Profile (from onboarding)
        business_type: company.business_type || '',
        employee_count: company.employee_count || 0,
        annual_revenue: company.annual_revenue || 0,
        founded_year: company.founded_year || new Date().getFullYear(),
        growth_stage: company.growth_stage || '',

        // Market Context (from onboarding)
        target_market: company.target_market || '',
        primary_products: company.primary_products || [],
        competitors: company.competitors || [],

        // Legacy fields
        email: company.email || '',
        phone: company.phone || '',
        taxId: company.tax_id || '',
        fiscalYearEnd: company.fiscal_year_end || ''
      })
    }
  }, [user, company, authLoading, router])

  const handlePersonalSave = async () => {
    if (!user) return

    try {
      setLoading(true)
      await api.patch(`/users/${user.id}`, {
        full_name: personalInfo.fullName,
        email: personalInfo.email
      })
      await refreshUser()
      alert('Personal information saved!')
    } catch (error) {
      console.error('Failed to save personal info:', error)
      alert('Failed to save personal information')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanySave = async () => {
    if (!company) return

    try {
      setLoading(true)
      await api.patch(`/companies/${company.id}`, {
        // Basic Info
        name: companyInfo.name,
        industry: companyInfo.industry,
        website: companyInfo.website,

        // Location
        location_city: companyInfo.location_city,
        location_state: companyInfo.location_state,
        location_country: companyInfo.location_country,
        location_zip: companyInfo.location_zip,

        // Business Profile
        business_type: companyInfo.business_type,
        employee_count: companyInfo.employee_count,
        annual_revenue: companyInfo.annual_revenue,
        founded_year: companyInfo.founded_year,
        growth_stage: companyInfo.growth_stage,

        // Market Context
        target_market: companyInfo.target_market,
        primary_products: companyInfo.primary_products,
        competitors: companyInfo.competitors,

        // Legacy fields
        email: companyInfo.email || null,
        phone: companyInfo.phone || null,
        tax_id: companyInfo.taxId || null,
        fiscal_year_end: companyInfo.fiscalYearEnd || null
      })
      await refreshUser()
      alert('Company information saved!')
    } catch (error) {
      console.error('Failed to save company info:', error)
      alert('Failed to save company information')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const initials = useMemo(() => {
    const source = personalInfo.fullName || companyInfo.name || 'Endless'
    return source
      .split(' ')
      .filter(Boolean)
      .map(word => word[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || 'EN'
  }, [personalInfo.fullName, companyInfo.name])

  const inputStyles = 'mt-2 w-full rounded-2xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40'
  const labelStyles = 'text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-white/50'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-white p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-600 dark:text-white/60">Control Center</p>
          <h1 className="text-3xl font-semibold mt-2 text-gray-900 dark:text-white">Profile & Company Settings</h1>
          <p className="text-gray-600 dark:text-white/60 mt-1">Keep your identity and firm metadata in sync with Endless Copilot.</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2 text-sm text-gray-700 dark:text-white/80 transition hover:text-gray-900 dark:hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 flex items-center justify-center text-xl font-semibold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-white/60 uppercase tracking-[0.3em]">Identity</p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{personalInfo.fullName || 'Demo User'}</h3>
              <p className="text-gray-600 dark:text-white/60 text-sm">{personalInfo.email || 'demo@endless.finance'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-white/70">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-fuchsia-500 dark:text-fuchsia-300" />
              {personalInfo.role || 'Admin'}
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-500 dark:text-cyan-300" />
              Joined Endless
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-fuchsia-500 dark:text-fuchsia-200" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-white/60 uppercase tracking-[0.3em]">Company</p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{companyInfo.name || 'Demo Company'}</h3>
              <p className="text-gray-600 dark:text-white/60 text-sm">{companyInfo.industry || 'Technology'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-white/70">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500 dark:text-emerald-300" />
              {companyInfo.phone || '—'}
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500 dark:text-sky-300" />
              {companyInfo.location_city ? `${companyInfo.location_city}, ${companyInfo.location_state}` : 'Unknown HQ'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-b border-gray-200 dark:border-white/10 pb-1">
        {[
          { key: 'personal', label: 'Personal Identity', icon: User },
          { key: 'company', label: 'Company Metadata', icon: Building2 }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'personal' | 'company')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-fuchsia-500/50 to-cyan-500/50 text-white shadow-[0_10px_40px_rgba(147,51,234,0.35)]'
                : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' && (
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 space-y-8 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-600 dark:text-white/50">Profile photo</p>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">Update your avatar</h3>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-700 dark:text-white/80">
              <Upload className="w-4 h-4" />
              Upload photo
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className={labelStyles}>Full name</p>
              <input
                type="text"
                value={personalInfo.fullName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                className={inputStyles}
              />
            </div>
            <div>
              <p className={labelStyles}>Email</p>
              <input
                type="email"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                className={inputStyles}
              />
            </div>
            <div>
              <p className={labelStyles}>Phone</p>
              <input
                type="tel"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                className={inputStyles}
                placeholder="+1 555 0100"
              />
            </div>
            <div>
              <p className={labelStyles}>Role</p>
              <select
                value={personalInfo.role}
                onChange={(e) => setPersonalInfo({ ...personalInfo, role: e.target.value })}
                className={`${inputStyles} bg-gray-50 dark:bg-slate-950/40`}
              >
                <option value="Admin">Admin</option>
                <option value="Accountant">Accountant</option>
                <option value="User">User</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 dark:border-white/10 pt-6">
            <button className="rounded-full border border-gray-300 dark:border-white/15 px-5 py-2 text-sm text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white">
              Cancel
            </button>
            <button
              onClick={handlePersonalSave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold shadow-[0_15px_45px_rgba(129,80,255,0.45)] disabled:opacity-40 text-white"
            >
              <Save className="w-4 h-4" />
              Save changes
            </button>
          </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 space-y-8 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-600 dark:text-white/50">Company Profile</p>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">Business Metadata for AI Insights</h3>
              <p className="text-xs text-gray-600 dark:text-white/50 mt-1">This data powers personalized AI recommendations</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-700 dark:text-white/80">
              <Upload className="w-4 h-4" />
              Upload logo
            </button>
          </div>

          {/* Basic Information */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-300" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-700 dark:text-white/70">Basic Information</h4>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <p className={labelStyles}>Company name</p>
                <input
                  type="text"
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                  className={inputStyles}
                />
              </div>
              <div>
                <p className={labelStyles}>Industry</p>
                <input
                  type="text"
                  value={companyInfo.industry}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
                  className={inputStyles}
                  placeholder="e.g., SaaS / Software"
                />
              </div>
              <div>
                <p className={labelStyles}>
                  <Globe className="w-3 h-3 inline mr-1" />
                  Website <span className="text-[0.65rem] normal-case tracking-normal text-gray-500 dark:text-white/40">(improves AI accuracy)</span>
                </p>
                <input
                  type="url"
                  value={companyInfo.website}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                  className={inputStyles}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-6 border-t border-gray-200 dark:border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-500 dark:text-cyan-300" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-700 dark:text-white/70">Location</h4>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className={labelStyles}>City</p>
                <input
                  type="text"
                  value={companyInfo.location_city}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, location_city: e.target.value })}
                  className={inputStyles}
                  placeholder="Phoenix"
                />
              </div>
              <div>
                <p className={labelStyles}>State</p>
                <input
                  type="text"
                  value={companyInfo.location_state}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, location_state: e.target.value })}
                  className={inputStyles}
                  placeholder="AZ"
                />
              </div>
              <div>
                <p className={labelStyles}>ZIP code</p>
                <input
                  type="text"
                  value={companyInfo.location_zip}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, location_zip: e.target.value })}
                  className={inputStyles}
                />
              </div>
              <div>
                <p className={labelStyles}>Country</p>
                <input
                  type="text"
                  value={companyInfo.location_country}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, location_country: e.target.value })}
                  className={inputStyles}
                  placeholder="USA"
                />
              </div>
            </div>
          </div>

          {/* Business Profile */}
          <div className="space-y-6 border-t border-gray-200 dark:border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-700 dark:text-white/70">Business Profile</h4>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className={labelStyles}>Business Type</p>
                <select
                  value={companyInfo.business_type}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, business_type: e.target.value })}
                  className={`${inputStyles} bg-gray-50 dark:bg-slate-950/40`}
                >
                  <option value="">Select type</option>
                  <option value="sole_proprietor">Sole Proprietor</option>
                  <option value="llc">LLC</option>
                  <option value="s_corp">S-Corporation</option>
                  <option value="corporation">C-Corporation</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>
              <div>
                <p className={labelStyles}>Growth Stage</p>
                <select
                  value={companyInfo.growth_stage}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, growth_stage: e.target.value })}
                  className={`${inputStyles} bg-gray-50 dark:bg-slate-950/40`}
                >
                  <option value="">Select stage</option>
                  <option value="startup">Startup (0-2 years)</option>
                  <option value="growth">Growth (2-5 years)</option>
                  <option value="mature">Mature (5+ years)</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <p className={labelStyles}>Employees</p>
                <input
                  type="number"
                  value={companyInfo.employee_count || ''}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, employee_count: parseInt(e.target.value) || 0 })}
                  className={inputStyles}
                  min="0"
                />
              </div>
              <div>
                <p className={labelStyles}>
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Annual Revenue (USD)
                </p>
                <input
                  type="number"
                  value={companyInfo.annual_revenue || ''}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, annual_revenue: parseFloat(e.target.value) || 0 })}
                  className={inputStyles}
                  min="0"
                  placeholder="250000"
                />
              </div>
              <div>
                <p className={labelStyles}>Founded Year</p>
                <input
                  type="number"
                  value={companyInfo.founded_year}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, founded_year: parseInt(e.target.value) })}
                  className={inputStyles}
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
              <div>
                <p className={labelStyles}>Target Market</p>
                <select
                  value={companyInfo.target_market}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, target_market: e.target.value })}
                  className={`${inputStyles} bg-gray-50 dark:bg-slate-950/40`}
                >
                  <option value="">Select market</option>
                  <option value="B2B">B2B</option>
                  <option value="B2C">B2C</option>
                  <option value="B2B2C">B2B2C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Market Context */}
          <div className="space-y-6 border-t border-gray-200 dark:border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-700 dark:text-white/70">Market Context (AI-Powered)</h4>
            </div>
            <div className="space-y-4">
              <div>
                <p className={labelStyles}>
                  <Package className="w-3 h-3 inline mr-1" />
                  Primary Products/Services
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {companyInfo.primary_products.map((product, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border border-cyan-500 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                    >
                      {product}
                      <button
                        onClick={() => setCompanyInfo({
                          ...companyInfo,
                          primary_products: companyInfo.primary_products.filter((_, idx) => idx !== i)
                        })}
                        className="hover:opacity-70"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-white/40 mt-2">Managed in onboarding - refresh to see latest</p>
              </div>
              <div>
                <p className={labelStyles}>
                  <Zap className="w-3 h-3 inline mr-1" />
                  Competitors
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {companyInfo.competitors.map((competitor, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    >
                      {competitor}
                      <button
                        onClick={() => setCompanyInfo({
                          ...companyInfo,
                          competitors: companyInfo.competitors.filter((_, idx) => idx !== i)
                        })}
                        className="hover:opacity-70"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-white/40 mt-2">Used for competitive intelligence - update as needed</p>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="space-y-6 border-t border-gray-200 dark:border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-500 dark:text-rose-300" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-700 dark:text-white/70">Additional Information</h4>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className={labelStyles}>Tax ID (EIN)</p>
                <input
                  type="text"
                  value={companyInfo.taxId}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                  className={inputStyles}
                />
              </div>
              <div>
                <p className={labelStyles}>Fiscal year end</p>
                <input
                  type="text"
                  value={companyInfo.fiscalYearEnd}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, fiscalYearEnd: e.target.value })}
                  placeholder="MM-DD"
                  className={inputStyles}
                />
              </div>
              <div>
                <p className={labelStyles}>Email</p>
                <input
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                  className={inputStyles}
                />
              </div>
              <div>
                <p className={labelStyles}>Phone</p>
                <input
                  type="tel"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                  className={inputStyles}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 dark:border-white/10 pt-6">
            <button className="rounded-full border border-gray-300 dark:border-white/15 px-5 py-2 text-sm text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleCompanySave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-sm font-semibold shadow-[0_15px_45px_rgba(129,80,255,0.45)] disabled:opacity-40 text-white"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-rose-400/50 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-300" />
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-rose-600 dark:text-rose-300">Danger zone</p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">Delete account</h3>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-white/70">
          Permanently remove this user and company data from Endless Copilot. This cannot be undone once confirmed.
        </p>
        <button className="rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-5 py-2 text-sm font-semibold shadow-[0_15px_45px_rgba(225,29,72,0.4)] text-white">
          Delete account
        </button>
      </div>
    </div>
  )
}
