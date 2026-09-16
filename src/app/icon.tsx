import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
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
          background: '#4f46e5',
          borderRadius: 7,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="white" fillOpacity="0.15" />
          <rect x="4" y="2" width="16" height="20" rx="2" stroke="white" strokeWidth="1.6" />
          <path d="M7.5 8h9M7.5 12h9M7.5 16h5.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M14.5 15.2l1.6 1.6 3-3.2"
            stroke="#4ade80"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
