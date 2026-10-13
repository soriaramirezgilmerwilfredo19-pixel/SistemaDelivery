const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { notify } = require('../utils/notify');

const DISH_LABELS = {
  hamburguesa: 'Hamburguesa',
  pizza: 'Pizza',
  papitas: 'Papitas',
  alitas: 'Alitas',
  combo: 'Combo',
  plato: 'Plato del dia',
  postre: 'Postre',
  bebida: 'Bebida',
  otro: 'Otro'
};

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['picked_up', 'preparing'],
  picked_up: ['delivered'],
  delivered: [],
  cancelled: []
};

const WITH_DETAILS = `
  SELECT o.*,
         u.name AS client_name, u.email AS client_email, u.phone AS client_phone,
         cu.name AS courier_name,
         a.line1 AS address_line1, a.line2 AS address_line2, a.city AS address_city,
         a.label AS address_label, a.notes AS address_notes,
         (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
  FROM orders o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN users cu ON cu.id = o.courier_id
  LEFT JOIN addresses a ON a.id = o.address_id
`;

function withAddress(order) {
  if (!order.address_line1) return { ...order, address: null };
  const { address_line1, address_line2, address_city, address_label, address_notes, ...rest } = order;
  return {
    ...rest,
    address: {
      label: address_label,
      line1: address_line1,
      line2: address_line2,
      city: address_city,
      notes: address_notes
    }
  };
}

async function listByUser(userId) {
  const { rows } = await query(
    `${WITH_DETAILS} WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows.map(withAddress);
}

async function findById(id) {
  const { rows } = await query(`${WITH_DETAILS} WHERE o.id = $1`, [id]);
  return rows[0] ? withAddress(rows[0]) : null;
}

async function findItems(orderId) {
  const { rows } = await query(
    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
    [orderId]
  );
  return rows;
}

async function findHistory(orderId) {
  const { rows } = await query(
    `SELECT h.id, h.status, h.note, h.created_at,
            a.name AS actor_name
     FROM order_status_history h
     LEFT JOIN users a ON a.id = h.actor_id
     WHERE h.order_id = $1
     ORDER BY h.id`,
    [orderId]
  );
  return rows;
}

async function addHistory({ client, orderId, status, note, actorId }) {
  const sql = {
    text:
      `INSERT INTO order_status_history (order_id, status, note, actor_id)
       VALUES ($1, $2, $3, $4)`,
    values: [orderId, status, note || null, actorId || null]
  };
  if (client) {
    await client.query(sql);
  } else {
    await query(sql);
  }
}

async function listAll({ status, courierId } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (courierId) {
    params.push(courierId);
    conditions.push(`o.courier_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `${WITH_DETAILS} ${where} ORDER BY o.created_at DESC`,
    params
  );
  return rows.map(withAddress);
}

async function updateStatus(id, newStatus, actorId) {
  const order = await findById(id);
  if (!order) throw new ApiError(404, 'Pedido no encontrado');

  const allowed = STATUS_FLOW[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      400,
      `No se puede cambiar el estado de "${order.status}" a "${newStatus}"`
    );
  }

  const extra = newStatus === 'delivered' ? `, payment_status = 'paid'` : '';
  const { rows } = await query(
    `UPDATE orders SET status = $1${extra}, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [newStatus, id]
  );
  await addHistory({
    orderId: id,
    status: newStatus,
    actorId: actorId || null
  });
  const updated = await findById(rows[0].id);
  notify({
    type: 'status_changed',
    orderId: updated.id,
    status: updated.status,
    userId: updated.user_id,
    courierId: updated.courier_id
  });
  return updated;
}

async function assignCourier(id, courierId) {
  const order = await findById(id);
  if (!order) throw new ApiError(404, 'Pedido no encontrado');

  const courier = await query(
    `SELECT id FROM users WHERE id = $1 AND role = 'courier'`,
    [courierId]
  );
  if (!courier.rows[0]) throw new ApiError(400, 'El usuario no es repartidor valido');

  await query(
    `UPDATE orders SET courier_id = $1, updated_at = NOW() WHERE id = $2`,
    [courierId, id]
  );
  await addHistory({
    orderId: id,
    status: order.status,
    note: `Asignado al repartidor #${courierId}`,
    actorId: courierId
  });
  const updated = await findById(id);
  notify({
    type: 'assigned',
    orderId: updated.id,
    status: updated.status,
    userId: updated.user_id,
    courierId
  });
  return updated;
}

