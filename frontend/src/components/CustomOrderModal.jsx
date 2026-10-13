import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../utils/orders';

const DISH_OPTIONS = [
  { id: 'hamburguesa', emoji: '🍔', label: 'Hamburguesa' },
  { id: 'pizza', emoji: '🍕', label: 'Pizza' },
  { id: 'papitas', emoji: '🍟', label: 'Papitas' },
  { id: 'alitas', emoji: '🍗', label: 'Alitas' },
  { id: 'combo', emoji: '🍱', label: 'Combo' },
  { id: 'plato', emoji: '🍛', label: 'Plato del día' },
  { id: 'postre', emoji: '🍰', label: 'Postre' },
  { id: 'bebida', emoji: '🥤', label: 'Bebida' },
  { id: 'otro', emoji: '✨', label: 'Otro' }
];

function addrIcon(label = '') {
  const l = label.toLowerCase();
  if (l.includes('oficina') || l.includes('trabajo')) return '🏢';
  if (l.includes('casa') || l.includes('hogar')) return '🏠';
  if (l.includes('hotel')) return '🏨';
  return '📍';
}

export default function CustomOrderModal({ onClose }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [dishType, setDishType] = useState('hamburguesa');
  const [customRequest, setCustomRequest] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [budget, setBudget] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Casa', line1: '', city: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAddresses = useCallback(() => {
    client
      .get('/addresses')
      .then((res) => {
        setAddresses(res.data.data);
        const def = res.data.data.find((a) => a.is_default) || res.data.data[0];
        if (def) setAddressId(def.id);
        else setShowForm(true);
      })
      .catch((err) => toast(apiError(err), 'error'));
  }, [toast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function createAddress(e) {
    e.preventDefault();
    try {
      const res = await client.post('/addresses', { ...newAddress, is_default: addresses.length === 0 });
      setAddresses((list) => [...list, res.data.address]);
      setAddressId(res.data.address.id);
      setShowForm(false);
      toast('Direccion guardada', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customRequest.trim()) {
      toast('Cuentanos que quieres pedir', 'error');
      return;
    }
    if (!addressId) {
      toast('Selecciona o crea una direccion de entrega', 'error');
      return;
    }
    const b = Number(budget);
    if (!b || b <= 0) {
      toast('Indica tu presupuesto estimado', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post('/orders/custom', {
        address_id: addressId,
        payment_method: paymentMethod,
        dish_type: dishType,
        custom_request: customRequest.trim(),
        quantity,
        budget: b,
        notes
      });
      const orderId = res.data.order.id;

      if (paymentMethod === 'card') {
        await client.post(`/orders/${orderId}/pay`);
        toast('🎨 Pedido personalizado enviado y pagado', 'success');
      } else {
        toast('🎨 Pedido personalizado enviado. Pagas en efectivo al recibir', 'success');
      }
      onClose();
      navigate(`/pedidos/${orderId}`);
    } catch (err) {
      toast(apiError(err), 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg co-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        <form onSubmit={handleSubmit} noValidate>
          <header className="co-head">
            <span className="co-icon">🎨</span>
            <div>
              <h2>Pedido personalizado</h2>
              <p className="hint">
                No encontraste lo que querias en el menu? Cuentanos lo que se te antoje
                y lo preparamos especialmente para ti.
              </p>
            </div>
          </header>

          <section className="co-section">
            <h3>¿Qué se te antoja?</h3>
            <div className="co-dish-grid">
              {DISH_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`co-dish ${dishType === d.id ? 'co-dish-on' : ''}`}
                  onClick={() => setDishType(d.id)}
                >
                  <span className="co-dish-emoji">{d.emoji}</span>
                  {d.label}
                </button>
              ))}
            </div>

            <label className="field">
              <span className="field-label">Describe tu pedido a tu gusto</span>
              <textarea
                rows={3}
                maxLength={400}
                value={customRequest}
                onChange={(e) => setCustomRequest(e.target.value)}
                placeholder="Ej: hamburguesa de pollo con extra queso, sin cebolla y papas caseras grandes..."
                required
              />
            </label>

            <div className="co-budget-row">
              <label className="field">
                <span className="field-label">Cantidad</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                />
              </label>
              <label className="field">
                <span className="field-label">Presupuesto estimado</span>
                <div className="input-affix">
                  <span className="affix">S/</span>
                  <input
                    type="number"
                    min="1"
                    step="0.50"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </label>
            </div>
            <p className="hint">
              El presupuesto es la referencia con la que el local prepara tu pedido y calcula
              el total (envío gratis desde el umbral configurado). Confirmamos el precio final contigo.
            </p>
          </section>

          <section className="co-section">
            <h3>📍 Direccion de entrega</h3>
            {addresses.length > 0 && (
              <div className="addr-list">
                {addresses.map((a) => (
                  <label key={a.id} className={`addr-card ${addressId === a.id ? 'addr-card-on' : ''}`}>
                    <input
                      type="radio"
                      name="co-address"
                      className="sr-only"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                    />
                    <span className="addr-icon">{addrIcon(a.label)}</span>
                    <span className="addr-body">
                      <strong>{a.label}</strong>
                      <small>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}</small>
                    </span>
                    {a.is_default && <span className="addr-tag">Principal</span>}
                  </label>
                ))}
              </div>
            )}

            {!showForm && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}>
                + Usar otra direccion
              </button>
            )}

            {showForm && (
              <div className="subform">
                <input
                  placeholder="Etiqueta (Casa, Oficina...)"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  required
                />
                <input
                  placeholder="Direccion (linea principal)"
                  value={newAddress.line1}
                  onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                  required
                />
                <input
                  placeholder="Ciudad"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  required
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={createAddress}>
                  Guardar direccion
                </button>
              </div>
            )}
          </section>

          <section className="co-section">
            <h3>💳 Pago</h3>
            <div className="pay-grid">
              <button
                type="button"
                className={`pay-card ${paymentMethod === 'cash' ? 'pay-card-on' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <span className="pay-icon">💵</span>
                <span className="pay-title">Efectivo</span>
                <span className="pay-desc">Pagas al recibir</span>
                <span className="pay-check">{paymentMethod === 'cash' ? '✓' : ''}</span>
              </button>
              <button
                type="button"
                className={`pay-card ${paymentMethod === 'card' ? 'pay-card-on' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <span className="pay-icon">💳</span>
                <span className="pay-title">Tarjeta</span>
                <span className="pay-desc">Aprobacion inmediata (simulado)</span>
                <span className="pay-check">{paymentMethod === 'card' ? '✓' : ''}</span>
              </button>
            </div>

            <label className="field">
              <span className="field-label">Notas para el repartidor</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: timbre danyado, llamar al llegar..."
              />
            </label>
          </section>

          <button
            className={`btn btn-primary btn-block co-submit ${submitting ? 'is-loading' : ''}`}
            disabled={submitting}
          >
            {submitting ? (
              <><span className="spin" /> Enviando pedido...</>
            ) : (
              '🎨 Enviar pedido personalizado'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}