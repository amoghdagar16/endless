'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL params
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error('Auth error:', error, errorDescription)
          setStatus('error')
          setTimeout(() => router.push('/login'), 2000)
          return
        }

        if (code && supabase) {
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('Session exchange error:', exchangeError)
            setStatus('error')
            setTimeout(() => router.push('/login'), 2000)
            return
          }

          setStatus('success')
          // Redirect to login page with success message
          setTimeout(() => router.push('/login?confirmed=true'), 1500)
        } else {
          // No code, just redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setTimeout(() => router.push('/login'), 2000)
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse mb-4 mx-auto"></div>
            <p className="text-gray-400">Confirming your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium mb-2">Email confirmed!</p>
            <p className="text-gray-400 text-sm">Redirecting to login...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-white font-medium mb-2">Confirmation failed</p>
            <p className="text-gray-400 text-sm">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
