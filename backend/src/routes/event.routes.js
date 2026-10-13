const { Router } = require('express');

const { requireAuth } = require('../middlewares/auth.middleware');
const bus = require('../utils/events');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();
  res.write(': connected\n\n');

  const { id: userId, role } = req.user;

  const listener = (payload) => {
    const relevant =
      payload.userId === userId ||
      role === 'admin' ||
      (role === 'courier' && payload.courierId === userId);

    if (!relevant) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  bus.on('order-event', listener);

  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    bus.off('order-event', listener);
    clearInterval(ping);
  });
});

module.exports = router;
