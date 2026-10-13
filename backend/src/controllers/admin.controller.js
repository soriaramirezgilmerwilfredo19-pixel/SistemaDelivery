const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const orderModel = require('../models/order.model');
const userModel = require('../models/user.model');
const liveLocations = require('../utils/liveLocations');

const listOrders = asyncHandler(async (req, res) => {
  const data = await orderModel.listAll({
    status: req.query.status,
    courierId: req.query.courier_id
  });
  res.json({ data });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const updated = await orderModel.updateStatus(Number(req.params.id), req.body.status, req.user.id);
  res.json({ order: updated });
});

const assignCourier = asyncHandler(async (req, res) => {
  const order = await orderModel.assignCourier(Number(req.params.id), req.body.courier_id);
  res.json({ order });
});

const listCouriers = asyncHandler(async (req, res) => {
  const data = await userModel.listByRole('courier');
  res.json({ data });
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await userModel.listAll();
  res.json({ data });
});

const stats = asyncHandler(async (req, res) => {
  const data = await orderModel.stats();
  res.json({ data });
});

const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(Number(req.params.id));
  if (!order) throw new ApiError(404, 'Pedido no encontrado');
  const items = await orderModel.findItems(order.id);
  const history = await orderModel.findHistory(order.id);
  const courier_location = order.courier_id ? liveLocations.get(order.courier_id) : null;
  res.json({ order: { ...order, items, history, courier_location } });
});

const exportCsv = asyncHandler(async (req, res) => {
  const rows = await orderModel.exportCsv({
    from: req.query.from,
    to: req.query.to
  });
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['id', 'fecha', 'cliente', 'subtotal', 'delivery', 'total', 'pago', 'estado_pago'];
  const lines = rows.map((r) => [
    r.id,
    r.created_at,
    r.client_name,
    r.subtotal,
    r.delivery_fee,
    r.total,
    r.payment_method,
    r.payment_status
  ].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send([header.map(esc).join(','), ...lines].join('\r\n'));
});

module.exports = {
  listOrders,
  updateOrderStatus,
  assignCourier,
  listCouriers,
  listUsers,
  stats,
  getOrderDetail,
  exportCsv
};
