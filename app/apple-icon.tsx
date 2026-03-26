import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
          borderRadius: '40px',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="s" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path
            d="M8 22 C12 10, 18 26, 24 12"
            fill="none"
            stroke="url(#s)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M23 10 L26.5 6 L27 10.5 L23.5 11 Z" fill="white" opacity="0.95" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
