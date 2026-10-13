import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const TIME_FMT = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

function relTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return TIME_FMT.format(new Date(dateStr));
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const panelRef = useRef(null);

  const load = useCallback(() => {
    client
      .get('/notifications')
      .then((res) => setData(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  useEffect(() => {
    function onEvent() {
      load();
    }
    window.addEventListener('delivery-event', onEvent);
    return () => window.removeEventListener('delivery-event', onEvent);
  }, [load]);

  useEffect(() => {
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  async function markAll() {
    try {
      await client.put('/notifications/read');
      setData((d) => ({ ...d, unread: 0, items: d.items.map((i) => ({ ...i, read: true })) }));
    } catch {
      /* noop */
    }
  }

  async function openItem(item) {
    if (!item.read) {
      client.put(`/notifications/${item.id}/read`).catch(() => {});
      setData((d) => ({
        unread: Math.max(0, d.unread - 1),
        items: d.items.map((i) => (i.id === item.id ? { ...i, read: true } : i))
      }));
    }
    setOpen(false);
    if (!item.order_id) return;
    if (user.role === 'client') navigate(`/pedidos/${item.order_id}`);
    else if (user.role === 'admin') navigate('/admin/pedidos');
  }

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        className="notif-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        🔔
        {data.unread > 0 && <span className="notif-badge">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notificaciones</strong>
            {data.unread > 0 && (
              <button className="notif-mark" onClick={markAll}>Marcar leídas</button>
            )}
          </div>
          {data.items.length === 0 ? (
            <p className="notif-empty">No tienes notificaciones.</p>
          ) : (
            <ul className="notif-list">
              {data.items.map((n) => (
                <li
                  key={n.id}
                  className={`notif-item ${n.read ? '' : 'notif-unread'}`}
                  onClick={() => openItem(n)}
                >
                  <span className="notif-dot" />
                  <div>
                    <p>{n.message}</p>
                    <small>{relTime(n.created_at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
