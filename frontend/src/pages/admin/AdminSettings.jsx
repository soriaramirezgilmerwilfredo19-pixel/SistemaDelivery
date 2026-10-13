import { useCallback, useEffect, useState } from 'react';
import client, { apiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { DAY_NAMES, formatHM, humanDate, upcomingHolidays } from '../../utils/schedule';

const TABS = [
  { key: 'establishment', label: '🏪 Establecimiento' },
  { key: 'hours', label: '🕐 Horario semanal' },
  { key: 'holidays', label: '📅 Feriados' }
];

const EMPTY_EST = {
  name: '', banner: '', address: '', city: '', phone: '', whatsapp: '',
  email: '', map_query: '', timezone: 'America/Guayaquil', delivery_radius_km: 8
};

const EMPTY_DAY = { day_of_week: 0, is_open: true, open_time: '09:00', close_time: '23:00', note: '' };

function timeInput(v) {
  if (!v) return '';
  return String(v).slice(0, 5);
}

export default function AdminSettings() {
  const toast = useToast();
  const [tab, setTab] = useState('establishment');
  const [est, setEst] = useState(EMPTY_EST);
  const [hours, setHours] = useState(Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_DAY, day_of_week: i })));
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({
    id: null,
    date: '',
    name: '',
    closed: true,
    open_time: '09:00',
    close_time: '18:00',
    note: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client
      .get('/admin/settings')
      .then((res) => {
        const data = res.data.data;
        setEst({ ...EMPTY_EST, ...data.establishment });
        if (data.hours?.length) {
          setHours(data.hours.map((h) => ({ ...EMPTY_DAY, ...h, open_time: timeInput(h.open_time), close_time: timeInput(h.close_time) })));
        }
        setHolidays(data.holidays || []);
      })
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveGuard = async (fn, okMsg) => {
    setSaving(true);
    try {
      await fn();
      toast(okMsg, 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="hint">Cargando configuracion...</div>;

  const saveEst = () =>
    saveGuard(async () => client.put('/admin/settings/establishment', {
      ...est,
      delivery_radius_km: Number(est.delivery_radius_km)
    }), 'Establecimiento actualizado');

  const saveHours = () =>
    saveGuard(async () => client.put('/admin/settings/hours', hours), 'Horario guardado');

  const submitHoliday = () => {
    if (!holidayForm.date || !holidayForm.name.trim()) {
      toast('Indica fecha y nombre del feriado', 'error');
      return;
    }
    const payload = {
      date: holidayForm.date,
      name: holidayForm.name.trim(),
      closed: holidayForm.closed,
      open_time: holidayForm.closed ? null : holidayForm.open_time,
      close_time: holidayForm.closed ? null : holidayForm.close_time,
      note: holidayForm.note.trim() || null
    };
    saveGuard(async () => {
      if (holidayForm.id) await client.put(`/admin/settings/holidays/${holidayForm.id}`, payload);
      else await client.post('/admin/settings/holidays', payload);
    }, holidayForm.id ? 'Feriado actualizado' : 'Feriado agregado').then(() => {
      setHolidayForm({ ...holidayForm, id: null, date: '', name: '', closed: true, open_time: '09:00', close_time: '18:00', note: '' });
    });
  };

  const removeHoliday = (id) => {
    if (!window.confirm('¿Eliminar este feriado?')) return;
    saveGuard(async () => client.delete(`/admin/settings/holidays/${id}`), 'Feriado eliminado');
  };

  const upcoming = upcomingHolidays(holidays, est.timezone, 3);

  return (
    <div className="admin-page">
      <h2 className="section-title">Local y horario</h2>
      <p className="muted">
        Ajusta los datos del establecimiento, el horario semanal y los feriados.
        Todo esto se muestra en la pagina publica <strong>/local</strong> y en el footer.
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'establishment' && (
        <div className="card co-section">
          <div className="form-grid">
            <label>Nombre del establecimiento
              <input value={est.name} onChange={(e) => setEst({ ...est, name: e.target.value })} placeholder="Ej: DeliveryPuyo" />
            </label>
            <label>Eslogan / banner
              <input value={est.banner} onChange={(e) => setEst({ ...est, banner: e.target.value })} placeholder="Tu comida favorita, a tu puerta" />
            </label>
            <label>Direccion
              <input value={est.address} onChange={(e) => setEst({ ...est, address: e.target.value })} placeholder="Av. Ceslao Marin y Orellana" />
            </label>
            <label>Ciudad
              <input value={est.city} onChange={(e) => setEst({ ...est, city: e.target.value })} placeholder="Puyo, Pastaza" />
            </label>
            <label>Telefono
              <input value={est.phone} onChange={(e) => setEst({ ...est, phone: e.target.value })} />
            </label>
            <label>WhatsApp
              <input value={est.whatsapp} onChange={(e) => setEst({ ...est, whatsapp: e.target.value })} />
            </label>
            <label>Correo
              <input value={est.email} onChange={(e) => setEst({ ...est, email: e.target.value })} />
            </label>
            <label>Texto para el mapa (Google)
              <input value={est.map_query} onChange={(e) => setEst({ ...est, map_query: e.target.value })} placeholder="Puyo, Pastaza, Ecuador" />
            </label>
            <label>Zona horaria
              <input value={est.timezone} onChange={(e) => setEst({ ...est, timezone: e.target.value })} placeholder="America/Guayaquil" />
            </label>
            <label>Radio de entrega (km)
              <input type="number" min="0" max="100" value={est.delivery_radius_km} onChange={(e) => setEst({ ...est, delivery_radius_km: e.target.value })} />
            </label>
          </div>
          <button className="btn btn-primary" onClick={saveEst} disabled={saving}>Guardar establecimiento</button>
        </div>
      )}

      {tab === 'hours' && (
        <div className="card co-section">
          <p className="hint">
            Configuracion flexible: marca el dia como cerrado, cambia las horas o deja una nota
            para el resto del equipo. Se aplica de inmediato en la pagina publica.
          </p>
          <div className="admin-hours">
            {hours.map((h) => {
              const set = (patch) => setHours(hours.map((x) => (x.day_of_week === h.day_of_week ? { ...x, ...patch } : x)));
              return (
                <div key={h.day_of_week} className="admin-hour-row">
                  <span className="ah-day">{DAY_NAMES[h.day_of_week]}</span>
                  <label className="switch">
                    <input type="checkbox" checked={h.is_open} onChange={(e) => set({ is_open: e.target.checked })} />
                    <span className="switch-slider" />
                  </label>
                  <span className="ah-label">{h.is_open ? 'Abierto' : 'Cerrado'}</span>
                  {h.is_open ? (
                    <>
                      <input type="time" value={h.open_time} onChange={(e) => set({ open_time: e.target.value })} className="time-input" />
                      <span className="ah-sep">a</span>
                      <input type="time" value={h.close_time} onChange={(e) => set({ close_time: e.target.value })} className="time-input" />
                    </>
                  ) : (
                    <span className="ah-off-note">Sin atencion este dia</span>
                  )}
                  <input
                    type="text"
                    className="ah-note"
                    placeholder="Nota (opcional) Ej: Viernes hasta tarde"
                    value={h.note || ''}
                    onChange={(e) => set({ note: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" onClick={saveHours} disabled={saving}>Guardar horario</button>
        </div>
      )}

      {tab === 'holidays' && (
        <div className="holiday-admin">
          <div className="card co-section">
            <h3>{holidayForm.id ? '✏️ Editar feriado' : '➕ Agregar feriado'}</h3>
            <div className="form-grid">
              <label>Fecha
                <input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
              </label>
              <label>Nombre
                <input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="Ej: Navidad" />
              </label>
            </div>
            <label className="switch-line">
              <span>Cerrado este dia</span>
              <span className="switch">
                <input type="checkbox" checked={holidayForm.closed} onChange={(e) => setHolidayForm({ ...holidayForm, closed: e.target.checked })} />
                <span className="switch-slider" />
              </span>
            </label>
            {!holidayForm.closed && (
              <div className="form-grid">
                <label>Abre
                  <input type="time" value={holidayForm.open_time} onChange={(e) => setHolidayForm({ ...holidayForm, open_time: e.target.value })} />
                </label>
                <label>Cierra
                  <input type="time" value={holidayForm.close_time} onChange={(e) => setHolidayForm({ ...holidayForm, close_time: e.target.value })} />
                </label>
              </div>
            )}
            <label>Nota (visible para el cliente)
              <input value={holidayForm.note} onChange={(e) => setHolidayForm({ ...holidayForm, note: e.target.value })} placeholder="Ej: Horario especial: atencion hasta las 6pm" />
            </label>
            <div className="inline-actions">
              <button className="btn btn-primary" onClick={submitHoliday} disabled={saving}>
                {holidayForm.id ? 'Guardar cambios' : 'Agregar feriado'}
              </button>
              {holidayForm.id && (
                <button className="btn btn-outline" onClick={() => setHolidayForm({ id: null, date: '', name: '', closed: true, open_time: '09:00', close_time: '18:00', note: '' })}>
                  Cancelar edicion
                </button>
              )}
            </div>
          </div>

          <div className="card co-section">
            <div className="local-split">
              <h3>Feriados registrados ({holidays.length})</h3>
              {upcoming.length > 0 && (
                <span className="live-pill">Proximo: {upcoming[0].name}</span>
              )}
            </div>
            {holidays.length === 0 ? (
              <p className="muted">Aun no hay feriados registrados.</p>
            ) : (
              <div className="holiday-list">
                {holidays.map((h) => (
                  <div key={h.id} className="holiday-item">
                    <div>
                      <strong>{h.name}</strong>
                      <span className="muted">{humanDate(h.date)}</span>
                      <span className={`holiday-tag ${h.closed ? 'ht-closed' : 'ht-open'}`}>
                        {h.closed ? 'Cerrado' : h.open_time ? `Abierto ${formatHM(h.open_time)}–${formatHM(h.close_time)}` : 'Atencion normal'}
                      </span>
                      {h.note && <span className="holiday-note">{h.note}</span>}
                    </div>
                    <div className="inline-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setHolidayForm({
                          id: h.id, date: h.date, name: h.name, closed: h.closed,
                          open_time: timeInput(h.open_time) || '09:00',
                          close_time: timeInput(h.close_time) || '18:00', note: h.note || ''
                        })}
                      >
                        Editar
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeHoliday(h.id)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}