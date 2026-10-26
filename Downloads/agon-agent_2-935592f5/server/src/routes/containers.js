'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { lockedQuantity } = require('../services/locks');

const router = express.Router();

const SELECT_AVAIL = `
  SELECT c.*,
         (c.total_capacity - c.booked_capacity) AS available_capacity,
         l.company_name AS lsp_company,
         l.data_quality_score,
         (SELECT COALESCE(AVG(rating), 0) FROM reviews r WHERE r.lsp_id = l.id) AS avg_rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.lsp_id = l.id) AS review_count
  FROM containers c
  JOIN lsp_profiles l ON l.id = c.lsp_id
`;

/**
 * @openapi
 * /api/containers/search:
 *   get:
 *     summary: Search containers with spare space
 *     parameters:
 *       - in: query
 *         name: origin
 *       - in: query
 *         name: destination
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [rail, road, ship, air] }
 *       - in: query
 *         name: date
 *       - in: query
 *         name: minSpace
 *       - in: query
 *         name: cargo
 *     tags: [Containers]
 */
router.get('/search', async (req, res, next) => {
  try {
    const { origin, destination, mode, date, minSpace, cargo } = req.query;
    const where = [`c.status = 'active'`, `(c.total_capacity - c.booked_capacity) > 0`, `c.departure_datetime > now()`];
    const params = [];
    const p = (val) => { params.push(val); return `$${params.length}`; };

    if (origin) where.push(`(c.origin_code ILIKE ${p('%' + origin + '%')} OR c.origin ILIKE ${p('%' + origin + '%')})`);
    if (destination) where.push(`(c.destination_code ILIKE ${p('%' + destination + '%')} OR c.destination ILIKE ${p('%' + destination + '%')})`);
    if (mode) where.push(`c.mode = ${p(mode)}::transport_mode`);
    if (date) where.push(`c.departure_datetime::date = ${p(date)}::date`);
    if (minSpace) where.push(`(c.total_capacity - c.booked_capacity) >= ${p(Number(minSpace))}`);
    if (cargo) where.push(`${p(cargo)} = ANY(c.cargo_types)`);

    const { rows } = await query(
      `${SELECT_AVAIL} WHERE ${where.join(' AND ')} ORDER BY c.departure_datetime ASC LIMIT 100`,
      params
    );
    // Subtract in-flight Redis locks for true live availability
    const withLocks = await Promise.all(rows.map(async (r) => {
      const locked = await lockedQuantity(r.id).catch(() => 0);
      return { ...r, locked_quantity: locked, available_capacity: Math.max(0, Number(r.available_capacity) - locked) };
    }));
    res.json({ containers: withLocks, total: withLocks.length });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/containers/mine:
 *   get:
 *     summary: LSP — list own containers (any status)
 *     tags: [Containers]
 */
router.get('/mine', requireAuth, requireRole('lsp'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, (c.total_capacity - c.booked_capacity) AS available_capacity
       FROM containers c JOIN lsp_profiles l ON l.id = c.lsp_id
       WHERE l.user_id = $1 ORDER BY c.departure_datetime ASC`,
      [req.user.id]
    );
    res.json({ containers: rows });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/containers:
 *   post:
 *     summary: LSP — create a container listing
 *     tags: [Containers]
 */
router.post('/', requireAuth, requireRole('lsp', 'admin'), async (req, res, next) => {
  try {
    const b = req.body;
    const lspQ = await query('SELECT id FROM lsp_profiles WHERE user_id = $1 AND approval_status = $2', [req.user.id, 'approved']);
    if (!lspQ.rows[0]) return res.status(403).json({ error: 'LSP_NOT_APPROVED' });
    const lspId = lspQ.rows[0].id;
    const { rows } = await query(
      `INSERT INTO containers (lsp_id, mode, container_ref, origin, origin_code, destination, destination_code,
         origin_lat, origin_lng, destination_lat, destination_lng, departure_datetime, arrival_datetime,
         total_capacity, unit, rate_per_unit, min_booking_qty, cutoff_datetime, cargo_types)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [lspId, b.mode, b.containerRef, b.origin, b.originCode, b.destination, b.destinationCode,
       b.originLat ?? null, b.originLng ?? null, b.destinationLat ?? null, b.destinationLng ?? null,
       b.departureDatetime, b.arrivalDatetime ?? null, b.totalCapacity, b.unit || 'MT',
       b.ratePerUnit, b.minBookingQty || 1, b.cutoffDatetime ?? null, b.cargoTypes || []]
    );
    res.status(201).json({ container: rows[0] });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/containers/{id}:
 *   patch:
 *     summary: LSP — update own container listing
 *     tags: [Containers]
 */
router.patch('/:id', requireAuth, requireRole('lsp', 'admin'), async (req, res, next) => {
  try {
    const b = req.body;
    const allowed = {
      origin: 'origin', destination: 'destination', origin_code: 'originCode', destination_code: 'destinationCode',
      departure_datetime: 'departureDatetime', arrival_datetime: 'arrivalDatetime', total_capacity: 'totalCapacity',
      rate_per_unit: 'ratePerUnit', min_booking_qty: 'minBookingQty', cutoff_datetime: 'cutoffDatetime',
      cargo_types: 'cargoTypes', status: 'status', unit: 'unit',
    };
    const sets = [], params = [];
    for (const [col, key] of Object.entries(allowed)) {
      if (b[key] !== undefined) { params.push(b[key]); sets.push(`${col} = $${params.length}`); }
    }
    if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
    params.push(req.params.id);
    params.push(req.user.id);
    params.push(req.user.role);
    const { rows } = await query(
      `UPDATE containers SET ${sets.join(', ')}
       WHERE id = $${params.length - 2}
         AND ($${params.length}::text = 'admin' OR lsp_id IN (SELECT id FROM lsp_profiles WHERE user_id = $${params.length - 1}))
       RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'CONTAINER_NOT_FOUND' });
    res.json({ container: rows[0] });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/containers/{id}:
 *   delete:
 *     summary: LSP — delete own container (only if no confirmed bookings)
 *     tags: [Containers]
 */
router.delete('/:id', requireAuth, requireRole('lsp', 'admin'), async (req, res, next) => {
  try {
    const active = await query(
      `SELECT COUNT(*)::int AS n FROM bookings b JOIN containers c ON c.id = b.container_id
       JOIN lsp_profiles l ON l.id = c.lsp_id
       WHERE c.id = $1 AND l.user_id = $2 AND b.booking_status IN ('confirmed','payment_pending','locked')`,
      [req.params.id, req.user.id]
    );
    if (active.rows[0].n > 0) return res.status(409).json({ error: 'HAS_ACTIVE_BOOKINGS' });
    await query(
      `DELETE FROM containers c USING lsp_profiles l
       WHERE c.id = $1 AND c.lsp_id = l.id AND l.user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.status(204).end();
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/containers/{id}:
 *   get:
 *     summary: Container detail with live availability
 *     tags: [Containers]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`${SELECT_AVAIL} WHERE c.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'CONTAINER_NOT_FOUND' });
    const locked = await lockedQuantity(req.params.id).catch(() => 0);
    res.json({ container: { ...rows[0], locked_quantity: locked, available_capacity: Math.max(0, Number(rows[0].available_capacity) - locked) } });
  } catch (e) { next(e); }
});

module.exports = router;
