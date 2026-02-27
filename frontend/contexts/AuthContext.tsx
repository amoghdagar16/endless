'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User, Company } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  company: Company | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchUserData = async (authUser: SupabaseUser) => {
    try {
      // Fetch user via backend API (bypasses broken RLS on users table)
      let userResp = await api.get(`/users/${authUser.id}`)
      let userData = userResp?.data

      // If user row doesn't exist, create it via backend
      if (!userData) {
        const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/users/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: authUser.id,
            email: authUser.email,
            full_name: fullName,
            role: 'admin',
          }),
        })
        userResp = await api.get(`/users/${authUser.id}`)
        userData = userResp?.data
      }

      if (!userData) return

      setUser(userData)

      // Fetch company via backend API
      if (userData.company_id) {
        try {
          const companyResp = await api.get('/companies/')
          const companyData = companyResp?.data?.[0]
          if (companyData) setCompany(companyData)
        } catch {
          console.error('Failed to load company data')
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL / KEY.')
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserData(session.user)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        fetchUserData(session.user).finally(() => setLoading(false))
      } else {
        setUser(null)
        setCompany(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
        const response = await fetch(`${apiBase}/users/`, {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Ensure user row exists in the users table (may be missing after schema reset)
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!existingUser) {
          const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
          await fetch(`${apiBase}/users/`, {
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

        // Check onboarding status via backend API (bypasses RLS)
        try {
          const companyResp = await api.get('/companies/')
          const companyData = companyResp?.data?.[0]

          if (!companyData) {
            router.push('/onboarding')
          } else if (!companyData.onboarding_completed) {
            router.push('/onboarding')
          } else {
            router.push('/new-dashboard')
          }
        } catch {
          router.push('/onboarding')
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in')
    }
  }

  const signOut = async () => {
    if (!supabase) {
      setUser(null)
      setCompany(null)
      return
    }
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setCompany(null)
      router.push('/login')
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out')
    }
  }

  const refreshUser = async () => {
    if (supabaseUser) {
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
