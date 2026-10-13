import { useCallback, useEffect, useState } from 'react';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PriceBlock } from './PriceBlock';
import Stars from './Stars';
import ProductImage from './ProductImage';
import { formatMoney } from '../utils/currency';

export default function QuickView({ product, adding, onAdd, onClose }) {
  const toast = useToast();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const loadReviews = useCallback(() => {
    client
      .get(`/reviews/product/${product.id}`)
      .then((res) => setReviews(res.data.data))
      .catch(() => {});
  }, [product.id]);

  useEffect(loadReviews, [loadReviews]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submitReview(e) {
    e.preventDefault();
    setSending(true);
    try {
      await client.post(`/reviews/product/${product.id}`, { rating, comment });
      toast('Reseña publicada. Gracias!', 'success');
      setComment('');
      setRating(5);
      loadReviews();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setSending(false);
    }
  }

  async function deleteReview(id) {
    if (!window.confirm('¿Eliminar tu reseña?')) return;
    try {
      await client.delete(`/reviews/${id}`);
      toast('Reseña eliminada', 'info');
      loadReviews();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  if (!product.available) return null;

  const avg = Number(product.avg_rating) || 0;
  const count = Number(product.review_count) || 0;
  const stock = product.stock === null || product.stock === undefined ? null : Number(product.stock);
  const soldOut = stock !== null && stock <= 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        <ProductImage product={product} discount={product.discount} className="modal-img" />
        <div className="modal-body">
          <span className="product-cat">{product.category?.name || 'Sin categoria'}</span>
          <h2>{product.name}</h2>
          <p className="muted">{product.description}</p>

          <div className="modal-meta">
            <PriceBlock price={product.price} finalPrice={product.final_price} discount={product.discount} size="lg" />
            {count > 0 && (
              <div className="product-rating">
                <Stars value={avg} />
                <small>{avg.toFixed(1)} ({count} reseña{count !== 1 ? 's' : ''})</small>
              </div>
            )}
          </div>

          <p className={`stock-line ${soldOut ? 'stock-out' : stock !== null && stock <= 5 ? 'stock-low' : ''}`}>
            {soldOut
              ? '❌ Producto agotado por el momento'
              : stock === null
                ? '✅ Disponible'
                : stock <= 5
                  ? `⚠️ ¡Date prisa! Solo quedan ${stock}`
                  : `✅ Disponible (${stock} unidades)`}
          </p>

          <div className="modal-actions">
            <div className="qty-controls">
              <button className="btn btn-outline btn-sm" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="qty">{qty}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setQty(qty + 1)}>+</button>
            </div>
            <button className="btn btn-primary" disabled={adding || soldOut} onClick={() => onAdd(qty)}>
              {soldOut ? 'Agotado' : adding ? 'Agregando...' : `Agregar — ${formatMoney(Number(product.final_price ?? product.price) * qty)}`}
            </button>
          </div>

          <div className="reviews-section">
            <h3>Reseñas</h3>

            {user?.role === 'client' && (
              <form className="review-form" onSubmit={submitReview}>
                <div className="review-stars-input">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={i <= rating ? 'star-btn star-on' : 'star-btn'}
                      onClick={() => setRating(i)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Cuenta como te parecio este producto..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                />
                <button className="btn btn-primary btn-sm" disabled={sending}>
                  {sending ? 'Enviando...' : 'Publicar reseña'}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="muted">Sé el primero en reseñar este producto.</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((r) => (
                  <div key={r.id} className="review-item">
                    <div className="review-head">
                      <strong>{r.user_name}</strong>
                      <Stars value={r.rating} />
                      {r.user_id === user?.id && (
                        <button className="review-delete" onClick={() => deleteReview(r.id)}>×</button>
                      )}
                    </div>
                    {r.comment && <p>{r.comment}</p>}
                    <small className="muted">{new Date(r.created_at).toLocaleDateString('es-ES')}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
