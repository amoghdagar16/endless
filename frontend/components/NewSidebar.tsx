'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  Sparkles,
  User,
  Building2,
  Menu,
  PanelRight,
  Globe,
  Landmark,
  FileText,
  Receipt,
  BarChart3,
  CalendarCheck
} from 'lucide-react'
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/new-dashboard', icon: LayoutDashboard },
  { name: 'Banking', href: '/banking', icon: Landmark },
  { name: 'Journals', href: '/new-journals', icon: BookOpen },
  { name: 'Chart of Accounts', href: '/chart-of-accounts', icon: FolderTree },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Bills', href: '/bills', icon: Receipt },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Month-end', href: '/month-end', icon: CalendarCheck },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Ask AI', href: '/ai', icon: Sparkles },
  { name: 'Company', href: '/profile?tab=company', icon: Globe }
]

export default function NewSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, company, loading: authLoading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const initials = useMemo(() => {
    const source = user?.full_name || company?.name || 'Endless'
    return (
      source
        .split(' ')
        .filter(Boolean)
        .map(word => word[0]?.toUpperCase())
        .slice(0, 2)
        .join('') || 'EN'
    )
  }, [user?.full_name, company?.name])

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 96 : 280 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        boxShadow: isDark
          ? '0 20px 120px rgba(15,23,42,0.7)'
          : '0 20px 60px rgba(0,0,0,0.08)'
      }}
    >
      <div className="relative flex h-20 items-center justify-between px-4">
        <div
          className="absolute inset-0 blur-3xl"
          style={{
            background: 'linear-gradient(to right, var(--neon-fuchsia), var(--neon-cyan), transparent)',
            opacity: 'var(--glow-opacity)'
          }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              boxShadow: '0 10px 40px rgba(217,70,239,0.3)'
            }}
          >
            <Building2 className="h-5 w-5" style={{ color: 'var(--neon-fuchsia)' }} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="leading-tight"
              >
                <p className="text-[11px] uppercase tracking-[0.5em]" style={{ color: 'var(--text-muted)' }}>
                  Endless
                </p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Finance OS
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onToggle}
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl transition"
          style={{
            border: '1px solid var(--border-color)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            color: 'var(--text-muted)'
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)'
              }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-all"
                style={{
                  border: isActive
                    ? '1px solid rgba(217,70,239,0.6)'
                    : '1px solid var(--border-color)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(217,70,239,0.4), rgba(34,211,238,0.4))'
                    : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)'
                }}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="flex-1"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && !collapsed && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--neon-fuchsia)',
                    boxShadow: '0 0 12px var(--neon-fuchsia)'
                  }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-6">
        <div
          className="rounded-3xl p-4"
          style={{
            border: '1px solid var(--border-color)',
            backgroundColor: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(0,0,0,0.02)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, var(--neon-fuchsia), var(--neon-indigo))'
              }}
            >
              {initials}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  className="min-w-0"
                >
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {authLoading ? 'Loading...' : (company?.name || (user ? 'Complete setup' : 'Demo Company'))}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                    {authLoading ? '...' : (user?.email || 'demo@endless.finance')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!collapsed && (
            <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Realtime ledgers synced to Endless Copilot.
            </p>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
