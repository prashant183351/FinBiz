import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinNbiz - Accounting & Business Management',
  description: 'GST-compliant accounting and business management for Indian SMBs',
  manifest: '/manifest.json',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
