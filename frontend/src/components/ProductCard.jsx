import { useState } from 'react'
import { formatMoney } from '../utils/format'

export default function ProductCard({ product, onAdd, adding, canAdd = true }) {
  const [broken, setBroken] = useState(false)
  const price = Number(product?.price || 0)
  const available = product?.available !== false
  const initial = String(product?.name || '?').trim().charAt(0).toUpperCase()

  return (
    <article className={`product-card ${available ? '' : 'product-card-unavailable'}`}>
      <div className="product-media">
        {product?.image_url && !broken ? (
          <img src={product.image_url} alt={product.name} onError={() => setBroken(true)} loading="lazy" />
        ) : (
          <div className="product-placeholder" aria-hidden="true">
            {initial}
          </div>
        )}
        {!available && <span className="product-tag">No disponible</span>}
      </div>

      <div className="product-body">
        <div className="product-category">{product?.category?.name || 'Sin categoría'}</div>
        <h3 className="product-name">{product?.name}</h3>
        <p className="product-desc">{product?.description || 'Sin descripción.'}</p>

        <div className="product-footer">
          <span className="product-price">{formatMoney(price)}</span>
          {canAdd && (
            <button
              className="btn btn-primary btn-sm"
              disabled={!available || adding}
              onClick={() => onAdd(product)}
            >
              {adding ? 'Agregando…' : available ? 'Agregar' : 'Agotado'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
