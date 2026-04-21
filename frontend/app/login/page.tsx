'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

function LoginInner() {
  const { signIn, checkLoginLockout } = useAuth()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0)
  const isDark = theme === 'dark'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      setShowConfirmation(true)
      setTimeout(() => setShowConfirmation(false), 5000)
    }
  }, [searchParams])

  useEffect(() => {
    if (lockoutRemainingSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutRemainingSeconds(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutRemainingSeconds])

  useEffect(() => {
    const normalizedEmail = formData.email.trim().toLowerCase()
    if (!normalizedEmail) { setLockoutRemainingSeconds(0); return }
    const timeout = setTimeout(async () => {
      const lockout = await checkLoginLockout(normalizedEmail)
      setLockoutRemainingSeconds(lockout.locked ? lockout.remainingSeconds : 0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [formData.email, checkLoginLockout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutRemainingSeconds > 0) {
      setError(`Too many attempts. Try again in ${lockoutRemainingSeconds}s.`)
      return
    }
    setLoading(true)
    setError('')
    // Let the browser paint "Signing in…" before Supabase + API work runs in this tick.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    try {
      await signIn(formData.email, formData.password)
    } catch (err: any) {
      if (err?.code === 'AUTH_LOCKED') {
        setLockoutRemainingSeconds(Number(err?.remainingSeconds || 0))
      }
      setError(err.message || 'Sign in failed. Please try again.')
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
      className="min-h-screen dot-grid flex items-center justify-center p-4 relative"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Back link */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 btn btn-ghost btn-sm no-underline flex items-center gap-1.5"
        style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo / wordmark */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 no-underline mb-6" style={{ textDecoration: 'none' }}>
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Building2 className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              Fintra
            </span>
          </Link>
          <h1
            className="text-2xl font-semibold mb-1.5"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in to your account
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
          {/* Success banner */}
          {showConfirmation && (
            <div
              className="mb-5 px-3.5 py-3 rounded-lg flex items-start gap-2.5"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--neon-emerald)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--neon-emerald)' }}>Email confirmed!</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>You can now sign in to your account.</p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="mb-5 px-3.5 py-3 rounded-lg"
              style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@company.com"
                className="input input-lg"
                disabled={loading}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs no-underline"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="input input-lg"
                  style={{ paddingRight: 42 }}
                  disabled={loading || lockoutRemainingSeconds > 0}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || lockoutRemainingSeconds > 0}
              className="btn btn-primary btn-lg w-full mt-2"
              style={{ width: '100%' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : lockoutRemainingSeconds > 0 ? (
                `Locked (${lockoutRemainingSeconds}s)`
              ) : (
                'Sign in'
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
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium no-underline"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          By signing in, you agree to our{' '}
          <Link href="/terms" className="no-underline hover:underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="no-underline hover:underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    }>
      <LoginInner />
    </Suspense>
  )
}
