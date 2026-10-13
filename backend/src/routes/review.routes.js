const { Router } = require('express');

const validate = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { reviewSchema } = require('../validators/review.schemas');
const reviewController = require('../controllers/review.controller');

const router = Router();

router.get('/product/:productId', reviewController.listByProduct);
router.post(
  '/product/:productId',
  requireAuth,
  requireRole('client'),
  validate(reviewSchema),
  reviewController.create
);
router.delete('/:id', requireAuth, reviewController.remove);

module.exports = router;
