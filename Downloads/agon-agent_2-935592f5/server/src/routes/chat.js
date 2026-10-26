'use strict';
const express = require('express');
const multer = require('multer');
const { Client } = require('minio');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const cfg = require('../config');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const minio = new Client({
  endPoint: cfg.minio.endPoint, port: cfg.minio.port, useSSL: cfg.minio.useSSL,
  accessKey: cfg.minio.accessKey, secretKey: cfg.minio.secretKey,
});

async function putChatAttachment(file, userId) {
  const bucket = cfg.minio.bucketChat;
  const exists = await minio.bucketExists(bucket).catch(() => false);
  if (!exists) await minio.makeBucket(bucket);
  const objectName = `chat/${userId}/${Date.now()}-${file.originalname.replace(/[^\w.-]/g, '_')}`;
  await minio.putObject(bucket, objectName, file.buffer, { 'Content-Type': file.mimetype });
  return `minio://${bucket}/${objectName}`;
}

/** GET /api/chat/:bookingId — message history for a booking room */
router.get('/:bookingId', requireAuth, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    // Access control: sender must be the trader on the booking or the LSP who owns the container
    const access = await query(
      `SELECT b.trader_id, l.user_id AS lsp_user_id
       FROM bookings b JOIN containers c ON c.id = b.container_id JOIN lsp_profiles l ON l.id = c.lsp_id
       WHERE b.id = $1`, [bookingId]);
    const a = access.rows[0];
    if (!a) return res.status(404).json({ error: 'BOOKING_NOT_FOUND' });
    const isParty = [a.trader_id, a.lsp_user_id].includes(req.user.id) || req.user.role === 'admin';
    if (!isParty) return res.status(403).json({ error: 'FORBIDDEN' });

    const { rows } = await query(
      `SELECT m.*, u.name AS sender_name, u.role AS sender_role
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.booking_id = $1 ORDER BY m.created_at ASC LIMIT 500`, [bookingId]);
    await query('UPDATE chat_messages SET read_status = TRUE WHERE booking_id = $1 AND receiver_id = $2 AND read_status = FALSE',
      [bookingId, req.user.id]);
    res.json({ messages: rows });
  } catch (e) { next(e); }
});

/** POST /api/chat/:bookingId — persist a message (socket layer also handles live delivery) */
router.post('/:bookingId', requireAuth, async (req, res, next) => {
  try {
    const { receiverId, messageText, attachmentUrl, attachmentName, threadId } = req.body;
    const { rows } = await query(
      `INSERT INTO chat_messages (booking_id, thread_id, sender_id, receiver_id, message_text, attachment_url, attachment_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.bookingId, threadId || null, req.user.id, receiverId, messageText || null, attachmentUrl || null, attachmentName || null]
    );
    res.status(201).json({ message: rows[0] });
  } catch (e) { next(e); }
});

/** POST /api/chat/attachment — multipart upload to MinIO, returns object URL */
router.post('/attachment/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'FILE_REQUIRED' });
    const url = await putChatAttachment(req.file, req.user.id);
    res.status(201).json({ attachmentUrl: url, name: req.file.originalname, size: req.file.size });
  } catch (e) { next(e); }
});

/** GET /api/chat/threads/mine — inbox summary for the current user */
router.get('/threads/mine', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT b.id AS booking_id, b.booking_ref, c.origin, c.destination, c.mode,
              (SELECT message_text FROM chat_messages m WHERE m.booking_id = b.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM chat_messages m WHERE m.booking_id = b.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM chat_messages m WHERE m.booking_id = b.id AND m.receiver_id = $1 AND m.read_status = FALSE) AS unread
       FROM bookings b JOIN containers c ON c.id = b.container_id
       LEFT JOIN lsp_profiles l ON l.id = c.lsp_id
       WHERE b.trader_id = $1 OR l.user_id = $1
       ORDER BY last_message_at DESC NULLS LAST`, [req.user.id]);
    res.json({ threads: rows });
  } catch (e) { next(e); }
});

module.exports = router;
