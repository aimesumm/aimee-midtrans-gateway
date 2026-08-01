import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { categories } from '../data/siteConfig'
import { useCart } from '../context/CartContext'
import { useMenu } from '../context/MenuContext'
import { useAdminAuth } from '../context/AdminAuthContext'
import MenuCard from './MenuCard'
import AddMenuCard from './AddMenuCard'
import { MENU_PLACEHOLDER_IMAGE } from '../data/menuItems'

function uniqCategoryList(items) {
  const ordered = ['Semua']
  const base = Array.isArray(categories) ? categories : []
  const raw = [...base, ...items.map((item) => item.category)]
  const seen = new Set(['semua'])

  for (const cat of raw) {
    const label = String(cat || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (key === 'semua') continue
    if (seen.has(key)) continue
    seen.add(key)
    ordered.push(label)
  }

  return ordered
}

function getCategoryTheme(category) {
  const key = String(category || 'Semua').trim().toLowerCase()
  const themes = {
    semua: { accent: '#7B1824', soft: 'rgba(123, 24, 36, 0.10)', border: 'rgba(123, 24, 36, 0.18)' },
    paket: { accent: '#8B5CF6', soft: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.18)' },
    makanan: { accent: '#C46B12', soft: 'rgba(196, 107, 18, 0.12)', border: 'rgba(196, 107, 18, 0.18)' },
    minuman: { accent: '#0F7A8A', soft: 'rgba(15, 122, 138, 0.12)', border: 'rgba(15, 122, 138, 0.18)' },
    lainnya: { accent: '#D13A7A', soft: 'rgba(209, 58, 122, 0.12)', border: 'rgba(209, 58, 122, 0.18)' },
  }
  return themes[key] || themes.lainnya
}

export default function MenuSection({ cartBarRef }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [flyers, setFlyers] = useState([])
  const { cart, addItem, removeItem } = useCart()
  const { items, loading } = useMenu()
  const { isAdmin } = useAdminAuth()
  const tabRefs = useRef(new Map())
  const flyerTimers = useRef(new Set())

  const categoryList = useMemo(() => uniqCategoryList(items), [items])
  const activeTheme = getCategoryTheme(activeCategory)

  useEffect(() => {
    if (!categoryList.includes(activeCategory)) {
      setActiveCategory(categoryList[0] || 'Semua')
    }
  }, [activeCategory, categoryList])

  useEffect(() => {
    const node = tabRefs.current.get(activeCategory)
    if (node) {
      window.requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      })
    }
  }, [activeCategory])

  useEffect(() => {
    return () => {
      flyerTimers.current.forEach((timer) => window.clearTimeout(timer))
      flyerTimers.current.clear()
    }
  }, [])

  const filtered = useMemo(() => {
    return activeCategory === 'Semua'
      ? items
      : items.filter((item) => item.category === activeCategory)
  }, [activeCategory, items])

  const getCartQty = (item) => {
    const match = cart.find((entry) => String(entry.id) === String(item.id) && String(entry.variant || '') === '')
    return Number(match?.qty || 0)
  }

  const addFlyer = (item, sourceEl) => {
    const buttonRect = sourceEl?.getBoundingClientRect?.()
    const cartRect = cartBarRef?.current?.getBoundingClientRect?.()

    if (!buttonRect || !cartRect) return

    const id = `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startX = buttonRect.left + buttonRect.width / 2
    const startY = buttonRect.top + buttonRect.height / 2
    const endX = cartRect.left + 42
    const endY = cartRect.top + cartRect.height / 2

    const timeoutId = window.setTimeout(() => {
      setFlyers((prev) => prev.filter((flyer) => flyer.id !== id))
      flyerTimers.current.delete(timeoutId)
    }, 760)
    flyerTimers.current.add(timeoutId)

    setFlyers((prev) => [
      ...prev,
      {
        id,
        item,
        startX,
        startY,
        endX,
        endY,
      },
    ])
  }

  const handleAdd = (item, sourceEl) => {
    if (item.available === false) return
    if (item.hasVariantPage) {
      navigate(`/variant/${item.id}`)
      return
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      basePrice: item.price,
      variantPrice: 0,
      category: item.category,
      emoji: item.emoji,
      image: item.image,
      available: item.available,
      variant: '',
      variantLabel: '',
    })

    addFlyer(item, sourceEl)
  }

  const handleIncrease = (item, sourceEl) => {
    if (item.available === false) return
    if (item.hasVariantPage) return

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      basePrice: item.price,
      variantPrice: 0,
      category: item.category,
      emoji: item.emoji,
      image: item.image,
      available: item.available,
      variant: '',
      variantLabel: '',
    })

    addFlyer(item, sourceEl)
  }

  const handleDecrease = (item) => {
    if (item.hasVariantPage) return
    removeItem(item.id, '')
  }

  return (
    <section className="menu-section" id="menu">
      <div className="menu-section-head">
        <div className="menu-section-copy">
          <p className="eyebrow">Pilih kategori</p>
          <h2>Geser kategori untuk melihat menu</h2>
        </div>
      </div>

      <div
        className="category-toolbar glass-card"
        style={{
          '--category-accent': activeTheme.accent,
          '--category-soft': activeTheme.soft,
          '--category-border': activeTheme.border,
        }}
      >
        <div
          className="menu-active-chip menu-active-chip-inline"
          aria-live="polite"
          title={activeCategory}
          style={{
            background: `linear-gradient(135deg, ${activeTheme.soft}, rgba(255, 255, 255, 0.50))`,
            borderColor: activeTheme.border,
          }}
        >
          <strong style={{ color: activeTheme.accent }}>{activeCategory}</strong>
        </div>

        <div className="menu-tabs-shell">
          <div className="tabs scrollable menu-tabs" role="tablist" aria-label="Kategori menu">
            {categoryList.map((cat) => {
              const theme = getCategoryTheme(cat)
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  ref={(node) => {
                    if (node) {
                      tabRefs.current.set(cat, node)
                    } else {
                      tabRefs.current.delete(cat)
                    }
                  }}
                  className={isActive ? 'tab active' : 'tab'}
                  onClick={() => setActiveCategory(cat)}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  style={isActive ? { '--tab-accent': theme.accent } : undefined}
                >
                  <span className="tab-label">{cat}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="menu-results">
        <div className="menu-grid-v2">
          {filtered.map((item, index) => (
            <MenuCard
              key={item.id}
              item={item}
              index={index}
              cartQty={getCartQty(item)}
              onAdd={handleAdd}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          ))}

          {isAdmin ? (
            <AddMenuCard index={filtered.length} onClick={() => navigate('/admin/menu/new')} />
          ) : null}
        </div>

        {!loading && !filtered.length && !isAdmin ? (
          <p className="section-copy menu-empty-state">Menu belum tersedia saat ini. Silakan cek kembali sebentar lagi.</p>
        ) : null}
      </div>

      <AnimatePresence>
        {flyers.map((flyer) => (
          <motion.div
            key={flyer.id}
            className="menu-flyer"
            initial={{ opacity: 0, scale: 0.7, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 0.95, 0.18], x: flyer.endX - flyer.startX, y: flyer.endY - flyer.startY }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.76, ease: [0.16, 1, 0.3, 1] }}
            style={{ left: flyer.startX, top: flyer.startY }}
          >
            <img src={flyer.item.image || MENU_PLACEHOLDER_IMAGE} alt="" aria-hidden="true" />
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  )
}
