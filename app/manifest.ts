import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The White Board',
    short_name: 'White Board',
    description:
      'Figmaの利点を抽出した高速・軽量AIフレンドリーなホワイトボードツール。Claude Code Agentとの連携に最適化。',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4338ca',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
