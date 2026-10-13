const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const userModel = require('../models/user.model');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await userModel.updateProfile(req.user.id, { name, phone });
  res.status(200).json({ user });
});

module.exports = { register, login, me, updateMe };
