const { Router } = require('express');

const categoryController = require('../controllers/category.controller');

const router = Router();

router.get('/', categoryController.list);

module.exports = router;
