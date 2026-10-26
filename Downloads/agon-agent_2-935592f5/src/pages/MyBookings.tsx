import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, FileText, Printer, MessageSquare, ChevronRight, Search, ShieldCheck,
  Star, Flag, X, CheckCircle2, Truck, Building2,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { ModeBadge, inr, shortDate, Stars, Modal, EmptyState } from '../components/ui';
import type { Booking } from '../lib/types';

const STATUS_TONE: Record<string, string> = {
  confirmed: 'bg-leaf/10 text-leaf-2 border-leaf/30',
  completed: 'bg-ink/5 text-ink/70 border-ink/15',
  payment_pending: 'bg-gold/15 text-[#8a6d0a] border-gold/40',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

export default function MyBookings() {
  const { bookings, user, invoiceFor, raiseDispute, notify, toast } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all');
  const [query, setQuery] = useState('');
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);
  const [disputeReason, setDisputeReason] = useState('Short delivery');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewed, setReviewed] = useState<string[]>([]);

  const mine = useMemo(() => {
    let arr = bookings.filter((b) => b.traderId === user?.id || b.traderName === user?.company || b.traderId === 'u-trader-1');
    if (tab === 'active') arr = arr.filter((b) => ['confirmed', 'payment_pending'].includes(b.bookingStatus));
    if (tab === 'completed') arr = arr.filter((b) => ['completed', 'cancelled'].includes(b.bookingStatus));
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((b) => `${b.bookingRef} ${b.origin} ${b.destination} ${b.lspCompany} ${b.cargoDetails.commodity}`.toLowerCase().includes(q));
    }
    return [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, user, tab, query]);

  const counts = {
    all: bookings.length,
    active: bookings.filter((b) => ['confirmed', 'payment_pending'].includes(b.bookingStatus)).length,
    completed: bookings.filter((b) => ['completed', 'cancelled'].includes(b.bookingStatus)).length,
  };

  const submitDispute = () => {
    if (!disputeBooking) return;
    raiseDispute(disputeBooking.id, disputeReason, disputeDesc);
    setDisputeBooking(null);
    setDisputeDesc('');
  };

  const submitReview = () => {
    if (!reviewBooking) return;
    setReviewed((p) => [...p, reviewBooking.id]);
    notify({ type: 'review', title: 'Review submitted', body: `Thanks! Your ${rating}★ review of ${reviewBooking.lspCompany} helps other traders.` });
    toast('success', 'Review published', `${rating}★ for ${reviewBooking.lspCompany}`);
    setReviewBooking(null);
    setReviewText('');
    setRating(5);
  };

  const inv = invoiceBooking ? invoiceFor(invoiceBooking) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">Trader workspace</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">My Bookings</h1>
          <p className="mt-0.5 text-[12px] text-ink/55">Track shipments, download GST e-invoices, chat with LSPs, raise disputes.</p>
        </div>
        <Link to="/search" className="flex items-center gap-1.5 rounded-xl bg-flame px-4 py-2.5 text-[13px] font-bold text-white hover:bg-flame-2"><Search size={15} /> Book more space</Link>
      </div>

      {/* tabs + search */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-ink/10 bg-white p-1">
          {([['all', 'All'], ['active', 'Active'], ['completed', 'Completed']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-[12.5px] font-bold transition ${tab === key ? 'bg-ink text-paper' : 'text-ink/65 hover:text-ink'}`}>
              {label} <span className="font-mono text-[10.5px] opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
        <label className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ref, route, LSP, cargo…" aria-label="Search bookings"
            className="w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-flame" />
        </label>
      </div>

      {/* list */}
      <div className="mt-4 space-y-3">
        {mine.length === 0 && <EmptyState icon={Package} title="No bookings here yet" hint="Search spare capacity on your lanes and book partial space in minutes — pay only for what you use." action={<Link to="/search" className="rounded-xl bg-ink px-5 py-2.5 text-[13px] font-bold text-paper">Explore marketplace</Link>} />}
        {mine.map((b) => (
          <article key={b.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition hover:shadow-md">
            <div className="grid md:grid-cols-[1fr_auto]">
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-mono text-[13px] font-bold text-ink">{b.bookingRef}</span>
                  <ModeBadge mode={b.mode} size="sm" />
                  <span className={`rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${STATUS_TONE[b.bookingStatus]}`}>{b.bookingStatus.replace('_', ' ')}</span>
                  <span className="font-mono text-[10px] text-ink/45">{shortDate(b.createdAt)}</span>
                </div>
                <p className="mt-2 font-display text-[18px] font-semibold leading-snug text-ink">{b.origin} <span className="text-flame">→</span> {b.destination}</p>
                <p className="mt-1 text-[11.5px] font-medium text-ink/60">
                  <strong className="text-ink/80">{b.qtyBooked} {b.unit}</strong> · {b.cargoDetails.commodity} · {b.cargoDetails.packages} packages · departs {shortDate(b.departure)} · via {b.lspCompany}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-ink/55">Freight {inr(b.totalPrice)}</span>
                  <span className="text-ink/55">Fee {inr(b.platformFee)}</span>
                  <span className="font-bold text-ink">Total {inr(b.totalPrice + b.platformFee)}</span>
                  {b.paymentStatus === 'captured' && <span className="flex items-center gap-1 font-semibold text-leaf-2"><ShieldCheck size={11} /> Paid · {b.paymentMethod}</span>}
                </div>
              </div>
              <div className="flex flex-row items-center gap-2 border-t border-ink/8 bg-paper-2/50 p-3 md:flex-col md:justify-center md:border-l md:border-t-0 md:px-4">
                <button onClick={() => setInvoiceBooking(b)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-[11px] font-bold text-ink transition hover:border-flame hover:text-flame-2 md:w-36 md:flex-none"><FileText size={14} /> Invoice</button>
                <button onClick={() => navigate(`/chat?booking=${b.id}`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-[11px] font-bold text-ink transition hover:border-flame hover:text-flame-2 md:w-36 md:flex-none"><MessageSquare size={14} /> Chat LSP</button>
                {b.bookingStatus === 'completed' && !reviewed.includes(b.id) && (
                  <button onClick={() => setReviewBooking(b)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2.5 text-[11px] font-bold text-[#8a6d0a] transition hover:bg-gold/20 md:w-36 md:flex-none"><Star size={14} /> Rate LSP</button>
                )}
                {reviewed.includes(b.id) && <span className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[10.5px] font-bold text-leaf-2 md:w-36 md:flex-none"><CheckCircle2 size={14} /> Reviewed</span>}
                <button onClick={() => setDisputeBooking(b)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 md:w-36 md:flex-none"><Flag size={14} /> Dispute</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ═══════════ GST E-INVOICE MODAL ═══════════ */}
      <Modal open={!!invoiceBooking} onClose={() => setInvoiceBooking(null)} size="md" label="Tax invoice">
        {invoiceBooking && inv && (
          <div className="print-invoice overflow-y-auto bg-white">
            <div className="flex items-center justify-between border-b border-ink/10 bg-ink px-6 py-3 text-paper no-print">
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest"><FileText size={14} /> GST Tax Invoice</p>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-flame px-3 py-2 text-[11px] font-bold text-white"><Printer size={13} /> Print / PDF</button>
                <button onClick={() => setInvoiceBooking(null)} className="rounded-lg p-2 hover:bg-white/10"><X size={16} /></button>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-2xl font-semibold text-ink">Cargo<span className="text-flame">Share</span></p>
                  <p className="mt-1 font-mono text-[9.5px] leading-relaxed text-ink/55">CargoShare Labs Pvt Ltd · 14 Freight Corridor,<br />Bengaluru 560016 · HSN 9965 · GSTIN 29AABCC1234F1Z1</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[15px] font-bold text-ink">{inv.invoiceNo}</p>
                  <p className="font-mono text-[9.5px] text-ink/55">Date: {new Date(inv.date).toLocaleDateString('en-IN')}</p>
                  <p className="font-mono text-[9.5px] text-ink/55">Place of supply: {inv.placeOfSupply}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-ink/10 bg-paper-2/50 p-3 text-[10.5px]">
                <div>
                  <p className="font-bold uppercase tracking-widest text-ink/45">Billed to</p>
                  <p className="mt-0.5 font-bold text-ink">{user?.company || user?.name}</p>
                  <p className="text-ink/60">{user?.address || 'Surat, Gujarat'}</p>
                  <p className="font-mono text-ink/60">GSTIN: {user?.gstin || '27AABFS4426P1Z5'}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-widest text-ink/45">Service by</p>
                  <p className="mt-0.5 font-bold text-ink">{invoiceBooking.lspCompany}</p>
                  <p className="text-ink/60">Verified Logistics Service Provider</p>
                  <p className="font-mono text-ink/60">Booking: {invoiceBooking.bookingRef}</p>
                </div>
              </div>
              <table className="mt-4 w-full text-[11.5px]">
                <thead>
                  <tr className="bg-ink text-left text-paper">
                    <th className="rounded-tl-lg px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Rate ₹</th>
                    <th className="rounded-tr-lg px-3 py-2 text-right font-semibold">Amount ₹</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-ink/10">
                    <td className="px-3 py-2.5">Spare space — {invoiceBooking.mode.toUpperCase()} · {invoiceBooking.origin} → {invoiceBooking.destination}<br /><span className="text-[9.5px] text-ink/50">{invoiceBooking.cargoDetails.commodity} · {invoiceBooking.cargoDetails.packages} packages</span></td>
                    <td className="px-3 py-2.5 text-right font-mono">{inv.qty} {inv.unit}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{inr(inv.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{inr(invoiceBooking.totalPrice)}</td>
                  </tr>
                  <tr className="border-b border-ink/10"><td className="px-3 py-2.5" colSpan={3}>Platform fee (2.5%)</td><td className="px-3 py-2.5 text-right font-mono">{inr(invoiceBooking.platformFee)}</td></tr>
                  <tr className="border-b border-ink/10"><td className="px-3 py-2.5" colSpan={3}>GST @ 18% (IGST, HSN {inv.hsn})</td><td className="px-3 py-2.5 text-right font-mono">{inr(inv.gst)}</td></tr>
                </tbody>
                <tfoot>
                  <tr className="bg-paper-2"><td className="rounded-bl-lg px-3 py-2.5 font-display text-[13px] font-bold text-ink" colSpan={3}>Grand Total</td><td className="rounded-br-lg px-3 py-2.5 text-right font-mono text-[13px] font-bold text-ink">{inr(inv.grandTotal)}</td></tr>
                </tfoot>
              </table>
              <p className="mt-4 text-center font-mono text-[8.5px] uppercase tracking-widest text-ink/40">Computer-generated invoice · No signature required · Payment via Razorpay sandbox · cargoshare.io/terms</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ DISPUTE MODAL ═══════════ */}
      <Modal open={!!disputeBooking} onClose={() => setDisputeBooking(null)} size="sm" label="Raise a dispute">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">Raise a dispute</h2>
            <button onClick={() => setDisputeBooking(null)} className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5"><X size={18} /></button>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-ink/55">{disputeBooking?.bookingRef} · {disputeBooking?.lspCompany}</p>
          <label className="mt-4 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Reason</span>
            <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-flame">
              {['Short delivery', 'Damaged cargo', 'Late delivery', 'Wrong cargo loaded', 'Overcharged', 'Cargo not loaded', 'Documentation issue', 'Other'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="mt-3 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">What happened?</span>
            <textarea value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} rows={4} placeholder="Weighbridge slips, photos, e-way bill discrepancy…" className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
          </label>
          <button onClick={submitDispute} disabled={!disputeDesc.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 font-bold text-white transition hover:bg-red-700 disabled:opacity-40"><Flag size={16} /> Submit dispute — 24h SLA</button>
        </div>
      </Modal>

      {/* ═══════════ REVIEW MODAL ═══════════ */}
      <Modal open={!!reviewBooking} onClose={() => setReviewBooking(null)} size="sm" label="Rate your provider">
        <div className="p-6 text-center">
          <Building2 size={30} className="mx-auto text-ink/30" />
          <h2 className="mt-2 font-display text-xl font-semibold text-ink">How was {reviewBooking?.lspCompany}?</h2>
          <p className="mt-0.5 text-[11px] text-ink/55">{reviewBooking?.bookingRef} · {reviewBooking?.origin} → {reviewBooking?.destination}</p>
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)} aria-label={`${i} star`}>
                <Star size={36} strokeWidth={1.5} className="transition" fill={i <= rating ? '#D9A227' : 'none'} stroke="#D9A227" />
              </button>
            ))}
          </div>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} placeholder="On-time? Cargo condition? Communication? (optional)" className="mt-4 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
          <button onClick={submitReview} className="mt-3 w-full rounded-xl bg-ink px-5 py-3.5 font-bold text-paper transition hover:bg-ink-2">Submit {rating}★ review</button>
        </div>
      </Modal>
    </div>
  );
}
