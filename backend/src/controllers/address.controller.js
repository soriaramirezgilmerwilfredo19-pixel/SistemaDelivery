const asyncHandler = require('../utils/asyncHandler');
const addressModel = require('../models/address.model');

const list = asyncHandler(async (req, res) => {
  const data = await addressModel.listByUser(req.user.id);
  res.json({ data });
});

const create = asyncHandler(async (req, res) => {
  const body = req.body;
  if (body.is_default) {
    await addressModel.clearDefault(req.user.id);
  }
  const address = await addressModel.create(req.user.id, body);
  res.status(201).json({ address });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (req.body.is_default) {
    await addressModel.clearDefault(req.user.id);
  }
  const address = await addressModel.update(id, req.user.id, req.body);
  if (!address) {
    return res.status(404).json({ status: 'error', message: 'Direccion no encontrada' });
  }
  res.json({ address });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await addressModel.remove(Number(req.params.id), req.user.id);
  if (!ok) {
    return res.status(404).json({ status: 'error', message: 'Direccion no encontrada' });
  }
  res.status(204).send();
});

module.exports = { list, create, update, remove };
