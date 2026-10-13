const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const { findById } = require('../models/user.model');

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  let [scheme, token] = header.split(' ');

  // EventSource (SSE) no puede enviar headers: aceptar token en query
  if (!token && req.query?.token) {
    scheme = 'Bearer';
    token = String(req.query.token);
  }

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Autenticacion requerida');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new ApiError(401, 'Token invalido o expirado');
  }

  const user = await findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'Usuario no encontrado');
  }

  req.user = user;
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'No tienes permisos para esta accion'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
