const asyncHandler = require('../utils/asyncHandler');
const notificationModel = require('../models/notification.model');

const listMine = asyncHandler(async (req, res) => {
  const data = await notificationModel.listForUser(req.user.id);
  res.json({ data });
});

const markOneRead = asyncHandler(async (req, res) => {
  const ok = await notificationModel.markRead(Number(req.params.id), req.user.id);
  res.json({ success: ok });
});

const markAll = asyncHandler(async (req, res) => {
  await notificationModel.markAllRead(req.user.id);
  res.json({ success: true });
});

module.exports = { listMine, markOneRead, markAll };