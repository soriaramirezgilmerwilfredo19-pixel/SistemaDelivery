-- Esquema de la base de datos del Sistema Delivery

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('client', 'courier', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'preparing', 'ready',
    'picked_up', 'delivered', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(120) NOT NULL,
  phone         VARCHAR(30),
  role          user_role NOT NULL DEFAULT 'client',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(60) NOT NULL DEFAULT 'Casa',
  line1       VARCHAR(180) NOT NULL,
  line2       VARCHAR(180),
  city        VARCHAR(80) NOT NULL,
  postal_code VARCHAR(20),
  notes       VARCHAR(255),
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(140) NOT NULL,
  description VARCHAR(400),
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  discount    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 90),
  image_url   TEXT,
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Migracion idempotente para bases de datos creadas antes del descuento
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN discount NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (discount >= 0 AND discount <= 90);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Etiqueta visible ("Popular", "Nuevo", "Promo") y destacado en catalogo
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN badge VARCHAR(24);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN featured BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Ajustes del negocio (establecimiento, valores editables desde el admin)
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(60) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Horario de atencion semanal (0 = Domingo ... 6 = Sabado, igual que JS getDay)
CREATE TABLE IF NOT EXISTS business_hours (
  day_of_week SMALLINT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_open     BOOLEAN NOT NULL DEFAULT TRUE,
  open_time   TIME,
  close_time  TIME,
  note        VARCHAR(120)
);

-- Feriados y dias especiales de todo el anio
CREATE TABLE IF NOT EXISTS holidays (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL UNIQUE,
  name       VARCHAR(120) NOT NULL,
  closed     BOOLEAN NOT NULL DEFAULT TRUE,
  open_time  TIME,
  close_time TIME,
  note       VARCHAR(160)
);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_id     INTEGER REFERENCES addresses(id) ON DELETE SET NULL,
  courier_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status         order_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  subtotal       NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes          VARCHAR(400),
  custom_request VARCHAR(400),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_request VARCHAR(400);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(140) NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  subtotal     NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Stock disponible por producto (NULL = ilimitado, 0 = sin stock)
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN stock INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Historial de estados del pedido (linea de tiempo con timestamps)
CREATE TABLE IF NOT EXISTS order_status_history (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  note       VARCHAR(200),
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- Notificaciones in-app por usuario
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(24) NOT NULL,
  message    VARCHAR(240) NOT NULL,
  order_id   INTEGER,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
