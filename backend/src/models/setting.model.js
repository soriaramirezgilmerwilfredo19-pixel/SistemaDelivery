const { query, withTransaction } = require('../config/database');

const DEFAULT_ESTABLISHMENT = {
  name: 'DeliveryPuyo',
  banner: 'Tu comida favorita, a tu puerta',
  address: 'Av. Ceslao Marin y Orellana',
  city: 'Puyo, Pastaza',
  phone: '(03) 999-9999',
  whatsapp: '099 999 9999',
  email: 'hola@deliverypuyo.test',
  map_query: 'Puyo, Pastaza, Ecuador',
  timezone: 'America/Guayaquil',
  delivery_radius_km: 8
};

function normalizeTime(value) {
  if (!value) return null;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function getEstablishment() {
  const { rows } = await query("SELECT value FROM settings WHERE key = 'establishment'");
  return { ...DEFAULT_ESTABLISHMENT, ...(rows[0]?.value || {}) };
}

async function saveEstablishment(data) {
  const merged = { ...DEFAULT_ESTABLISHMENT, ...data };
  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('establishment', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(merged)]
  );
  return merged;
}

async function getHours() {
  const { rows } = await query('SELECT * FROM business_hours ORDER BY day_of_week');
  return rows;
}

async function saveHours(items) {
  const rows = await withTransaction(async (client) => {
    await client.query('DELETE FROM business_hours');
    for (const h of items) {
      await client.query(
        `INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          h.day_of_week,
          h.is_open !== false,
          h.is_open === false ? null : normalizeTime(h.open_time) || null,
          h.is_open === false ? null : normalizeTime(h.close_time) || null,
          h.note || null
        ]
      );
    }
    return await client.query('SELECT * FROM business_hours ORDER BY day_of_week');
  });
  return rows.rows;
}

async function listHolidays() {
  const { rows } = await query('SELECT * FROM holidays ORDER BY date');
  return rows.map((r) => ({ ...r, date: normalizeDate(r.date) }));
}

async function createHoliday(data) {
  const { rows } = await query(
    `INSERT INTO holidays (date, name, closed, open_time, close_time, note)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.date,
      data.name,
      data.closed !== false,
      data.closed ? null : normalizeTime(data.open_time) || null,
      data.closed ? null : normalizeTime(data.close_time) || null,
      data.note || null
    ]
  );
  return { ...rows[0], date: normalizeDate(rows[0].date) };
}

async function updateHoliday(id, data) {
  const { rows } = await query(
    `UPDATE holidays
     SET date = $1, name = $2, closed = $3, open_time = $4, close_time = $5, note = $6
     WHERE id = $7 RETURNING *`,
    [
      data.date,
      data.name,
      data.closed !== false,
      data.closed ? null : normalizeTime(data.open_time) || null,
      data.closed ? null : normalizeTime(data.close_time) || null,
      data.note || null,
      id
    ]
  );
  return rows[0] ? { ...rows[0], date: normalizeDate(rows[0].date) } : null;
}

async function deleteHoliday(id) {
  const { rows } = await query('DELETE FROM holidays WHERE id = $1 RETURNING id', [id]);
  return rows[0] ? true : false;
}

async function getPublicSettings() {
  const [establishment, hours, holidays] = await Promise.all([
    getEstablishment(),
    getHours(),
    listHolidays()
  ]);
  return { establishment, hours, holidays };
}

module.exports = {
  DEFAULT_ESTABLISHMENT,
  getEstablishment,
  saveEstablishment,
  getHours,
  saveHours,
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getPublicSettings
};