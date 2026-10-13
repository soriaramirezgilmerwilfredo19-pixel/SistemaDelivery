import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatMoney, formatDate, STATUS_ICONS, STATUS_HINTS } from '../utils/orders';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client
      .get('/orders')
      .then((res) => setOrders(res.data.data))
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    function onEvent() {
      load();
    }
    window.addEventListener('delivery-event', onEvent);
    return () => window.removeEventListener('delivery-event', onEvent);
  }, [load]);

  async function cancelOrder(id) {
    if (!window.confirm('¿Seguro que quieres cancelar este pedido?')) return;
    try {
      await client.post(`/orders/${id}/cancel`);
      toast('Pedido cancelado', 'info');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  if (loading) return <Loader />;

  if (orders?.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-emoji">🛍️</span>
        <h3>Todavia no has hecho pedidos</h3>
        <p className="muted">Explora el catalogo y haz tu primer pedido, llega en 25-45 min.</p>
        <Link to="/" className="btn btn-primary">Ver catalogo</Link>
      </div>
    );
  }

  const active = (orders || []).filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2 className="section-title">Mis pedidos</h2>
          <p className="muted">
            {active > 0
              ? `${active} pedido(s) en curso con seguimiento en vivo`
              : `${orders?.length || 0} pedido(s) en total`}
          </p>
        </div>
        {active > 0 && (
          <span className="live-pill">
            <span className="live-dot" /> {active} en vivo
          </span>
        )}
      </div>

      <div className="order-list">
        {orders?.map((o) => {
          const isLive = !['delivered', 'cancelled'].includes(o.status);
          return (
            <div key={o.id} className={`card order-card oc-${o.status}`}>
              <div className="order-head">
                <Link to={`/pedidos/${o.id}`} className="oc-title">
                  <span className="oc-emoji">{STATUS_ICONS[o.status]}</span>
                  <strong>Pedido #{o.id}</strong>
                </Link>
                <div className="oc-badges">
                  {isLive && <span className="mini-live"><span className="live-dot" /> En vivo</span>}
                  <span className={`pay-pill ${o.payment_status === 'paid' ? 'pay-pill-paid' : 'pay-pill-pending'}`}>
                    {o.payment_status === 'paid' ? '✓ Pagado' : 'Pendiente'}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
              <p className="muted">{formatDate(o.created_at)} — {o.address_line1 || 'Sin direccion'}</p>
              <p className="oc-hint">{STATUS_HINTS[o.status]}</p>
              <div className="order-foot">
                <span>{o.items_count} producto(s) — <strong>{formatMoney(o.total)}</strong></span>
                <div className="oc-actions">
                  {o.status === 'pending' && (
                    <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o.id)}>
                      Cancelar
                    </button>
                  )}
                  <Link to={`/pedidos/${o.id}`} className="btn btn-outline btn-sm">
                    {isLive ? '📡 Ver seguimiento →' : 'Ver detalle →'}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

