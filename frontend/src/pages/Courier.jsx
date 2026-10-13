import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../utils/orders';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';

function MapEmbed({ line1, city }) {
  if (!line1) return null;
  const q = encodeURIComponent(`${line1}, ${city}`);
  return (
    <div className="map-wrap map-small">
      <iframe
        title="Mapa de entrega"
        src={`https://www.google.com/maps?q=${q}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

const HIDDEN_STATUSES = ['delivered', 'cancelled'];

export default function Courier() {
  const toast = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [tab, setTab] = useState('active');
  const [geoState, setGeoState] = useState('off');
  const lastPosRef = useRef(null);

  const load = useCallback(() => {
    client
      .get('/courier/orders')
      .then((res) => setOrders(res.data.data))
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  useEffect(() => {
    function onEvent() {
      load();
    }
    window.addEventListener('delivery-event', onEvent);
    return () => window.removeEventListener('delivery-event', onEvent);
  }, [load]);

  useEffect(() => {
    if (geoState !== 'sharing') return undefined;
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [geoState]);

  useEffect(() => {
    if (geoState !== 'sharing') return undefined;
    let stopped = false;
    async function push() {
      const pos = lastPosRef.current;
      if (!pos || stopped) return;
      try {
        await client.put('/courier/location', pos);
      } catch {
        /* se reintenta en el siguiente ciclo */
      }
    }
    push();
    const timer = setInterval(push, 8000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [geoState]);

  async function updateStatus(id, status) {
    setUpdating(id);
    try {
      await client.put(`/courier/orders/${id}/status`, { status });
      toast(status === 'picked_up' ? 'Pedido recogido 🛵' : 'Pedido entregado ✅', 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setUpdating(null);
    }
  }

  const groups = useMemo(() => {
    const list = orders || [];
    return {
      waiting: list.filter((o) => ['pending', 'confirmed', 'preparing'].includes(o.status)),
      toPick: list.filter((o) => o.status === 'ready'),
      onRoute: list.filter((o) => o.status === 'picked_up'),
      done: list.filter((o) => HIDDEN_STATUSES.includes(o.status))
    };
  }, [orders]);

  const activeCount = groups.waiting.length + groups.toPick.length + groups.onRoute.length;

  function toggleGeo() {
    setGeoState((s) => (s === 'sharing' ? 'off' : 'sharing'));
  }

  if (loading) return <Loader />;

  const view = tab === 'active' ? 'active' : 'done';

  return (
    <div>
      <div className="page-head courier-head">
        <div>
          <h2>Panel del repartidor</h2>
          <p className="muted">
            ¡Hola, {user?.name?.split(' ')[0] || 'repartidor'}! Estos son tus pedidos asignados. Se
            actualizan solo cuando hay novedades.
          </p>
        </div>
      </div>

      <div className={`live-share ${geoState === 'sharing' ? 'is-on' : ''}`}>
        <div className="ls-info">
          <strong>
            {geoState === 'sharing' ? '📍 Ubicacion en vivo activa' : 'Compartir ubicacion en vivo'}
          </strong>
          <small>
            {geoState === 'sharing' &&
              'Tus clientes ven tu posicion en el mapa mientras llevas el pedido.'}
            {geoState === 'off' &&
              'Activalo para que el cliente siga su pedido en tiempo real en Google Maps.'}
            {geoState === 'denied' &&
              'El navegador bloqueo el GPS. Desde el celular por HTTP se necesita HTTPS (en la PC con localhost si funciona).'}
            {geoState === 'unsupported' && 'Tu navegador no soporta geolocalizacion.'}
          </small>
        </div>
        <button
          className={`btn ${geoState === 'sharing' ? 'btn-outline' : 'btn-primary'} btn-sm`}
          onClick={toggleGeo}
          disabled={geoState === 'unsupported'}
        >
          {geoState === 'sharing' ? '⏹ Detener' : '📡 Activar'}
        </button>
      </div>

      <div className="courier-chips">
        <div className="chip chip-primary">
          <strong>{groups.toPick.length}</strong>
          <span>Listos para recoger</span>
        </div>
        <div className="chip chip-info">
          <strong>{groups.onRoute.length}</strong>
          <span>En camino</span>
        </div>
        <div className="chip chip-warn">
          <strong>{groups.waiting.length}</strong>
          <span>En preparacion</span>
        </div>
        <button
          className="chip chip-outline"
          onClick={() => setTab(tab === 'active' ? 'done' : 'active')}
        >
          {tab === 'active' ? (
            <>
              <strong>{groups.done.length}</strong>
              <span>Ver entregados</span>
            </>
          ) : (
            <>
              <strong>{activeCount}</strong>
              <span>Volver a activos</span>
            </>
          )}
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${view === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Entregas activas <span className="tab-count">{activeCount}</span>
        </button>
        <button
          className={`tab ${view === 'done' ? 'active' : ''}`}
          onClick={() => setTab('done')}
        >
          Entregados <span className="tab-count">{groups.done.length}</span>
        </button>
      </div>

      {view === 'active' ? (
        activeCount === 0 ? (
          <div className="card empty-card">
            <p className="empty-big">📭</p>
            <p>
              No tienes entregas activas. Cuando el admin te asigne pedidos apareceran aqui en
              tiempo real.
            </p>
          </div>
        ) : (
          <div className="order-list">
            {groups.toPick.length > 0 && (
              <SectionHeader
                icon="📦"
                title="Listos para recoger"
                count={groups.toPick.length}
                hint="El local ya tiene el pedido listo. Recogelo y ponte en camino."
              />
            )}
            {groups.toPick.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                updating={updating}
                onAction={updateStatus}
                state="ready"
              />
            ))}

            {groups.onRoute.length > 0 && (
              <SectionHeader
                icon="🛵"
                title="En camino"
                count={groups.onRoute.length}
                hint="Vas repartiendo estos pedidos. Marcalos como entregados al llegar."
              />
            )}
            {groups.onRoute.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                updating={updating}
                onAction={updateStatus}
                state="picked_up"
              />
            ))}

            {groups.waiting.length > 0 && (
              <SectionHeader
                icon="👨‍🍳"
                title="En preparacion"
                count={groups.waiting.length}
                hint="Aun no estan listos. Te avisaremos cuando cambie su estado."
              />
            )}
            {groups.waiting.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                updating={updating}
                onAction={updateStatus}
                state="waiting"
              />
            ))}
          </div>
        )
      ) : groups.done.length === 0 ? (
        <p className="empty">Todavia no tienes pedidos entregados.</p>
      ) : (
        <div className="order-list">
          {groups.done.map((o) => (
            <div key={o.id} className="card order-card order-done oc-delivered">
              <div className="order-head">
                <strong>Pedido #{o.id}</strong>
                <StatusBadge status={o.status} />
              </div>
              <p className="muted">
                {o.client_name} — {formatMoney(o.total)} — {formatDate(o.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, count, hint }) {
  return (
    <div className="courier-section">
      <h3>
        {icon} {title}
        <span className="tab-count">{count}</span>
      </h3>
      <p className="muted">{hint}</p>
    </div>
  );
}

function OrderCard({ o, updating, onAction, state }) {
  const cash = o.payment_method === 'cash';
  const waiting =
    state === 'waiting' && ['pending', 'confirmed', 'preparing'].includes(o.status);

  return (
    <div className={`card order-card oc-${o.status}`}>
      <div className="order-head">
        <strong>Pedido #{o.id}</strong>
        <StatusBadge status={o.status} />
      </div>
      <p>
        <strong>{o.client_name}</strong>
        {o.client_phone ? ` — ${o.client_phone}` : ''}
      </p>
      <p>
        📍 {o.address_line1}
        {o.address_line2 ? `, ${o.address_line2}` : ''}, {o.address_city}
      </p>
      <MapEmbed line1={o.address_line1} city={o.address_city} />
      {o.address_notes && <p className="muted">Notas: {o.address_notes}</p>}
      {o.custom_request && (
        <p className="muted custom-tag">🎨 Pedido personalizado: “{o.custom_request}”</p>
      )}
      <p className="muted">
        {o.items_count} producto(s) — {formatMoney(o.total)} ({o.payment_method === 'cash' ? 'cobra en efectivo' : 'ya pagado'})
      </p>
      <div className="form-actions">
        {state === 'ready' && o.status === 'ready' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={updating === o.id}
            onClick={() => onAction(o.id, 'picked_up')}
          >
            {updating === o.id ? 'Guardando...' : 'Marcar recogido 🛵'}
          </button>
        )}
        {state === 'ready' && o.status === 'ready' && cash && (
          <span className="pay-note">💵 Cobra {formatMoney(o.total)} en efectivo</span>
        )}
        {state === 'picked_up' && o.status === 'picked_up' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={updating === o.id}
            onClick={() => onAction(o.id, 'delivered')}
          >
            {updating === o.id ? 'Guardando...' : 'Marcar entregado ✅'}
          </button>
        )}
        {state === 'picked_up' && o.status === 'picked_up' && cash && (
          <span className="pay-note">💵 Cobra {formatMoney(o.total)} en efectivo</span>
        )}
        {waiting && <span className="muted">⏳ Esperando a que el local marque el pedido como listo.</span>}
      </div>
    </div>
  );
}