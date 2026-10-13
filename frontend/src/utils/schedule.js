export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
export const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export function parseHM(t) {
  if (!t) return null;
  const parts = String(t).split(':').map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

export function formatHM(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatHM12(t) {
  const hm = formatHM(t);
  if (!hm) return null;
  const [h, m] = hm.split(':').map(Number);
  const suffix = h < 12 ? 'a.m.' : 'p.m.';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function localNow(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts();
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const year = get('year');
  const month = String(get('month')).padStart(2, '0');
  const day = String(get('day')).padStart(2, '0');
  const dow = new Date(Date.UTC(year, get('month') - 1, get('day'))).getUTCDay();
  return {
    year,
    month: Number(month),
    day: Number(day),
    dow,
    dateKey: `${year}-${month}-${day}`,
    minutes: get('hour') * 60 + get('minute'),
    hm: `${String(get('hour')).padStart(2, '0')}:${String(get('minute')).padStart(2, '0')}`
  };
}

export function todayHours(hours, tz) {
  const now = localNow(tz);
  return { dow: now.dow, dayName: DAY_NAMES[now.dow], row: (hours || []).find((h) => h.day_of_week === now.dow) };
}

export function holidayFor(holidays, dateKey) {
  return (holidays || []).find((h) => h.date === dateKey);
}

export function scheduleStatus(hours, holidays, tz) {
  const now = localNow(tz);
  const holiday = holidayFor(holidays, now.dateKey);

  if (holiday) {
    if (holiday.closed) {
      return { open: false, kind: 'holiday', title: 'Cerrado por feriado', text: holiday.name, holiday, now };
    }
    const o = parseHM(holiday.open_time);
    const c = parseHM(holiday.close_time);
    if (o != null && c != null && now.minutes >= o && now.minutes < c) {
      return {
        open: true,
        kind: 'holiday',
        title: 'Abierto ahora · horario especial',
        text: `Hoy es ${holiday.name}: atencion de ${formatHM(holiday.open_time)} a ${formatHM(holiday.close_time)}`,
        holiday,
        now
      };
    }
    if (o != null && now.minutes < o) {
      return {
        open: false,
        kind: 'holiday',
        title: 'Feriado con horario especial',
        text: `${holiday.name} · abrimos hoy a las ${formatHM(holiday.open_time)}`,
        holiday,
        now,
        nextOpenAt: o
      };
    }
    return { open: false, kind: 'holiday', title: 'Feriado', text: holiday.name, holiday, now };
  }

  const row = (hours || []).find((h) => h.day_of_week === now.dow);
  if (!row || !row.is_open) {
    return { open: false, kind: 'closed', title: 'Cerrado hoy', text: `${DAY_NAMES[now.dow]} no atendemos. Reabrimos manana.`, now };
  }
  const o = parseHM(row.open_time);
  const c = parseHM(row.close_time);
  if (o != null && c != null && now.minutes >= o && now.minutes < c) {
    return { open: true, kind: 'open', title: 'Abierto ahora', text: `Atendemos hasta las ${formatHM(row.close_time)}`, today: row, now, closesAt: c };
  }
  if (o != null && now.minutes < o) {
    return { open: false, kind: 'opens', title: 'Aun no abrimos', text: `Hoy abrimos a las ${formatHM(row.open_time)}`, today: row, now, nextOpenAt: o };
  }
  return { open: false, kind: 'closed', title: 'Cerrado', text: 'Ya cerramos por hoy. Reabrimos manana.', today: row, now };
}

export function upcomingHolidays(holidays, tz, limit = 12) {
  const now = localNow(tz);
  return (holidays || [])
    .filter((h) => h.date >= now.dateKey)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, limit);
}

export function humanDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${d} ${MONTH_SHORT[m - 1]} ${y}`;
}

export function monthOf(dateKey) {
  return Number(dateKey.slice(5, 7));
}

export function weekdayOf(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}