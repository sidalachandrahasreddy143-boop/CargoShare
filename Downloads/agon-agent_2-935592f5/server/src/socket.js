'use strict';
/**
 * Socket.io — single websocket layer for BOTH use cases.
 *
 * Rooms:
 *   marketplace               — global channel: container create/update/book events
 *   container:{id}            — live capacity for one listing
 *   booking:{bookingId}       — chat + status events for one booking
 *   user:{userId}             — private notifications
 */
const jwt = require('jsonwebtoken');
const { query } = require('./db');
const cfg = require('./config');

function initSocket(io) {
  // Auth handshake — JWT in socket.auth.token
  io.use((socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token || '', cfg.jwt.secret);
      socket.user = payload;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.user.id;
    socket.join(`user:${uid}`);
    socket.join('marketplace');

    socket.on('container:watch', (containerId) => socket.join(`container:${containerId}`));
    socket.on('container:unwatch', (containerId) => socket.leave(`container:${containerId}`));

    socket.on('booking:join', (bookingId) => socket.join(`booking:${bookingId}`));
    socket.on('booking:leave', (bookingId) => socket.leave(`booking:${bookingId}`));

    socket.on('chat:send', async ({ bookingId, receiverId, messageText, attachmentUrl, attachmentName }, ack) => {
      try {
        const { rows } = await query(
          `INSERT INTO chat_messages (booking_id, sender_id, receiver_id, message_text, attachment_url, attachment_name)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [bookingId, uid, receiverId, messageText || null, attachmentUrl || null, attachmentName || null]
        );
        const message = rows[0];
        io.to(`booking:${bookingId}`).emit('chat:message', { bookingId, message });
        io.to(`user:${receiverId}`).emit('notification', { type: 'chat_message', bookingId, from: socket.user.name });
        ack?.({ ok: true, message });
      } catch (err) {
        console.error('[chat:send]', err);
        ack?.({ ok: false, error: 'SEND_FAILED' });
      }
    });

    socket.on('chat:typing', ({ bookingId, isTyping }) => {
      socket.to(`booking:${bookingId}`).emit('chat:typing', { bookingId, userId: uid, isTyping });
    });

    socket.on('disconnect', () => {});
  });
}

module.exports = { initSocket };
