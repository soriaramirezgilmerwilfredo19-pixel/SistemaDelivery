const { ZodError } = require('zod');

const { config } = require('../config');
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos invalidos',
      errors: err.issues.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message
      }))
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      status: 'error',
      message: 'El registro ya existe (valor duplicado)'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      status: 'error',
      message: 'Referencia invalida a otro registro'
    });
  }

  console.error(err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    ...(config.env === 'development' ? { detalle: err.message } : {})
  });
}

module.exports = { notFound, errorHandler };
