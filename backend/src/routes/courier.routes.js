const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { orderStatusSchema, locationSchema } = require('../validators/order.schemas');
const courierController = require('../controllers/courier.controller');

const router = Router();

router.use(requireAuth, requireRole('courier'));
router.put('/location', validate(locationSchema), courierController.shareLocation);
router.get('/orders', courierController.myOrders);
router.put('/orders/:id/status', validate(orderStatusSchema), courierController.updateStatus);

module.exports = router;
