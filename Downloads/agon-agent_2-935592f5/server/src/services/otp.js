'use strict';
/**
 * OTP service — self-built. Only the SMS delivery hop calls an external API
 * (MSG91/Twilio/Fast2SMS via SMS_API_URL); generation, hashing, attempt
 * limiting and expiry are all implemented here.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../db');
const cfg = require('../config');

async function sendSms(phone, text) {
  if (!cfg.sms.apiUrl || !cfg.sms.apiKey) {
    // Dev mode: log the OTP so local development works without an SMS account.
    console.log(`[otp:dev] SMS to ${phone}: ${text}`);
    return { delivered: false, dev: true };
  }
  const res = await fetch(cfg.sms.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: cfg.sms.apiKey },
    body: JSON.stringify({ sender: cfg.sms.senderId, route: '4', country: '91', sms: [{ message: text, to: [phone] }] }),
  });
  return { delivered: res.ok };
}

/** Generate a 6-digit OTP, store a bcrypt hash, dispatch SMS. Returns the plain OTP in dev only. */
async function generateOtp(phone, purpose = 'login') {
  const otp = String(crypto.randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 10);
  await query(
    `INSERT INTO otp_challenges (phone, purpose, otp_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' seconds')::interval)`,
    [phone, purpose, otpHash, String(cfg.otpTtlSeconds)]
  );
  await sendSms(phone, `Your CargoShare verification code is ${otp}. Valid for 5 minutes. Do not share it.`);
  return cfg.env === 'production' ? { sent: true } : { sent: true, devOtp: otp };
}

/** Verify latest unconsumed OTP for phone+purpose. Max 5 attempts. */
async function verifyOtp(phone, purpose, otp) {
  const { rows } = await query(
    `SELECT * FROM otp_challenges
      WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC LIMIT 1`,
    [phone, purpose]
  );
  const ch = rows[0];
  if (!ch) return { ok: false, error: 'OTP_EXPIRED_OR_NOT_FOUND' };
  if (ch.attempts >= 5) return { ok: false, error: 'OTP_ATTEMPTS_EXCEEDED' };

  const match = await bcrypt.compare(otp, ch.otp_hash);
  if (!match) {
    await query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1', [ch.id]);
    return { ok: false, error: 'OTP_MISMATCH' };
  }
  await query('UPDATE otp_challenges SET consumed_at = now() WHERE id = $1', [ch.id]);
  return { ok: true };
}

module.exports = { generateOtp, verifyOtp };
