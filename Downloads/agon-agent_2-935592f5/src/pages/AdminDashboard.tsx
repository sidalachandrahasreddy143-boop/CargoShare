import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Users, Building2, PackageCheck, IndianRupee, TrendingUp,
  ArrowRight, Clock, AlertTriangle, FileCheck2, Percent,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useStore } from '../lib/store';
import { REVENUE_SERIES, ROUTE_LEADERBOARD, FILL_RATE_BY_MODE, TOP_TRADERS } from '../lib/data';
import { inr } from '../components/ui';

const MODE_COLORS: Record<string, string> = { Rail: '#7C3AED', Road: '#B4530A', Ship: '#0F766E', Air: '#0E6BA8' };

export default function AdminDashboard() {
  const { user, lspApplications, disputes, bookings, reviewApplication } = useStore();
  const navigate = useNavigate();
  const pendingCount = lspApplications.filter((a) => a.approvalStatus === 'pending' || a.approvalStatus === 'under_review').length;
  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'investigating').length;

  const totalGmv = REVENUE_SERIES.reduce((s, d) => s + d.gmv, 0);
  const totalBookings30d = REVENUE_SERIES.reduce((s, d) => s + d.bookings, 0);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldCheck size={38} className="mx-auto text-flame" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Admin access only</h1>
        <p className="mt-1.5 text-[13px] text-ink/60">This console is restricted to CargoShare operations staff.</p>
        <button onClick={() => navigate('/login')} className="mt-5 rounded-xl bg-ink px-6 py-3 font-bold text-paper">Sign in — try admin@cargoshare.io / admin123</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">Operations console</p>
          <h1 className="mt-1 flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-ink"><ShieldCheck className="text-flame" size={27} /> Admin Panel</h1>
          <p className="mt-0.5 text-[12px] text-ink/55">Marketplace health, verification queue, disputes, payouts — one pane of glass.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/lsp-queue" className="relative flex items-center gap-1.5 rounded-xl border border-gold/60 bg-gold/15 px-4 py-2.5 text-[12px] font-bold text-[#8a6d0a] hover:bg-gold/25">
            <FileCheck2 size={15} /> Verification queue
            {pendingCount > 0 && <span className="rounded-full bg-flame px-1.5 text-[10px] font-bold text-white">{pendingCount}</span>}
          </Link>
          <Link to="/admin/disputes" className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-700 hover:bg-red-100">
            <AlertTriangle size={15} /> Disputes {openDisputes > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{openDisputes}</span>}
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'GMV · 30d', value: inr(totalGmv), icon: IndianRupee, tint: '#217A4B' },
          { label: 'Bookings · 30d', value: String(totalBookings30d), icon: PackageCheck, tint: '#0E6BA8' },
          { label: 'Platform revenue', value: inr(Math.round(totalGmv * 0.025)), icon: TrendingUp, tint: '#E8622C' },
          { label: 'Active traders', value: '9,412', icon: Users, tint: '#7C3AED' },
          { label: 'Verified LSPs', value: '612', icon: Building2, tint: '#0F766E' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
            <k.icon size={16} style={{ color: k.tint }} />
            <p className="mt-2 font-mono text-[19px] font-semibold leading-none text-ink">{k.value}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink/55">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* ════ revenue trend ════ */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[17px] font-semibold text-ink">GMV & bookings — trailing 30 days</h2>
            <span className="font-mono text-[10px] font-bold text-leaf-2">▲ 18.4% MoM</span>
          </div>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_SERIES} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8622C" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#E8622C" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e4d5" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#55666c' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis yAxisId="l" tick={{ fontSize: 9, fill: '#55666c' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 100000)}L`} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9, fill: '#55666c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e4e1d2', fontSize: 11 }} formatter={(v: any, name: any) => name === 'gmv' ? [inr(Number(v)), 'GMV'] : [v, 'Bookings']} />
                <Area yAxisId="l" type="monotone" dataKey="gmv" stroke="#E8622C" strokeWidth={2.4} fill="url(#gmv)" />
                <Area yAxisId="r" type="monotone" dataKey="bookings" stroke="#0E242D" strokeWidth={1.6} strokeDasharray="5 4" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ════ fill rate by mode ════ */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-4">
          <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold text-ink"><Percent size={16} className="text-flame" /> Fill rate by mode</h2>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={FILL_RATE_BY_MODE} dataKey="fill" nameKey="mode" innerRadius={44} outerRadius={64} paddingAngle={4} strokeWidth={2}>
                  {FILL_RATE_BY_MODE.map((m) => <Cell key={m.mode} fill={MODE_COLORS[m.mode]} />)}
                </Pie>
                <Tooltip formatter={(v: any, _n: any, p: any) => [`${v}% · ${p?.payload?.listings} listings`, 'Fill rate']} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[11px] font-semibold text-ink/70">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 border-t border-ink/8 pt-3">
            {FILL_RATE_BY_MODE.map((m) => (
              <div key={m.mode} className="flex items-center gap-2 text-[11px]">
                <span className="w-9 font-bold" style={{ color: MODE_COLORS[m.mode] }}>{m.mode}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full" style={{ width: `${m.fill}%`, background: MODE_COLORS[m.mode] }} /></div>
                <span className="font-mono text-[10px] text-ink/60">{m.fill}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* ════ route leaderboard ════ */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-5">
          <h2 className="font-display text-[17px] font-semibold text-ink">Top corridors by bookings</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ROUTE_LEADERBOARD} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="route" width={118} tick={{ fontSize: 9.5, fill: '#37474d', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(232,98,44,0.08)' }} formatter={(v: any) => [v, 'Bookings']} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                <Bar dataKey="bookings" fill="#0E242D" radius={[0, 5, 5, 0]}>
                  {ROUTE_LEADERBOARD.map((_, i) => <Cell key={i} fill={i < 3 ? '#E8622C' : '#1f3d49'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ════ LSP verification queue preview ════ */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold text-ink"><Clock size={16} className="text-gold" /> Verification queue</h2>
            <Link to="/admin/lsp-queue" className="flex items-center gap-1 text-[11px] font-bold text-flame-2 hover:underline">Open queue <ArrowRight size={12} /></Link>
          </div>
          <div className="mt-3 space-y-2">
            {lspApplications.filter((a) => a.approvalStatus !== 'approved' && a.approvalStatus !== 'rejected').slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-ink/8 p-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink/5 font-mono text-[9px] font-bold text-ink/60">{a.mode.slice(0, 3).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-ink">{a.companyName}</p>
                  <p className="truncate text-[10px] text-ink/55">{a.applicantName} · {a.licenseNumber}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[8.5px] font-bold uppercase tracking-wider ${a.approvalStatus === 'under_review' ? 'bg-gold/20 text-[#8a6d0a]' : 'bg-red-50 text-red-600'}`}>{a.approvalStatus.replace('_', ' ')}</span>
              </div>
            ))}
            {pendingCount === 0 && <p className="py-6 text-center text-[11.5px] text-ink/50">Queue clear — every applicant reviewed. 🎉</p>}
          </div>
        </div>

        {/* ════ top traders ════ */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="font-display text-[17px] font-semibold text-ink">Top traders</h2>
          <ol className="mt-3 divide-y divide-ink/6">
            {TOP_TRADERS.slice(0, 5).map((t, i) => (
              <li key={t.name} className="flex items-center gap-2.5 py-2">
                <span className="font-mono text-[11px] font-bold text-flame-2">0{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-bold text-ink">{t.name}</p>
                  <p className="text-[9.5px] text-ink/50">{t.company}</p>
                </div>
                <span className="shrink-0 font-mono text-[10.5px] font-semibold text-ink/70">{inr(t.gmv)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
