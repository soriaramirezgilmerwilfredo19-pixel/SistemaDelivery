import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../utils/orders';
import ProductImage from '../components/ProductImage';
import { PriceBlock } from '../components/PriceBlock';
import Loader from '../components/Loader';

export default function Cart() {
  const toast = useToast();
  const navigate = useNavigate();
  const { setCartCount } = useOutletContext();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  function applyCart(data) {
    setCart(data);
    setCartCount(data.items.length);
  }

  useEffect(() => {
    client
      .get('/cart')
      .then((res) => applyCart(res.data.data))
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function updateQty(productId, quantity) {
    try {
      const res = await client.put(`/cart/items/${productId}`, { quantity });
      applyCart(res.data.data);
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function removeItem(productId) {
    try {
      const res = await client.delete(`/cart/items/${productId}`);
      applyCart(res.data.data);
      toast('Producto eliminado del carrito', 'info');
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  if (loading) return <Loader />;
  if (!cart) return null;

  const original = cart.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const subtotal = Number(cart.subtotal);
  const saved = Number((original - subtotal).toFixed(2));

  if (cart.items.length === 0) {
    return (
      <div className="empty-state">
        <h3>Tu carrito esta vacio</h3>
        <Link to="/" className="btn btn-primary">Ver catalogo</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Mi carrito</h2>
      <div className="card">
        {cart.items.map((item) => (
          <div key={item.product_id} className="cart-row">
            <ProductImage product={item} className="cart-thumb" discount={item.discount} />
            <div className="cart-info">
              <strong>{item.name}</strong>
              <PriceBlock price={item.price} finalPrice={item.unit_price} discount={item.discount} size="sm" />
              {item.stock !== null && item.stock !== undefined && (
                <small className="muted">Stock disponible: {item.stock}</small>
              )}
            </div>
            <div className="qty-controls">
              <button className="btn btn-outline btn-sm" onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
              <span className="qty">{item.quantity}</span>
              <button
                className="btn btn-outline btn-sm"
                disabled={item.stock !== null && item.stock !== undefined && item.quantity >= item.stock}
                onClick={() => updateQty(item.product_id, item.quantity + 1)}
              >
                +
              </button>
            </div>
            <strong className="cart-subtotal">{formatMoney(item.subtotal)}</strong>
            <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.product_id)}>Eliminar</button>
          </div>
        ))}
        <div className="cart-footer">
          <div className="cart-meta">
            <span>{cart.items.reduce((s, i) => s + i.quantity, 0)} producto(s) en tu carrito</span>
            {saved > 0 && (
              <span className="cart-saved">🎉 Ahorras {formatMoney(saved)}</span>
            )}
          </div>
          <div className="cart-total">
            <div className="cart-total-box">
              <small>Subtotal</small>
              <strong>{formatMoney(cart.subtotal)}</strong>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/checkout')}>
              Continuar al pago →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
