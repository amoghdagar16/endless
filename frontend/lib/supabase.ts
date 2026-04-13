import { createClient, SupabaseClient } from '@supabase/supabase-js'

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Auth/API can be slow on first load or poor networks; use a longer timeout (60s)
const SUPABASE_FETCH_TIMEOUT_MS = 60_000

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS)
  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(id))
}

let supabaseClient: SupabaseClient | null = null

if (!supabaseUrl || !supabaseAnonKey) {
  if (!demoMode) {
    throw new Error('Missing Supabase environment variables')
  } else {
    if (typeof window !== 'undefined') {
      console.warn('Supabase credentials missing. Running frontend in demo mode.')
    }
  }
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: fetchWithTimeout as typeof fetch,
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
}

export const supabase = supabaseClient

export type User = {
  id: string
  email: string
  full_name: string
  role: string
  company_id: string | null
  created_at: string
}

export type Company = {
  id: string
  name: string
  industry: string
  fiscal_year_end: string
  onboarding_completed: boolean
  created_at: string
}
