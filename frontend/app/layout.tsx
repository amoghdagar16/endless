import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import NewSidebar from '@/components/NewSidebar'
import AskAIButton from '@/components/AskAIButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Endless - Smart Accounting Platform',
  description: 'AI-powered accounting and financial management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <NewSidebar />

          {/* Main Content */}
          <div className="flex-1 ml-64 overflow-auto">
            <main className="min-h-screen">
              {children}
            </main>
          </div>

          {/* Floating Ask AI Button */}
          <AskAIButton />
        </div>
      </body>
    </html>
  )
}
