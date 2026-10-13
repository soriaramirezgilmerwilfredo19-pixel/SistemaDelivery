import { Link } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import {
  DAY_NAMES,
  MONTH_SHORT,
  formatHM12,
  localNow,
  upcomingHolidays,
  humanDate
} from '../utils/schedule';

function waLink(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith('0') ? `593${digits.slice(1)}` : digits}`;
}

function mapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Puyo, Ecuador')}`;
}

export default function Local() {
  const { est, config, status, eta } = useConfig();
  const now = localNow(est.timezone);
  const holidays = config?.holidays || [];
  const upcoming = upcomingHolidays(holidays, est.timezone, 8);

  const yearHolidays = holidays.filter((h) => h.date.startsWith(`${now.year}-`));
  const byMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    items: yearHolidays.filter((h) => Number(h.date.slice(5, 7)) === i + 1)
  }));

  const open = Boolean(status?.open);

  return (
    <div className="local-page">
      <Link to="/" className="back-link">← Volver al catalogo</Link>

      <section className={`local-hero ${open ? 'local-hero-open' : 'local-hero-closed'}`}>
        <div className="local-hero-badge">
          <span className={`bilge ${open ? 'bilge-open' : 'bilge-closed'}`}>
            <span className="live-dot" /> {open ? 'Abierto ahora' : 'Cerrado'}
          </span>
          <span className="bilge-sub">{status?.title} · {status?.text}</span>
        </div>
        <h1>{est.name}</h1>
        <p className="local-tagline">{est.banner}</p>
        <div className="local-chips">
          <span className="lchip">⚡ Entrega en {eta} min</span>
          <span className="lchip">🚚 Radio de {est.delivery_radius_km || 8} km</span>
          <span className="lchip">📅 {holidays.length} feriados en {now.year}</span>
          <Link to="/" className="lchip lchip-cta">🍔 Ir a pedir ahora →</Link>
        </div>
      </section>

      <section className="local-section">
        <h2 className="section-title">📍 Nuestro local</h2>
        <div className="contact-grid">
          <div className="card contact-card">
            <span className="cc-ico">📍</span>
            <strong>{est.address}</strong>
            <span>{est.city}</span>
          </div>
          <div className="card contact-card">
            <span className="cc-ico">📞</span>
            <strong><a href={`tel:${est.phone}`}>{est.phone}</a></strong>
            <span>Llamanos para consultas y pedidos grandes</span>
          </div>
          <div className="card contact-card">
            <span className="cc-ico">💬</span>
            <strong>
              <a href={waLink(est.whatsapp) || '#'} target="_blank" rel="noreferrer">
                {est.whatsapp}
              </a>
            </strong>
            <span>WhatsApp para pedidos y delivery</span>
          </div>
          <div className="card contact-card">
            <span className="cc-ico">✉️</span>
            <strong><a href={`mailto:${est.email}`}>{est.email}</a></strong>
            <span>Escribenos en cualquier momento</span>
          </div>
        </div>
        <div className="map-wrap map-local">
          <iframe
            title="Ubicacion del local"
            src={`https://www.google.com/maps?q=${encodeURIComponent(est.map_query || 'Puyo, Ecuador')}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="local-section">
        <div className="local-split">
          <div>
            <h2 className="section-title">🕐 Horario de atencion</h2>
            <p className="muted">
              Hoy es <strong>{DAY_NAMES[now.dow]}</strong>. Este horario lo administran
              los trabajadores desde el panel y se actualiza al instante.
            </p>
          </div>
          <a className="btn btn-outline btn-sm" href={mapsUrl(est.map_query)} target="_blank" rel="noreferrer">
            🗺 Como llegar
          </a>
        </div>

        <div className="hours-grid">
          {(config?.hours || []).map((h) => {
            const isToday = h.day_of_week === now.dow;
            return (
              <div key={h.day_of_week} className={`hours-row ${isToday ? 'is-today' : ''}`}>
                <span className="hours-day">
                  {isToday && <span className="today-pill">Hoy</span>}
                  {DAY_NAMES[h.day_of_week]}
                </span>
                {h.is_open ? (
                  <span className="hours-time">
                    {formatHM12(h.open_time)} – {formatHM12(h.close_time)}
                  </span>
                ) : (
                  <span className="hours-time hours-closed">Cerrado</span>
                )}
                {h.note && <span className="hours-note">{h.note}</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="local-section">
        <div className="local-split">
          <div>
            <h2 className="section-title">📅 Feriados y dias especiales {now.year}</h2>
            <p className="muted">Dias en que el local cierra o atiende con horario especial.</p>
          </div>
          <span className="live-pill">{yearHolidays.length} registrados</span>
        </div>

        {upcoming.length > 0 && (
          <div className="next-holiday">
            <span className="nh-icon">🗓️</span>
            <div>
              <strong>Proximo feriado: {upcoming[0].name}</strong>
              <span>{humanDate(upcoming[0].date)}{upcoming[0].closed ? ' · Cerrado' : ' · Con horario especial'}</span>
            </div>
          </div>
        )}

        <div className="holiday-grid">
          {byMonth.map(({ month, items }) =>
            items.length > 0 ? (
              <div key={month} className="holiday-month">
                <h4>{MONTH_SHORT[month - 1]}</h4>
                <ul>
                  {items.map((h, i) => (
                    <li key={`${h.date}-${i}`} className={upcoming[0]?.date === h.date ? 'is-next' : ''}>
                      <span className="hm-day">{humanDate(h.date)}</span>
                      <strong>{h.name}</strong>
                      <span className={`holiday-tag ${h.closed ? 'ht-closed' : 'ht-open'}`}>
                        {h.closed ? 'Cerrado' : 'Atencion normal'}
                      </span>
                      {!h.closed && h.open_time && (
                        <span className="holiday-special">
                          {formatHM12(h.open_time)} – {formatHM12(h.close_time)}
                        </span>
                      )}
                      {!h.closed && h.note && <span className="holiday-note">{h.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </section>

      <div className="local-cta card">
        <div>
          <h3>¿Quieres pedir algo?</h3>
          <p>Revisa el catalogo y te lo llevamos en {eta} minutos.</p>
        </div>
        <Link to="/" className="btn btn-primary btn-lg">Ver catalogo</Link>
      </div>
    </div>
  );
}