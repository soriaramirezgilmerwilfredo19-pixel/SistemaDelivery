const { query, withTransaction } = require('../config/database');

const STATUS_LABELS = {
  pending: 'Recibido',
  confirmed: 'Confirmado',
  preparing: 'En preparacion',
  ready: 'Listo',
  picked_up: 'Recogido',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

async function listForUser(userId, { limit = 30 } = {}) {
  const { rows } = await query(
    `SELECT id, type, message, order_id, read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [userId, limit]
  );
  const { rows: [unreadRow] } = await query(
    'SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND read = FALSE',
    [userId]
  );
  return { items: rows, unread: unreadRow.unread };
}

async function markRead(id, userId) {
  const { rowCount } = await query(
    `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rowCount > 0;
}

async function markAllRead(userId) {
  await query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
    [userId]
  );
}

async function createForOrder(payload) {
  const { type, orderId, userId, courierId, status } = payload;
  return withTransaction(async (client) => {
    const insert = async (targetId, message) => {
      await client.query(
        `INSERT INTO notifications (user_id, type, message, order_id)
         VALUES ($1, $2, $3, $4)`,
        [targetId, type, message, orderId]
      );
    };

    if (type === 'created') {
      const { rows } = await client.query(
        `SELECT id FROM users WHERE role = 'admin'`
      );
      for (const admin of rows) {
        await insert(admin.id, `Nuevo pedido #${orderId} recibido`);
      }
    }

    if (type === 'assigned') {
      if (courierId) {
        await insert(courierId, `Pedido #${orderId} asignado a ti`);
      }
      if (userId) {
        await insert(userId, `Tu pedido #${orderId} tiene repartidor asignado`);
      }
    }

    if (type === 'status_changed') {
      const label = STATUS_LABELS[status] || status;
      await insert(userId, `Tu pedido #${orderId} esta "${label}"`);
    }
  });
}

module.exports = { listForUser, markRead, markAllRead, createForOrder };