'use strict';
/**
 * Redis booking locks — the heart of double-booking prevention.
 *
 * Lock key:   lock:container:{containerId}:{lockId}
 * Index key:  lock:container:{containerId}  (SET of held lockIds)
 * TTL:        10 minutes (LOCK_TTL_SECONDS)
 *
 * Strategy: atomic capacity reservation via WATCH-free Lua script so the
 * check-and-decrement is a single round trip. Available capacity is derived
 * from PostgreSQL (total - booked - locked) to survive Redis restarts.
 */
const redis = require('../redis');
const cfg = require('../config');

const LOCK_PREFIX = 'lock:container:';

// Atomically: sum active locks for container, check vs available, add new lock.
const ACQUIRE_SCRIPT = `
local lockKey  = KEYS[1]               -- lock:container:{id}:{lockId}
local indexKey = KEYS[2]               -- lock:container:{id}  (hash field lockKey -> qty)
local qty      = tonumber(ARGV[1])
local avail    = tonumber(ARGV[2])
local ttl      = tonumber(ARGV[3])
local vals = redis.call('HVALS', indexKey)
local sum = 0
for _, v in ipairs(vals) do sum = sum + tonumber(v) end
if (avail - sum) < qty then
  return {0, avail - sum}
end
redis.call('HSET', indexKey, lockKey, qty)
redis.call('EXPIRE', indexKey, ttl)
redis.call('SET', lockKey, qty, 'EX', ttl)
return {1, avail - sum - qty}
`;

async function acquireLock(containerId, lockId, qty, dbAvailable) {
  const lockKey = `${LOCK_PREFIX}${containerId}:${lockId}`;
  const indexKey = `${LOCK_PREFIX}${containerId}`;
  const result = await redis.eval(ACQUIRE_SCRIPT, 2, lockKey, indexKey, String(qty), String(dbAvailable), String(cfg.lockTtlSeconds));
  const [ok, remaining] = result;
  if (ok === 1) return { ok: true, lockId, remaining, ttl: cfg.lockTtlSeconds };
  return { ok: false, remaining };
}

async function releaseLock(containerId, lockId, qty) {
  const lockKey = `${LOCK_PREFIX}${containerId}:${lockId}`;
  const indexKey = `${LOCK_PREFIX}${containerId}`;
  await redis.multi()
    .del(lockKey)
    .hdel(indexKey, lockKey)
    .exec();
}

/** Locked (in-flight) quantity for a container — used to compute true availability. */
async function lockedQuantity(containerId) {
  const indexKey = `${LOCK_PREFIX}${containerId}`;
  const vals = await redis.hvals(indexKey);
  return vals.reduce((sum, v) => sum + Number(v || 0), 0);
}

module.exports = { acquireLock, releaseLock, lockedQuantity };
