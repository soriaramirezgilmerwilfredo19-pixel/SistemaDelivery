const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { orderStatusSchema, assignSchema } = require('../validators/order.schemas');
const {
  establishmentSchema,
  hoursSchema,
  holidaySchema
} = require('../validators/settings.schemas');
const adminController = require('../controllers/admin.controller');
const settingController = require('../controllers/setting.controller');

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats', adminController.stats);
router.get('/stats/export', adminController.exportCsv);
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.getOrderDetail);
router.put('/orders/:id/status', validate(orderStatusSchema), adminController.updateOrderStatus);
router.put('/orders/:id/assign', validate(assignSchema), adminController.assignCourier);
router.get('/couriers', adminController.listCouriers);
router.get('/users', adminController.listUsers);

router.get('/settings', settingController.getSettings);
router.put('/settings/establishment', validate(establishmentSchema), settingController.saveEstablishment);
router.put('/settings/hours', validate(hoursSchema), settingController.saveHours);
router.post('/settings/holidays', validate(holidaySchema), settingController.addHoliday);
router.put('/settings/holidays/:id', validate(holidaySchema), settingController.editHoliday);
router.delete('/settings/holidays/:id', settingController.removeHoliday);

module.exports = router;
