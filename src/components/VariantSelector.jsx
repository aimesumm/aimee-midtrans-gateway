
import React from 'react'
import { currency } from '../data/siteConfig'

export default function VariantSelector({ options, selectedKey, onSelect }) {
  return (
    <div className="variant-selector">
      <div className="variant-selector-head">
        <span className="variant-selector-title">PILIH VARIAN</span>
        <span className="variant-selector-hint">Must be selected max. 1</span>
      </div>

      <div className="variant-selector-list">
        {options.map((option) => {
          const checked = selectedKey === option.key
          return (
            <label
              key={option.key}
              className={checked ? 'variant-option checked' : 'variant-option'}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onSelect(checked ? null : option.key)}
              />
              <span className="variant-option-box" aria-hidden="true" />
              <span className="variant-option-label">{option.label}</span>
              <span className="variant-option-price">+{currency.format(option.price)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
