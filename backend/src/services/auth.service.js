const bcrypt = require('bcryptjs');

const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const userModel = require('../models/user.model');

const SALT_ROUNDS = 10;

function toPublic(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

async function register({ name, email, password, phone }) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new ApiError(409, 'El email ya esta registrado');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userModel.create({ name, email, passwordHash, phone, role: 'client' });
  const token = signToken({ sub: user.id, role: user.role });

  return { token, user: toPublic(user) };
}

async function login({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Credenciales invalidas');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new ApiError(401, 'Credenciales invalidas');
  }

  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: toPublic(user) };
}

module.exports = { register, login };
