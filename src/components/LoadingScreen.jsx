import React from 'react'

function MaroonFlameMark() {
  return (
    <svg viewBox="0 0 64 64" className="loading-mark" aria-hidden="true">
      <path
        d="M34 5c-5 7-6 12-4 17 2 4 7 7 6 13-1 4-4 6-7 6-5 0-9-4-9-10 0-5 2-10 6-15-9 3-16 12-16 23 0 14 11 24 24 24s24-10 24-24C58 22 46 11 34 5Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M34 12c-3 5-4 9-2 13 2 3 5 5 5 10 0 4-3 7-7 7-4 0-7-3-7-8 0-4 2-8 4-11-6 2-10 8-10 15 0 9 7 16 16 16s16-7 16-16C49 28 42 19 34 12Z"
        fill="currentColor"
      />
      <circle cx="40" cy="20" r="3" fill="#ffd4a5" opacity="0.85" />
    </svg>
  )
}

export default function LoadingScreen({ label = 'Memuat aplikasi...' }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label={label}>
      <div className="loading-screen-card">
        <div className="loading-spinner loading-spinner-large">
          <MaroonFlameMark />
        </div>
        <strong>{label}</strong>
        <p>Menyiapkan menu, bundle, dan data awal.</p>
      </div>
    </div>
  )
}
