import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CONTACT_EMAIL, OWNER_WHATSAPP, getContactWhatsAppUrl, socialLinks } from '../data/siteConfig'

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const whatsappUrl = getContactWhatsAppUrl()

  return (
    <div className="app-shell">
      <main className="container profile-stack profile-stack-final">
        <motion.div className="section-head compact profile-head-row" custom={0} variants={cardVariants} initial="hidden" animate="show">
          <button type="button" className="ghost-btn small profile-close-btn" onClick={() => navigate('/')}>
            ×
          </button>
        </motion.div>

        <motion.section
          className="glass-card profile-hero"
          custom={0.04}
          variants={cardVariants}
          initial="hidden"
          animate="show"
        >
          <div className="profile-hero-head">
            <div>
              <p className="profile-hero-label">Akun tamu</p>
              <h3>Log In as Guest</h3>
            </div>
            <button type="button" className="primary-btn" onClick={() => navigate('/admin/login')}>
              Sign in
            </button>
          </div>
        </motion.section>

        <motion.section
          className="glass-card profile-section"
          custom={0.08}
          variants={cardVariants}
          initial="hidden"
          animate="show"
        >
          <div className="profile-section-head">
            <div>
              <p className="profile-section-title">Sosial media</p>
              <h3>Ikuti kami</h3>
            </div>
          </div>

          <div className="profile-link-list">
            {socialLinks.map((social) => {
              const hasUrl = Boolean(social.url)
              return (
                <a
                  key={social.key}
                  className={`profile-link-item ${hasUrl ? '' : 'profile-link-item-disabled'}`.trim()}
                  href={hasUrl ? social.url : undefined}
                  target={hasUrl ? '_blank' : undefined}
                  rel={hasUrl ? 'noreferrer' : undefined}
                  onClick={hasUrl ? undefined : (event) => event.preventDefault()}
                >
                  <span className="profile-link-icon" aria-hidden="true">{social.icon}</span>
                  <span className="profile-link-meta">
                    <span className="profile-link-name">{social.label}</span>
                    <span className="profile-link-handle">
                      {social.handle || (hasUrl ? 'Buka tautan' : 'Belum diatur')}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        </motion.section>

        <motion.section
          className="glass-card profile-section"
          custom={0.12}
          variants={cardVariants}
          initial="hidden"
          animate="show"
        >
          <div className="profile-section-head">
            <div>
              <p className="profile-section-title">Kontak</p>
              <h3>Hubungi kami</h3>
            </div>
          </div>

          <div className="profile-link-list">
            <a
              className={`profile-link-item ${whatsappUrl ? '' : 'profile-link-item-disabled'}`.trim()}
              href={whatsappUrl || undefined}
              target={whatsappUrl ? '_blank' : undefined}
              rel={whatsappUrl ? 'noreferrer' : undefined}
              onClick={whatsappUrl ? undefined : (event) => event.preventDefault()}
            >
              <span className="profile-link-icon" aria-hidden="true">💬</span>
              <span className="profile-link-meta">
                <span className="profile-link-name">WhatsApp</span>
                <span className="profile-link-handle">{OWNER_WHATSAPP || 'Belum diatur'}</span>
              </span>
            </a>

            <a
              className={`profile-link-item ${CONTACT_EMAIL ? '' : 'profile-link-item-disabled'}`.trim()}
              href={CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : undefined}
              onClick={CONTACT_EMAIL ? undefined : (event) => event.preventDefault()}
            >
              <span className="profile-link-icon" aria-hidden="true">✉️</span>
              <span className="profile-link-meta">
                <span className="profile-link-name">Email</span>
                <span className="profile-link-handle">{CONTACT_EMAIL || 'Belum diatur'}</span>
              </span>
            </a>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
