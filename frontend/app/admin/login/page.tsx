'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Lock, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passcode, setPasscode] = useState('')
  const [newPasscode, setNewPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsPasscodeSetup, setNeedsPasscodeSetup] = useState(false)
  const [error, setError] = useState('')

  const ensureSignedIn = async () => {
    if (!supabase) throw new Error('Supabase auth is not configured')
    const { data } = await supabase.auth.getSession()
    if (data?.session?.user) return
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
  }

  const verifyPasscode = async (code: string) => {
    const verify = await api.post<{ token: string; requires_passcode_reset?: boolean }>('/admin/session/verify-passcode', {
      passcode: code,
    })
    if (!verify?.token) {
      throw new Error('Admin session token was not returned')
    }
    return verify
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setNeedsPasscodeSetup(false)

    try {
      await ensureSignedIn()

      const verify = await verifyPasscode(passcode)
      if (verify.requires_passcode_reset) {
        setNeedsPasscodeSetup(true)
        setError('Temporary admin passcode accepted. Set a new admin passcode to continue.')
        setNewPasscode('')
        return
      }
      localStorage.setItem('admin_session_token', verify.token)
      router.push('/admin')
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      if (status === 404) {
        setNeedsPasscodeSetup(true)
        setError('Admin passcode is not configured yet. Set it below.')
      } else {
        setError(detail || err?.message || 'Admin login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const startFirstTimeSetup = async () => {
    setError('')
    setLoading(true)
    try {
      await ensureSignedIn()
      setNeedsPasscodeSetup(true)
      setError('Set a new admin passcode below, then continue to admin panel.')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(detail || err?.message || 'Failed to initialize passcode setup')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPasscode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/admin/session/set-passcode', { passcode: newPasscode })
      const verify = await verifyPasscode(newPasscode)
      localStorage.setItem('admin_session_token', verify.token)
      router.push('/admin')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(detail || err?.message || 'Failed to set admin passcode')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="text-center space-y-2">
          <div className="btn btn-primary">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Admin Login</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Company-scoped admin access with second-step passcode.
          </p>
        </div>

        {error && (
          <div className="text-sm p-3 rounded-lg" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />

          <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />

          <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>Admin Passcode</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="password"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder='Temporary default: "admin"'
              className="w-full pl-9 pr-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Verifying...' : 'Enter Admin Panel'}
          </button>
        </form>

        {!needsPasscodeSetup && (
          <div className="pt-2">
            <button
              type="button"
              onClick={startFirstTimeSetup}
              disabled={loading || !email || !password}
              className="w-full py-2 rounded-lg font-medium disabled:opacity-60"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              First time here? Set admin passcode
            </button>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Enter email and password first, then click this button to initialize passcode setup.
            </p>
          </div>
        )}

        {needsPasscodeSetup && (
          <form onSubmit={handleSetPasscode} className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Lock className="w-4 h-4" />
              Set your first admin passcode
            </div>
            <input
              type="password"
              minLength={6}
              required
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg font-medium disabled:opacity-60"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {loading ? 'Saving...' : 'Save Passcode and Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
