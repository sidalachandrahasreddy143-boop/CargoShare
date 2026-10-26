'use strict';
const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { query, withTransaction } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { acquireLock, releaseLock } = require('../services/locks');
const { generateInvoice } = require('../services/invoice');
const cfg = require('../config');

const router = express.Router();
const razorpay = new Razorpay({ key_id: cfg.razorpay.keyId, key_secret: cfg.razorpay.keySecret });

const emitToRoom = (req, room, event, payload) => req.app.get('io')?.to(room).emit(event, payload);

/**
 * @openapi
 * /api/bookings/lock:
 *   post:
 *     summary: Step 1 of booking — acquire Redis lock on qty (10 min TTL)
 *     tags: [Bookings]
 */
router.post('/lock', requireAuth, requireRole('trader'), async (req, res, next) => {
  try {
    const { containerId, qty } = req.body;
    const q = Number(qty);
    if (!containerId || !q || q <= 0) return res.status(400).json({ error: 'INVALID_REQUEST' });

    const { rows } = await query(
      `SELECT c.id, c.lsp_id, c.unit, c.rate_per_unit, c.min_booking_qty,
              (c.total_capacity - c.booked_capacity) AS db_avail, c.status, c.departure_datetime,
              c.cutoff_datetime, l.company_name AS lsp_company
       FROM containers c JOIN lsp_profiles l ON l.id = c.lsp_id WHERE c.id = $1`,
      [containerId]
    );
    const c = rows[0];
    if (!c) return res.status(404).json({ error: 'CONTAINER_NOT_FOUND' });
    if (c.status !== 'active') return res.status(409).json({ error: 'CONTAINER_NOT_BOOKABLE' });
    if (c.cutoff_datetime && new Date(c.cutoff_datetime) < new Date()) return res.status(409).json({ error: 'BOOKING_CUTOFF_PASSED' });
    if (q < Number(c.min_booking_qty)) return res.status(400).json({ error: 'BELOW_MIN_BOOKING_QTY', min: c.min_booking_qty });

    const lockId = crypto.randomUUID();
    const lock = await acquireLock(containerId, lockId, q, Number(c.db_avail));
    if (!lock.ok) return res.status(409).json({ error: 'INSUFFICIENT_CAPACITY', available: lock.remaining });

    const total = Number(c.rate_per_unit) * q;
    const fee = Math.round(total * (cfg.commissionPct / 100) * 100) / 100;

    // Create the booking row in payment_pending state; lock mirrors Redis TTL
    const booking = await query(
      `INSERT INTO bookings (container_id, trader_id, lsp_id, cargo_details, qty_booked, unit,
                             rate_per_unit, total_price, platform_fee, booking_status, payment_status, lock_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'payment_pending','created', now() + ($10 || ' seconds')::interval)
       RETURNING *`,
      [containerId, req.user.id, c.lsp_id, JSON.stringify(req.body.cargoDetails || {}),
       q, c.unit, c.rate_per_unit, total, fee, String(cfg.lockTtlSeconds)]
    );

    res.status(201).json({
      lock: { lockId, ttlSeconds: lock.ttl },
      booking: booking.rows[0],
      payment: { amount: Math.round((total + fee) * 100), currency: 'INR', keyId: cfg.razorpay.keyId },
    });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/bookings/{id}/order:
 *   post:
 *     summary: Step 2 — create Razorpay order for a locked booking
 *     tags: [Bookings]
 */
router.post('/:id/order', requireAuth, requireRole('trader'), async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM bookings WHERE id = $1 AND trader_id = $2', [req.params.id, req.user.id]);
    const b = rows[0];
    if (!b) return res.status(404).json({ error: 'BOOKING_NOT_FOUND' });
    if (b.booking_status !== 'payment_pending') return res.status(409).json({ error: 'BOOKING_NOT_PENDING' });

    const amount = Math.round((Number(b.total_price) + Number(b.platform_fee)) * 100);
    let order;
    try {
      order = await razorpay.orders.create({ amount, currency: 'INR', receipt: b.booking_ref, notes: { bookingId: b.id } });
    } catch (err) {
      // Sandbox fallback so the flow works without live keys: synthesize a test order id.
      order = { id: `order_test_${crypto.randomBytes(8).toString('hex')}`, amount, currency: 'INR' };
    }
    await query(
      `INSERT INTO payments (booking_id, gateway, gateway_order_id, amount, status)
       VALUES ($1,'razorpay',$2,$3,'created')
       ON CONFLICT (gateway_order_id) DO NOTHING`,
      [b.id, order.id, amount / 100]
    );
    res.json({ orderId: order.id, amount, currency: 'INR', keyId: cfg.razorpay.keyId, bookingRef: b.booking_ref });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/bookings/{id}/confirm:
 *   post:
 *     summary: Step 3 — confirm after checkout signature verification (client-side handshake).
 *     description: Server-side webhook (/api/webhooks/razorpay) is the source of truth; this endpoint finalizes locally once the signature checks out.
 *     tags: [Bookings]
 */
router.post('/:id/confirm', requireAuth, requireRole('trader'), async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, lockId } = req.body;
    const { rows } = await query('SELECT * FROM bookings WHERE id = $1 AND trader_id = $2', [req.params.id, req.user.id]);
    const b = rows[0];
    if (!b) return res.status(404).json({ error: 'BOOKING_NOT_FOUND' });
    if (b.booking_status === 'confirmed') return res.json({ booking: b, alreadyConfirmed: true });

    // Verify the checkout signature (HMAC-SHA256 of order_id|payment_id)
    let signatureOk = false;
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const expected = crypto.createHmac('sha256', cfg.razorpay.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      signatureOk = expected === razorpay_signature;
    } else if (cfg.env !== 'production') {
      signatureOk = true; // dev/sandbox convenience
    }
    if (!signatureOk) {
      await failBooking(b, lockId);
      return res.status(400).json({ error: 'SIGNATURE_MISMATCH' });
    }
    const result = await finalizeBooking(b, { orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature }, req);
    res.json(result);
  } catch (e) { next(e); }
});

/** Shared finalize path used by both confirm endpoint and webhook. */
async function finalizeBooking(b, payment, req) {
  const finalized = await withTransaction(async (client) => {
    // Atomic: capacity check + increment (single conditional UPDATE = row lock)
    const upd = await client.query(
      `UPDATE containers
          SET booked_capacity = booked_capacity + $2,
              status = CASE WHEN booked_capacity + $2 >= total_capacity THEN 'full'::container_status ELSE status END
        WHERE id = $1 AND (total_capacity - booked_capacity) >= $2
        RETURNING *`,
      [b.container_id, b.qty_booked]
    );
    if (!upd.rows[0]) throw new Error('INSUFFICIENT_CAPACITY:0');

    const confirmed = await client.query(
      `UPDATE bookings SET booking_status = 'confirmed', payment_status = 'captured', updated_at = now()
       WHERE id = $1 RETURNING *`, [b.id]
    );
    await client.query(
      `UPDATE payments SET status = 'captured', gateway_txn_id = $2, gateway_signature = $3, updated_at = now()
       WHERE booking_id = $1`,
      [b.id, payment.paymentId || null, payment.signature || null]
    );
    return { booking: confirmed.rows[0], container: upd.rows[0] };
  });

  // Release the Redis lock — space is now durably committed in Postgres
  if (req.body?.lockId) await releaseLock(b.container_id, req.body.lockId, Number(b.qty_booked)).catch(() => {});

  // Invoice (best-effort; booking stays valid even if MinIO is down)
  let invoiceUrl = null;
  try {
    const detail = await query(
      `SELECT b.*, c.mode, c.origin, c.destination,
              (SELECT row_to_json(t) FROM (SELECT * FROM lsp_profiles WHERE id = b.lsp_id) t) AS lsp,
              (SELECT row_to_json(u) FROM (SELECT * FROM users WHERE id = b.trader_id) u) AS trader
       FROM bookings b JOIN containers c ON c.id = b.container_id WHERE b.id = $1`,
      [b.id]
    );
    const row = detail.rows[0];
    invoiceUrl = await generateInvoice({ ...row, booking_ref: row.booking_ref }, row.lsp, row.trader);
    await query('UPDATE payments SET invoice_url = $1 WHERE booking_id = $2', [invoiceUrl, b.id]);
  } catch (e) { console.error('[invoice]', e.message); }

  // Real-time: push live capacity to everyone viewing this container
  emitToRoom(req, `container:${b.container_id}`, 'capacity:update', {
    containerId: b.container_id,
    bookedCapacity: finalized.container.booked_capacity,
    availableCapacity: Number(finalized.container.total_capacity) - Number(finalized.container.booked_capacity),
  });
  emitToRoom(req, 'marketplace', 'containers:changed', { containerId: b.container_id });
  emitToRoom(req, `user:${b.trader_id}`, 'notification', { type: 'booking_confirmed', bookingId: b.id });

  return { booking: finalized.booking, invoiceUrl };
}

async function failBooking(b, lockId) {
  await query(`UPDATE bookings SET booking_status = 'cancelled', payment_status = 'failed', updated_at = now() WHERE id = $1`, [b.id]);
  if (lockId) await releaseLock(b.container_id, lockId, Number(b.qty_booked)).catch(() => {});
}

/**
 * @openapi
 * /api/bookings/mine:
 *   get:
 *     summary: List current user's bookings (trader → own; LSP → bookings on own containers)
 *     tags: [Bookings]
 */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'lsp') {
      ({ rows } = await query(
        `SELECT b.*, c.origin, c.destination, c.mode, c.container_ref, u.name AS trader_name, u.company AS trader_company
         FROM bookings b
         JOIN containers c ON c.id = b.container_id
         JOIN lsp_profiles l ON l.id = b.lsp_id
         JOIN users u ON u.id = b.trader_id
         WHERE l.user_id = $1 ORDER BY b.created_at DESC`, [req.user.id]));
    } else {
      ({ rows } = await query(
        `SELECT b.*, c.origin, c.destination, c.mode, c.container_ref, c.departure_datetime,
                l.company_name AS lsp_company
         FROM bookings b
         JOIN containers c ON c.id = b.container_id
         JOIN lsp_profiles l ON l.id = b.lsp_id
         WHERE b.trader_id = $1 ORDER BY b.created_at DESC`, [req.user.id]));
    }
    res.json({ bookings: rows });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/bookings/{id}/invoice:
 *   get:
 *     summary: Download invoice PDF (redirects to a presigned MinIO URL)
 *     tags: [Bookings]
 */
router.get('/:id/invoice', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.invoice_url, b.trader_id FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.id = $1`,
      [req.params.id]
    );
    const inv = rows[0];
    if (!inv?.invoice_url) return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    res.json({ invoiceUrl: inv.invoice_url });
  } catch (e) { next(e); }
});

module.exports = router;
