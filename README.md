# Sistema Delivery

Proyecto académico para el curso de Seguridad Informática (Desarrollo de Sistemas): MVP funcional de un sistema de delivery con catálogo, carrito, pedidos, roles (cliente / repartidor / administrador) y pago simulado.

## Stack

- **Backend:** Node.js + Express 5, PostgreSQL 18, JWT, bcryptjs, Helmet, CORS, rate limiting, validación con Zod, morgan
- **Frontend:** React 19 + Vite, react-router-dom, axios
- **Tests:** Jest + Supertest (30 tests de integración)
- **Base de datos:** PostgreSQL (esquema en `backend/src/db/schema.sql`)

## Estructura

```
SistemaDelivery/
├── backend/
│   ├── src/
│   │   ├── app.js            # Configuración de Express
│   │   ├── server.js         # Punto de entrada
│   │   ├── config/           # Variables de entorno + pool de PostgreSQL
│   │   ├── db/schema.sql     # Esquema de la base de datos
│   │   ├── middlewares/      # Auth (JWT), roles, validación, errores
│   │   ├── models/           # Consultas SQL (users, products, cart, orders...)
│   │   ├── services/         # Lógica de negocio (auth)
│   │   ├── controllers/      # Handlers HTTP
│   │   ├── routes/           # /api/auth, /api/products, /api/cart...
│   │   ├── validators/       # Esquemas Zod
│   │   └── scripts/          # migrate.js, seed.js
│   └── tests/                # Tests de integración (Jest + Supertest)
└── frontend/
    └── src/
        ├── api/client.js     # Axios con JWT
        ├── context/          # Auth y Toasts
        ├── components/       # Layout, guards, badges
        └── pages/            # Catálogo, carrito, pedidos, admin, repartidor
```

## Requisitos

- Node.js 18+ y npm
- PostgreSQL 13+ corriendo en `localhost:5432`

## Instalación

### 1. Base de datos

Crea un usuario y una base de datos en PostgreSQL:

```sql
CREATE ROLE delivery_app LOGIN CONTRASENA 'tu_contraseña';
CREATE DATABASE sistema_delivery OWNER delivery_app ENCODING 'UTF8';
```

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env    # Windows  (o cp .env.example .env en Linux/Mac)
```

Edita `.env` con tus credenciales reales (`DATABASE_URL`, `JWT_SECRET`, etc.). Luego:

```bash
npm run migrate   # crea las tablas
npm run seed      # crea usuarios de prueba y catálogo
npm run dev       # servidor en http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # en http://localhost:5173
```

## Cuentas de prueba (tras `npm run seed`)

| Rol | Email | Contrasena |
|---|---|---|
| Administrador | admin@delivery.test | Admin123! |
| Repartidor | repartidor@delivery.test | Repartidor123! |
| Repartidor | repartidor2@delivery.test | Repartidor123! |
| Repartidor | repartidor3@delivery.test | Repartidor123! |
| Repartidor | repartidor4@delivery.test | Repartidor123! |
| Repartidor | repartidor5@delivery.test | Repartidor123! |
| Repartidor | repartidor6@delivery.test | Repartidor123! |
| Repartidor | repartidor7@delivery.test | Repartidor123! |
| Repartidor | repartidor8@delivery.test | Repartidor123! |
| Cliente | cliente@delivery.test | Cliente123! |

> El seed es idempotente: si los usuarios ya existen, resetea sus credenciales
> (nombre, contraseña, teléfono y rol) para que todas las cuentas de arriba
> siempre vuelvan a estar disponibles.

## Flujo del sistema

1. El **cliente** se registra, elige productos, llena el carrito y hace checkout (efectivo o tarjeta simulada).
2. El **administrador** confirma, prepara y marca el pedido como listo, y asigna un repartidor.
3. El **repartidor** marca el pedido como recogido y luego entregado (al entregar se considera cobrado).
4. El pago con tarjeta es **simulado**: el cliente puede pulsar "Pagar ahora" en su pedido.

Estados del pedido: `pending → confirmed → preparing → ready → picked_up → delivered` (o `cancelled`).

## Endpoints principales

| Metodo | Ruta | Acceso |
|---|---|---|
| POST | /api/auth/register · /api/auth/login | publico |
| GET · PUT | /api/auth/me · /api/users/me | autenticado |
| GET | /api/products · /api/categories | publico |
| POST · PUT · DELETE | /api/products | admin |
| GET · POST · PUT · DELETE | /api/cart... | cliente |
| POST | /api/cart/checkout | cliente |
| GET · POST cancel/pay | /api/orders | cliente |
| GET · PUT status/assign | /api/admin/orders... | admin |
| GET | /api/admin/stats · /api/admin/users · /api/admin/couriers | admin |
| GET · PUT status | /api/courier/orders... | repartidor |

## Tests

```bash
cd backend
npm test    # requiere la BD de pruebas configurada en backend/.env.test
```

Los tests usan `sistema_delivery_test` (se crea igual que la principal).

## Seguridad implementada

- Contraseñas con bcrypt (nunca en texto plano)
- JWT con expiración configurable
- Helmet (headers HTTP seguros)
- CORS restringido al origen del frontend
- Rate limiting global y más estricto en `/api/auth`
- Validación de todos los inputs con Zod
- Consultas SQL parametrizadas (prevención de inyección SQL)
- Roles y autorización por ruta (cliente / repartidor / admin)
