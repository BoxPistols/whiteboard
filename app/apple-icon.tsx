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
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: '120px',
            height: '120px',
            gap: '12px',
            padding: '4px',
          }}
        >
          {/* 4つのグリッドセル */}
          <div
            style={{
              width: '50px',
              height: '50px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
            }}
          />
          <div
            style={{
              width: '50px',
              height: '50px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
              position: 'relative',
            }}
          >
            {/* 黄色のアクセント */}
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                background: '#fbbf24',
                borderRadius: '50%',
              }}
            />
          </div>
          <div
            style={{
              width: '50px',
              height: '50px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
            }}
          />
          <div
            style={{
              width: '50px',
              height: '50px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
