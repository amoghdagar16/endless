'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const MAX_COMPANY_RECOVERY_ATTEMPTS = 3

export function useCompanyReady() {
  const { company, loading: authLoading, refreshUser } = useAuth()
  const companyId = company?.id || null
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (companyId) return
    if (retryCount >= MAX_COMPANY_RECOVERY_ATTEMPTS) return

    let cancelled = false
    refreshUser().finally(() => {
      if (!cancelled) {
        setRetryCount(c => c + 1)
      }
    })

    return () => {
      cancelled = true
    }
  }, [authLoading, companyId, retryCount, refreshUser])

  return {
    company,
    companyId,
    companyLoading: authLoading || (!companyId && retryCount < MAX_COMPANY_RECOVERY_ATTEMPTS),
    companyMissing: !authLoading && !companyId && retryCount >= MAX_COMPANY_RECOVERY_ATTEMPTS,
  }
}
