const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { cartItemSchema, cartItemUpdateSchema, checkoutSchema } = require('../validators/order.schemas');
const cartController = require('../controllers/cart.controller');

const router = Router();

router.use(requireAuth, requireRole('client'));
router.get('/', cartController.getCart);
router.post('/items', validate(cartItemSchema), cartController.addItem);
router.put('/items/:productId', validate(cartItemUpdateSchema), cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clear);
router.post('/checkout', validate(checkoutSchema), cartController.checkout);

module.exports = router;
