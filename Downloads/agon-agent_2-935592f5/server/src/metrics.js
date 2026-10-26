'use strict';
/** Prometheus metrics — exposed at GET /metrics */
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'cargoshare_' });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const bookingLocks = new client.Counter({
  name: 'booking_locks_acquired_total',
  help: 'Redis booking locks acquired',
  registers: [register],
});

const bookingsConfirmed = new client.Counter({
  name: 'bookings_confirmed_total',
  help: 'Bookings confirmed after payment',
  registers: [register],
});

const paymentsTotal = new client.Counter({
  name: 'payments_total',
  help: 'Payments by status',
  labelNames: ['status'],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown';
    end({ method: req.method, route: String(route).slice(0, 80), status_code: res.statusCode });
  });
  next();
}

module.exports = { register, metricsMiddleware, bookingLocks, bookingsConfirmed, paymentsTotal };
