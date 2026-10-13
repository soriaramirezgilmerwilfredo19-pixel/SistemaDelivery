import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  formatMoney,
  formatDate,
  STATUS_LABELS,
  STATUS_ICONS,
  STATUS_HINTS,
  STATUS_PROGRESS,
  TRACK_STEPS,
  PAYMENT_LABELS,
  ORDER_STATUSES,
  mapsSearchUrl,
  mapsDirectionsUrl
} from '../utils/orders';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';

function MapCard({ address, status, courierLocation, orderId }) {
  const [courier, setCourier] = useState(courierLocation || null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setCourier(courierLocation || null);
  }, [courierLocation]);

  useEffect(() => {
    function onEvent(e) {
      const d = e.detail;
      if (d?.type === 'location' && d.orderId === Number(orderId)) {
        setCourier({ lat: d.lat, lng: d.lng, updatedAt: Date.now() });
      }
    }
    window.addEventListener('delivery-event', onEvent);
    return () => window.removeEventListener('delivery-event', onEvent);
  }, [orderId]);

  useEffect(() => {
    if (!courier) return undefined;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [courier]);

  const tracking = courier && ['ready', 'picked_up'].includes(status);
  if (!address?.line1 && !tracking) return null;

  const search = mapsSearchUrl(address);
  const directions = mapsDirectionsUrl(address);
  const secondsAgo = courier?.updatedAt
    ? Math.max(0, Math.round((now - courier.updatedAt) / 1000))
    : null;

  const src = tracking
    ? `https://www.google.com/maps?q=${courier.lat},${courier.lng}&z=16&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(`${address.line1}, ${address.city}`)}&output=embed`;

  return (
    <div className={`map-card ${tracking ? 'is-live' : ''}`}>
      <div className="map-head">
        <div className="map-title">
          <span className="map-pin">{tracking ? '🛵' : '📍'}</span>
          <div>
            <strong>{tracking ? 'Tu repartidor va en camino' : 'Direccion de entrega'}</strong>
            {tracking ? (
              <small className="live-updated">
                <span className="live-dot" /> Ubicacion en vivo
                {secondsAgo !== null && ` · actualizado hace ${secondsAgo}s`}
              </small>
            ) : (
              <small>
                {address.label}: {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}, {address.city}
              </small>
            )}
          </div>
        </div>
        <div className="map-actions">
          <a className="btn btn-outline btn-sm" href={search} target="_blank" rel="noreferrer">
            🗺 Ver en Google Maps
          </a>
          {status === 'picked_up' && (
            <a className="btn btn-primary btn-sm" href={directions} target="_blank" rel="noreferrer">
              🧭 Como llegar
            </a>
          )}
        </div>
      </div>
      <div className="map-wrap">
        <iframe
          title="Ubicacion de entrega"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

function Tracking({ order }) {
  const statusIndex = ORDER_STATUSES.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const currentIdx = TRACK_STEPS.findIndex((s) => s.key === order.status);

  return (
    <section className="track-card">
      <div className="track-head">
        <div>
          <h3>📡 Seguimiento en vivo</h3>
          <p className="muted">
            {isCancelled
              ? 'Este pedido fue cancelado, el seguimiento se detuvo.'
              : 'Se actualiza solo, sin que tengas que recargar la pagina.'}
          </p>
        </div>
        {!isCancelled && (
          <span className="live-pill">
            <span className="live-dot" /> En vivo
          </span>
        )}
      </div>

      {!isCancelled && (
        <>
          <div className="track-bar">
            <span style={{ width: `${STATUS_PROGRESS[order.status] || 0}%` }} />
          </div>
          <ol className="track-steps">
            {TRACK_STEPS.map((s, i) => {
              const done = currentIdx > -1 && i < currentIdx;
              const active = i === currentIdx;
              return (
                <li key={s.key} className={`track-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}>
                  <span className="track-icon">{done ? '✓' : s.icon}</span>
                  <span className="track-label">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}

function StatusTimeline({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <section className="card">
      <h3>🕓 Historial del pedido</h3>
      <p className="hint">Todo lo que ha pasado con tu pedido, con fecha y hora.</p>
      <ol className="timeline">
        {history.map((h, i) => (
          <li key={h.id} className={`timeline-item ${i === history.length - 1 ? 'is-latest' : ''}`}>
            <span className="tl-icon">{STATUS_ICONS[h.status] || '📦'}</span>
            <div className="tl-body">
              <strong>{STATUS_LABELS[h.status] || h.status}</strong>
              {h.note && <p>{h.note}</p>}
              <small>
                {formatDate(h.created_at)}
                {h.actor_name ? ` · ${h.actor_name}` : ''}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = useCallback(() => {
    client
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onEvent(e) {
      if (e.detail?.orderId === Number(id) && e.detail?.type !== 'location') load();
    }
    window.addEventListener('delivery-event', onEvent);
    return () => window.removeEventListener('delivery-event', onEvent);
  }, [id, load]);

  async function pay() {
    setPaying(true);
    try {
      await client.post(`/orders/${id}/pay`);
      toast('Pago simulado realizado con exito', 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <Loader />;
  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const paid = order.payment_status === 'paid';

  return (
    <div className="order-detail">
      <div className="detail-top">
        <Link to="/pedidos" className="back-link">← Mis pedidos</Link>
        <h2>Pedido #{order.id}</h2>
        <p className="muted">Creado el {formatDate(order.created_at)}</p>
      </div>

      <div className={`status-hero sh-${order.status}`}>
        <span className="sh-icon">{STATUS_ICONS[order.status] || '📦'}</span>
        <div className="sh-text">
          <strong>{STATUS_LABELS[order.status] || order.status}</strong>
          <p>{STATUS_HINTS[order.status] || ''}</p>
        </div>
        <div className="sh-side">
          <StatusBadge status={order.status} />
          <span className={`pay-pill ${paid ? 'pay-pill-paid' : 'pay-pill-pending'}`}>
            {paid ? '✓ Pagado' : 'Pago pendiente'}
          </span>
        </div>
      </div>

      {order.custom_request && (
        <section className="card custom-request-card">
          <div className="cr-head">
            <span className="cr-icon">🎨</span>
            <div>
              <h3>Pedido personalizado</h3>
              <p className="hint">Lo que pidió el cliente a su gusto, tal cual lo describió</p>
            </div>
          </div>
          <blockquote className="cr-text">{order.custom_request}</blockquote>
        </section>
      )}

      <div className="detail-grid">
        <div className="detail-col">
          <Tracking order={order} />

          <StatusTimeline history={order.history} />

          <section className="card">
            <h3>🧾 Productos</h3>
            <div className="items-table">
              {order.items?.map((it) => (
                <div key={it.id} className="items-row">
                  <span>{it.quantity}x {it.product_name}</span>
                  <span>{formatMoney(it.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="totals">
              <div className="items-row"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
              <div className="items-row"><span>Envio</span><span>{formatMoney(order.delivery_fee)}</span></div>
              <div className="items-row total"><span>Total</span><span>{formatMoney(order.total)}</span></div>
            </div>
          </section>
        </div>

        <div className="detail-col">
          <section className="card">
            <h3>💳 Pago</h3>
            <div className="payment-box">
              <span className="pb-icon">{order.payment_method === 'card' ? '💳' : '💵'}</span>
              <div className="pb-info">
                <strong>{PAYMENT_LABELS[order.payment_method]}</strong>
                <small>
                  {paid
                    ? 'Pago recibido, no hay nada pendiente'
                    : order.payment_method === 'card'
                      ? 'Paga ahora con tarjeta (simulado)'
                      : 'Pagas en efectivo al recibir tu pedido'}
                </small>
              </div>
              <span className={`pay-pill ${paid ? 'pay-pill-paid' : 'pay-pill-pending'}`}>
                {paid ? '✓ Pagado' : 'Pendiente'}
              </span>
            </div>
            {order.payment_method === 'card' && !paid && (
              <button className="btn btn-primary btn-block pay-now-btn" onClick={pay} disabled={paying}>
                {paying ? <><span className="spin" /> Procesando pago...</> : `🔒 Pagar ${formatMoney(order.total)}`}
              </button>
            )}
            <p className="hint">
              {order.payment_method === 'cash'
                ? 'Pagas en efectivo cuando el repartidor te entregue el pedido.'
                : 'El pago con tarjeta es simulado: no se realiza ningun cargo real.'}
            </p>
          </section>

          <section className="card">
            <h3>🚚 Entrega</h3>
            {order.courier_name ? (
              <div className="courier-chip">
                <span className="cc-avatar">{order.courier_name.charAt(0)}</span>
                <div>
                  <strong>{order.courier_name}</strong>
                  <small>Repartidor asignado a tu pedido</small>
                </div>
              </div>
            ) : (
              <p className="muted">Aun no hay repartidor asignado.</p>
            )}
            {order.notes && <p className="hint">📝 {order.notes}</p>}
          </section>
        </div>
      </div>

      <MapCard
        address={order.address}
        status={order.status}
        courierLocation={order.courier_location}
        orderId={order.id}
      />
    </div>
  );
}
