const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { config } = require('./config');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));

if (!config.isTest) {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Demasiadas peticiones, intenta mas tarde' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Demasiados intentos de autenticacion' }
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', async (req, res) => {
  try {
    const { query } = require('./config/database');
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
