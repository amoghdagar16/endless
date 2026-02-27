'use client'

import { useState, useEffect } from 'react'
import { CalendarCheck, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function MonthEndPage() {
  const { company } = useAuth()
  const [periods, setPeriods] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!company?.id) {
      setLoading(false)
      return
    }
    Promise.all([
      api.get('/accounting-periods/').catch(() => []),
      api.get('/reconciliation/sessions').catch(() => []),
    ]).then(([p, s]) => {
      setPeriods(Array.isArray(p) ? p : [])
      setSessions(Array.isArray(s) ? s : [])
    }).finally(() => setLoading(false))
  }, [company?.id])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!company?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <CalendarCheck className="h-16 w-16 text-neutral-400 dark:text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">No company set up</h2>
        <p className="text-neutral-600 dark:text-white/60 max-w-md mb-6">Finish onboarding to use Month-end.</p>
        <a href="/onboarding" className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold text-white">Complete onboarding</a>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-8 w-8 text-fuchsia-500" />
        <div>
          <h1 className="text-2xl font-semibold">Month-end</h1>
          <p className="text-sm text-neutral-500">Reconcile bank and close periods to lock the month</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="font-medium mb-3">Accounting periods</h2>
          {periods.length === 0 ? (
            <p className="text-neutral-500 text-sm">No periods defined. Create a period and close it when the month is verified.</p>
          ) : (
            <ul className="space-y-2">
              {periods.slice(0, 10).map((p: any) => (
                <li key={p.id} className="flex justify-between py-1 text-sm">
                  <span>{p.period_start} – {p.period_end}</span>
                  <span className={p.is_closed ? 'text-green-600' : 'text-neutral-500'}>{p.is_closed ? 'Closed' : 'Open'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="font-medium mb-3">Reconciliation sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-neutral-500 text-sm">No reconciliation sessions yet. Start one to match your bank statement.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.slice(0, 10).map((s: any) => (
                <li key={s.id} className="flex justify-between py-1 text-sm">
                  <span>{s.statement_start} – {s.statement_end}</span>
                  <span className="text-neutral-500">{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
