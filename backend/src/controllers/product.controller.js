const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const productModel = require('../models/product.model');

const list = asyncHandler(async (req, res) => {
  const data = await productModel.list({
    search: req.query.search,
    categorySlug: req.query.category,
    availableOnly: req.query.available === 'true'
  });
  res.json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productModel.findById(Number(req.params.id));
  if (!product) throw new ApiError(404, 'Producto no encontrado');
  res.json({ product });
});

const create = asyncHandler(async (req, res) => {
  const product = await productModel.create(req.body);
  res.status(201).json({ product });
});

const update = asyncHandler(async (req, res) => {
  const product = await productModel.update(Number(req.params.id), req.body);
  if (!product) throw new ApiError(404, 'Producto no encontrado');
  res.json({ product });
});

const remove = asyncHandler(async (req, res) => {
  const product = await productModel.softDelete(Number(req.params.id));
  if (!product) throw new ApiError(404, 'Producto no encontrado');
  res.json({ message: 'Producto deshabilitado', product });
});

module.exports = { list, getById, create, update, remove };
