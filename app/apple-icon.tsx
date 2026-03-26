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
          background: 'linear-gradient(135deg, #0f0a2a 0%, #3730a3 100%)',
          borderRadius: '40px',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
          <polyline
            points="7,23 13,13 19,20 25,9"
            fill="none"
            stroke="url(#s)"
            strokeWidth="2.2"
            strokeLinejoin="bevel"
          />
          <polygon points="25,9 28,5.5 28.5,9.5" fill="white" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
