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
  LogOut
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/new-dashboard', icon: LayoutDashboard },
  { name: 'Journals', href: '/new-journals', icon: BookOpen },
  { name: 'Chart of Accounts', href: '/chart-of-accounts', icon: FolderTree },
  { name: 'AI Insights', href: '/ai-insights', icon: Sparkles },
  { name: 'Profile', href: '/profile', icon: User },
]

export default function NewSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Building2 className="w-6 h-6 text-blue-600" />
        <span className="ml-3 font-bold text-xl text-gray-900">Endless</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            AC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Acme Corp</p>
            <p className="text-xs text-gray-500 truncate">admin@acme.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
