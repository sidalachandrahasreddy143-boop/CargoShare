import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Search, IndianRupee, Flag, AlertTriangle, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { inr, shortDate } from '../components/ui';
import type { Dispute } from '../lib/types';

export default function AdminDisputes() {
  const { user, disputes, resolveDispute, bookings } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'disputes' | 'transactions'>('disputes');
  const [query, setQuery] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState<Record<string, string>>({});

  const filteredDisputes = useMemo(() => {
    let arr = [...disputes];
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((d) => `${d.bookingRef} ${d.reason} ${d.raisedBy} ${d.description}`.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [disputes, query]);

  const payments = useMemo(() => bookings.map((b, i) => ({
    id: `pay-${i}`,
    bookingRef: b.bookingRef,
    date: b.createdAt,
    gateway: 'Razorpay (test)',
    amount: b.totalPrice + b.platformFee,
    fee: b.platformFee,
    gst: Math.round((b.totalPrice + b.platformFee) * 0.18),
    status: b.paymentStatus,
    payout: b.bookingStatus === 'completed' ? 'paid' : b.bookingStatus === 'confirmed' ? 'pending' : 'on_hold',
    trader: b.traderName,
    lsp: b.lspCompany,
  })).filter((p) => !query.trim() || `${p.bookingRef} ${p.trader} ${p.lsp}`.toLowerCase().includes(query.toLowerCase())), [bookings, query]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldCheck size={38} className="mx-auto text-flame" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Admin access only</h1>
        <button onClick={() => navigate('/login')} className="mt-4 rounded-xl bg-ink px-6 py-3 font-bold text-paper">Sign in as admin</button>
      </div>
    );
  }

  const openCount = disputes.filter((d) => d.status === 'open').length;
  const investigating = disputes.filter((d) => d.status === 'investigating').length;

  const statusIcon = (s: Dispute['status']) =>
    s === 'open' ? <Clock size={13} className="text-red-500" /> :
    s === 'investigating' ? <AlertTriangle size={13} className="text-[#8a6d0a]" /> :
    s === 'resolved' ? <CheckCircle2 size={13} className="text-leaf" /> :
    <XCircle size={13} className="text-ink/40" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">Trust & safety</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">Disputes & Transactions</h1>
          <p className="mt-0.5 text-[12px] text-ink/55">{openCount} open · {investigating} investigating · SLA 24h · every action written to audit_log</p>
        </div>
        <div className="flex rounded-xl border border-ink/10 bg-white p-1">
          <button onClick={() => setTab('disputes')} className={`rounded-lg px-4 py-2 text-[12px] font-bold transition ${tab === 'disputes' ? 'bg-ink text-paper' : 'text-ink/65'}`}>Disputes <span className="font-mono opacity-70">{disputes.length}</span></button>
          <button onClick={() => setTab('transactions')} className={`rounded-lg px-4 py-2 text-[12px] font-bold transition ${tab === 'transactions' ? 'bg-ink text-paper' : 'text-ink/65'}`}>Transactions <span className="font-mono opacity-70">{payments.length}</span></button>
        </div>
      </div>

      <label className="relative mt-4 block max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === 'disputes' ? 'Search ref, party, reason…' : 'Search ref, trader, LSP…'} aria-label="Search"
          className="w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-[12.5px] outline-none focus:border-flame" />
      </label>

      {tab === 'disputes' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filteredDisputes.map((d) => (
            <article key={d.id} className="flex flex-col rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[12px] font-bold text-ink">{d.bookingRef}</span>
                <span className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper-2 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-ink/70">{statusIcon(d.status)}{d.status}</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-[13px] font-bold text-ink"><Flag size={13} className="text-red-500" />{d.reason}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink/65">{d.description}</p>
              <p className="mt-2 text-[10.5px] font-semibold text-ink/50">Raised by <strong>{d.raisedBy}</strong> · {shortDate(d.createdAt)}</p>
              {d.resolution && <p className="mt-2 rounded-lg bg-leaf/10 px-3 py-2 text-[11px] font-medium text-leaf-2">Resolution: {d.resolution}</p>}
              {d.status !== 'resolved' && d.status !== 'rejected' && (
                <div className="mt-auto pt-4">
                  <textarea value={resolutionDraft[d.id] ?? ''} onChange={(e) => setResolutionDraft((p) => ({ ...p, [d.id]: e.target.value }))} rows={2} placeholder="Resolution summary (sent to both parties)…"
                    className="w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[12px] outline-none focus:border-flame" />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => resolveDispute(d.id, 'investigating', resolutionDraft[d.id] || 'Under investigation by CargoShare ops.')} className="flex-1 rounded-xl border border-gold/60 bg-gold/15 px-3 py-2.5 text-[11px] font-bold text-[#8a6d0a] hover:bg-gold/25">Investigating</button>
                    <button onClick={() => resolveDispute(d.id, 'resolved', resolutionDraft[d.id] || 'Resolved in favour of claimant.')} className="flex-1 rounded-xl bg-leaf px-3 py-2.5 text-[11px] font-bold text-white hover:bg-leaf-2">Resolve</button>
                    <button onClick={() => resolveDispute(d.id, 'rejected', resolutionDraft[d.id] || 'Insufficient evidence — rejected.')} className="flex-1 rounded-xl bg-ink/80 px-3 py-2.5 text-[11px] font-bold text-paper hover:bg-ink">Reject</button>
                  </div>
                </div>
              )}
            </article>
          ))}
          {filteredDisputes.length === 0 && <p className="col-span-2 rounded-2xl border border-dashed border-ink/20 py-14 text-center text-[12.5px] text-ink/50">No disputes match your search.</p>}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-[12px]">
              <thead>
                <tr className="border-b border-ink/10 bg-paper-2/50 text-left text-[9.5px] font-bold uppercase tracking-widest text-ink/50">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Parties</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Fee (2.5%)</th>
                  <th className="px-4 py-3 text-right">GST 18%</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/6">
                {payments.map((p) => (
                  <tr key={p.id} className="transition hover:bg-paper-2/40">
                    <td className="px-5 py-3 font-mono text-[10.5px] text-ink/65">{shortDate(p.date)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-ink">{p.bookingRef}</td>
                    <td className="max-w-[220px] px-4 py-3"><span className="block truncate text-[10.5px] font-semibold text-ink/80">{p.trader}</span><span className="block truncate text-[9.5px] text-ink/50">→ {p.lsp} · {p.gateway}</span></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ink">{inr(p.amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink/70">{inr(p.fee)}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink/70">{inr(p.gst)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[8.5px] font-bold uppercase tracking-wider ${p.status === 'captured' ? 'bg-leaf/10 text-leaf-2' : 'bg-red-50 text-red-600'}`}>{p.status}</span></td>
                    <td className="px-4 py-3"><span className={`flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${p.payout === 'paid' ? 'text-leaf-2' : p.payout === 'pending' ? 'text-[#8a6d0a]' : 'text-red-600'}`}>{p.payout === 'paid' ? <CheckCircle2 size={11} /> : <Clock size={11} />}{p.payout.replace('_', ' ')}</span></td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-[12px] text-ink/50"><IndianRupee size={26} className="mx-auto mb-2 text-ink/25" />No transactions match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
