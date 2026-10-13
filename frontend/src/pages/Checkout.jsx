import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../utils/orders';
import Loader from '../components/Loader';

const CARD_MASKS = {
  visa: [4, 4, 4, 4],
  mastercard: [4, 4, 4, 4],
  amex: [4, 6, 5],
  discover: [4, 4, 4, 4],
  default: [4, 4, 4, 4]
};

const BRAND_LABEL = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  default: 'Tarjeta'
};

function onlyDigits(v) {
  return v.replace(/\D/g, '');
}

function detectBrand(raw) {
  const n = onlyDigits(raw);
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  return 'default';
}

function luhnOk(num) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function formatCardNumber(value) {
  const brand = detectBrand(value);
  const groups = CARD_MASKS[brand];
  const digits = onlyDigits(value).slice(0, groups.reduce((a, b) => a + b, 0));
  const out = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + size));
    i += size;
  }
  return out.join(' ');
}

function maskCardNumber(raw, brand) {
  const groups = CARD_MASKS[brand];
  const digits = onlyDigits(raw);
  const out = [];
  let i = 0;
  for (const size of groups) {
    let g = '';
    for (let j = 0; j < size; j++) {
      g += digits[i] ?? '•';
      i++;
    }
    out.push(g);
  }
  return out.join(' ');
}

