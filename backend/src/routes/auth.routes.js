const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { registerSchema, loginSchema } = require('../validators/schemas');
const authController = require('../controllers/auth.controller');
const { updateMeSchema } = require('../validators/user.schemas');

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', requireAuth, authController.me);
router.put('/me', requireAuth, validate(updateMeSchema), authController.updateMe);

module.exports = router;
