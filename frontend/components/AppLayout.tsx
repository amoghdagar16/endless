'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, FolderTree, Sparkles, User,
  Landmark, FileText, Receipt, BarChart3, CalendarCheck,
  Users, CreditCard, Menu, X,
} from 'lucide-react'
import NewSidebar from './NewSidebar'
import AskAIButton from './AskAIButton'
import { useTheme } from '@/contexts/ThemeContext'

const publicRoutes = ['/', '/login', '/signup', '/auth/callback', '/admin/login', '/forgot-password', '/reset-password', '/onboarding']

const mobileNav = [
  { name: 'Dashboard', href: '/new-dashboard', icon: LayoutDashboard },
  { name: 'Banking',   href: '/banking',        icon: Landmark },
  { name: 'Invoices',  href: '/invoices',        icon: FileText },
  { name: 'Journals',  href: '/new-journals',    icon: BookOpen },
  { name: 'More',      href: null,               icon: Menu }, // opens drawer
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname === '/' || publicRoutes.slice(1).some(route => pathname.startsWith(route))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const sidebarWidth = useMemo(() => (sidebarCollapsed ? 64 : 240), [sidebarCollapsed])
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (isPublicRoute) {
    return (
      <main className="min-h-screen dot-grid" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {children}
      </main>
    )
  }

  return (
    <div
      className="relative min-h-screen dot-grid"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Dark mode glow */}
      {isDark && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden" aria-hidden>
          <div
            className="absolute -top-32 left-1/2 h-72 w-72 rounded-full blur-[180px]"
            style={{ backgroundColor: 'var(--accent)', opacity: 0.05 }}
          />
        </div>
      )}

      {/* ── DESKTOP sidebar (hidden on mobile) ── */}
      <div className="hidden md:block print:hidden">
        <NewSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* ── MOBILE drawer overlay ── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-64 shadow-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <NewSidebar
              collapsed={false}
              onToggle={() => {}}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              onNavClick={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {/* On mobile: ml-0, pb-16 for bottom nav. On desktop: sidebar offset, no bottom pad. */}
      <div className="relative z-10 min-h-screen print:!ml-0 pb-16 md:pb-0 fintra-main-content">
        <style>{`@media (min-width: 768px) { .fintra-main-content { margin-left: ${sidebarWidth}px; transition: margin-left 200ms ease-out; } }`}</style>
        <main className="min-h-screen">{children}</main>
      </div>

      {/* ── MOBILE bottom nav ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden print:hidden border-t"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {mobileNav.map((item) => {
          if (item.href === null) {
            // "More" button opens drawer
            return (
              <button
                key="more"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                <Menu className="h-5 w-5" />
                <span>More</span>
              </button>
            )
          }
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Floating AI button */}
      <div className="print:hidden">
        <AskAIButton />
      </div>
    </div>
  )
}
