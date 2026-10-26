'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/lsp-applications', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? 'WHERE p.approval_status = $1' : '';
    const params = status ? [status] : [];
    const { rows } = await query(
      `SELECT p.*, u.name AS applicant_name, u.email, u.phone, u.address, u.created_at AS applied_at
       FROM lsp_profiles p JOIN users u ON u.id = p.user_id ${where}
       ORDER BY CASE p.approval_status WHEN 'pending' THEN 0 WHEN 'under_review' THEN 1 ELSE 2 END, p.created_at DESC`,
      params
    );
    res.json({ applications: rows });
  } catch (e) { next(e); }
});

router.patch('/lsp-applications/:id', async (req, res, next) => {
  try {
    const { decision, reason, inspectionNotes, dataQualityScore } = req.body;
    if (decision && !['approved', 'rejected', 'under_review'].includes(decision)) {
      return res.status(400).json({ error: 'INVALID_DECISION' });
    }
    const { rows } = await query(
      `UPDATE lsp_profiles
          SET approval_status = COALESCE($2::lsp_approval, approval_status),
              rejection_reason = COALESCE($3, rejection_reason),
              inspection_notes = COALESCE($4, inspection_notes),
              data_quality_score = COALESCE($5, data_quality_score),
              reviewed_by = $6, reviewed_at = now()
        WHERE id = $1 RETURNING *`,
      [req.params.id, decision || null, reason || null, inspectionNotes || null, dataQualityScore ?? null, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'APPLICATION_NOT_FOUND' });
    await query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, meta) VALUES ($1,'lsp_decision','lsp_profiles',$2,$3)`,
      [req.user.id, req.params.id, JSON.stringify({ decision, reason })]
    );
    if (decision === 'approved' || decision === 'rejected') {
      await query(
        `INSERT INTO notifications (user_id, type, title, body)
         SELECT user_id, $2, $3, $4 FROM lsp_profiles WHERE id = $1`,
        [req.params.id, decision === 'approved' ? 'lsp_approved' : 'lsp_rejected',
         decision === 'approved' ? 'Your LSP application was approved' : 'Your LSP application was rejected',
         decision === 'approved' ? 'You can now list containers and receive bookings.' : (reason || 'See admin notes for details.')]
      );
    }
    res.json({ profile: rows[0] });
  } catch (e) { next(e); }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const [bookingsByRoute, revenue, fillRate, totals, recent] = await Promise.all([
      query(`SELECT c.origin_code || ' → ' || c.destination_code AS route, COUNT(*)::int AS bookings,
                    COALESCE(SUM(b.total_price),0)::numeric AS gmv
             FROM bookings b JOIN containers c ON c.id = b.container_id
             WHERE b.booking_status = 'confirmed'
             GROUP BY 1 ORDER BY bookings DESC LIMIT 8`),
      query(`SELECT date_trunc('day', b.created_at)::date AS day, COALESCE(SUM(b.total_price),0)::numeric AS gmv,
                    COUNT(*)::int AS bookings
             FROM bookings b WHERE b.booking_status = 'confirmed' AND b.created_at > now() - interval '30 days'
             GROUP BY 1 ORDER BY 1`),
      query(`SELECT mode, ROUND(AVG(booked_capacity / NULLIF(total_capacity,0)) * 100, 1) AS fill_pct,
                    COUNT(*)::int AS listings
             FROM containers GROUP BY mode`),
      query(`SELECT
               (SELECT COUNT(*) FROM users WHERE role = 'trader') AS traders,
               (SELECT COUNT(*) FROM users WHERE role = 'lsp') AS lsps,
               (SELECT COUNT(*) FROM lsp_profiles WHERE approval_status = 'pending') AS pending_lsps,
               (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed') AS confirmed_bookings,
               (SELECT COALESCE(SUM(total_price),0) FROM bookings WHERE booking_status = 'confirmed') AS gmv,
               (SELECT COALESCE(SUM(platform_fee),0) FROM bookings WHERE booking_status = 'confirmed') AS platform_revenue`),
      query(`SELECT b.booking_ref, b.total_price, b.booking_status, b.created_at, u.name AS trader, l.company_name AS lsp
             FROM bookings b JOIN users u ON u.id = b.trader_id JOIN lsp_profiles l ON l.id = b.lsp_id
             ORDER BY b.created_at DESC LIMIT 12`),
    ]);
    res.json({
      bookingsByRoute: bookingsByRoute.rows,
      revenueByDay: revenue.rows,
      fillRateByMode: fillRate.rows,
      totals: totals.rows[0],
      recentBookings: recent.rows,
    });
  } catch (e) { next(e); }
});

router.get('/disputes', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT d.*, b.booking_ref, u.name AS raised_by_name, u.email AS raised_by_email
       FROM disputes d JOIN bookings b ON b.id = d.booking_id JOIN users u ON u.id = d.raised_by
       ORDER BY d.created_at DESC`);
    res.json({ disputes: rows });
  } catch (e) { next(e); }
});

router.patch('/disputes/:id', async (req, res, next) => {
  try {
    const { status, resolution } = req.body;
    const { rows } = await query(
      `UPDATE disputes SET status = $2, resolution = $3, resolved_by = $4, resolved_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id, status, resolution || null, req.user.id]
    );
    res.json({ dispute: rows[0] });
  } catch (e) { next(e); }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, b.booking_ref, u.name AS trader_name, l.company_name AS lsp_company,
              b.total_price, b.platform_fee
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       JOIN users u ON u.id = b.trader_id JOIN lsp_profiles l ON l.id = b.lsp_id
       ORDER BY p.created_at DESC LIMIT 200`);
    res.json({ payments: rows });
  } catch (e) { next(e); }
});

router.get('/audit-log', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 200`);
    res.json({ events: rows });
  } catch (e) { next(e); }
});

module.exports = router;
