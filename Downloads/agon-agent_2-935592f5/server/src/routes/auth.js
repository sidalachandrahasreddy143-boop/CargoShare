'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { generateOtp, verifyOtp } = require('../services/otp');

const router = express.Router();

const otpLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true });
const loginLimiter = rateLimit({ windowMs: 60_000, max: 20 });

const publicUser = (u) => ({
  id: u.id, role: u.role, name: u.name, company: u.company, email: u.email,
  phone: u.phone, gstin: u.gstin, businessType: u.business_type,
  kycStatus: u.kyc_status, phoneVerified: u.phone_verified,
});

/**
 * @openapi
 * /api/auth/register/trader:
 *   post:
 *     summary: Trader self-registration (instant activation)
 *     tags: [Auth]
 */
router.post('/register/trader', async (req, res, next) => {
  try {
    const { name, company, gstin, email, phone, password, businessType, address } = req.body;
    if (!name || !email || !phone || !password) return res.status(400).json({ error: 'MISSING_FIELDS' });
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (role, name, company, gstin, email, phone, password_hash, business_type, address, phone_verified)
       VALUES ('trader',$1,$2,$3,$4,$5,$6,$7,$8, FALSE) RETURNING *`,
      [name, company || null, gstin || null, email.toLowerCase(), phone, password_hash, businessType || null, address || null]
    );
    const otp = await generateOtp(phone, 'register');
    res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]), otp });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/auth/register/lsp:
 *   post:
 *     summary: LSP application — account created in pending state, requires admin approval
 *     tags: [Auth]
 */
router.post('/register/lsp', async (req, res, next) => {
  try {
    const { name, companyName, email, phone, password, mode, licenseNumber, fleetDetails, hubLocations, bankDetails, address } = req.body;
    if (!name || !companyName || !email || !phone || !password || !mode) return res.status(400).json({ error: 'MISSING_FIELDS' });
    const password_hash = await bcrypt.hash(password, 10);
    const { user, lsp } = await require('../db').withTransaction(async (client) => {
      const u = await client.query(
        `INSERT INTO users (role, name, company, email, phone, password_hash, address)
         VALUES ('lsp',$1,$2,$3,$4,$5,$6) RETURNING *`,
        [name, companyName, email.toLowerCase(), phone, password_hash, address || null]
      );
      const p = await client.query(
        `INSERT INTO lsp_profiles (user_id, company_name, license_number, mode, fleet_details, hub_locations, bank_details)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [u.rows[0].id, companyName, licenseNumber || null, mode,
         JSON.stringify(fleetDetails || {}), JSON.stringify(hubLocations || []), JSON.stringify(bankDetails || {})]
      );
      return { user: u.rows[0], lsp: p.rows[0] };
    });
    const otp = await generateOtp(phone, 'register');
    res.status(201).json({ token: signToken(user), user: publicUser(user), lspProfile: lsp, otp });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/auth/otp/send:
 *   post:
 *     summary: Send an OTP to a phone number
 *     tags: [Auth]
 */
router.post('/otp/send', otpLimiter, async (req, res, next) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone) return res.status(400).json({ error: 'PHONE_REQUIRED' });
    res.json(await generateOtp(phone, purpose || 'login'));
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/auth/otp/verify:
 *   post:
 *     summary: Verify OTP — on success marks the phone verified
 *     tags: [Auth]
 */
router.post('/otp/verify', otpLimiter, async (req, res, next) => {
  try {
    const { phone, purpose, otp } = req.body;
    const result = await verifyOtp(phone, purpose || 'login', otp);
    if (!result.ok) return res.status(400).json(result);
    await query('UPDATE users SET phone_verified = TRUE WHERE phone = $1', [phone]);
    res.json({ verified: true });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Password login — returns JWT with role claim
 *     tags: [Auth]
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [String(email || '').toLowerCase()]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    let lsp = null;
    if (u.role === 'lsp') {
      const p = await query('SELECT * FROM lsp_profiles WHERE user_id = $1', [u.id]);
      lsp = p.rows[0] || null;
    }
    res.json({ token: signToken(u), user: publicUser(u), lspProfile: lsp });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Current authenticated user
 *     tags: [Auth]
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    let lsp = null;
    if (rows[0].role === 'lsp') {
      const p = await query('SELECT * FROM lsp_profiles WHERE user_id = $1', [rows[0].id]);
      lsp = p.rows[0] || null;
    }
    res.json({ user: publicUser(rows[0]), lspProfile: lsp });
  } catch (e) { next(e); }
});

module.exports = router;
