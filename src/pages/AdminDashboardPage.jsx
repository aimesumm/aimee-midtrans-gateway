
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { currency } from '../data/siteConfig'
import { MENU_PLACEHOLDER_IMAGE } from '../data/menuItems'
import { useMenu } from '../context/MenuContext'
import { useAdminAuth } from '../context/AdminAuthContext'
import { deleteMenuItem as deleteMenuItemRequest } from '../lib/menuApi'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { isAdmin, logout } = useAdminAuth()
  const { items, loading, refresh, source } = useMenu()
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login')
    }
  }, [isAdmin, navigate])

  if (!isAdmin) return null

  const handleDelete = async (event, item) => {
    event.stopPropagation()
    if (!window.confirm(`Hapus menu "${item.name}"?`)) return

    setDeletingId(item.id)
    setError('')

    try {
      await deleteMenuItemRequest(item.id)
      await refresh()
    } catch (err) {
      setError(err.message || 'Gagal menghapus menu')
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <div className="container admin-stack">
        <div className="section-head">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>Dashboard Menu</h2>
            <p className="section-copy">
              {source === 'error'
                ? 'Gagal memuat menu dari backend. Cek koneksi Supabase, lalu refresh halaman ini.'
                : source === 'local'
                  ? 'Mode lokal aktif. Menu tetap bisa ditambah/edit/hapus, tetapi data disimpan di browser ini sampai backend Supabase tersambung.'
                  : 'Klik menu untuk mengedit. Perubahan langsung tersimpan ke backend.'}
            </p>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn small" type="button" onClick={() => navigate('/')}>
              Lihat Halaman Utama
            </button>
            <button className="ghost-btn small" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {error ? <p className="admin-form-error">{error}</p> : null}

        <div className="menu-grid-v2">
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              className="menu-card-v2 admin-menu-card"
              onClick={() => navigate(`/admin/menu/${item.id}/edit`)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.32, delay: index * 0.03 }}
            >
              <div className="menu-card-v2-image">
                {(item.image || MENU_PLACEHOLDER_IMAGE) ? (
                  <img src={item.image || MENU_PLACEHOLDER_IMAGE} alt={item.name} />
                ) : (
                  <span className="menu-card-v2-emoji" aria-hidden="true">{item.emoji}</span>
                )}
                <span className="menu-badge">{item.category}</span>
              </div>

              <div className="menu-card-v2-body">
                <h3>{item.name}</h3>
                <strong className="menu-card-v2-price">{currency.format(item.price)}</strong>
                <span className={`admin-menu-stock-tag${item.available === false ? ' is-empty' : ''}`}>
                  {item.available === false ? 'Stok Kosong' : 'Stok Tersedia'}
                </span>
                {item.hasVariantPage ? <span className="admin-menu-variant-tag">Punya varian</span> : null}
              </div>

              <span
                className="admin-menu-delete"
                role="button"
                tabIndex={0}
                onClick={(event) => handleDelete(event, item)}
                aria-label={`Hapus ${item.name}`}
              >
                {deletingId === item.id ? '...' : '🗑️'}
              </span>
            </motion.button>
          ))}

          <motion.button
            type="button"
            className="menu-card-v2 add-menu-card"
            onClick={() => navigate('/admin/menu/new')}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.32, delay: items.length * 0.03 }}
          >
            <span className="add-menu-card-icon" aria-hidden="true">➕</span>
            <span className="add-menu-card-label">Tambah Menu</span>
          </motion.button>
        </div>

        {loading ? <p className="section-copy">Memuat menu...</p> : null}
      </div>
    </div>
  )
}
