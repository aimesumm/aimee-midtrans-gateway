import React from 'react'
import { useNavigate } from 'react-router-dom'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </svg>
  )
}

export default function Header() {
  const navigate = useNavigate()

  return (
    <header className="topbar menu-topbar glass-card">
      <div className="header-title-wrap">
        <h1 className="header-title">LAPAK - AIME</h1>
      </div>

      <div className="topbar-actions header-actions">
        <button className="icon-btn header-search-btn" type="button" aria-label="Search">
          <SearchIcon />
        </button>
        <button
          className="icon-btn header-profile-btn"
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Buka halaman profile"
        >
          <MenuIcon />
        </button>
      </div>
    </header>
  )
}
