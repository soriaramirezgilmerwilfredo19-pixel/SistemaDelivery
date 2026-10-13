const bus = require('./events');
const notificationModel = require('../models/notification.model');

function notify(payload) {
  setImmediate(() => {
    bus.emit('order-event', payload);
    notificationModel.createForOrder(payload).catch(() => {});
  });
}

function notifyNewOrder(order) {
  notify({
    type: 'created',
    orderId: order.id,
    status: order.status,
    userId: order.user_id,
    courierId: order.courier_id || null
  });
}

module.exports = { notify, notifyNewOrder };
