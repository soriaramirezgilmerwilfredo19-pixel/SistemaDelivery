const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { productSchema } = require('../validators/product.schemas');
const productController = require('../controllers/product.controller');

const router = Router();

router.get('/', productController.list);
router.get('/:id', productController.getById);

router.use(requireAuth, requireRole('admin'));
router.post('/', validate(productSchema), productController.create);
router.put('/:id', validate(productSchema), productController.update);
router.delete('/:id', productController.remove);

module.exports = router;
