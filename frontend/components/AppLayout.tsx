'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import NewSidebar from './NewSidebar'
import AskAIButton from './AskAIButton'
import { useTheme } from '@/contexts/ThemeContext'

const publicRoutes = ['/', '/login', '/signup', '/auth/callback']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname === '/' || publicRoutes.slice(1).some(route => pathname.startsWith(route))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebarWidth = useMemo(() => (sidebarCollapsed ? 96 : 280), [sidebarCollapsed])
  const { theme, toggleTheme } = useTheme()

  if (isPublicRoute) {
    return <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>{children}</main>
  }

  return (
    <div
      className="relative min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Neon background effects - preserved in both themes with adjusted opacity */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden">
        <div
          className="absolute -top-32 left-1/4 h-96 w-96 rounded-full blur-[200px] transition-opacity duration-500"
          style={{ backgroundColor: 'var(--neon-fuchsia)', opacity: 'var(--glow-opacity)' }}
        />
        <div
          className="absolute top-1/3 right-0 h-80 w-80 rounded-full blur-[180px] transition-opacity duration-500"
          style={{ backgroundColor: 'var(--neon-cyan)', opacity: 'var(--glow-opacity)' }}
        />
        <div
          className="absolute bottom-10 left-10 h-72 w-72 rounded-full blur-[160px] transition-opacity duration-500"
          style={{ backgroundColor: 'var(--neon-emerald)', opacity: 'var(--glow-opacity)' }}
        />
      </div>

      <div className="print:hidden">
        <NewSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      </div>

      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-105 print:hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: theme === 'dark'
            ? '0 0 20px rgba(217, 70, 239, 0.2)'
            : '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" style={{ color: 'var(--neon-cyan)' }} />
        ) : (
          <Moon className="w-5 h-5" style={{ color: 'var(--neon-fuchsia)' }} />
        )}
      </button>

      <div
        className="relative z-10 min-h-screen transition-[margin-left] duration-300 ease-out print:!ml-0"
        style={{ marginLeft: sidebarWidth }}
      >
        <main className="min-h-screen">{children}</main>
      </div>

      <div className="print:hidden">
        <AskAIButton />
      </div>
    </div>
  )
}
