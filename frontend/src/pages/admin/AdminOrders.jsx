import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { apiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  STATUS_LABELS,
  STATUS_FLOW,
  PAYMENT_LABELS,
  formatMoney,
  formatDate
} from '../../utils/orders';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';

export default function AdminOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = filter ? { status: filter } : {};
    Promise.all([
      client.get('/admin/orders', { params }),
      client.get('/admin/couriers')
    ])
      .then(([oRes, cRes]) => {
        setOrders(oRes.data.data);
        setCouriers(cRes.data.data);
      })
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [filter]);

  useEffect(() => {
    function onEvent() {
      load();
    }
    window.addEventListener('delivery-event', onEvent);
    return () => window.removeEventListener('delivery-event', onEvent);
  });

  async function changeStatus(id, status) {
    try {
      await client.put(`/admin/orders/${id}/status`, { status });
      toast(`Estado actualizado a ${STATUS_LABELS[status]}`, 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function assign(id, courierId) {
    try {
      await client.put(`/admin/orders/${id}/assign`, { courier_id: Number(courierId) });
      toast('Repartidor asignado', 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>Gestion de pedidos</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Direccion</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Cambiar estado</th>
                <th>Repartidor</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/pedidos/${o.id}`}>#{o.id}</Link></td>
                  <td>{o.client_name}</td>
                  <td>{o.address_line1 || '—'}, {o.address_city || ''}</td>
                  <td>{formatMoney(o.total)}</td>
                  <td>
                    {PAYMENT_LABELS[o.payment_method]}
                    <br />
                    <small>{o.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}</small>
                  </td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                    >
                      <option value={o.status}>{STATUS_LABELS[o.status]}</option>
                      {(STATUS_FLOW[o.status] || []).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {couriers.length === 0 ? (
                      <small className="muted">Sin repartidores</small>
                    ) : (
                      <select
                        value={o.courier_id || ''}
                        onChange={(e) => assign(o.id, e.target.value)}
                      >
                        <option value="">Asignar...</option>
                        {couriers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td><small>{formatDate(o.created_at)}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders?.length === 0 && <p className="empty">No hay pedidos con ese filtro.</p>}
        </div>
      )}
    </div>
  );
}

