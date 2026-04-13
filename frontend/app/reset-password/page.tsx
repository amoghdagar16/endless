'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setError('Supabase auth is not configured.')
        return
      }

      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        setReady(true)
        return
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || !!session) {
          setReady(true)
        }
      })

      // Give auth URL processing a moment before showing link error.
      setTimeout(async () => {
        const { data: fresh } = await supabase!.auth.getSession()
        if (!fresh?.session && !ready) {
          setError('Invalid or expired reset link. Request a new one.')
        }
      }, 1200)

      return () => subscription.unsubscribe()
    }

    init()
  }, [ready])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!ready) {
      setError('Reset session is not ready. Open the reset link from your email again.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      if (!supabase) throw new Error('Supabase auth is not configured.')
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <Link href="/login" className="inline-flex items-center gap-2 mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Reset password</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Set a new password for your account.
        </p>

        {done && (
          <div
            className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
            style={{ border: '1px solid var(--neon-emerald)', backgroundColor: 'rgba(52,211,153,0.08)', color: 'var(--neon-emerald)' }}
          >
            <CheckCircle className="w-4 h-4 mt-0.5" />
            <span>Password updated successfully. You can now sign in.</span>
          </div>
        )}

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{ border: '1px solid rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
          >
            {error}
          </div>
        )}

        {!done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Confirm password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ready}
              className="btn btn-primary"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
