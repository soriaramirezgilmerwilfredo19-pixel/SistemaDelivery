const asyncHandler = require('../utils/asyncHandler');
const reviewModel = require('../models/review.model');

const listByProduct = asyncHandler(async (req, res) => {
  const data = await reviewModel.listByProduct(Number(req.params.productId));
  res.json({ data });
});

const create = asyncHandler(async (req, res) => {
  const review = await reviewModel.create(
    Number(req.params.productId),
    req.user.id,
    req.body
  );
  res.status(201).json({ review });
});

const remove = asyncHandler(async (req, res) => {
  await reviewModel.remove(Number(req.params.id), req.user.id, req.user.role === 'admin');
  res.status(204).send();
});

module.exports = { listByProduct, create, remove };
