const request = require('supertest');

const { initTestDb, seedBase, teardown } = require('./helpers/db');

let app;

beforeAll(async () => {
  await initTestDb();
  await seedBase();
  app = require('../src/app');
});

afterAll(async () => {
  await teardown();
});

describe('Autenticacion', () => {
  const email = `nuevo-${Date.now()}@test.local`;

  test('POST /api/auth/register crea un cliente', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Cliente Nuevo',
      email,
      password: 'Secret123',
      phone: '555-9999'
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('client');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('POST /api/auth/register rechaza email duplicado', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Otro',
      email,
      password: 'Secret123'
    });
    expect(res.status).toBe(409);
  });

  test('POST /api/auth/register valida datos', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'no-es-email',
      password: '123'
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('POST /api/auth/login con credenciales correctas', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'Secret123'
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email.toLowerCase());
  });

  test('POST /api/auth/login rechaza contrasena incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'mala'
    });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me requiere token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me devuelve el usuario', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'Secret123'
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email.toLowerCase());
  });
});

describe('Salud y productos publicos', () => {
  test('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/products lista el catalogo', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/categories lista categorias', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('Ruta inexistente devuelve 404 JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});
