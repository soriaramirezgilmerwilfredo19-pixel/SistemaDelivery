const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const cartModel = require('../models/cart.model');
const orderModel = require('../models/order.model');
const { notifyNewOrder } = require('../utils/notify');
const { config } = require('../config');

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartModel.getCart(req.user.id);
  res.json({ data: cart });
});

const addItem = asyncHandler(async (req, res) => {
  const cart = await cartModel.addItem(
    req.user.id,
    req.body.product_id,
    req.body.quantity
  );
  res.status(201).json({ data: cart });
});

const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartModel.updateItem(
    req.user.id,
    Number(req.params.productId),
    req.body.quantity
  );
  res.json({ data: cart });
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartModel.removeItem(req.user.id, Number(req.params.productId));
  res.json({ data: cart });
});

const clear = asyncHandler(async (req, res) => {
  const cart = await cartModel.clear(req.user.id);
  res.json({ data: cart });
});

const checkout = asyncHandler(async (req, res) => {
  const { address_id, payment_method, notes } = req.body;
  const order = await cartModel.checkout(req.user.id, {
    addressId: address_id,
    paymentMethod: payment_method,
    notes,
    deliveryFee: config.deliveryFee,
    freeDeliveryOver: config.freeDeliveryOver
  });
  const full = await orderModel.findById(order.id);
  const items = await orderModel.findItems(order.id);
  notifyNewOrder(full);
  res.status(201).json({ order: { ...full, items } });
});

module.exports = { getCart, addItem, updateItem, removeItem, clear, checkout };
