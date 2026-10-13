export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'cancelled'
];

export const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparacion',
  ready: 'Listo para recoger',
  picked_up: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

export const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['picked_up', 'preparing'],
  picked_up: ['delivered'],
  delivered: [],
  cancelled: []
};

export const PAYMENT_LABELS = {
  cash: 'Efectivo',
  card: 'Tarjeta (simulado)'
};

export const STATUS_ICONS = {
  pending: '⏳',
  confirmed: '✅',
  preparing: '👨‍🍳',
  ready: '📦',
  picked_up: '🛵',
  delivered: '🏁',
  cancelled: '❌'
};

export const STATUS_HINTS = {
  pending: 'Recibimos tu pedido y estamos esperando la confirmacion.',
  confirmed: 'El restaurante acepto tu pedido y va a empezar a prepararlo.',
  preparing: 'Estan cocinando tu pedido en este momento.',
  ready: 'Tu pedido esta listo y esperando al repartidor.',
  picked_up: 'Tu pedido va en camino hacia la direccion de entrega.',
  delivered: 'Pedido entregado. ¡Gracias por tu compra!',
  cancelled: 'Este pedido fue cancelado.'
};

export const STATUS_PROGRESS = {
  pending: 10,
  confirmed: 28,
  preparing: 46,
  ready: 64,
  picked_up: 84,
  delivered: 100,
  cancelled: 100
};

export const TRACK_STEPS = [
  { key: 'pending', label: 'Recibido', icon: '⏳' },
  { key: 'confirmed', label: 'Confirmado', icon: '✅' },
  { key: 'preparing', label: 'En preparacion', icon: '👨‍🍳' },
  { key: 'ready', label: 'Listo', icon: '📦' },
  { key: 'picked_up', label: 'En camino', icon: '🛵' },
  { key: 'delivered', label: 'Entregado', icon: '🏁' }
];

export function mapsSearchUrl(address) {
  if (!address?.line1) return null;
  const q = encodeURIComponent(`${address.line1}, ${address.city}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function mapsDirectionsUrl(address) {
  if (!address?.line1) return null;
  const q = encodeURIComponent(`${address.line1}, ${address.city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}


export function formatMoney(v) {
  return `S/ ${Number(v || 0).toFixed(2)}`;
}

export function formatDate(v) {
  return new Date(v).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}
