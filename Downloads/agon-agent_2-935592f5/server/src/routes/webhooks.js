'use strict';
/**
 * Razorpay webhook — server-side source of truth for payment capture.
 * Mounted with express.raw() BEFORE the JSON parser (signature = HMAC of raw body).
 */
const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');
const cfg = require('../config');

const router = express.Router();

// NOTE: finalize logic mirrors bookings.js /confirm — kept in sync deliberately.
router.post('/razorpay', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac('sha256', cfg.razorpay.webhookSecret).update(raw).digest('hex');
    if (signature !== expected) return res.status(400).json({ error: 'INVALID_WEBHOOK_SIGNATURE' });

    const event = JSON.parse(raw.toString());
    console.log('[webhook]', event.event);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const orderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = event.payload?.payment?.entity?.id;
      const pay = await query('SELECT * FROM payments WHERE gateway_order_id = $1', [orderId]);
      const p = pay.rows[0];
      if (p) {
        const b = (await query('SELECT * FROM bookings WHERE id = $1', [p.booking_id])).rows[0];
        if (b && b.booking_status !== 'confirmed') {
          const upd = await query(
            `UPDATE containers
                SET booked_capacity = booked_capacity + $2,
                    status = CASE WHEN booked_capacity + $2 >= total_capacity THEN 'full'::container_status ELSE status END
              WHERE id = $1 AND (total_capacity - booked_capacity) >= $2
              RETURNING id`,
            [b.container_id, b.qty_booked]
          );
          if (upd.rows[0]) {
            await query(`UPDATE bookings SET booking_status = 'confirmed', payment_status = 'captured', updated_at = now() WHERE id = $1`, [b.id]);
          } else {
            await query(`UPDATE bookings SET booking_status = 'rejected', payment_status = 'refunded', updated_at = now() WHERE id = $1`, [b.id]);
          }
        }
        await query('UPDATE payments SET status = $2, gateway_txn_id = $3, raw_webhook = $4, updated_at = now() WHERE id = $1',
          [p.id, 'captured', paymentId || null, JSON.stringify(event)]);
      }
    } else if (event.event === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id;
      await query(`UPDATE payments SET status = 'failed', raw_webhook = $2, updated_at = now() WHERE gateway_order_id = $1`,
        [orderId, JSON.stringify(event)]);
      await query(
        `UPDATE bookings SET booking_status = 'cancelled', payment_status = 'failed', updated_at = now()
         WHERE id = (SELECT booking_id FROM payments WHERE gateway_order_id = $1)`, [orderId]);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[webhook]', err);
    res.status(500).json({ error: 'WEBHOOK_ERROR' });
  }
});

module.exports = router;
