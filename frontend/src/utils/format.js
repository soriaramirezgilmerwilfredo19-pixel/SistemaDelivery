export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'cancelled',
]

export const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  picked_up: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered']

export const PAYMENT_METHODS = {
  cash: 'Efectivo al recibir',
  card: 'Tarjeta (simulado)',
}

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente de pago',
  paid: 'Pagado',
  refunded: 'Reembolsado',
  failed: 'Pago fallido',
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—'
}

export function formatMoney(value) {
  const n = Number(value || 0)
  return `S/ ${n.toFixed(2)}`
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
