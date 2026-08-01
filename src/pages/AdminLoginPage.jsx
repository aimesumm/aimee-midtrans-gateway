
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { login } = useAdminAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!password) {
      setError('Password wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      await login(password)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message || 'Password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="container admin-auth-stack">
        <motion.div
          className="admin-login-card glass-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Admin</p>
              <h2>Login Account</h2>
              <p className="section-copy">Masuk untuk mengelola menu AIME-Dimsum.</p>
            </div>
          </div>

          <form className="admin-login-form" onSubmit={handleSubmit}>
            <label className="admin-form-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password admin"
                autoFocus
              />
            </label>

            {error ? <p className="admin-form-error">{error}</p> : null}

            <div className="admin-login-actions">
              <button type="button" className="ghost-btn" onClick={() => navigate('/')}>
                Kembali
              </button>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Memeriksa...' : 'Login'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
