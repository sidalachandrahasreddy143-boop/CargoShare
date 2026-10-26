'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/** POST /api/reviews — one review per completed booking */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const q = await query(
      `SELECT b.*, c.lsp_id FROM bookings b JOIN containers c ON c.id = b.container_id WHERE b.id = $1 AND b.trader_id = $2`,
      [bookingId, req.user.id]);
    const b = q.rows[0];
    if (!b) return res.status(404).json({ error: 'BOOKING_NOT_FOUND' });
    if (!['confirmed', 'completed'].includes(b.booking_status)) return res.status(409).json({ error: 'BOOKING_NOT_COMPLETED' });
    const { rows } = await query(
      `INSERT INTO reviews (booking_id, trader_id, lsp_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (booking_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
       RETURNING *`,
      [bookingId, req.user.id, b.lsp_id, rating, comment || null]);
    res.status(201).json({ review: rows[0] });
  } catch (e) { next(e); }
});

router.get('/lsp/:lspId', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.*, u.name AS trader_name FROM reviews r JOIN users u ON u.id = r.trader_id
       WHERE r.lsp_id = $1 ORDER BY r.created_at DESC`, [req.params.lspId]);
    const agg = await query('SELECT AVG(rating)::numeric(3,2) AS avg, COUNT(*)::int AS count FROM reviews WHERE lsp_id = $1', [req.params.lspId]);
    res.json({ reviews: rows, summary: agg.rows[0] });
  } catch (e) { next(e); }
});

module.exports = router;
