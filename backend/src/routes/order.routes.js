const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { customOrderSchema } = require('../validators/order.schemas');
const orderController = require('../controllers/order.controller');

const router = Router();

router.use(requireAuth, requireRole('client'));
router.post('/custom', validate(customOrderSchema), orderController.createCustom);
router.get('/', orderController.listMine);
router.get('/:id', orderController.getMine);
router.post('/:id/cancel', orderController.cancel);
router.post('/:id/pay', orderController.pay);

module.exports = router;
