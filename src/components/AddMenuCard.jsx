
import React from 'react'
import { motion } from 'framer-motion'

export default function AddMenuCard({ index = 0, onClick }) {
  return (
    <motion.button
      type="button"
      className="menu-card-v2 add-menu-card"
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.38, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
    >
      <span className="add-menu-card-icon" aria-hidden="true">➕</span>
      <span className="add-menu-card-label">Tambah Menu</span>
    </motion.button>
  )
}
