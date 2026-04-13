'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, ArrowRight } from 'lucide-react'

interface BankAccount {
  account_id: string
  account_name: string
  account_code: string
  balance: number
}

interface Props {
  accounts: BankAccount[]
  totalBalance: number
  loading?: boolean
}

const $ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: 'var(--border-color)' }} />
}

export function BankAccountsCard({ accounts, totalBalance, loading }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [cardHovered, setCardHovered] = useState(false)

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: `1px solid ${cardHovered ? 'var(--neon-cyan)' : 'var(--border-color)'}`,
    borderRadius: 8,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
    boxShadow: cardHovered ? '0 0 20px rgba(0,255,255,0.08)' : 'none',
    transform: cardHovered ? 'translateY(-1px)' : 'none',
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      className="p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Bank Accounts
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>As of today</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
          No bank/cash accounts found
        </p>
      ) : (
        <>
          <div className="space-y-0.5">
            {accounts.map((acct) => (
              <Link
                key={acct.account_id}
                href={`/chart-of-accounts/${acct.account_id}`}
                className="flex items-center justify-between px-2 py-2 rounded-md cursor-pointer transition-colors"
                style={{
                  background: hovered === acct.account_id ? 'var(--bg-secondary)' : 'transparent',
                }}
                onMouseEnter={() => setHovered(acct.account_id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--neon-cyan)' }} />
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {acct.account_name}
                  </span>
                  {acct.account_code && (
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {acct.account_code}
                    </span>
                  )}
                </div>
                <span
                  className="text-sm font-semibold tabular-nums flex-shrink-0 ml-2"
                  style={{ color: acct.balance < 0 ? 'var(--neon-fuchsia)' : 'var(--text-primary)' }}
                >
                  {$(acct.balance)}
                </span>
              </Link>
            ))}
          </div>

          <div
            className="flex items-center justify-between pt-2 mt-1"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Total</span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: totalBalance < 0 ? 'var(--neon-fuchsia)' : 'var(--neon-cyan)' }}
            >
              {$(totalBalance)}
            </span>
          </div>

          <Link
            href="/chart-of-accounts"
            className="flex items-center gap-1 mt-3 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--neon-cyan)' }}
          >
            Go to registers <ArrowRight className="w-3 h-3" />
          </Link>
        </>
      )}
    </div>
  )
}
