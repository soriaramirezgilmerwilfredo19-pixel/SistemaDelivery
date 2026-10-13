const { z } = require('zod');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const establishmentSchema = z.object({
  name: z.string().max(80).optional(),
  banner: z.string().max(160).optional(),
  address: z.string().max(180).optional(),
  city: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(40).optional(),
  email: z.string().max(160).optional().or(z.literal('')),
  map_query: z.string().max(200).optional(),
  timezone: z.string().max(60).optional(),
  delivery_radius_km: z.coerce.number().min(0).max(100).optional().default(8)
});

const hourItemSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  is_open: z.boolean().optional().default(true),
  open_time: z.string().regex(TIME_RE, 'Hora invalida').optional().nullable().or(z.literal('')),
  close_time: z.string().regex(TIME_RE, 'Hora invalida').optional().nullable().or(z.literal('')),
  note: z.string().max(120).optional().nullable()
});

const hoursSchema = z.array(hourItemSchema).min(7).max(7);

const holidaySchema = z.object({
  date: z.string().regex(DATE_RE, 'Fecha invalida'),
  name: z.string().min(2).max(120),
  closed: z.boolean().optional().default(true),
  open_time: z.string().regex(TIME_RE, 'Hora invalida').optional().nullable(),
  close_time: z.string().regex(TIME_RE, 'Hora invalida').optional().nullable(),
  note: z.string().max(160).optional().nullable()
});

module.exports = { establishmentSchema, hoursSchema, holidaySchema };