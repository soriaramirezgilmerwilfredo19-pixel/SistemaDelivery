const { query } = require('../config/database');

const WITH_CATEGORY = `
  SELECT p.id, p.name, p.description, p.price, p.discount, p.badge, p.featured,
         p.image_url, p.available, p.stock, p.category_id, p.created_at,
         ROUND(p.price * (1 - p.discount / 100), 2) AS final_price,
         COALESCE(r.avg_rating, 0)::numeric(3,1) AS avg_rating,
         COALESCE(r.review_count, 0)::int AS review_count,
         CASE WHEN c.id IS NULL THEN NULL
              ELSE json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
         END AS category
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
    FROM reviews GROUP BY product_id
  ) r ON r.product_id = p.id
`;

async function list({ search, categorySlug, availableOnly = false, featuredOnly = false } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }
  if (categorySlug) {
    params.push(categorySlug);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (availableOnly) {
    conditions.push('p.available = TRUE');
  }
  if (featuredOnly) {
    conditions.push('p.featured = TRUE');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `${WITH_CATEGORY} ${where} ORDER BY p.featured DESC, p.name`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(`${WITH_CATEGORY} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO products (category_id, name, description, price, discount, badge, featured, image_url, available, stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      data.category_id || null,
      data.name,
      data.description || null,
      data.price,
      data.discount || 0,
      data.badge || null,
      data.featured ?? false,
      data.image_url || null,
      data.available ?? true,
      data.stock ?? null
    ]
  );
  return findById(rows[0].id);
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE products
     SET category_id = $1, name = $2, description = $3, price = $4,
         discount = $5, badge = $6, featured = $7, image_url = $8, available = $9,
         stock = $10, updated_at = NOW()
     WHERE id = $11 RETURNING id`,
    [
      data.category_id || null,
      data.name,
      data.description || null,
      data.price,
      data.discount || 0,
      data.badge || null,
      data.featured ?? false,
      data.image_url || null,
      data.available ?? true,
      data.stock ?? null,
      id
    ]
  );
  if (!rows[0]) return null;
  return findById(id);
}

async function softDelete(id) {
  const { rows } = await query(
    'UPDATE products SET available = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );
  if (!rows[0]) return null;
  return findById(id);
}

module.exports = { list, findById, create, update, softDelete };
