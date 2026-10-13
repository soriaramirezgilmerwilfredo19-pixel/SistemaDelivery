const request = require('supertest');

const { initTestDb, seedBase, login, teardown, query } = require('./helpers/db');

let app;
let adminToken;
let courierToken;
let clientToken;
let productId;
let addressId;
let orderId;

beforeAll(async () => {
  await initTestDb();
  await seedBase();
  app = require('../src/app');
  adminToken = await login(app, 'admin@test.local', 'Admin123!');
  courierToken = await login(app, 'courier@test.local', 'Courier123!');
  clientToken = await login(app, 'client@test.local', 'Client123!');
  const products = await query(`SELECT id FROM products WHERE name = 'Producto Test'`);
  productId = products.rows[0].id;
});

afterAll(async () => {
  await teardown();
});

describe('Flujo completo de pedido', () => {
  test('El cliente crea una direccion', async () => {
    const res = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        label: 'Casa',
        line1: 'Calle Falsa 123',
        city: 'Puyo',
        is_default: true
      });
    expect(res.status).toBe(201);
    addressId = res.body.address.id;
  });

  test('El cliente agrega productos al carrito', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ product_id: productId, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(Number(res.body.data.subtotal)).toBe(20);
  });

  test('El cliente ve su carrito', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  test('El cliente hace checkout en efectivo', async () => {
    const res = await request(app)
      .post('/api/cart/checkout')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ address_id: addressId, payment_method: 'cash', notes: 'Llamar al llegar' });

    expect(res.status).toBe(201);
    orderId = res.body.order.id;
    expect(res.body.order.status).toBe('pending');
    expect(Number(res.body.order.total)).toBe(22.5);
    expect(res.body.order.items).toHaveLength(1);
  });

  test('El carrito queda vacio tras el checkout', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.body.data.items).toHaveLength(0);
  });

  test('El cliente ve su pedido en la lista', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((o) => o.id === orderId)).toBe(true);
  });

  test('El cliente no puede cambiar el estado directamente (solo admin)', async () => {
    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(403);
  });

  test('El admin confirma y prepara el pedido', async () => {
    let res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('confirmed');

    res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'preparing' });
    expect(res.body.order.status).toBe('preparing');

    res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ready' });
    expect(res.body.order.status).toBe('ready');
  });

  test('Un salto de estado invalido se rechaza', async () => {
    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(400);
  });

  test('El admin asigna un repartidor', async () => {
    const couriers = await request(app)
      .get('/api/admin/couriers')
      .set('Authorization', `Bearer ${adminToken}`);
    const courierId = couriers.body.data[0].id;

    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courier_id: courierId });
    expect(res.status).toBe(200);
    expect(res.body.order.courier_id).toBe(courierId);
  });

  test('El repartidor ve sus pedidos asignados', async () => {
    const res = await request(app)
      .get('/api/courier/orders')
      .set('Authorization', `Bearer ${courierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((o) => o.id === orderId)).toBe(true);
  });

  test('El repartidor marca recogido y entregado', async () => {
    let res = await request(app)
      .put(`/api/courier/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send({ status: 'picked_up' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('picked_up');

    res = await request(app)
      .put(`/api/courier/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('delivered');
  });

  test('El admin ve estadisticas', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.orders_by_status.delivered).toBeGreaterThan(0);
  });
});

describe('Pago simulado y cancelacion', () => {
  let order2Id;

  test('Checkout con tarjeta y pago simulado', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ product_id: productId, quantity: 1 });

    const checkout = await request(app)
      .post('/api/cart/checkout')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ address_id: addressId, payment_method: 'card' });
    expect(checkout.status).toBe(201);
    order2Id = checkout.body.order.id;
    expect(checkout.body.order.payment_status).toBe('pending');

    const pay = await request(app)
      .post(`/api/orders/${order2Id}/pay`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(pay.status).toBe(200);
    expect(pay.body.order.payment_status).toBe('paid');
  });

  test('El cliente puede cancelar su pedido pendiente', async () => {
    const cancel = await request(app)
      .post(`/api/orders/${order2Id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.order.status).toBe('cancelled');
  });

  test('El cliente no puede cancelar un pedido entregado', async () => {
    const cancel = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(cancel.status).toBe(400);
  });
});

describe('Proteccion de rutas', () => {
  test('Un cliente no puede listar usuarios (admin)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  test('Un cliente no puede crear productos', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'X', price: 1 });
    expect(res.status).toBe(403);
  });

  test('El admin puede crear y deshabilitar productos', async () => {
    const categories = await request(app).get('/api/categories');
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Producto Admin',
        price: 5.5,
        category_id: categories.body.data[0].id
      });
    expect(created.status).toBe(201);

    const removed = await request(app)
      .delete(`/api/products/${created.body.product.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(200);
    expect(removed.body.product.available).toBe(false);
  });
});
