'use strict';
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const cfg = require('./config');
const { errorHandler, notFound } = require('./middleware/error');
const { register, metricsMiddleware } = require('./metrics');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: cfg.corsOrigin === '*' ? '*' : cfg.corsOrigin.split(','), credentials: true },
});
app.set('io', io);
initSocket(io);

// ── Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: cfg.corsOrigin === '*' ? true : cfg.corsOrigin.split(','), credentials: true }));

// Razorpay webhook needs the raw body for signature verification — mount BEFORE json parser
app.use('/api/webhooks', require('./routes/webhooks'));

app.use(express.json({ limit: '1mb' }));
app.use(metricsMiddleware);

// ── Health & metrics (unauthenticated, for k8s probes + Prometheus)
app.get('/api/health', async (req, res) => {
  try {
    await require('./db').query('SELECT 1');
    await require('./redis').ping();
    res.json({ status: 'ok', service: 'cargoshare-api', uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: e.message });
  }
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Swagger / OpenAPI (auto-generated from JSDoc above routes)
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CargoShare API',
      version: '1.0.0',
      description: 'Open-source spare-capacity logistics marketplace — REST + Socket.io.\n\nAuth: Bearer JWT. Get one via POST /api/auth/login.',
      license: { name: 'AGPL-3.0', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [__dirname + '/routes/*.js'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'CargoShare API Docs' }));
app.get('/api/openapi.json', (req, res) => res.json(swaggerSpec));

// ── Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/containers', require('./routes/containers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));

app.use(notFound);
app.use(errorHandler);

server.listen(cfg.port, () => {
  console.log(`[cargoshare-api] listening on :${cfg.port} (${cfg.env})`);
  console.log(`[cargoshare-api] swagger → http://localhost:${cfg.port}/api/docs`);
});

module.exports = { app, server };
