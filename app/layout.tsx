import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Figma Clone',
  description: 'A collaborative design tool built with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
