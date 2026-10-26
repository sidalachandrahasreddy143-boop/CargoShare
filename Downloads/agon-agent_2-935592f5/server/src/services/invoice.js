'use strict';
/** PDF invoice generation via pdfkit (open-source). Uploads to MinIO. */
const PDFDocument = require('pdfkit');
const { Client } = require('minio');
const cfg = require('../config');

const minio = new Client({
  endPoint: cfg.minio.endPoint,
  port: cfg.minio.port,
  useSSL: cfg.minio.useSSL,
  accessKey: cfg.minio.accessKey,
  secretKey: cfg.minio.secretKey,
});

async function ensureBucket(bucket) {
  const exists = await minio.bucketExists(bucket).catch(() => false);
  if (!exists) await minio.makeBucket(bucket);
}

/**
 * Builds a GST-style tax invoice PDF for a confirmed booking.
 * Returns the MinIO object URL.
 */
async function generateInvoice(booking, lsp, trader) {
  await ensureBucket(cfg.minio.bucketInvoices);

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  // ── Header
  doc.fontSize(22).fillColor('#0b3b5e').text('CargoShare', { continued: true })
     .fillColor('#111').fontSize(10).text('   Tax Invoice', { baseline: 'bottom' });
  doc.moveDown(0.2).fontSize(9).fillColor('#555')
     .text('CargoShare Labs Pvt Ltd · HSN 9965 · GSTIN 29AABCC1234F1Z1')
     .text('14, Freight Corridor, Bengaluru 560016 · support@cargoshare.io');
  doc.moveDown(0.6);
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor('#0b3b5e').stroke();
  doc.moveDown(0.6);

  // ── Meta grid
  doc.fillColor('#111').fontSize(10);
  const y0 = doc.y;
  doc.text(`Invoice No: INV-${booking.booking_ref}`, 48, y0);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 48, y0 + 14);
  doc.text(`Booking Ref: ${booking.booking_ref}`, 48, y0 + 28);
  doc.text('Billed To:', 320, y0);
  doc.text(trader.company || trader.name, 320, y0 + 14);
  doc.text(trader.email, 320, y0 + 28);
  doc.moveDown(2.5);

  // ── Parties
  doc.fontSize(11).fillColor('#0b3b5e').text('Service Provider (LSP)');
  doc.fontSize(10).fillColor('#111').text(`${lsp.company_name} · License ${lsp.license_number || '—'}`);
  doc.text(lsp.address || '');
  doc.moveDown(1);

  // ── Line items table
  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#fff');
  doc.rect(48, tableTop, 499, 20).fill('#0b3b5e');
  doc.fillColor('#fff')
     .text('Description', 56, tableTop + 5)
     .text('Qty', 320, tableTop + 5)
     .text('Rate ₹', 380, tableTop + 5)
     .text('Amount ₹', 460, tableTop + 5);

  const rowY = tableTop + 26;
  doc.fillColor('#111')
     .text(`${booking.mode || 'cargo'} space · ${booking.origin} → ${booking.destination}`, 56, rowY, { width: 250 })
     .text(`${booking.qty_booked} ${booking.unit}`, 320, rowY)
     .text(Number(booking.rate_per_unit).toLocaleString('en-IN'), 380, rowY)
     .text(Number(booking.total_price).toLocaleString('en-IN'), 460, rowY);

  let y = rowY + 46;
  const fee = Number(booking.platform_fee || 0);
  const base = Number(booking.total_price);
  const gst = Math.round((base + fee) * 0.18);
  const grand = base + fee + gst;
  doc.moveTo(48, y).lineTo(547, y).strokeColor('#ddd').stroke();
  doc.text('Subtotal', 380, y + 8).text(`₹ ${base.toLocaleString('en-IN')}`, 460, y + 8);
  doc.text('Platform fee', 380, y + 24).text(`₹ ${fee.toLocaleString('en-IN')}`, 460, y + 24);
  doc.text('GST @18%', 380, y + 40).text(`₹ ${gst.toLocaleString('en-IN')}`, 460, y + 40);
  doc.fontSize(11).fillColor('#0b3b5e')
     .text('Grand Total', 380, y + 62).text(`₹ ${grand.toLocaleString('en-IN')}`, 452, y + 62);

  doc.moveDown(6).fontSize(8).fillColor('#666')
     .text('Payment method: Razorpay (test mode) · This is a computer-generated invoice and needs no signature.')
     .text('CargoShare Marketplace Terms: goods move under the LSP’s waybill. Platform commission applies on payout.');

  doc.end();
  await done;

  const objectName = `invoices/INV-${booking.booking_ref}.pdf`;
  await minio.putObject(cfg.minio.bucketInvoices, objectName, Buffer.concat(chunks), { 'Content-Type': 'application/pdf' });
  return `minio://${cfg.minio.bucketInvoices}/${objectName}`;
}

module.exports = { generateInvoice };
