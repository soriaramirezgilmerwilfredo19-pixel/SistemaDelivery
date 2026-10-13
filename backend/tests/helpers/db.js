const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const request = require('supertest');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env.test'),
  override: true
});

const { assertConfig } = require('../../src/config');
const { getPool, query, closePool } = require('../../src/config/database');

async function initTestDb() {
  assertConfig();
  const pool = getPool();
  const schema = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql'),
    'utf8'
  );
  await pool.query(schema);
}

async function upsertUser(name, email, password, role) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, email, hash, role]
  );
  return rows[0].id;
}

async function seedBase() {
  await upsertUser('Admin Test', 'admin@test.local', 'Admin123!', 'admin');
  await upsertUser('Courier Test', 'courier@test.local', 'Courier123!', 'courier');
  await upsertUser('Client Test', 'client@test.local', 'Client123!', 'client');

  await query(
    `INSERT INTO categories (name, slug) VALUES ('Test Cat', 'test-cat')
     ON CONFLICT (slug) DO NOTHING`
  );

  const existing = await query('SELECT id FROM products WHERE name = $1', ['Producto Test']);
  if (!existing.rows[0]) {
    const cat = await query(`SELECT id FROM categories WHERE slug = 'test-cat'`);
    await query(
      `INSERT INTO products (category_id, name, description, price, available)
       VALUES ($1, 'Producto Test', 'Descripcion de prueba', 10.00, TRUE)`,
      [cat.rows[0].id]
    );
  }
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

async function teardown() {
  await closePool();
}

module.exports = { initTestDb, seedBase, login, teardown, query };
