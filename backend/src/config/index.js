const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env')
});

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isTest: env === 'test',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  deliveryFee: Number(process.env.DELIVERY_FEE ?? 2.5),
  freeDeliveryOver: Number(process.env.FREE_DELIVERY_OVER ?? 25),
  etaMinutes: process.env.ETA_MINUTES || '25-45',
  appName: process.env.APP_NAME || 'Sistema Delivery'
};

function assertConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.jwtSecret || config.jwtSecret.length < 16) {
    missing.push('JWT_SECRET (minimo 16 caracteres)');
  }
  if (missing.length > 0) {
    throw new Error(
      `Configuracion invalida. Faltan variables en .env: ${missing.join(', ')}`
    );
  }
}

module.exports = { config, assertConfig };
