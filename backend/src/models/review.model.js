const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');

async function listByProduct(productId) {
  const { rows } = await query(
    `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
            u.id AS user_id, u.name AS user_name
     FROM reviews rv
     JOIN users u ON u.id = rv.user_id
     WHERE rv.product_id = $1
     ORDER BY rv.created_at DESC`,
    [productId]
  );
  return rows;
}

async function create(productId, userId, { rating, comment }) {
  const product = await query('SELECT id FROM products WHERE id = $1', [productId]);
  if (!product.rows[0]) throw new ApiError(404, 'Producto no encontrado');

  const existing = await query(
    'SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2',
    [productId, userId]
  );
  if (existing.rows[0]) {
    throw new ApiError(409, 'Ya has reseñado este producto. Puedes eliminar tu reseña anterior.');
  }

  const { rows } = await query(
    `INSERT INTO reviews (product_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, rating, comment, created_at`,
    [productId, userId, rating, comment || null]
  );
  return rows[0];
}

async function remove(id, userId, isAdmin) {
  const { rowCount } = await query(
    isAdmin
      ? 'DELETE FROM reviews WHERE id = $1'
      : 'DELETE FROM reviews WHERE id = $1 AND user_id = $2',
    isAdmin ? [id] : [id, userId]
  );
  if (rowCount === 0) throw new ApiError(404, 'Reseña no encontrada');
  return true;
}

module.exports = { listByProduct, create, remove };
