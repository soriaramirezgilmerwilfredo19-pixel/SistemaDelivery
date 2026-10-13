import { useState } from 'react';
import { artForProduct } from '../utils/productArt';

function badgeVariant(badge) {
  const b = String(badge || '').toLowerCase();
  if (b.includes('promo') || b.includes('ahorra') || b.includes('oferta')) return 'bv-hot';
  if (b.includes('nuevo')) return 'bv-new';
  if (b.includes('tipo') || b.includes('clas')) return 'bv-tipico';
  return 'bv-popular';
}

export default function ProductImage({ product, className = '', discount = 0, quick = null, badge = null, out = false }) {
  const [failed, setFailed] = useState(false);
  const showImg = product?.image_url && !failed;
  const hasDiscount = Number(discount) > 0;

  return (
    <div className={`product-img ${className}`}>
      {showImg ? (
        <img
          src={product.image_url}
          alt={product?.name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          src={artForProduct(product)}
          alt={product?.name || 'Producto'}
          loading="lazy"
        />
      )}
      {hasDiscount && !out && <span className="img-discount-tag">-{Number(discount)}%</span>}
      {out ? (
        <span className="img-out">Agotado</span>
      ) : (
        badge && <span className={`img-badge ${badgeVariant(badge)}`}>{badge}</span>
      )}
      {quick && <span className="product-quick">{quick}</span>}
    </div>
  );
}