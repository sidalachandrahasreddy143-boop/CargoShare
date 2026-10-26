import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Plus, Package, TrendingUp, Wallet, Star, Edit3, Trash2,
  Pause, Play, ChevronRight, AlertCircle, FileCheck2, Clock, CheckCircle2, XCircle, IndianRupee,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useStore } from '../lib/store';
import { CapacityBar, ModeBadge, Stars, inr, shortDate } from '../components/ui';
import type { Container } from '../lib/types';

export default function LspDashboard() {
  const { user, lspContainers, bookings, toggleContainerStatus, deleteContainer, lspProfileFor, toast } = useStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<Container | null>(null);

  const myLspId = user?.company === 'Deccan Rail Freight' ? 'lsp-1' : user?.company === 'Singh Roadways' ? 'lsp-2' : user?.company === 'Coastal Shipping Co' ? 'lsp-3' : user?.id;
  const myProfile = user ? lspProfileFor(user.id) : undefined;
  // seed LSPs are pre-approved; self-registered ones look up their application
  const application = myProfile ?? (user && ['u-lsp-1', 'u-lsp-2', 'u-lsp-3'].includes(user.id)
    ? { approvalStatus: 'approved' as const, dataQualityScore: user.id === 'u-lsp-1' ? 92 : user.id === 'u-lsp-2' ? 85 : 88, rejectionReason: undefined, inspectionNotes: 'Verified during onboarding.' }
    : undefined);

  const activeListings = lspContainers.filter((c) => c.status === 'active');
  const totalSpare = lspContainers.reduce((s, c) => s + Math.max(0, c.totalCapacity - c.bookedCapacity), 0);
  const bookedPct = lspContainers.length
    ? Math.round((lspContainers.reduce((s, c) => s + c.bookedCapacity / c.totalCapacity, 0) / lspContainers.length) * 100)
    : 0;

  const myBookings = useMemo(() => bookings.filter((b) => b.lspId === myLspId), [bookings, myLspId]);
  const lifetimeGmv = myBookings.reduce((s, b) => s + b.totalPrice, 0);
  const pendingPayout = myBookings.filter((b) => b.paymentStatus === 'captured').reduce((s, b) => s + b.totalPrice - b.platformFee, 0);

  const earningsSeries = useMemo(() => {
    const days: { day: string; payout: number }[] = [];
    let s = 7;
    const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      days.push({ day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), payout: Math.round((weekend ? 0.4 : 1) * (22000 + rand() * 38000)) });
    }
    return days;
  }, []);

  if (!user || user.role !== 'lsp') {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <AlertCircle size={38} className="mx-auto text-flame" />
        <h1 className="mt-3 font-display text-2xl font-semibold">LSP access only</h1>
        <p className="mt-1.5 text-[13px] text-ink/60">Sign in with a logistics provider account to manage listings and payouts.</p>
        <button onClick={() => navigate('/login?tab=lsp')} className="mt-5 rounded-xl bg-ink px-6 py-3 font-bold text-paper">Sign in as LSP — try karthik@deccanrail.in / lsp12345</button>
      </div>
    );
  }

  const pending = application?.approvalStatus !== 'approved';

  return (
    <div className="mx-auto max-w-7xl px-4 py-7">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">Provider console</p>
          <h1 className="mt-1 flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-ink"><LayoutDashboard className="text-flame" size={26} /> {user.company}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-[12px] text-ink/55"><FileCheck2 size={13} className="text-leaf" /> KYC verified · fleet GPS-tracked · payouts T+1 via Razorpay Route</p>
        </div>
        <Link to="/lsp/containers/new" className="flex items-center gap-1.5 rounded-xl bg-flame px-4 py-3 text-[13px] font-bold text-white shadow-sm transition hover:bg-flame-2"><Plus size={16} /> List spare capacity</Link>
      </div>

      {/* approval status banner */}
      {pending && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gold/50 bg-[#fdf6dd] p-4">
          <Clock size={19} className="mt-0.5 shrink-0 text-[#8a6d0a]" />
          <div className="text-[12.5px]">
            <p className="font-bold text-ink">Application {application?.approvalStatus === 'under_review' ? 'under review' : 'pending'} — listings go live after admin approval</p>
            <p className="mt-0.5 text-ink/65">Our verification desk reviews license documents against transport authority registries. Median decision time: 2 business days. We’ll notify you on every step.</p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Active listings', value: String(activeListings.length), sub: `${lspContainers.length} total`, icon: Package, tint: '#0E6BA8' },
          { label: 'Spare capacity open', value: `${Math.round(totalSpare).toLocaleString('en-IN')}`, sub: 'units across lanes', icon: TrendingUp, tint: '#217A4B' },
          { label: 'Avg. fill rate', value: `${bookedPct}%`, sub: 'of listed capacity', icon: LayoutDashboard, tint: '#B4530A' },
          { label: 'Pending payout', value: inr(pendingPayout), sub: 'settles T+1', icon: Wallet, tint: '#7C3AED' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
            <k.icon size={17} style={{ color: k.tint }} />
            <p className="mt-2 font-mono text-[22px] font-semibold leading-none text-ink">{k.value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/55">{k.label}</p>
            <p className="text-[9.5px] text-ink/40">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* ════ earnings chart ════ */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-ink">Payouts — last 14 days</h2>
              <p className="text-[10.5px] text-ink/55">Lifetime GMV {inr(lifetimeGmv)} · next settlement tomorrow 17:00 IST</p>
            </div>
            <span className="rounded-full border border-ink/10 bg-paper-2 px-3 py-1 font-mono text-[10px] font-bold text-ink/60">RAZORPAY ROUTE</span>
          </div>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsSeries} margin={{ top: 6, right: 0, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e1d2" />
                <XAxis dataKey="day" tick={{ fontSize: 9.5, fill: '#4a5a60' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 9.5, fill: '#4a5a60' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip cursor={{ fill: 'rgba(232,98,44,0.08)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e4e1d2', fontSize: 12 }} formatter={(v) => [inr(Number(v)), 'Payout']} />
                <Bar dataKey="payout" radius={[5, 5, 0, 0]}>
                  {earningsSeries.map((d, i) => <Cell key={i} fill={d.payout > 45000 ? '#E8622C' : '#F0A05A'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-4 border-t border-ink/8 pt-3 text-[10.5px] font-semibold text-ink/55">
            <span className="flex items-center gap-1.5"><Stars rating={4.8} size={11} /> 4.8 (214 reviews)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-leaf" /> 96% on-time departures</span>
            <span className="flex items-center gap-1.5"><IndianRupee size={12} className="text-gold" /> Quality score {application?.dataQualityScore ?? 80}/100</span>
          </div>
        </div>

        {/* ════ recent activity ════ */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-5">
          <h2 className="font-display text-[17px] font-semibold text-ink">Recent bookings on your fleet</h2>
          <div className="mt-2 divide-y divide-ink/6">
            {myBookings.slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] font-bold text-ink">{b.bookingRef}</p>
                  <p className="truncate text-[10.5px] text-ink/55">{b.cargoDetails.commodity} · {b.qtyBooked} {b.unit} · {b.traderName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[12px] font-semibold text-ink">{inr(b.totalPrice)}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-leaf-2">{b.paymentStatus === 'captured' ? 'Paid' : b.bookingStatus}</p>
                </div>
              </div>
            ))}
            {myBookings.length === 0 && <p className="py-6 text-center text-[11.5px] text-ink/50">No bookings yet. Share your listing link with cargo owners to fill it faster.</p>}
          </div>
        </div>
      </div>

      {/* ════ listings table ════ */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-ink/10 bg-paper-2/50 px-5 py-3.5">
          <h2 className="font-display text-[16px] font-semibold text-ink">Your listings <span className="font-mono text-[11px] text-ink/45">{lspContainers.length}</span></h2>
          <p className="hidden text-[10px] font-mono uppercase tracking-widest text-ink/40 sm:block">Real-time · socket: capacity:update</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-[12px]">
            <thead>
              <tr className="text-left text-[9.5px] font-bold uppercase tracking-widest text-ink/50">
                <th className="px-5 py-2.5">Container / Route</th>
                <th className="px-4 py-2.5">Departure</th>
                <th className="px-4 py-2.5">Capacity</th>
                <th className="px-4 py-2.5 text-right">Rate</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {lspContainers.map((c) => {
                const pct = Math.round((c.bookedCapacity / c.totalCapacity) * 100);
                return (
                  <tr key={c.id} className="align-middle transition hover:bg-paper-2/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2"><ModeBadge mode={c.mode} size="sm" /><span className="font-mono font-bold text-ink">{c.containerRef}</span></div>
                      <p className="mt-1 max-w-[210px] truncate text-[10.5px] font-semibold text-ink/60">{c.origin} → {c.destination}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10.5px] text-ink/70">{shortDate(c.departure)}</td>
                    <td className="px-4 py-3">
                      <div className="w-40"><CapacityBar total={c.totalCapacity} booked={c.bookedCapacity} unit={c.unit} showLabel={false} /></div>
                      <p className="mt-0.5 font-mono text-[9.5px] text-ink/55">{c.totalCapacity - c.bookedCapacity} {c.unit} free · {pct}% full</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ink">{inr(c.ratePerUnit)}<span className="text-[9px] text-ink/50">/{c.unit}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider ${c.status === 'active' ? 'bg-leaf/10 text-leaf-2' : 'bg-ink/8 text-ink/55'}`}>{c.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/lsp/containers/${c.id}/edit`)} className="rounded-lg p-2 text-ink/55 transition hover:bg-ink/5 hover:text-ink" title="Edit listing" aria-label="Edit listing"><Edit3 size={15} /></button>
                        <button onClick={() => toggleContainerStatus(c.id)} className="rounded-lg p-2 text-ink/55 transition hover:bg-ink/5 hover:text-ink" title={c.status === 'active' ? 'Pause listing' : 'Reactivate'} aria-label="Toggle listing status">{c.status === 'active' ? <Pause size={15} /> : <Play size={15} />}</button>
                        <button onClick={() => setConfirmDelete(c)} className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600" title="Delete listing" aria-label="Delete listing"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {lspContainers.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-[12px] text-ink/50">No listings yet. <Link to="/lsp/containers/new" className="font-bold text-flame-2 underline">Create your first listing →</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <XCircle size={30} className="text-red-500" />
            <h3 className="mt-2 font-display text-xl font-semibold text-ink">Delete {confirmDelete.containerRef}?</h3>
            <p className="mt-1 text-[12.5px] text-ink/60">This removes the listing from the marketplace immediately. Containers with active bookings can’t be deleted.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { const r = deleteContainer(confirmDelete.id); if (!r.ok) toast('error', 'Cannot delete', r.error); setConfirmDelete(null); }} className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700">Delete listing</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-ink/15 px-4 py-3 font-bold text-ink">Keep it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
