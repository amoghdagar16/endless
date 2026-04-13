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
  ChevronLeft,
  ChevronRight,
  Landmark,
  FileText,
  Receipt,
  BarChart3,
  CalendarCheck,
  Users,
  CreditCard,
  Shield,
  Sun,
  Moon,
} from 'lucide-react'
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  isDark?: boolean
  onToggleTheme?: () => void
  onNavClick?: () => void
}

const navigation = [
  { name: 'Dashboard',         href: '/new-dashboard',      icon: LayoutDashboard },
  { name: 'Banking',           href: '/banking',             icon: Landmark },
  { name: 'Invoices',          href: '/invoices',            icon: FileText },
  { name: 'Bills',             href: '/bills',               icon: Receipt },
  { name: 'Payments',          href: '/payments',            icon: CreditCard },
  { name: 'Contacts',          href: '/contacts',            icon: Users },
  { name: 'Journals',          href: '/new-journals',        icon: BookOpen },
  { name: 'Chart of Accounts', href: '/chart-of-accounts',   icon: FolderTree },
  { name: 'Reports',           href: '/reports',             icon: BarChart3 },
  { name: 'Month-end',         href: '/month-end',           icon: CalendarCheck },
  { name: 'Ask AI',            href: '/ai',                  icon: Sparkles },
  { name: 'Profile',           href: '/profile',             icon: User },
]

const ROLE_LABELS: Record<string, string> = {
  owner:      'Owner',
  admin:      'Admin',
  accountant: 'Accountant',
  user:       'Member',
  viewer:     'Viewer',
}

export default function NewSidebar({ collapsed, onToggle, isDark, onToggleTheme, onNavClick }: SidebarProps) {
  const pathname = usePathname()
  const { user, company, loading: authLoading } = useAuth()
  const role = (user?.role || '').toLowerCase()

  const filteredNavigation = useMemo(() => {
    const base = navigation.filter((item) => {
      if ((item.href === '/ai' || item.href === '/reports') && ['user', 'viewer'].includes(role)) {
        return false
      }
      return true
    })
    if (['owner', 'admin'].includes(role)) {
      return [...base, { name: 'Admin', href: '/admin', icon: Shield, isAdmin: true }]
    }
    return base
  }, [role])

  const initials = useMemo(() => {
    const source = user?.full_name || company?.name || 'Fintra'
    return (
      source
        .split(' ')
        .filter(Boolean)
        .map((word: string) => word[0]?.toUpperCase())
        .slice(0, 2)
        .join('') || 'FN'
    )
  }, [user?.full_name, company?.name])

  const roleLabel = ROLE_LABELS[role] || role

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col print:hidden"
      style={{
        backgroundColor: 'var(--sidebar-bg, var(--bg-secondary))',
        borderRight: '1px solid var(--sidebar-border, var(--border-color))',
      }}
    >
      {/* Header / Logo */}
      <div className="flex h-[52px] items-center justify-between px-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo mark */}
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 1px 4px rgba(37,99,235,0.35)' }}
          >
            <Building2 className="h-4 w-4 text-white" />
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <span
                  className="text-sm font-semibold tracking-tight whitespace-nowrap"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
                >
                  Fintra
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md transition-colors"
          style={{
            color: 'var(--text-muted)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {filteredNavigation.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isAdminItem = 'isAdmin' in item && item.isAdmin

          return (
            <div key={item.name}>
              {/* Separator before Admin */}
              {isAdminItem && (
                <div
                  className="my-2 mx-1"
                  style={{ height: 1, backgroundColor: 'var(--border-color)' }}
                />
              )}

              <Link
                href={item.href}
                title={collapsed ? item.name : undefined}
                onClick={onNavClick}
                className={`
                  group relative flex items-center gap-2.5 rounded-md px-2 py-1.5
                  text-sm font-medium transition-colors duration-100
                  ${isActive ? 'nav-item-active' : 'nav-item'}
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                {/* Active left-border accent (handled via CSS .nav-item-active) */}
                <item.icon
                  className={`flex-shrink-0 h-4 w-4 transition-colors ${
                    isActive ? '' : 'group-hover:opacity-100'
                  }`}
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                />

                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="truncate"
                      style={{ color: isActive ? 'var(--accent)' : undefined }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </div>
          )
        })}
      </nav>

      {/* Theme toggle + user card at bottom */}
      <div
        className="px-2 pb-3 flex-shrink-0 space-y-1.5"
        style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}
      >
        {/* Theme toggle row */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className={`flex items-center gap-2.5 rounded-md w-full px-2 py-1.5 transition-colors ${collapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            {isDark
              ? <Sun className="flex-shrink-0 h-4 w-4" />
              : <Moon className="flex-shrink-0 h-4 w-4" />}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-sm font-medium"
                >
                  {isDark ? 'Light mode' : 'Dark mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}

        <div
          className={`flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors cursor-default ${collapsed ? 'justify-center' : ''}`}
          style={{ backgroundColor: 'var(--bg-muted)' }}
        >
          {/* Avatar */}
          <div
            className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)', fontSize: 11 }}
          >
            {initials}
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex-1 min-w-0"
              >
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
                >
                  {authLoading ? '...' : (company?.name || (user ? 'Set up company' : 'Demo'))}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p
                    className="text-xs truncate"
                    style={{ color: 'var(--text-muted)', fontSize: 11 }}
                  >
                    {authLoading ? '...' : (user?.email || 'demo@fintra.app')}
                  </p>
                  {roleLabel && (
                    <span className="badge badge-neutral flex-shrink-0" style={{ fontSize: 10, height: 16, padding: '0 5px' }}>
                      {roleLabel}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
