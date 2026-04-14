'use client'

import { useState, useEffect, useMemo } from 'react'
import { Eye, EyeOff, CheckCircle2, ArrowLeft, Building2, Check } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

/* ── Password strength computation ── */
function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
} {
  if (!password) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[0-9]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const map = [
    { label: '', color: 'transparent' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f97316' },
    { label: 'Good', color: '#eab308' },
    { label: 'Strong', color: '#10b981' },
  ]
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] }
}

const passwordChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter',       test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number',                 test: (p: string) => /[0-9]/.test(p) },
]

export default function Signup() {
  const { signUp } = useAuth()
  const { theme } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password])
  const passwordMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await signUp(formData.email, formData.password, formData.fullName)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
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
    <div
      className="min-h-screen dot-grid flex items-center justify-center p-4 py-10"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Back */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 btn btn-ghost btn-sm no-underline flex items-center gap-1.5"
        style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 no-underline mb-6" style={{ textDecoration: 'none' }}>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
              <Building2 className="text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Fintra
            </span>
          </Link>
          <h1 className="text-2xl font-semibold mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Create your account
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Start managing your finances with AI
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Success state */}
          {success ? (
            <div className="text-center py-4">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}
              >
                <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--neon-emerald)' }} />
              </div>
              <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Check your email
              </h2>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                We sent a confirmation link to
              </p>
              <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-primary)' }}>
                {formData.email}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Click the link in your email to verify your account, then{' '}
                <Link href="/login" className="font-medium no-underline" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  sign in
                </Link>.
              </p>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div
                  className="mb-5 px-3.5 py-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="label" htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Jane Smith"
                    className="input input-lg"
                    required
                    autoComplete="name"
                    autoFocus
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="label" htmlFor="email">Work email</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@company.com"
                    className="input input-lg"
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="input input-lg"
                      style={{ paddingRight: 42 }}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded"
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {formData.password.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(seg => (
                          <div
                            key={seg}
                            className="h-1 flex-1 rounded-full transition-colors duration-200"
                            style={{
                              backgroundColor: seg <= strength.score ? strength.color : 'var(--border-color)',
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                          {passwordChecks.map(check => (
                            <div key={check.label} className="flex items-center gap-1">
                              <div
                                className="h-3 w-3 rounded-full flex items-center justify-center"
                                style={{
                                  backgroundColor: check.test(formData.password)
                                    ? 'rgba(16,185,129,0.15)'
                                    : 'var(--bg-muted)',
                                }}
                              >
                                {check.test(formData.password) && (
                                  <Check className="h-2 w-2" style={{ color: 'var(--neon-emerald)' }} />
                                )}
                              </div>
                              <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                                {check.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        {strength.label && (
                          <span className="text-xs font-medium" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="label" htmlFor="confirmPassword">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className={`input input-lg ${passwordMismatch ? 'input-error' : ''}`}
                    required
                    autoComplete="new-password"
                  />
                  {passwordMismatch && (
                    <p className="text-xs mt-1" style={{ color: '#dc2626' }}>Passwords don't match</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || passwordMismatch}
                  className="btn btn-primary btn-lg w-full mt-2"
                  style={{ width: '100%' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5">
                <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />
                <span
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 text-xs"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}
                >
                  or
                </span>
              </div>

              <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <Link href="/login" className="font-medium no-underline"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="no-underline hover:underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="no-underline hover:underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
