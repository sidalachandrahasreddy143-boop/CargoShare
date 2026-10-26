'use strict';
/** Central error handler — consistent error envelope. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  console.error('[error]', err);
  if (err.message && err.message.startsWith('INSUFFICIENT_CAPACITY')) {
    return res.status(409).json({ error: 'INSUFFICIENT_CAPACITY', available: err.message.split(':')[1] });
  }
  if (err.message === 'CONTAINER_NOT_FOUND') return res.status(404).json({ error: 'CONTAINER_NOT_FOUND' });
  if (err.code === '23505') return res.status(409).json({ error: 'DUPLICATE', detail: err.detail });
  res.status(err.status || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
}

function notFound(req, res) {
  res.status(404).json({ error: 'ROUTE_NOT_FOUND', path: req.path });
}

module.exports = { errorHandler, notFound };
