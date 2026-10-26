'use strict';
const Redis = require('ioredis');
const cfg = require('./config');

const redis = new Redis(cfg.redisUrl, {
  maxRetriesPerRequest: 2,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on('error', (err) => console.error('[redis]', err.message));

module.exports = redis;
