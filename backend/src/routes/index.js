const { Router } = require('express');

const authRoutes = require('./auth.routes');
const configRoutes = require('./config.routes');
const addressRoutes = require('./address.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const courierRoutes = require('./courier.routes');
const adminRoutes = require('./admin.routes');
const reviewRoutes = require('./review.routes');
const eventRoutes = require('./event.routes');
const notificationRoutes = require('./notification.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/addresses', addressRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/courier', courierRoutes);
router.use('/admin', adminRoutes);
router.use('/reviews', reviewRoutes);
router.use('/events', eventRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