function formatExpiry(value) {
  const d = onlyDigits(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function validateCard(card) {
  const errs = {};
  const digits = onlyDigits(card.number);
  if (!digits) errs.number = 'Ingresa el numero de tu tarjeta';
  else if (!luhnOk(digits)) errs.number = 'Numero de tarjeta invalido';

  if (card.name.trim().length < 3) errs.name = 'Escribe el nombre como figura en la tarjeta';

  const m = card.expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m) {
    errs.expiry = 'Formato MM/AA';
  } else {
    const mm = Number(m[1]);
    const exp = new Date(2000 + Number(m[2]), mm, 1);
    if (mm < 1 || mm > 12) errs.expiry = 'Mes invalido';
    else if (exp <= new Date()) errs.expiry = 'Tarjeta vencida';
  }

  if (!/^\d{3,4}$/.test(card.cvv)) errs.cvv = 'CVV de 3 o 4 digitos';
  return errs;
}

function addrIcon(label = '') {
  const l = label.toLowerCase();
  if (l.includes('oficina') || l.includes('trabajo')) return '🏢';
  if (l.includes('casa') || l.includes('hogar')) return '🏠';
  if (l.includes('hotel')) return '🏨';
  return '📍';
}

function CardPreview({ number, name, expiry, brand }) {
  const label = BRAND_LABEL[brand] || BRAND_LABEL.default;
  return (
    <div className={`card-preview brand-${brand}`}>
      <div className="cp-top">
        <span className="cp-chip" />
        <span className="cp-brand">{label}</span>
      </div>
      <div className="cp-number">{maskCardNumber(number, brand)}</div>
      <div className="cp-bottom">
        <div className="cp-field">
          <small>Titular</small>
          <span>{(name || 'TU NOMBRE').toUpperCase()}</span>
        </div>
        <div className="cp-field">
          <small>Vence</small>
          <span>{expiry || 'MM/AA'}</span>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const toast = useToast();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [cart, setCart] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashPaid, setCashPaid] = useState('');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [cardErrors, setCardErrors] = useState({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Casa', line1: '', city: '' });

  useEffect(() => {
    Promise.all([
      client.get('/addresses'),
      client.get('/cart'),
      client.get('/config').catch(() => ({ data: { data: null } }))
    ])
      .then(([addrRes, cartRes, cfgRes]) => {
        setAddresses(addrRes.data.data);
        setCart(cartRes.data.data);
        setCfg(cfgRes.data.data);
        const def = addrRes.data.data.find((a) => a.is_default) || addrRes.data.data[0];
        if (def) setAddressId(def.id);
        else setShowForm(true);
      })
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const brand = detectBrand(card.number);
  const deliveryFee = cfg ? Number(cfg.delivery_fee) : 2.5;
  const freeOver = cfg ? Number(cfg.free_delivery_over) : 25;

  const subtotal = cart ? Number(cart.subtotal) : 0;
  const originalTotal = cart
    ? cart.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
    : 0;
  const savings = originalTotal - subtotal;
  const isFreeShipping = freeOver > 0 && subtotal >= freeOver;
  const fee = isFreeShipping ? 0 : deliveryFee;
  const toFree = freeOver - subtotal;
  const total = subtotal + fee;

  const change = useMemo(() => {
    if (paymentMethod !== 'cash' || !cashPaid) return null;
    const paid = Number(cashPaid);
    if (Number.isNaN(paid)) return null;
    return Number((paid - total).toFixed(2));
  }, [paymentMethod, cashPaid, total]);

  const currentStep = !addressId ? 1 : submitting ? 3 : 2;

  async function createAddress(e) {
    e.preventDefault();
    try {
      const res = await client.post('/addresses', { ...newAddress, is_default: addresses.length === 0 });
      setAddresses([...addresses, res.data.address]);
      setAddressId(res.data.address.id);
      setShowForm(false);
      toast('Direccion guardada', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!addressId) {
      toast('Selecciona o crea una direccion de entrega', 'error');
      return;
    }

    if (paymentMethod === 'card') {
      const errs = validateCard(card);
      setCardErrors(errs);
      if (Object.keys(errs).length > 0) {
        toast('Revisa los datos de la tarjeta', 'error');
        return;
      }
    }

    if (paymentMethod === 'cash' && change !== null && change < 0) {
      toast('El monto en efectivo no alcanza para cubrir el total', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let notesPayload = notes;
      if (paymentMethod === 'cash' && cashPaid) {
        const extra = `Paga con ${formatMoney(cashPaid)}, cambio ${formatMoney(Math.max(change, 0))}`;
        notesPayload = notes ? `${notes} — ${extra}` : extra;
      }

      const res = await client.post('/cart/checkout', {
        address_id: addressId,
        payment_method: paymentMethod,
        notes: notesPayload
      });

      if (paymentMethod === 'card') {
        await client.post(`/orders/${res.data.order.id}/pay`);
        toast('Pago aprobado. Tu pedido fue confirmado', 'success');
      } else {
        toast('Pedido creado. Pagas en efectivo al recibir', 'success');
      }
      navigate(`/pedidos/${res.data.order.id}`);
    } catch (err) {
      toast(apiError(err), 'error');
      setSubmitting(false);
    }
  }

  if (loading) return <Loader />;
  if (!cart || cart.items.length === 0) {
    navigate('/carrito');
    return null;
  }

  const steps = [
    { n: 1, label: 'Entrega', icon: '📍' },
    { n: 2, label: 'Pago', icon: '💳' },
    { n: 3, label: 'Confirmar', icon: '🧾' }
  ];

  return (
    <div className="checkout-page">
      <form className="checkout-main" onSubmit={handleSubmit} noValidate>
        <div className="steps">
          {steps.map((s) => (
            <div
              key={s.n}
              className={`step ${currentStep === s.n ? 'step-active' : ''} ${currentStep > s.n ? 'step-done' : ''}`}
            >
              <span className="step-num">{currentStep > s.n ? '✓' : s.icon}</span>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>

        <section className="card co-section">
          <div className="section-head">
            <span className="section-num">1</span>
            <div>
              <h3>Direccion de entrega</h3>
              <p className="hint">A donde llevamos tu pedido</p>
            </div>
          </div>

          {addresses.length > 0 && (
            <div className="addr-list">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`addr-card ${addressId === a.id ? 'addr-card-on' : ''}`}
                >
                  <input
                    type="radio"
                    name="address"
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

        <section className="card co-section">
          <div className="section-head">
            <span className="section-num">2</span>
            <div>
              <h3>Como quieres pagar</h3>
              <p className="hint">Elige el metodo que te quede mas comodo</p>
            </div>
          </div>

          <div className="pay-grid">
            <button
              type="button"
              className={`pay-card ${paymentMethod === 'cash' ? 'pay-card-on' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <span className="pay-icon">💵</span>
              <span className="pay-title">Efectivo</span>
              <span className="pay-desc">Pagas al recibir tu pedido en la puerta</span>
              <span className="pay-check">{paymentMethod === 'cash' ? '✓' : ''}</span>
            </button>

            <button
              type="button"
              className={`pay-card ${paymentMethod === 'card' ? 'pay-card-on' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <span className="pay-icon">💳</span>
              <span className="pay-title">Tarjeta</span>
              <span className="pay-desc">Debito o credito, aprobacion inmediata</span>
              <span className="pay-check">{paymentMethod === 'card' ? '✓' : ''}</span>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="pay-extra">
              <label className="field">
                <span className="field-label">¿Con cuanto pagas? (opcional)</span>
                <div className="input-affix">
                  <span className="affix">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder={total.toFixed(2)}
                    value={cashPaid}
                    onChange={(e) => setCashPaid(e.target.value)}
                  />
                </div>
              </label>
              {change !== null && (
                change >= 0 ? (
                  <div className="change-box change-ok">
                    <span>Tu cambio</span>
                    <strong>{formatMoney(change)}</strong>
                  </div>
                ) : (
                  <div className="change-box change-short">
                    <span>Faltan</span>
                    <strong>{formatMoney(Math.abs(change))}</strong>
                  </div>
                )
              )}
              <p className="hint">El repartidor lleva cambio disponible. Puedes pagar el total al momento de la entrega.</p>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="pay-extra">
              <div className="card-entry">
                <CardPreview number={card.number} name={card.name} expiry={card.expiry} brand={brand} />

                <div className="card-form">
                  <label className="field">
                    <span className="field-label">Numero de tarjeta</span>
                    <input
                      className="cc-input"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      value={card.number}
                      onChange={(e) => {
                        setCard({ ...card, number: formatCardNumber(e.target.value) });
                        setCardErrors({ ...cardErrors, number: undefined });
                      }}
                    />
                    {cardErrors.number && <em className="field-error">{cardErrors.number}</em>}
                  </label>

                  <label className="field">
                    <span className="field-label">Titular de la tarjeta</span>
                    <input
                      className="cc-input"
                      autoComplete="cc-name"
                      placeholder="Como figura en la tarjeta"
                      value={card.name}
                      onChange={(e) => {
                        setCard({ ...card, name: e.target.value.toUpperCase() });
                        setCardErrors({ ...cardErrors, name: undefined });
                      }}
                    />
                    {cardErrors.name && <em className="field-error">{cardErrors.name}</em>}
                  </label>

                  <div className="field-row">
                    <label className="field">
                      <span className="field-label">Vencimiento</span>
                      <input
                        className="cc-input"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/AA"
                        value={card.expiry}
                        onChange={(e) => {
                          setCard({ ...card, expiry: formatExpiry(e.target.value) });
                          setCardErrors({ ...cardErrors, expiry: undefined });
                        }}
                      />
                      {cardErrors.expiry && <em className="field-error">{cardErrors.expiry}</em>}
                    </label>

                    <label className="field">
                      <span className="field-label">CVV</span>
                      <input
                        className="cc-input"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        maxLength={4}
                        value={card.cvv}
                        onChange={(e) => {
                          setCard({ ...card, cvv: onlyDigits(e.target.value).slice(0, 4) });
                          setCardErrors({ ...cardErrors, cvv: undefined });
                        }}
                      />
                      {cardErrors.cvv && <em className="field-error">{cardErrors.cvv}</em>}
                    </label>
                  </div>

                  <div className="demo-hint">
                    <span>🧪</span>
                    <div>
                      <strong>Entorno de prueba</strong>
                      <p>No se realiza ningun cargo real. Usa <code>4242 4242 4242 4242</code> con cualquier fecha futura y CVV.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="secure-note">
                🔒 Cifrado SSL · Tus datos viajan protegidos y nunca se almacenan en nuestros servidores
              </div>
            </div>
          )}
        </section>

        <section className="card co-section">
          <div className="section-head">
            <span className="section-num">3</span>
            <div>
              <h3>Detalles del pedido</h3>
              <p className="hint">Opcional, pero ayuda al repartidor</p>
            </div>
          </div>

          <label className="field">
            <span className="field-label">Notas para el repartidor</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: timbre danyado, llamar al llegar, porton negro..."
            />
          </label>

          <button
            className={`btn btn-primary btn-block checkout-cta ${submitting ? 'is-loading' : ''}`}
            disabled={submitting}
          >
            {submitting ? (
              <><span className="spin" /> Procesando...</>
            ) : paymentMethod === 'card' ? (
              <>🔒 Pagar {formatMoney(total)}</>
            ) : (
              <>Confirmar pedido · {formatMoney(total)}</>
            )}
          </button>

          <p className="cta-note">
            {paymentMethod === 'card'
              ? 'Se realizara un cargo simulado por el total del pedido.'
              : 'Pagas en efectivo cuando recibas tu pedido.'}
          </p>
        </section>
      </form>

      <aside className="checkout-aside">
        <div className="card summary-card summary-sticky">
          <div className="summary-head">
            <h3>Tu pedido</h3>
            <span className="eta-badge">⚡ {cfg?.eta_minutes || '25-45'} min</span>
          </div>

          <div className="summary-items">
            {cart.items.map((i) => (
              <div key={i.product_id} className="summary-item">
                <span className="si-qty">{i.quantity}</span>
                <span className="si-name">
                  {i.name}
                  <small>{formatMoney(i.unit_price)} c/u</small>
                </span>
                <span className="si-price">{formatMoney(i.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="summary-lines">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {savings > 0 && (
              <div className="summary-row savings-row">
                <span>Descuentos aplicados</span>
                <span>−{formatMoney(savings)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Envio</span>
              <span className={isFreeShipping ? 'ship-free' : ''}>
                {isFreeShipping ? 'GRATIS' : formatMoney(fee)}
              </span>
            </div>
          </div>

          {!isFreeShipping && freeOver > 0 && toFree > 0 && (
            <div className="free-ship-hint">
              <div className="fs-bar"><span style={{ width: `${Math.min(100, (subtotal / freeOver) * 100)}%` }} /></div>
              <p>Agrega <strong>{formatMoney(toFree)}</strong> mas y el envio es <strong>gratis</strong></p>
            </div>
          )}

          <div className="summary-total">
            <span>Total</span>
            <strong>{formatMoney(total)}</strong>
          </div>

          <ul className="trust-row">
            <li>🔒 Pago seguro</li>
            <li>⚡ Entrega rapida</li>
            <li>🛡️ Pedido protegido</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
