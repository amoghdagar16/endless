'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User, Company } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { api, API_BASE } from '@/lib/api'

interface LoginLockoutState {
  locked: boolean
  remainingSeconds: number
}

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  company: Company | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  checkLoginLockout: (email: string) => Promise<LoginLockoutState>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const normalizeEmail = (email: string) => email.trim().toLowerCase()
  const AUTH_CACHE_TTL_MS = 60 * 1000
  const API_FETCH_TIMEOUT_MS = 8000
  const AUTH_INIT_TIMEOUT_MS = 12000

  const fetchJsonWithTimeout = async (url: string, init?: RequestInit) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const getStorage = () => {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage
    } catch {
      return window.sessionStorage
    }
  }

  const toLockoutError = (remainingSeconds: number) => {
    const error = new Error(`Too many failed attempts. Try again in ${Math.max(1, remainingSeconds)} seconds.`) as Error & {
      code: string
      remainingSeconds: number
    }
    error.code = 'AUTH_LOCKED'
    error.remainingSeconds = Math.max(0, remainingSeconds)
    return error
  }

  const isInvalidCredentialsError = (error: any) => {
    const message = (error?.message || '').toLowerCase()
    const code = (error?.code || '').toLowerCase()
    return code === 'invalid_credentials' || message.includes('invalid login credentials')
  }

  const checkLoginLockout = useCallback(async (email: string): Promise<LoginLockoutState> => {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      return { locked: false, remainingSeconds: 0 }
    }

    try {
      const response = await api.post<{ locked?: boolean; remaining_seconds?: number }>(
        '/users/auth/attempts/precheck',
        { email: normalizedEmail }
      )
      return {
        locked: Boolean(response?.locked),
        remainingSeconds: Number(response?.remaining_seconds || 0),
      }
    } catch {
      // Fail-open to avoid blocking valid users on transient API errors.
      return { locked: false, remainingSeconds: 0 }
    }
  }, [])

  const fetchUserData = async (authUser: SupabaseUser) => {
    if (!supabase) return
    try {
      // Check local cache first to keep PWA reloads fast.
      const cacheKey = `fintra_auth_v2_${authUser.id}`
      const storage = getStorage()
      const cached = storage?.getItem(cacheKey)
      if (cached) {
        try {
          const { user: cachedUser, company: cachedCompany, ts } = JSON.parse(cached)
          const cacheIsFresh = Date.now() - ts < AUTH_CACHE_TTL_MS
          // Do not trust cache that indicates onboarding incomplete or missing company.
          // This avoids false redirects to onboarding after completion.
          const cacheIsTrusted = Boolean(cachedUser?.company_id) && cachedCompany?.onboarding_completed !== false
          if (cacheIsFresh && cachedUser && cacheIsTrusted) {
            setUser(cachedUser)
            setCompany(cachedCompany)
          }
        } catch { /* invalid cache, re-fetch */ }
      }

      // Fetch user and company in parallel
      const [userResult, _] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).maybeSingle(),
        Promise.resolve() // placeholder for parallel expansion
      ])

      let userData: any = userResult.data

      // RLS may block direct read — fall back to backend API
      if (userResult.error || !userData) {
        try {
          const res = await fetchJsonWithTimeout(`${API_BASE}/users/${authUser.id}`)
          if (res.ok) {
            const json = await res.json()
            if (json?.data) userData = json.data
          }
        } catch { /* Backend not reachable */ }
      }

      if (!userData) {
        setUser(null)
        setCompany(null)
        return
      }

      // Fetch company in parallel with setting user state
      let companyData: any = null
      if (userData.company_id) {
        const { data: directCompany, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .maybeSingle()

        if (!companyError && directCompany) {
          companyData = directCompany
        } else {
          try {
            const res = await api.get<{ data?: any[] }>('/companies/')
            if (res?.data && res.data.length > 0) companyData = res.data[0]
          } catch { /* Backend not reachable */ }
        }
      }

      setUser(userData)
      setCompany(companyData)

      // Cache in browser storage so refresh doesn't re-fetch
      try {
        storage?.setItem(cacheKey, JSON.stringify({
          user: userData,
          company: companyData,
          ts: Date.now()
        }))
      } catch { /* storage not available */ }

    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  useEffect(() => {
    const supabaseClient = supabase
    if (!supabaseClient) {
      console.error('Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL / KEY.')
      setLoading(false)
      return
    }

    let disposed = false
    let initFinished = false
    const initTimeout = setTimeout(() => {
      if (!initFinished && !disposed) {
        console.warn('Auth initialization timed out; continuing without blocking UI.')
        setLoading(false)
      }
    }, AUTH_INIT_TIMEOUT_MS)

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (disposed) return
        setSupabaseUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserData(session.user)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        initFinished = true
        if (!disposed) {
          setLoading(false)
        }
      }
    }
    initAuth()

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (disposed) return
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserData(session.user)
      } else {
        setUser(null)
        setCompany(null)
      }
      setLoading(false)
    })

    return () => {
      disposed = true
      clearTimeout(initTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) {
      throw new Error(
        'Authentication requires Supabase. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, set NEXT_PUBLIC_DEMO_MODE=false, and restart the dev server. Get keys from Supabase Dashboard → Project Settings → API.'
      )
    }
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'http://localhost:3000/auth/callback'

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Create user record via backend API (uses service_role key, bypasses RLS)
        const response = await fetchJsonWithTimeout(`${API_BASE}/users/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            role: 'admin',
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to create user record')
        }

        // Don't redirect yet - user needs to confirm email first
        // The signup page will show a message to check email
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign up')
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error(
        'Authentication requires Supabase. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, set NEXT_PUBLIC_DEMO_MODE=false, and restart the dev server. Get keys from Supabase Dashboard → Project Settings → API.'
      )
    }
    try {
      const normalizedEmail = normalizeEmail(email)

      const precheck = await checkLoginLockout(normalizedEmail)
      if (precheck.locked) {
        throw toLockoutError(precheck.remainingSeconds)
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (isInvalidCredentialsError(error)) {
          try {
            const record = await api.post<{ locked?: boolean; remaining_seconds?: number }>(
              '/users/auth/attempts/record',
              { email: normalizedEmail, outcome: 'invalid_credentials' }
            )
            if (record?.locked) {
              throw toLockoutError(Number(record?.remaining_seconds || 0))
            }
          } catch (recordError: any) {
            if (recordError?.code === 'AUTH_LOCKED') {
              throw recordError
            }
          }
        }
        throw error
      }

      if (data.user) {
        try {
          await api.post('/users/auth/attempts/record', {
            email: normalizedEmail,
            outcome: 'success',
          })
        } catch {
          // Do not block login if lockout reset endpoint is unavailable.
        }

        // Ensure user row exists in the users table (may be missing after schema reset)
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!existingUser) {
          await fetchJsonWithTimeout(`${API_BASE}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.email || 'User',
              role: 'admin',
            }),
          })
        }

        await fetchUserData(data.user)

        // Check if user has completed onboarding — two separate queries to avoid
        // relying on Supabase FK join (companies(...)) which silently returns null
        // when PostgREST relationships are not configured, causing false redirects.
        const { data: userRow } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!userRow?.company_id) {
          router.push('/onboarding')
          return
        }

        const { data: companyRow } = await supabase
          .from('companies')
          .select('onboarding_completed')
          .eq('id', userRow.company_id)
          .maybeSingle()

        if (companyRow?.onboarding_completed) {
          router.push('/new-dashboard')
        } else {
          router.push('/onboarding')
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in')
    }
  }

  const signOut = async () => {
    let signOutError: any = null

    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) signOutError = error
      } catch (error: any) {
        signOutError = error
      }
    }

    // Always clear local state and cached auth so logout works even if
    // Supabase signOut fails due transient network/session issues.
    setSupabaseUser(null)
    setUser(null)
    setCompany(null)

    try {
      const storage = getStorage()
      if (storage) {
        Object.keys(storage)
          .filter(k => k.startsWith('fintra_auth_') || k === 'admin_session_token')
          .forEach(k => storage.removeItem(k))
      }
    } catch { /* ignore */ }

    router.replace('/login')

    if (signOutError) {
      console.warn('Supabase signOut returned an error, local logout still completed.', signOutError)
    }
  }

  const refreshUser = async () => {
    if (supabaseUser) {
      // Bust cache so refreshUser always gets fresh data
      try {
        const storage = getStorage()
        storage?.removeItem(`fintra_auth_v2_${supabaseUser.id}`)
      } catch { /* ignore */ }
      await fetchUserData(supabaseUser)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        company,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUser,
      checkLoginLockout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
