const asyncHandler = require('../utils/asyncHandler');
const categoryModel = require('../models/category.model');

const list = asyncHandler(async (req, res) => {
  const data = await categoryModel.list();
  res.json({ data });
});

module.exports = { list };
