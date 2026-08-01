
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMenu } from '../context/MenuContext'
import { useAdminAuth } from '../context/AdminAuthContext'
import { createMenuItem, updateMenuItem, fileToBase64 } from '../lib/menuApi'
import { MENU_PLACEHOLDER_IMAGE } from '../data/menuItems'
import { menuCategories } from '../data/siteConfig'

function emptyVariant() {
  return { label: '', price: '' }
}

export default function AdminMenuFormPage() {
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const { isAdmin } = useAdminAuth()
  const { items, refresh } = useMenu()

  const existingItem = useMemo(
    () => (isEditMode ? items.find((item) => String(item.id) === String(id)) : null),
    [items, id, isEditMode],
  )

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Makanan')
  const [badge, setBadge] = useState('')
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState(MENU_PLACEHOLDER_IMAGE)
  const [imageBase64, setImageBase64] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [useVariant, setUseVariant] = useState(false)
  const [variants, setVariants] = useState([emptyVariant()])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login')
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (existingItem) {
      setName(existingItem.name || '')
      setPrice(String(existingItem.price ?? ''))
      setCategory(menuCategories.includes(existingItem.category) ? existingItem.category : 'Makanan')
      setBadge(existingItem.badge || '')
      setDescription(existingItem.desc || '')
      setImagePreview(existingItem.image || MENU_PLACEHOLDER_IMAGE)
      setIsAvailable(existingItem.available !== false)
      setUseVariant(Boolean(existingItem.hasVariantPage))
      setVariants(
        existingItem.variantOptions?.length
          ? existingItem.variantOptions.map((option) => ({ label: option.label, price: String(option.price) }))
          : [emptyVariant()],
      )
      return
    }

    setName('')
    setPrice('')
    setCategory('Makanan')
    setBadge('')
    setDescription('')
    setImagePreview(MENU_PLACEHOLDER_IMAGE)
    setImageBase64('')
    setIsAvailable(true)
    setUseVariant(false)
    setVariants([emptyVariant()])
  }, [existingItem])

  if (!isAdmin) return null

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const base64 = await fileToBase64(file)
      setImageBase64(base64)
      setImagePreview(base64)
    } catch (err) {
      setError(err.message || 'Gagal membaca gambar')
    }
  }

  const updateVariant = (index, field, value) => {
    setVariants((prev) => prev.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant)))
  }

  const addVariantRow = () => setVariants((prev) => [...prev, emptyVariant()])

  const removeVariantRow = (index) => {
    setVariants((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  const validate = () => {
    if (!name.trim()) return 'Nama menu wajib diisi'
    if (!(Number(price) > 0)) return 'Harga menu harus lebih dari 0'
    if (!menuCategories.includes(category)) return 'Kategori wajib dipilih'

    if (useVariant) {
      const validVariants = variants.filter((variant) => variant.label.trim())
      if (!validVariants.length) return 'Tambahkan minimal satu varian, atau matikan "Menggunakan Varian"'
      const invalidPrice = validVariants.some((variant) => !(Number(variant.price) >= 0))
      if (invalidPrice) return 'Harga varian tidak boleh kosong atau negatif'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      name: name.trim(),
      price: Number(price),
      category,
      badge: badge.trim(),
      description: description.trim(),
      available: isAvailable,
      hasVariant: useVariant,
      variants: useVariant
        ? variants
            .filter((variant) => variant.label.trim())
            .map((variant) => ({ label: variant.label.trim(), price: Number(variant.price) || 0 }))
        : [],
    }

    if (imageBase64) {
      payload.imageBase64 = imageBase64
    } else {
      payload.imageUrl = existingItem?.image || MENU_PLACEHOLDER_IMAGE
    }

    try {
      if (isEditMode) {
        await updateMenuItem(id, payload)
      } else {
        await createMenuItem(payload)
      }
      await refresh()
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan menu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="container admin-stack">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>{isEditMode ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
          </div>
        </div>

        <motion.form
          className="admin-menu-form glass-card"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          <div className="admin-form-field">
            <span>Upload Gambar</span>
            <div className="admin-image-upload">
              <div className="admin-image-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview menu" />
                ) : (
                  <span aria-hidden="true">🍽️</span>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>
          </div>

          <label className="admin-form-field">
            <span>Nama Menu</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Dimsum Mentai" />
          </label>

          <label className="admin-form-field">
            <span>Harga Menu</span>
            <input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="15000" />
          </label>

          <label className="admin-form-field">
            <span>Badge (opsional)</span>
            <input type="text" value={badge} onChange={(event) => setBadge(event.target.value)} placeholder="Best Seller" />
          </label>

          <label className="admin-form-field">
            <span>Deskripsi (opsional)</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Deskripsi singkat menu" />
          </label>

          <div className="admin-form-field">
            <span>Kategori</span>
            <div className="admin-radio-row">
              {menuCategories
                .filter((item) => item !== 'Semua')
                .map((item) => (
                  <label className="admin-radio" key={item}>
                    <input
                      type="radio"
                      name="category"
                      checked={category === item}
                      onChange={() => setCategory(item)}
                    />
                    {item}
                  </label>
                ))}
            </div>
          </div>

          <label className="admin-checkbox-row admin-stock-row">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
            />
            <span>Stok Tersedia</span>
          </label>

          <label className="admin-checkbox-row">
            <input type="checkbox" checked={useVariant} onChange={(event) => setUseVariant(event.target.checked)} />
            <span>Menggunakan Varian</span>
          </label>

          {useVariant ? (
            <div className="admin-variant-editor">
              {variants.map((variant, index) => (
                <div className="admin-variant-row" key={index}>
                  <span className="admin-variant-index">Varian {index + 1}</span>
                  <input
                    type="text"
                    placeholder="Nama varian"
                    value={variant.label}
                    onChange={(event) => updateVariant(index, 'label', event.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Harga tambahan"
                    value={variant.price}
                    onChange={(event) => updateVariant(index, 'price', event.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-variant-remove"
                    onClick={() => removeVariantRow(index)}
                    aria-label={`Hapus varian ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button type="button" className="ghost-btn small" onClick={addVariantRow}>
                + Tambah Varian
              </button>
            </div>
          ) : null}

          {error ? <p className="admin-form-error">{error}</p> : null}

          <div className="admin-form-actions">
            <button type="button" className="ghost-btn" onClick={() => navigate('/admin/dashboard')}>
              Batal
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Save'}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
