const { Router } = require('express');
const settingController = require('../controllers/setting.controller');

const router = Router();

router.get('/', settingController.getPublic);

module.exports = router;