const { Router } = require('express');

const { requireAuth } = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');

const router = Router();

router.use(requireAuth);

router.get('/', notificationController.listMine);
router.put('/read', notificationController.markAll);
router.put('/:id/read', notificationController.markOneRead);

module.exports = router;