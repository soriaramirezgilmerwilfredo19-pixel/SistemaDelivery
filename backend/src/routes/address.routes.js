const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { addressSchema } = require('../validators/address.schemas');
const addressController = require('../controllers/address.controller');

const router = Router();

router.use(requireAuth);
router.get('/', addressController.list);
router.post('/', validate(addressSchema), addressController.create);
router.put('/:id', validate(addressSchema), addressController.update);
router.delete('/:id', addressController.remove);

module.exports = router;
