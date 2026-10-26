'use strict';
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || 'postgres://cargoshare:cargoshare_dev_password@localhost:5432/cargoshare',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  lockTtlSeconds: Number(process.env.LOCK_TTL_SECONDS || 600),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS || 300),
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'placeholder',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder',
  },
  commissionPct: Number(process.env.PLATFORM_COMMISSION_PCT || 2.5),
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: String(process.env.MINIO_USE_SSL) === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'cargoshare',
    secretKey: process.env.MINIO_SECRET_KEY || 'cargoshare_dev_minio',
    bucketDocs: process.env.MINIO_BUCKET_DOCS || 'cargoshare-docs',
    bucketInvoices: process.env.MINIO_BUCKET_INVOICES || 'cargoshare-invoices',
    bucketChat: process.env.MINIO_BUCKET_CHAT || 'cargoshare-chat',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'CargoShare <no-reply@cargoshare.io>',
  },
  sms: {
    apiUrl: process.env.SMS_API_URL || '',
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || 'CRGOSH',
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@cargoshare.io',
  },
};
