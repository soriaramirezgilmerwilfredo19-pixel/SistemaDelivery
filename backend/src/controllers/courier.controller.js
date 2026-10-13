const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const orderModel = require('../models/order.model');
const liveLocations = require('../utils/liveLocations');
const { notify } = require('../utils/notify');

const TRACKABLE_STATUSES = ['ready', 'picked_up'];

const myOrders = asyncHandler(async (req, res) => {
  const data = await orderModel.listAll({ courierId: req.user.id });
  res.json({ data });
});

const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!['picked_up', 'delivered'].includes(status)) {
    throw new ApiError(400, 'El repartidor solo puede marcar recogido o entregado');
  }

  const order = await orderModel.findById(id);
  if (!order) throw new ApiError(404, 'Pedido no encontrado');
  if (order.courier_id !== req.user.id) {
    throw new ApiError(403, 'Este pedido no esta asignado a ti');
  }
  if (order.status !== 'ready' && order.status !== 'picked_up') {
    throw new ApiError(
      400,
      'El pedido todavia no esta listo para recoger. Espera a que el local lo marque como listo.'
    );
  }
  if (status === 'delivered' && order.status !== 'picked_up') {
    throw new ApiError(400, 'Debes marcar el pedido como recogido antes de entregarlo');
  }

  const updated = await orderModel.updateStatus(id, status, req.user.id);
  res.json({ order: updated });
});

const shareLocation = asyncHandler(async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  liveLocations.set(req.user.id, lat, lng);

  const orders = await orderModel.listAll({ courierId: req.user.id });
  const active = orders.filter((o) => TRACKABLE_STATUSES.includes(o.status));

  for (const o of active) {
    notify({
      type: 'location',
      orderId: o.id,
      status: o.status,
      userId: o.user_id,
      courierId: req.user.id,
      lat,
      lng
    });
  }

  res.json({ ok: true, shared_with: active.length });
});

module.exports = { myOrders, updateStatus, shareLocation };
