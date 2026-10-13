const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { config } = require('../config');
const settingModel = require('../models/setting.model');

const getPublic = asyncHandler(async (req, res) => {
  const { establishment, hours, holidays } = await settingModel.getPublicSettings();
  res.json({
    data: {
      app_name: config.appName,
      delivery_fee: config.deliveryFee.toFixed(2),
      free_delivery_over: config.freeDeliveryOver,
      eta_minutes: config.etaMinutes,
      currency: 'S/',
      establishment,
      hours,
      holidays
    }
  });
});

const getSettings = asyncHandler(async (req, res) => {
  const data = await settingModel.getPublicSettings();
  res.json({ data });
});

const saveEstablishment = asyncHandler(async (req, res) => {
  const establishment = await settingModel.saveEstablishment(req.body);
  res.json({ establishment });
});

const saveHours = asyncHandler(async (req, res) => {
  const hours = await settingModel.saveHours(req.body);
  res.json({ hours });
});

const addHoliday = asyncHandler(async (req, res) => {
  const holiday = await settingModel.createHoliday(req.body);
  res.status(201).json({ holiday });
});

const editHoliday = asyncHandler(async (req, res) => {
  const holiday = await settingModel.updateHoliday(Number(req.params.id), req.body);
  if (!holiday) throw new ApiError(404, 'Feriado no encontrado');
  res.json({ holiday });
});

const removeHoliday = asyncHandler(async (req, res) => {
  const removed = await settingModel.deleteHoliday(Number(req.params.id));
  if (!removed) throw new ApiError(404, 'Feriado no encontrado');
  res.json({ message: 'Feriado eliminado' });
});

module.exports = {
  getPublic,
  getSettings,
  saveEstablishment,
  saveHours,
  addHoliday,
  editHoliday,
  removeHoliday
};