async function markPaid(id) {
  const order = await findById(id);
  if (!order) throw new ApiError(404, 'Pedido no encontrado');
  if (order.payment_method !== 'card') {
    throw new ApiError(400, 'Este pedido no tiene pago con tarjeta');
  }
  if (order.payment_status === 'paid') {
    throw new ApiError(400, 'El pedido ya esta pagado');
  }

  await query(
    `UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
    [id]
  );
  return findById(id);
}

async function createCustomOrder(userId, { addressId, paymentMethod, dishType, customRequest, quantity, budget, notes, deliveryFee, freeDeliveryOver = 0 }) {
  return withTransaction(async (client) => {
    const address = await client.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );
    if (!address.rows[0]) {
      throw new ApiError(400, 'Direccion invalida');
    }

    const unit = Math.round((Number(budget) / quantity) * 100) / 100;
    const subtotal = Number((unit * quantity).toFixed(2));
    const fee = Number(freeDeliveryOver) > 0 && subtotal >= Number(freeDeliveryOver)
      ? 0
      : Number(deliveryFee);
    const total = subtotal + fee;

    const label = DISH_LABELS[dishType] || String(dishType).slice(0, 30);
    const productName = `Pedido personalizado · ${label}`.slice(0, 140);

    const { rows } = await client.query(
      `INSERT INTO orders (user_id, address_id, payment_method, subtotal, delivery_fee, total, notes, custom_request)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, addressId, paymentMethod, subtotal.toFixed(2), fee.toFixed(2), total.toFixed(2), notes || null, customRequest]
    );
    const order = rows[0];

    await client.query(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
       VALUES ($1, NULL, $2, $3, $4, $5)`,
      [order.id, productName, unit.toFixed(2), quantity, subtotal.toFixed(2)]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, status, note)
       VALUES ($1, 'pending', 'Pedido personalizado recibido')`,
      [order.id]
    );

    return order;
  });
}

async function stats() {
  const { rows: statusRows } = await query(
    `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`
  );
  const orders_by_status = {};
  for (const s of ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled']) {
    orders_by_status[s] = 0;
  }
  for (const r of statusRows) orders_by_status[r.status] = r.count;

  const { rows } = await query(
    `SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*)::int AS total_orders,
            ROUND(AVG(total), 2) AS avg_ticket
     FROM orders WHERE status = 'delivered' AND payment_status = 'paid'`
  );

  const { rows: dayRows } = await query(
    `SELECT DATE(created_at) AS day, COUNT(*)::int AS orders,
            COALESCE(SUM(total), 0) AS revenue
     FROM orders
     WHERE status = 'delivered' AND payment_status = 'paid'
       AND created_at >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY day`
  );

  const { rows: topRows } = await query(
    `SELECT oi.product_name, SUM(oi.quantity)::int AS quantity,
            COALESCE(SUM(oi.subtotal), 0) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status = 'delivered' AND o.payment_status = 'paid'
     GROUP BY oi.product_name
     ORDER BY quantity DESC
     LIMIT 5`
  );

  return {
    orders_by_status,
    revenue: Number(rows[0].revenue).toFixed(2),
    total_orders: rows[0].total_orders,
    avg_ticket: Number(rows[0].avg_ticket || 0).toFixed(2),
    sales_by_day: dayRows.map((d) => ({
      day: d.day,
      orders: d.orders,
      revenue: Number(d.revenue).toFixed(2)
    })),
    top_products: topRows.map((t) => ({
      name: t.product_name,
      quantity: t.quantity,
      revenue: Number(t.revenue).toFixed(2)
    }))
  };
}

async function exportCsv({ from, to } = {}) {
  const conditions = ["o.status = 'delivered'", "o.payment_status = 'paid'"];
  const params = [];
  if (from) {
    params.push(from);
    conditions.push(`o.created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`o.created_at <= $${params.length}::date + INTERVAL '1 day'`);
  }
  const { rows } = await query(
    `SELECT o.id, o.created_at, u.name AS client_name,
            o.subtotal, o.delivery_fee, o.total, o.payment_method, o.payment_status
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.created_at`,
    params
  );
  return rows;
}

module.exports = {
  STATUS_FLOW,
  listByUser,
  findById,
  findItems,
  findHistory,
  listAll,
  createCustomOrder,
  updateStatus,
  assignCourier,
  markPaid,
  stats,
  exportCsv
};
