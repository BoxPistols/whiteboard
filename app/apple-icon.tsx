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
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '40px',
        }}
      >
        {/* ホワイトボード */}
        <div
          style={{
            width: '120px',
            height: '90px',
            background: 'rgba(255, 255, 255, 0.92)',
            borderRadius: '12px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* ペンストローク（SVG代替：3つのドット+線で表現） */}
          <svg
            width="80"
            height="50"
            viewBox="0 0 80 50"
            style={{ position: 'absolute' }}
          >
            <path
              d="M12 38 Q28 8 48 24 Q56 32 68 14"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {/* ペン先（右上のアクセント） */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '28px',
            width: '0',
            height: '0',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '24px solid #f59e0b',
            transform: 'rotate(45deg)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
