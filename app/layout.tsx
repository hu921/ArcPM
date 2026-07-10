import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'

export const metadata: Metadata = {
  title: 'ArcPM',
  description: 'AI-powered program management for hardware development',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }}>
        <AuthProvider>
          <DemoBanner />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
