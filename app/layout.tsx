import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Whiteboard - Figma Clone',
  description: 'A collaborative design tool built with Next.js',
  applicationName: 'Whiteboard',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Whiteboard',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
