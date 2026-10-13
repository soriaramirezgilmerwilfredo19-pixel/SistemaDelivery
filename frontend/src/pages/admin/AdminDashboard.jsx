import { useEffect, useState } from 'react';
import client from '../../api/client';
import { STATUS_LABELS, formatMoney } from '../../utils/orders';
import { useToast } from '../../context/ToastContext';
import Loader from '../../components/Loader';

const DAY_FMT = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' });

export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    client
      .get('/admin/stats')
      .then((res) => setStats(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await client.get('/admin/stats/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Reporte CSV descargado', 'success');
    } catch {
      toast('No se pudo exportar el reporte', 'error');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <Loader />;
  if (!stats) return <p className="empty">No hay estadisticas disponibles.</p>;

  const sales = stats.sales_by_day || [];
  const maxRevenue = Math.max(1, ...sales.map((d) => Number(d.revenue)));
  const top = stats.top_products || [];
  const maxQty = Math.max(1, ...top.map((t) => t.quantity));

  return (
    <div>
      <div className="page-head">
        <h2>Dashboard</h2>
        <button className="btn btn-primary btn-sm" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exportando...' : '⬇ Exportar CSV'}
        </button>
      </div>

      <div className="stats-grid" data-reveal>
        <div className="card stat-card">
          <span className="stat-number">{stats.total_orders}</span>
          <span>Pedidos entregados y pagados</span>
        </div>
        <div className="card stat-card">
          <span className="stat-number">{formatMoney(stats.revenue)}</span>
          <span>Ingresos</span>
        </div>
        <div className="card stat-card">
          <span className="stat-number">{formatMoney(stats.avg_ticket || 0)}</span>
          <span>Ticket promedio</span>
        </div>
      </div>

      <h3>Ventas de los últimos 30 días</h3>
      <div className="card chart-card" data-reveal>
        {sales.length === 0 ? (
          <p className="empty">Aún no hay ventas registradas.</p>
        ) : (
          <div className="bar-chart">
            {sales.map((d) => (
              <div key={d.day} className="bar-col" title={`${DAY_FMT.format(new Date(d.day))}: ${formatMoney(d.revenue)} (${d.orders})`}>
                <span className="bar-value">{Math.round(Number(d.revenue))}</span>
                <div className="bar" style={{ height: `${Math.max(6, (Number(d.revenue) / maxRevenue) * 100)}%` }} />
                <span className="bar-label">{DAY_FMT.format(new Date(d.day))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3>Productos más vendidos</h3>
      <div className="card">
        {top.length === 0 ? (
          <p className="empty">Aún no hay productos vendidos.</p>
        ) : (
          <ul className="top-list">
            {top.map((t) => (
              <li key={t.name}>
                <div className="top-info">
                  <strong>{t.name}</strong>
                  <span className="muted">{t.quantity} vendidos · {formatMoney(t.revenue)}</span>
                </div>
                <div className="top-bar">
                  <span style={{ width: `${(t.quantity / maxQty) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3>Pedidos por estado</h3>
      <div className="stats-grid">
        {Object.entries(stats.orders_by_status).map(([status, count]) => (
          <div key={status} className="card stat-card">
            <span className="stat-number">{count}</span>
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
