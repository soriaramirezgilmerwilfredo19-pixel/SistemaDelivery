const { query } = require('../config/database');

const PUBLIC_COLUMNS = 'id, name, email, phone, role, created_at';

async function findByEmail(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, email, passwordHash, phone, role = 'client' }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email.toLowerCase(), passwordHash, phone || null, role]
  );
  return rows[0];
}

async function listByRole(role) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE role = $1 ORDER BY name`,
    [role]
  );
  return rows;
}

async function listAll() {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`
  );
  return rows;
}

async function updateProfile(id, { name, phone }) {
  const { rows } = await query(
    `UPDATE users SET name = $1, phone = $2, updated_at = NOW()
     WHERE id = $3 RETURNING ${PUBLIC_COLUMNS}`,
    [name, phone || null, id]
  );
  return rows[0];
}

module.exports = {
  findByEmail,
  findById,
  create,
  listByRole,
  listAll,
  updateProfile
};
