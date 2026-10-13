const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');

async function getCart(userId) {
  const { rows } = await query(
    `SELECT ci.product_id, ci.quantity,
            p.name, p.price, p.discount, p.image_url, p.available, p.stock,
            ROUND(p.price * (1 - p.discount / 100), 2) AS unit_price,
            ROUND(p.price * (1 - p.discount / 100) * ci.quantity, 2) AS subtotal
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY p.name`,
    [userId]
  );

  const items = rows.map((r) => ({
    product_id: r.product_id,
    name: r.name,
    price: r.price,
    discount: r.discount,
    unit_price: r.unit_price,
    image_url: r.image_url,
    available: r.available,
    stock: r.stock,
    quantity: r.quantity,
    subtotal: r.subtotal
  }));

  const subtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
  return { items, subtotal: subtotal.toFixed(2) };
}

async function addItem(userId, productId, quantity) {
  const product = await query(
    'SELECT id, available, stock FROM products WHERE id = $1',
    [productId]
  );
  if (!product.rows[0]) throw new ApiError(404, 'Producto no encontrado');
  if (!product.rows[0].available) {
    throw new ApiError(400, 'El producto no esta disponible');
  }
  const stock = product.rows[0].stock;
  if (stock !== null && stock <= 0) {
    throw new ApiError(400, 'El producto esta agotado');
  }

  const existing = await query(
    'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  const newQty = quantity + (existing.rows[0]?.quantity || 0);
  if (stock !== null && newQty > stock) {
    throw new ApiError(400, `No hay suficiente stock (disponible: ${stock})`);
  }

  await query(
    `INSERT INTO cart_items (user_id, product_id, quantity, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()`,
    [userId, productId, quantity]
  );
  return getCart(userId);
}

async function updateItem(userId, productId, quantity) {
  const product = await query(
    'SELECT stock FROM products WHERE id = $1',
    [productId]
  );
  const stock = product.rows[0]?.stock;
  if (stock !== null && quantity > stock) {
    throw new ApiError(400, `No hay suficiente stock (disponible: ${stock})`);
  }

  const { rowCount } = await query(
    `UPDATE cart_items SET quantity = $1, updated_at = NOW()
     WHERE user_id = $2 AND product_id = $3`,
    [quantity, userId, productId]
  );
  if (rowCount === 0) throw new ApiError(404, 'Item no encontrado en el carrito');
  return getCart(userId);
}

async function removeItem(userId, productId) {
  const { rowCount } = await query(
    'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  if (rowCount === 0) throw new ApiError(404, 'Item no encontrado en el carrito');
  return getCart(userId);
}

async function clear(userId) {
  await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  return { items: [], subtotal: '0.00' };
}

async function checkout(userId, { addressId, paymentMethod, notes, deliveryFee, freeDeliveryOver = 0 }) {
  return withTransaction(async (client) => {
    const { rows: cartRows } = await client.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.discount, p.available, p.stock,
              ROUND(p.price * (1 - p.discount / 100), 2) AS unit_price
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       FOR UPDATE OF p`,
      [userId]
    );

    if (cartRows.length === 0) {
      throw new ApiError(400, 'El carrito esta vacio');
    }

    const unavailable = cartRows.find((r) => !r.available);
    if (unavailable) {
      throw new ApiError(400, `El producto "${unavailable.name}" ya no esta disponible`);
    }

    const sinStock = cartRows.find((r) => r.stock !== null && r.quantity > r.stock);
    if (sinStock) {
      throw new ApiError(
        400,
        `Stock insuficiente para "${sinStock.name}" (disponible: ${sinStock.stock})`
      );
    }

    const address = await client.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );
    if (!address.rows[0]) {
      throw new ApiError(400, 'Direccion invalida');
    }

    const subtotal = cartRows.reduce(
      (sum, r) => sum + Number(r.unit_price) * r.quantity,
      0
    );
    const fee = Number(freeDeliveryOver) > 0 && subtotal >= Number(freeDeliveryOver)
      ? 0
      : Number(deliveryFee);
    const total = subtotal + fee;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, address_id, payment_method, subtotal, delivery_fee, total, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, addressId, paymentMethod, subtotal.toFixed(2), fee.toFixed(2), total.toFixed(2), notes || null]
    );
    const order = orderRows[0];

    for (const item of cartRows) {
      const itemSubtotal = Number(item.unit_price) * item.quantity;
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.product_id, item.name, item.unit_price, item.quantity, itemSubtotal.toFixed(2)]
      );
      if (item.stock !== null) {
        await client.query(
          'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    await client.query(
      `INSERT INTO order_status_history (order_id, status, note)
       VALUES ($1, 'pending', 'Pedido recibido')`,
      [order.id]
    );

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    return order;
  });
}

module.exports = { getCart, addItem, updateItem, removeItem, clear, checkout };
