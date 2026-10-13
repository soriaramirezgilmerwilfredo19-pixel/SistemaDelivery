const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const orderModel = require('../models/order.model');
const liveLocations = require('../utils/liveLocations');
const { notifyNewOrder } = require('../utils/notify');
const { config } = require('../config');

function withCourierLocation(order) {
  const courier_location = order.courier_id ? liveLocations.get(order.courier_id) : null;
  return { ...order, courier_location };
}

async function getOwnedOrder(req) {
  const order = await orderModel.findById(Number(req.params.id));
  if (!order) throw new ApiError(404, 'Pedido no encontrado');

  const isOwner = order.user_id === req.user.id;
  const isStaff = ['admin', 'courier'].includes(req.user.role);
  const isAssignedCourier = req.user.role === 'courier' && order.courier_id === req.user.id;

  if (!isOwner && !isStaff && !isAssignedCourier) {
    throw new ApiError(403, 'No puedes ver este pedido');
  }
  return order;
}

const createCustom = asyncHandler(async (req, res) => {
  const order = await orderModel.createCustomOrder(req.user.id, {
    addressId: req.body.address_id,
    paymentMethod: req.body.payment_method,
    dishType: req.body.dish_type,
    customRequest: req.body.custom_request,
    quantity: req.body.quantity,
    budget: req.body.budget,
    notes: req.body.notes,
    deliveryFee: config.deliveryFee,
    freeDeliveryOver: config.freeDeliveryOver
  });
  const full = await orderModel.findById(order.id);
  const items = await orderModel.findItems(order.id);
  notifyNewOrder(full);
  res.status(201).json({ order: { ...full, items } });
});

const listMine = asyncHandler(async (req, res) => {
  const data = await orderModel.listByUser(req.user.id);
  res.json({ data });
});

const getMine = asyncHandler(async (req, res) => {
  const order = await getOwnedOrder(req);
  const items = await orderModel.findItems(order.id);
  const history = await orderModel.findHistory(order.id);
  res.json({ order: withCourierLocation({ ...order, items, history }) });
});

const cancel = asyncHandler(async (req, res) => {
  const order = await getOwnedOrder(req);
  if (order.user_id !== req.user.id) {
    throw new ApiError(403, 'Solo el cliente puede cancelar su pedido');
  }
  const updated = await orderModel.updateStatus(order.id, 'cancelled', req.user.id);
  res.json({ order: updated });
});

const pay = asyncHandler(async (req, res) => {
  const order = await getOwnedOrder(req);
  if (order.user_id !== req.user.id) {
    throw new ApiError(403, 'Solo el cliente puede pagar su pedido');
  }
  const updated = await orderModel.markPaid(order.id);
  res.json({ order: updated });
});

module.exports = { createCustom, listMine, getMine, cancel, pay };
