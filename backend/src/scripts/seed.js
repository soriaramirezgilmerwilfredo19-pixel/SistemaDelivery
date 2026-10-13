const bcrypt = require('bcryptjs');

const { assertConfig } = require('../config');
const { getPool, query, closePool } = require('../config/database');

async function upsertUser({ name, email, password, phone, role }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) {
    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users
       SET name = $1, password_hash = $2, phone = $3, role = $4, updated_at = NOW()
       WHERE id = $5`,
      [name, hash, phone || null, role, existing.rows[0].id]
    );
    console.log(`Usuario actualizado (credencial reset): ${email} (${role})`);
    return existing.rows[0].id;
  }
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, email, hash, phone || null, role]
  );
  console.log(`Usuario creado: ${email} (${role})`);
  return rows[0].id;
}

async function upsertCategory(name, slug) {
  const { rows } = await query(
    `INSERT INTO categories (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, slug]
  );
  return rows[0].id;
}

async function upsertProduct(categoryId, name, description, price, imageUrl, discount = 0, badge = null, featured = false, stock = 25) {
  const existing = await query('SELECT id FROM products WHERE name = $1', [name]);
  if (existing.rows[0]) {
    await query(
      `UPDATE products
       SET image_url = $1, discount = $2, description = $3, price = $4,
           badge = $5, featured = $6, stock = $7, updated_at = NOW()
       WHERE id = $8`,
      [imageUrl || null, discount, description, price, badge, featured, stock, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }
  const { rows } = await query(
    `INSERT INTO products (category_id, name, description, price, discount, badge, featured, image_url, available, stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9) RETURNING id`,
    [categoryId, name, description, price, discount, badge, featured, imageUrl || null, stock]
  );
  console.log(`Producto creado: ${name}`);
  return rows[0].id;
}

// Imagen SVG generada: emoji sobre degradado vibrante. No depende de internet,
// se ve igual en cualquier dispositivo y nunca se rompe.
function svgImage(emoji, color1, color2) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${color1}'/><stop offset='1' stop-color='${color2}'/>` +
    `</linearGradient></defs>` +
    `<rect width='800' height='600' fill='url(#g)'/>` +
    `<circle cx='685' cy='65' r='185' fill='rgba(255,255,255,0.10)'/>` +
    `<circle cx='90' cy='565' r='155' fill='rgba(255,255,255,0.10)'/>` +
    `<circle cx='400' cy='300' r='185' fill='rgba(255,255,255,0.95)'/>` +
    `<circle cx='400' cy='300' r='185' fill='none' stroke='rgba(255,255,255,0.55)' stroke-width='2'/>` +
    `<text x='402' y='412' font-size='215' text-anchor='middle' opacity='0.07' fill='#1c130a'>${emoji}</text>` +
    `<text x='400' y='410' font-size='215' text-anchor='middle'` +
    ` style='font-family:Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,emoji'>${emoji}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const art = (emoji, c1, c2) => svgImage(emoji, c1, c2);

// Foto real de Unsplash (CDN publico, se carga en cualquier navegador). Solo se
// usan IDs verificados. Alta resolucion y aspecto natural (sin recorte forzado,
// las tarjetas recortan con object-fit: cover) para que la comida se aprecie completa.
// Si alguna falla, el frontend muestra el arte de marca.
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&w=1100&q=85`;
const premium = (id) => `https://plus.unsplash.com/premium_photo-${id}?auto=format&w=1100&q=85`;

async function seed() {
  assertConfig();
  getPool();

  console.log('Sembrando datos de prueba...');

  const adminId = await upsertUser({
    name: 'Administrador',
    email: 'admin@delivery.test',
    password: 'Admin123!',
    role: 'admin'
  });

  const courierId = await upsertUser({
    name: 'Repartidor Uno',
    email: 'repartidor@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0001',
    role: 'courier'
  });

  await upsertUser({
    name: 'Repartidor Dos',
    email: 'repartidor2@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0011',
    role: 'courier'
  });

  await upsertUser({
    name: 'Repartidor Tres',
    email: 'repartidor3@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0012',
    role: 'courier'
  });

  await upsertUser({
    name: 'Repartidor Cuatro',
    email: 'repartidor4@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0013',
    role: 'courier'
  });

  await upsertUser({
    name: 'Repartidor Cinco',
    email: 'repartidor5@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0014',
    role: 'courier'
  });

  await upsertUser({
    name: 'Repartidor Seis',
    email: 'repartidor6@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0015',
    role: 'courier'
  });

  await upsertUser({
    name: 'Repartidor Siete',
    email: 'repartidor7@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0016',
    role: 'courier'
  });

  await upsertUser({
    name: 'Repartidor Ocho',
    email: 'repartidor8@delivery.test',
    password: 'Repartidor123!',
    phone: '555-0017',
    role: 'courier'
  });

  const clientId = await upsertUser({
    name: 'Cliente Demo',
    email: 'cliente@delivery.test',
    password: 'Cliente123!',
    phone: '555-0002',
    role: 'client'
  });

  const hasAddress = await query('SELECT id FROM addresses WHERE user_id = $1', [clientId]);
  if (!hasAddress.rows[0]) {
    await query(
      `INSERT INTO addresses (user_id, label, line1, city, is_default)
       VALUES ($1, 'Casa', 'Av. Principal 123', 'Puyo', TRUE)`,
      [clientId]
    );
    console.log('Direccion de ejemplo creada para el cliente.');
  }

  const catBurgers = await upsertCategory('Hamburguesas', 'hamburguesas');
  const catPizza = await upsertCategory('Pizzas', 'pizzas');
  const catSides = await upsertCategory('Acompañantes', 'acompanantes');
  const catSnacks = await upsertCategory('Alitas y Snacks', 'snacks');
  const catTacos = await upsertCategory('Tacos', 'tacos');
  const catSalads = await upsertCategory('Ensaladas', 'ensaladas');
  const catCombos = await upsertCategory('Combos', 'combos');
  const catDrinks = await upsertCategory('Bebidas', 'bebidas');
  const catCoffees = await upsertCategory('Cafes y Tes', 'cafes');
  const catDesserts = await upsertCategory('Postres', 'postres');

  // ---- Hamburguesas ----
  await upsertProduct(catBurgers, 'Hamburguesa Clasica', 'Carne a la parrilla, lechuga fresca, tomate y salsa especial de la casa', 4.5, img('1568901346375-23c9450c58cd'), 0, 'Popular', true);
  await upsertProduct(catBurgers, 'Hamburguesa Doble', 'Doble carne smash con queso cheddar fundido y tocino crocante', 6.5, img('1571091718767-18b5b1457add'), 15, 'Promo', true);
  await upsertProduct(catBurgers, 'Hamburguesa Vegetariana', 'Hamburguesa de garbanzo con vegetales grillados y alioli', 5.5, img('1520072959219-c595dc870360'), 0);
  await upsertProduct(catBurgers, 'Hamburguesa de Pollo', 'Pollo crujiente, lechuga, tomate y mayo ahumada', 5.8, img('1550547660-d9450f859349'), 0, 'Nuevo');
  await upsertProduct(catBurgers, 'Hamburguesa BBQ Bacon', 'Carne a la parrilla con tocino crocante, queso cheddar fundido y salsa BBQ ahumada', 6.9, img('1639262881416-01dca65c37ce'), 0, 'Nuevo', true);
  await upsertProduct(catBurgers, 'Hamburguesa Doble Cheddar', 'Doble carne smash con extra queso cheddar, cebolla caramelizada y pan brioche', 7.8, premium('1776081206733-2e7ff5474c91'), 0, 'Premium');
  await upsertProduct(catBurgers, 'Smash Burger Melt', 'Doble carne smash con doble queso fundido y cebolla crispy', 7.4, premium('1776216700288-cc0ba0350f08'), 0, 'Nuevo', true);
  await upsertProduct(catBurgers, 'La Burger del Chef', 'Ensenada gourmet con queso derretido, cebolla crocante y salsa de la casa', 8.9, premium('1776216700222-7566c19d80f1'), 0, 'Premium', true);
  await upsertProduct(catBurgers, 'Doble Bacon Melt', 'Doble carne con queso cheddar fundido y doble tocino crujiente', 7.5, img('1639020715395-487e2d63b927'), 0, 'Popular');
  await upsertProduct(catBurgers, 'Hamburguesa Parmesana', 'Carne a la parrilla con queso, lechuga, tomate y cebolla en pan artesanal', 6.4, img('1556816238-6c9caf68f140'), 0, 'Tipico');
  await upsertProduct(catBurgers, 'Burger Fresca Supreme', 'Hamburguesa jugosa con lechuga, tomate, cebolla y queso recien derretido', 7.0, premium('1776081206731-064a4dd3fd1c'), 0, 'Nuevo');

  // ---- Pizzas ----
  await upsertProduct(catPizza, 'Pizza Pepperoni', 'Masa artesanal, salsa de tomate San Marzano, mozzarella y pepperoni', 7.0, img('1513104890138-7c749659a591'), 10, 'Popular', true);
  await upsertProduct(catPizza, 'Pizza Vegetariana', 'Verduras frescas de temporada y queso mozzarella sobre masa madre', 6.5, img('1604382354936-07c5d9983bd3'), 0);
  await upsertProduct(catPizza, 'Pizza de Pollo', 'Pollo desmenuzado, cebolla caramelizada, orégano y queso', 7.5, img('1574071318508-1cdbab80d002'), 0);
  await upsertProduct(catPizza, 'Pizza Hawaiana', 'Jamón, piña caramelizada y extra queso', 7.2, img('1562835155-a7c2a225e97d'), 0, 'Nuevo');
  await upsertProduct(catPizza, 'Pizza BBQ Pollo', 'Pollo a la parrilla, cebolla roja, cilantro y salsa BBQ sobre masa artesanal', 8.0, img('1767065603116-8cee3bf11372'), 0, 'Popular');
  await upsertProduct(catPizza, 'Pizza Cuatro Quesos', 'Mozzarella, parmesano, gorgonzola y queso crema sobre masa madre', 8.5, img('1702716059239-385baacdabdc'), 0, 'Nuevo', true);
  await upsertProduct(catPizza, 'Pizza de la Casa', 'Pepperoni, mozzarella extra y salsa artesanal sobre masa crujiente', 8.9, premium('1668771085141-82507d6154d5'), 0, 'Popular', true);
  await upsertProduct(catPizza, 'Pizza Calabresa', 'Pepperoni con queso de tiro especiado y orillo dorado', 8.2, img('1746710222392-599916b1d986'), 0, 'Nuevo');
  await upsertProduct(catPizza, 'Pizza Queso Fundido', 'Porcion de pizza con estirado de queso mozzarella jugoso', 7.8, img('1772494047822-d0375853f7fd'), 0, 'Nueva');

  // ---- Acompañantes ----
  await upsertProduct(catSides, 'Papas Fritas', 'Papas belgas cortadas a mano, doble fritura y sal de mar', 2.0, img('1573080496219-bb080dd4f877'), 0);
  await upsertProduct(catSides, 'Aros de Cebolla', 'Ocho unidades crujientes con salsa dip de la casa', 2.5, img('1639024469010-44d77e559f7d'), 20);
  await upsertProduct(catSides, 'Nuggets (8 uds)', 'Pechuga de pollo 100% empanizada y freída al momento', 3.5, img('1562967914-608f82629710'), 0);
  await upsertProduct(catSides, 'Papas Deluxe', 'Papas fritas cubiertas con queso cheddar fundido, tocino y cebollín', 4.2, img('1771818708792-d671ae9b4b46'), 0, 'Nuevo');
  await upsertProduct(catSides, 'Papas Cheddar y Tocino', 'Papas fritas bañadas en queso cheddar derretido y trocitos de tocino', 4.5, premium('1672498329467-b27e2a97d29b'), 0, 'Nueva');
  await upsertProduct(catSides, 'Papas Parmesanas', 'Papas doradas en bowl con queso parmesano recien rallado', 3.9, img('1682117650826-881357860ec9'), 0, 'Nueva');

  // ---- Alitas y Snacks ----
  await upsertProduct(catSnacks, 'Alitas BBQ (8 uds)', 'Alitas glaseadas con salsa BBQ ahumada y sésamo', 5.0, img('1762631883174-6ea8c0cdc5ba'), 0, 'Popular', true);
  await upsertProduct(catSnacks, 'Alitas Buffalo (6 uds)', 'Alitas picantes con salsa buffalo y aderezo ranch', 4.5, img('1727280376746-b89107a5b0df'), 0);
  await upsertProduct(catSnacks, 'Nachos con Queso', 'Nachos crujientes con queso cheddar fundido y jalapeños', 3.2, img('1552332386-f8dd00dc2f85'), 0);
  await upsertProduct(catSnacks, 'Bolon de Verde', 'Clasico bolon ecuatoriano de plátano verde con chicharrón', 2.4, img('1767324672458-7dec3a2acffa'), 0, 'Tipico');
  await upsertProduct(catSnacks, 'Empanada de Viento (2 uds)', 'Empanadas de queso espolvoreadas con azúcar', 2.6, img('1556280725-d0a1d82c811b'), 0, 'Nuevo');
  await upsertProduct(catSnacks, 'Nachos Supreme', 'Nachos con queso fundido, guacamole, pico de gallo y jalapeños', 4.5, img('1768252688649-13d169feadc0'), 0, 'Nuevo');
  await upsertProduct(catSnacks, 'Mozzarella Sticks', 'Bastones de mozzarella empanizados con salsa marinara', 4.0, img('1778449665117-2c607bbc7415'), 0, 'Nuevo');
  await upsertProduct(catSnacks, 'Alitas Golden (12 uds)', 'Alitas doradas ultra crujientes servidas sobre lechuga con salsa dip', 6.9, img('1767427401867-ab1ca12a417d'), 0, 'Popular', true);
  await upsertProduct(catSnacks, 'Alitas y Papas (Para compartir)', 'Alitas crujientes acompañadas de papas doradas, ideal para compartir', 7.5, img('1578875858391-50798bc2ffee'), 0, 'Para compartir');

  // ---- Tacos ----
  await upsertProduct(catTacos, 'Tacos al Pastor (3 uds)', 'Tacos de cerdo al pastor con cilantro, cebolla y salsa roja', 4.2, premium('1661780139424-d582ec7aa9e2'), 0, 'Popular', true);
  await upsertProduct(catTacos, 'Tacos de Carnitas (3 uds)', 'Carne de cerdo desmechada con aguacate, cebolla morada y cilantro', 4.5, premium('1661776641811-acfb12f4b6ed'), 0, 'Nuevo');
  await upsertProduct(catTacos, 'Tacos Cochinita (3 uds)', 'Cochinita pibil yucateca con salsa habanera sobre tortilla caliente', 4.8, premium('1661730329741-b3bf77019b39'), 0, 'Tipico');

  // ---- Ensaladas ----
  await upsertProduct(catSalads, 'Ensalada Cesar', 'Lechuga romana, pollo a la plancha, crutones y salsa cesar', 4.5, img('1550304943-4f24f54ddde9'), 0);
  await upsertProduct(catSalads, 'Ensalada Tropical', 'Mango, piña, aguacate y camarones con vinagreta de maracuya', 5.0, img('1540420773420-3366772f4999'), 0, 'Ligera');
  await upsertProduct(catSalads, 'Ensalada Caprese', 'Rodajas de tomate y mozzarella fresca con albahaca y aceite de oliva', 5.2, img('1769458313860-3c8db667d990'), 0, 'Ligera');
  await upsertProduct(catSalads, 'Ensalada de la Huerta', 'Lechuga fresca con pepino, tomate cherry, zanahoria y semillas', 4.6, img('1773902280003-a769eb447460'), 0, 'Ligera');
  await upsertProduct(catSalads, 'Bowl Mediterráneo', 'Mezcla de hojas verdes, aguacate, tomate cherry, aceitunas y frutos secos', 5.4, img('1743779621234-4994b31b5b1f'), 0, 'Nueva');
  await upsertProduct(catSalads, 'Bowl Verde Fresco', 'Ensalada fresca con vegetales de estación y aliño de la casa', 4.8, img('1751890893842-7807b463b344'), 0, 'Ligera');

  // ---- Combos ----
  await upsertProduct(catCombos, 'Combo Clasico', 'Hamburguesa Classic + papas medianas + gaseosa 500ml', 7.5, img('1561758033-d89a9ad46330'), 15, 'Ahorra', true);
  await upsertProduct(catCombos, 'Combo Familiar', '2 pizzas familiares a eleccion + gaseosa 1.5L', 14.0, img('1565299624946-b28f40a0ae38'), 12, 'Top');
  await upsertProduct(catCombos, 'Combo Alitas Party', '16 alitas a eleccion + papas familiares + 4 dips', 9.0, img('1527477396000-e27163b481c2'), 10, 'Para compartir');
  await upsertProduct(catCombos, 'Combo Smash Supreme', 'Smash burger juegos + papas cheddar + gaseosa personal', 9.5, premium('1776081206759-194e8f23dea0'), 15, 'Ahorra', true);
  await upsertProduct(catCombos, 'Combo Tacos al Pastor', '3 tacos al pastor + papas + salsa especial, listo para armar tu antojo', 8.5, premium('1661776866702-d671127c2d8b'), 12, 'Ahorra');

  // ---- Bebidas ----
  await upsertProduct(catDrinks, 'Gaseosa 500ml', 'Sabor a elegir, bien fría', 1.2, img('1636144832475-0d81f893354d'), 0);
  await upsertProduct(catDrinks, 'Agua Mineral 600ml', 'Agua pura de manantial', 0.8, img('1523362628745-0c100150b504'), 0, null, false, 0);
  await upsertProduct(catDrinks, 'Jugo Natural 400ml', 'Exprimido al momento: naranja, mora o maracuyá', 1.8, img('1600271886742-f049cd451bba'), 0);
  await upsertProduct(catDrinks, 'Frappé de Café', 'Café frío batido con hielo, leche y crema batida', 3.0, img('1759259639354-830bc3120807'), 0, 'Nuevo');
  await upsertProduct(catDrinks, 'Malteada de Fresa', 'Malteada cremosa de fresa bien fría con crema batida', 3.2, img('1579954115545-a95591f28bfc'), 0, 'Nueva', true);
  await upsertProduct(catDrinks, 'Batido Doble de Fresa', 'Doble vaso de batido de fresa con fresas frescas', 3.6, img('1648178628415-b410fc1d58bc'), 0, 'Nuevo');
  await upsertProduct(catDrinks, 'Smoothie Flamingo', 'Smoothie de fresa en vaso decorado con crema y fresas', 3.8, img('1633108787619-9455a0ca4522'), 0, 'Nuevo');

  // ---- Cafes y Tes ----
  await upsertProduct(catCoffees, 'Cafe Americano', 'Cafe de especialidad recién preparado', 1.5, img('1509042239860-f550ce710b93'), 0);
  await upsertProduct(catCoffees, 'Capuchino', 'Cafe espresso con leche vaporizada y espuma cremosa', 2.2, img('1497636577773-f1231844b336'), 0, 'Popular');
  await upsertProduct(catCoffees, 'Te Helado', 'Té negro con limon y hielo, endulzado a gusto', 2.0, img('1556679343-c7306c1976bc'), 0, 'Nuevo', false, 3);
  await upsertProduct(catCoffees, 'Cappuccino Latte Art', 'Cappuccino con espuma cremosa y arte latte', 2.5, img('1571814521680-da02a7da9c97'), 0, 'Popular');
  await upsertProduct(catCoffees, 'Latte de la Casa', 'Latte suave con arte latte y punto de dulzura perfecto', 2.8, img('1762402519375-a29d7971a761'), 0, 'Nuevo');
  await upsertProduct(catCoffees, 'Café para Dos', 'Dos cafés con arte latte en bandeja, ideal en pareja', 4.6, premium('1755714215118-57b441727c67'), 0, 'Para compartir');

  // ---- Postres ----
  await upsertProduct(catDesserts, 'Brownie de Chocolate', 'Brownie casero de chocolate 70% con helado de vainilla', 3.0, img('1606313564200-e75d5e30476c'), 25, 'Popular', true);
  await upsertProduct(catDesserts, 'Helado de Vainilla', 'Cono doble con salsa de chocolate y crocante de almendra', 2.2, img('1497034825429-c343d7c6a68f'), 0);
  await upsertProduct(catDesserts, 'Cheesecake de Maracuya', 'Tarta cremosa de queso con salsa de maracuya', 3.4, img('1533134242443-d4fd215305ad'), 0, 'Nuevo');
  await upsertProduct(catDesserts, 'Tres Leches', 'Bizcocho bañado en tres leches con crema batida', 3.0, premium('1663839331564-2a43583cea49'), 0, 'Tipico');
  await upsertProduct(catDesserts, 'Tiramisú', 'Postre italiano de café, mascarpone y cacao espolvoreado', 3.8, img('1755602810510-decd1df5f64e'), 0, 'Popular');
  await upsertProduct(catDesserts, 'Flan Casero', 'Flan de caramelo con crema batida y cereza', 3.2, img('1752245055559-10daca95e434'), 0, 'Tipico');
  await upsertProduct(catDesserts, 'Torta de Chocolate Clásica', 'Porcion de torta de chocolate con ganache sedosa', 3.2, img('1605807646983-377bc5a76493'), 0, 'Popular');
  await upsertProduct(catDesserts, 'Torta Lava de Chocolate', 'Bizcocho de chocolate con centro fundido que fluye al cortar', 3.6, img('1626263468007-a9e0cf83f1ac'), 0, 'Nueva', true);
  await upsertProduct(catDesserts, 'Torta de Chocolate y Fresa', 'Torta de chocolate esponjosa coronada con fresas frescas', 3.4, img('1606890737304-57a1ca8a5b62'), 0, 'Popular');
  await upsertProduct(catDesserts, 'Cheesecake de Chocolate', 'Rebanada cremosa de cheesecake con chocolate y fresa', 3.9, img('1673551494394-23b13e77e58b'), 0, 'Nuevo');
  await upsertProduct(catDesserts, 'Delicia de Frambuesa', 'Porcion de torta de chocolate con crema y frambuesas', 3.7, img('1771415759744-7a3c0972801e'), 0, 'Premium');

  // ---- Ajustes del establecimiento ----
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('establishment', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [
      JSON.stringify({
        name: 'DeliveryPuyo',
        banner: 'Tu comida favorita, a tu puerta',
        address: 'Av. Ceslao Marin y Orellana',
        city: 'Puyo, Pastaza',
        phone: '(03) 999-9999',
        whatsapp: '099 999 9999',
        email: 'hola@deliverypuyo.test',
        map_query: 'Puyo, Pastaza, Ecuador',
        timezone: 'America/Guayaquil',
        delivery_radius_km: 8
      })
    ]
  );

  // ---- Horario de atencion semanal (0 = Domingo ... 6 = Sabado) ----
  await query('DELETE FROM business_hours');
  const hours = [
    { day: 0, open_time: '11:00', close_time: '22:00', note: 'Atencion reducida el domingo' },
    { day: 1, open_time: '09:00', close_time: '23:00', note: null },
    { day: 2, open_time: '09:00', close_time: '23:00', note: null },
    { day: 3, open_time: '09:00', close_time: '23:00', note: null },
    { day: 4, open_time: '09:00', close_time: '23:00', note: null },
    { day: 5, open_time: '09:00', close_time: '23:00', note: 'Viernes hasta tarde' },
    { day: 6, open_time: '10:00', close_time: '23:00', note: 'Sabados hasta tarde' }
  ];
  for (const h of hours) {
    await query(
      `INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, note)
       VALUES ($1, TRUE, $2, $3, $4)`,
      [h.day, h.open_time, h.close_time, h.note]
    );
  }
  console.log('Horario de atencion sembrado (Lun-Dom).');

  // ---- Feriados de todo el anio (Ecuador 2026) ----
  await query('DELETE FROM holidays');
  const holidays = [
    { date: '2026-01-01', name: 'Ano Nuevo', closed: true },
    { date: '2026-02-16', name: 'Carnaval', closed: true },
    { date: '2026-02-17', name: 'Carnaval', closed: true },
    { date: '2026-03-08', name: 'Dia de la Mujer', closed: false, note: 'Atencion normal todo el dia' },
    { date: '2026-04-03', name: 'Viernes Santo', closed: true },
    { date: '2026-05-01', name: 'Dia del Trabajo', closed: true },
    { date: '2026-05-24', name: 'Batalla de Pichincha', closed: true },
    { date: '2026-08-10', name: 'Primer Grito de Independencia', closed: true },
    { date: '2026-10-09', name: 'Independencia de Guayaquil', closed: true },
    { date: '2026-11-02', name: 'Dia de los Difuntos', closed: true },
    { date: '2026-11-03', name: 'Independencia de Cuenca', closed: true },
    { date: '2026-12-24', name: 'Nochebuena', closed: false, open_time: '12:00', close_time: '18:00', note: 'Horario especial: atencion hasta las 6pm' },
    { date: '2026-12-25', name: 'Navidad', closed: true },
    { date: '2026-12-31', name: 'Nochevieja', closed: false, open_time: '08:00', close_time: '16:00', note: 'Cierre temprano por celebracion' }
  ];
  for (const h of holidays) {
    await query(
      `INSERT INTO holidays (date, name, closed, open_time, close_time, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [h.date, h.name, h.closed, h.open_time || null, h.close_time || null, h.note || null]
    );
  }
  console.log('Feriados 2026 sembrados:', holidays.length);

  console.log('\nSeed completado.');
  console.log('Cuentas de prueba:');
  console.log('  Admin:      admin@delivery.test / Admin123!');
  console.log('  Repartidores: repartidor@delivery.test / Repartidor123! (Uno)');
  console.log('                repartidor2@delivery.test / Repartidor123! (Dos)');
  console.log('                repartidor3@delivery.test / Repartidor123! (Tres)');
  console.log('                repartidor4@delivery.test / Repartidor123! (Cuatro)');
  console.log('                repartidor5@delivery.test / Repartidor123! (Cinco)');
  console.log('                repartidor6@delivery.test / Repartidor123! (Seis)');
  console.log('                repartidor7@delivery.test / Repartidor123! (Siete)');
  console.log('                repartidor8@delivery.test / Repartidor123! (Ocho)');
  console.log('  Cliente:    cliente@delivery.test / Cliente123!');
  console.log(`  (ids: admin=${adminId}, courier=${courierId}, client=${clientId})`);

  await closePool();
}

seed().catch((err) => {
  console.error('Error al sembrar datos:', err.message);
  process.exit(1);
});