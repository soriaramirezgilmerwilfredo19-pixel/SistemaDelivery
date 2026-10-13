const { query } = require('../config/database');

async function listByUser(userId) {
  const { rows } = await query(
    `SELECT * FROM addresses WHERE user_id = $1
     ORDER BY is_default DESC, id`,
    [userId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM addresses WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(userId, data) {
  const { rows } = await query(
    `INSERT INTO addresses (user_id, label, line1, line2, city, postal_code, notes, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      data.label,
      data.line1,
      data.line2 || null,
      data.city,
      data.postal_code || null,
      data.notes || null,
      data.is_default || false
    ]
  );
  return rows[0];
}

async function update(id, userId, data) {
  const { rows } = await query(
    `UPDATE addresses
     SET label = $1, line1 = $2, line2 = $3, city = $4,
         postal_code = $5, notes = $6, is_default = $7
     WHERE id = $8 AND user_id = $9
     RETURNING *`,
    [
      data.label,
      data.line1,
      data.line2 || null,
      data.city,
      data.postal_code || null,
      data.notes || null,
      data.is_default || false,
      id,
      userId
    ]
  );
  return rows[0] || null;
}

async function remove(id, userId) {
  const { rowCount } = await query(
    'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCount > 0;
}

async function clearDefault(userId) {
  await query(
    'UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE',
    [userId]
  );
}

module.exports = { listByUser, findById, create, update, remove, clearDefault };
