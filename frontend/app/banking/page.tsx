'use client'

import { useState, useEffect } from 'react'
import { Landmark, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function BankingPage() {
  const { company } = useAuth()
  const [connections, setConnections] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'connections' | 'transactions'>('transactions')

  useEffect(() => {
    if (!company?.id) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        setLoading(true)
        const [conn, acct, txn] = await Promise.all([
          api.get('/bank/connections').catch(() => []),
          api.get('/bank/accounts').catch(() => []),
          api.get('/bank/transactions?status=unreviewed').catch(() => []),
        ])
        setConnections(Array.isArray(conn) ? conn : [])
        setAccounts(Array.isArray(acct) ? acct : [])
        setTransactions(Array.isArray(txn) ? txn : [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
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
        <Landmark className="h-16 w-16 text-neutral-400 dark:text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">No company set up</h2>
        <p className="text-neutral-600 dark:text-white/60 max-w-md mb-6">
          Finish onboarding to use Banking.
        </p>
        <a
          href="/onboarding"
          className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold text-white"
        >
          Complete onboarding
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Landmark className="h-8 w-8 text-fuchsia-500" />
        <div>
          <h1 className="text-2xl font-semibold">Banking</h1>
          <p className="text-sm text-neutral-500">Connect your bank and categorize transactions</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
        <button
          onClick={() => setTab('connections')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'connections' ? 'bg-fuchsia-500/20 text-fuchsia-600' : 'text-neutral-600'}`}
        >
          Connections
        </button>
        <button
          onClick={() => setTab('transactions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'transactions' ? 'bg-fuchsia-500/20 text-fuchsia-600' : 'text-neutral-600'}`}
        >
          Transactions
        </button>
      </div>

      {tab === 'connections' && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          {connections.length === 0 ? (
            <p className="text-neutral-500">No bank connections yet. Connect your bank to pull in transactions automatically.</p>
          ) : (
            <ul className="space-y-2">
              {connections.map((c: any) => (
                <li key={c.id} className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span>{c.institution_name || 'Bank'}</span>
                  <span className="text-sm text-neutral-500">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          {transactions.length === 0 ? (
            <p className="text-neutral-500">No unreviewed transactions. Connect a bank account to see transactions here, or add them manually.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.slice(0, 20).map((t: any) => (
                <li key={t.id} className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span>{t.name || t.merchant_name || '—'}</span>
                  <span className={t.amount >= 0 ? 'text-green-600' : 'text-red-600'}>${Number(t.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
