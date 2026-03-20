import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The White Board',
  description:
    'Figmaの利点を抽出した高速・軽量AIフレンドリーなホワイトボードツール。Claude Code Agentとの連携に最適化。',
  applicationName: 'The White Board',
  keywords: [
    'whiteboard',
    'ホワイトボード',
    'AI',
    'Claude',
    'fabric.js',
    'Next.js',
    'デザインツール',
    'コラボレーション',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'The White Board',
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
