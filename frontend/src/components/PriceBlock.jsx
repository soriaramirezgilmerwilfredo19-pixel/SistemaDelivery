import { formatMoney } from '../utils/currency';

export function PriceBlock({ price, finalPrice, discount, size = 'md' }) {
  const hasDiscount = Number(discount) > 0;
  return (
    <div className={`price-block price-${size}`}>
      <span className="price-final">{formatMoney(finalPrice ?? price)}</span>
      {hasDiscount && (
        <>
          <span className="price-old">{formatMoney(price)}</span>
          <span className="discount-badge">-{Number(discount)}%</span>
        </>
      )}
    </div>
  );
}
