import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Endless Moments - Project Poster',
  description: 'AI Financial Companion Project Poster',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
