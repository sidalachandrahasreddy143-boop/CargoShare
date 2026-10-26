import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Train, Truck, Ship, Plane, ArrowRight, ShieldCheck, IndianRupee,
  FileText, Leaf, ChevronRight, ChevronLeft, MapPin, PackageCheck, Quote,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { CapacityBar, MODE_META, ModeBadge, Stars, inr } from '../components/ui';
import MapView from '../components/MapView';
import type { TransportMode } from '../lib/types';

const CARGO_TYPES = ['Agri', 'FMCG', 'Pharma', 'Electronics', 'Textiles', 'Chemicals', 'Auto Parts'];

function useCounters() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setT(Math.min(1, (Date.now() - start) / 1600));
    }, 32);
    return () => clearInterval(timer);
  }, []);
  const ease = 1 - Math.pow(1 - t, 3);
  return {
    capacity: Math.round(38_240 * ease),
    lsps: Math.round(612 * ease),
    cities: Math.round(148 * ease),
    savings: Math.round(41 * ease),
  };
}

const TESTIMONIALS = [
  {
    quote: 'Booked 40 MT of spare rail space in under ten minutes. Our freight cost dropped from ₹2,050 to ₹1,450 per MT — that is a truckload of profit per wagon.',
    name: 'Ananya Sharma', role: 'Director, Sharma Exports · Basmati Rice · Surat', img: null, rating: 5,
  },
  {
    quote: 'Deadhead backhaul is gone. Our rakes to Gandhidham now carry FMCG on the return leg at 88% fill. That is real revenue, not empty miles.',
    name: 'Karthik Rao', role: 'Head of Ops, Deccan Rail Freight · 64 wagons', img: null, rating: 5,
  },
  {
    quote: 'The live capacity view is addictive. I check it like stock prices — when a Colombo sailing dips to 30% filled, I book two TEUs on the spot.',
    name: 'Priya Nair', role: 'Founder, Malabar Spices · Kochi', img: null, rating: 5,
  },
];

export default function Landing() {
  const { containers, login } = useStore();
  const navigate = useNavigate();
  const counters = useCounters();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState<TransportMode | ''>('');
  const [activeTile, setActiveTile] = useState(0);
  const [testimonial, setTestimonial] = useState(0);

  // auto-rotate cargo tiles
  useEffect(() => {
    const t = setInterval(() => setActiveTile((v) => (v + 1) % CARGO_TYPES.length), 2600);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTestimonial((v) => (v + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const featured = useMemo(
    () => [...containers].sort((a, b) => (b.totalCapacity - b.bookedCapacity) - (a.totalCapacity - a.bookedCapacity)).slice(0, 3),
    [containers],
  );

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    if (mode) params.set('mode', mode);
    navigate(`/search?${params.toString()}`);
  };

  const quickRoutes = [
    { o: 'Gandhidham', d: 'Ludhiana' }, { o: 'Delhi NCR', d: 'Mumbai' },
    { o: 'Chennai', d: 'Colombo' }, { o: 'Mumbai', d: 'Ahmedabad' },
  ];

  return (
    <div className="overflow-x-clip">
      {/* ════════════════ HERO ════════════════ */}
      <section className="relative bg-ink text-paper">
        <div className="absolute inset-0">
          <img src="/img/hero-port.jpg" alt="Aerial view of a container port at dusk" className="h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
          <div className="dot-grid absolute inset-0 opacity-60" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 md:pb-20 md:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-flame/40 bg-flame/10 py-1 pl-1 pr-3 text-[10.5px] font-semibold text-flame backdrop-blur">
                <span className="rounded-full bg-flame px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Open Source</span>
                100% FOSS stack · AGPL-3.0 · self-hostable in 15 minutes
              </div>
              <h1 className="mt-4 font-display text-[42px] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[64px]">
                Half-empty trains,<br />
                <span className="italic text-flame">full-speed savings.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-paper/85">
                CargoShare matches <strong className="text-paper">small exporters & importers</strong> with verified logistics
                providers to book <strong className="text-paper">spare space in partially-filled containers</strong> — rail, road, ship and air —
                at up to <span className="font-mono font-semibold text-gold">40% below full-charter rates</span>.
              </p>

              {/* SEARCH WIDGET */}
              <form onSubmit={submitSearch} className="mt-7 rounded-2xl border border-paper/15 bg-paper p-2 text-ink shadow-2xl">
                <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_auto]">
                  <label className="group relative border-b border-ink/10 px-3 py-2 md:border-b-0 md:border-r">
                    <span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-ink/50"><MapPin size={10} /> From</span>
                    <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Gandhidham, Delhi, Chennai…"
                      className="mt-0.5 w-full bg-transparent text-[14px] font-semibold outline-none placeholder:font-normal placeholder:text-ink/35" aria-label="Origin" />
                  </label>
                  <label className="border-b border-ink/10 px-3 py-2 md:border-b-0 md:border-r">
                    <span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-ink/50"><MapPin size={10} /> To</span>
                    <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ludhiana, Mumbai, Colombo…"
                      className="mt-0.5 w-full bg-transparent text-[14px] font-semibold outline-none placeholder:font-normal placeholder:text-ink/35" aria-label="Destination" />
                  </label>
                  <button type="submit" className="col-span-2 mt-2 flex items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3.5 font-display text-[16px] font-semibold text-white transition hover:bg-flame-2 md:col-span-1 md:mt-0">
                    <Search size={18} strokeWidth={2.5} /> Search
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-ink/10 px-2 pt-2">
                  {(['', 'rail', 'road', 'ship', 'air'] as const).map((m) => {
                    const active = mode === m;
                    const Icon = m === '' ? PackageCheck : MODE_META[m].icon;
                    return (
                      <button key={m || 'all'} type="button" onClick={() => setMode(m as TransportMode | '')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition ${active ? 'bg-ink text-paper' : 'text-ink/65 hover:bg-ink/5'}`}>
                        <Icon size={13} />{m === '' ? 'All modes' : MODE_META[m].label}
                      </button>
                    );
                  })}
                  <span className="ml-auto hidden items-center gap-1.5 font-mono text-[10px] text-ink/45 md:flex">
                    <ShieldCheck size={11} className="text-leaf" /> Escrow · insured · GST-invoiced
                  </span>
                </div>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-paper/70">
                <span className="text-paper/50">Popular:</span>
                {quickRoutes.map((r) => (
                  <button key={r.o + r.d} onClick={() => navigate(`/search?origin=${r.o}&destination=${r.d}`)}
                    className="rounded-full border border-paper/20 px-2.5 py-1 font-medium transition hover:border-flame hover:text-flame">
                    {r.o} → {r.d}
                  </button>
                ))}
              </div>
            </div>

            {/* live availability card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-paper/15 bg-ink-2/80 p-4 shadow-2xl backdrop-blur-md dark-scroll">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-paper/60">
                    <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" /> Live capacity feed
                  </p>
                  <span className="font-mono text-[10px] text-paper/40">socket.io · real-time</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {featured.map((c) => (
                    <button key={c.id} onClick={() => navigate(`/search?origin=${c.originCode}`)}
                      className="block w-full rounded-xl border border-paper/10 bg-paper/[0.06] p-3 text-left transition hover:border-flame/50 hover:bg-paper/10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <ModeBadge mode={c.mode} size="sm" />
                          <span className="truncate text-[12px] font-semibold text-paper">{c.originCode} → {c.destinationCode}</span>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] font-semibold text-gold">{inr(c.ratePerUnit)}/{c.unit}</span>
                      </div>
                      <div className="mt-2">
                        <CapacityBar total={c.totalCapacity} booked={c.bookedCapacity} unit={c.unit} />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-paper/10 pt-3 text-center">
                  <div><p className="font-mono text-lg font-semibold text-paper">{counters.capacity.toLocaleString('en-IN')}</p><p className="text-[9.5px] uppercase tracking-wide text-paper/50">MT open space</p></div>
                  <div className="border-x border-paper/10"><p className="font-mono text-lg font-semibold text-paper">{counters.lsps}</p><p className="text-[9.5px] uppercase tracking-wide text-paper/50">Verified LSPs</p></div>
                  <div><p className="font-mono text-lg font-semibold text-paper">{counters.cities}</p><p className="text-[9.5px] uppercase tracking-wide text-paper/50">Cities served</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* trust ribbon */}
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-paper/10 pt-5 text-[11px] font-semibold text-paper/55">
            <span className="uppercase tracking-widest text-paper/35">Trusted by 9,400+ businesses ·</span>
            {['Sharma Exports', 'Mehta Agro Foods', 'Malabar Spices', 'Deccan Rail Freight', 'Coastal Shipping Co'].map((n) => (
              <span key={n} className="font-display text-[13px] text-paper/70">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ HOW IT WORKS ════════════════ */}
      <section className="ruled bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">How it works</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Three steps from cargo<br />to confirmed space.</h2>
            </div>
            <p className="max-w-xs text-[12.5px] leading-relaxed text-ink/60">Every booking passes through the same battle-tested pipeline our backend runs in production — Redis lock, escrow payment, atomic capacity commit.</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { n: '01', title: 'Search live spare space', body: 'Filter 1,200+ open listings by route, mode, date and cargo class. Capacity bars update in real time over WebSockets as other traders book.', icon: Search, tint: '#0E6BA8' },
              { n: '02', title: 'Lock it for 10 minutes', body: 'Hit “Book Now” and we atomically reserve your quantity with a Redis SETNX lock (TTL 10 min). Nobody else can take your space while you pay.', icon: ShieldCheck, tint: '#B4530A' },
              { n: '03', title: 'Pay escrow · get invoiced', body: 'Razorpay/Cashfree checkout in sandbox today. Payment succeeds → capacity is committed in PostgreSQL, your e-invoice (GST) is generated instantly.', icon: IndianRupee, tint: '#217A4B' },
            ].map((s) => (
              <div key={s.n} className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <span className="absolute -right-2 -top-4 font-display text-[84px] font-bold leading-none text-ink/[0.06] transition group-hover:text-flame/10">{s.n}</span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${s.tint}1a`, color: s.tint }}>
                  <s.icon size={22} strokeWidth={2.2} />
                </div>
                <h3 className="mt-4 font-display text-[19px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/65">{s.body}</p>
                <div className="mt-4 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                  {s.n === '01' ? <><span>GET /api/containers/search</span><ChevronRight size={11} /></> : s.n === '02' ? <><span>Redis SETNX · lock:container:id</span><ChevronRight size={11} /></> : <><span>POST /api/bookings/:id/confirm</span><ChevronRight size={11} /></>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ MODE TILES ════════════════ */}
      <section className="bg-ink py-14 text-paper">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Every mode. <span className="italic text-flame">One marketplace.</span></h2>
            <button onClick={() => navigate('/search')} className="flex items-center gap-1 text-[12px] font-bold text-flame hover:underline">All listings <ArrowRight size={14} /></button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(Object.keys(MODE_META) as TransportMode[]).map((m) => {
              const meta = MODE_META[m];
              const Icon = meta.icon;
              const open = containers.filter((c) => c.mode === m).reduce((sum, c) => sum + (c.totalCapacity - c.bookedCapacity), 0);
              return (
                <button key={m} onClick={() => navigate(`/search?mode=${m}`)}
                  className="group relative h-44 overflow-hidden rounded-2xl text-left md:h-56">
                  <img src={meta.img} alt={`${meta.label} freight`} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/35 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <Icon size={22} className="text-flame transition group-hover:-translate-y-1" />
                    <p className="mt-1.5 font-display text-xl font-semibold">{meta.label}</p>
                    <p className="font-mono text-[10.5px] text-paper/75">{Math.round(open).toLocaleString('en-IN')} {m === 'ship' ? 'TEU' : 'MT'} spare now</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════ MAP ════════════════ */}
      <section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">Corridor map</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Where the space is moving right now.</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-ink/65">Live origin–destination pairs from the marketplace, plotted on OpenStreetMap tiles. Click any route line to jump straight into search for that corridor.</p>
              <div className="mt-5 space-y-2">
                {quickRoutes.map((r) => (
                  <button key={r.o + r.d} onClick={() => navigate(`/search?origin=${r.o}&destination=${r.d}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink transition hover:border-flame hover:text-flame-2">
                    {r.o} <ArrowRight size={14} /> {r.d}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-8">
              <MapView containers={containers} height={380} interactive onRouteClick={(o, d) => navigate(`/search?origin=${o}&destination=${d}`)} />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ SAVINGS + TESTIMONIALS ════════════════ */}
      <section className="border-t border-ink/10 bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">Why traders switch</p>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-ink">Spare capacity pricing that changes your P&L.</h2>
              <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink/50">Sample · 40 MT Basmati, GIM→LDH</p>
                <div className="mt-3 space-y-2 text-[13px]">
                  <div className="flex items-center justify-between text-ink/65"><span>Full charter (spot truck)</span><span className="font-mono line-through">₹2,100 / MT</span></div>
                  <div className="flex items-center justify-between text-ink/65"><span>Aggregator quote</span><span className="font-mono">₹1,780 / MT</span></div>
                  <div className="flex items-center justify-between rounded-lg bg-leaf/10 px-3 py-2 font-bold text-leaf-2"><span>CargoShare spare capacity</span><span className="font-mono">₹1,450 / MT</span></div>
                  <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-[14px] font-bold text-ink"><span>You save, per booking</span><span className="font-mono text-leaf-2">₹26,000 (31%)</span></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-2xl border border-ink/10 bg-ink p-8 text-paper">
                <Quote size={90} className="absolute -left-3 -top-3 text-flame/20" fill="currentColor" />
                <Stars rating={TESTIMONIALS[testimonial].rating} size={16} />
                <blockquote className="relative mt-4 font-display text-[21px] font-medium leading-snug md:text-[24px]">“{TESTIMONIALS[testimonial].quote}”</blockquote>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">{TESTIMONIALS[testimonial].name}</p>
                    <p className="text-[12px] text-paper/60">{TESTIMONIALS[testimonial].role}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => setTestimonial((v) => (v + TESTIMONIALS.length - 1) % TESTIMONIALS.length)} className="rounded-full border border-paper/20 p-2 transition hover:bg-paper/10" aria-label="Previous testimonial"><ChevronLeft size={16} /></button>
                    <button onClick={() => setTestimonial((v) => (v + 1) % TESTIMONIALS.length)} className="rounded-full border border-paper/20 p-2 transition hover:bg-paper/10" aria-label="Next testimonial"><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="mt-5 flex gap-1.5">
                  {TESTIMONIALS.map((_, i) => <button key={i} onClick={() => setTestimonial(i)} aria-label={`Testimonial ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === testimonial ? 'w-8 bg-flame' : 'w-2.5 bg-paper/25'}`} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ CTA BAND ════════════════ */}
      <section className="relative overflow-hidden bg-flame">
        <div className="dot-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-12 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">Got empty space? Start earning today.</h2>
            <p className="mt-1.5 max-w-md text-[13.5px] font-medium text-white/90">LSPs list spare capacity for free. Traders pay only when they book. 2.5% platform fee — nothing else.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => navigate('/login?tab=lsp')} className="rounded-xl bg-ink px-6 py-3.5 font-display text-[16px] font-semibold text-paper shadow-lg transition hover:bg-ink-2">List as LSP — free</button>
            <button onClick={() => navigate('/search')} className="rounded-xl border-2 border-white/80 px-6 py-3.5 font-display text-[16px] font-semibold text-white transition hover:bg-white hover:text-flame-2">Find capacity now</button>
          </div>
        </div>
      </section>

      {/* ════════════════ ESG STRIP ════════════════ */}
      <section className="bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-8 text-[12px] font-semibold text-ink/60">
          <span className="flex items-center gap-2"><Leaf size={16} className="text-leaf" /> 1.1 lakh MT·km of empty running avoided in 2025</span>
          <span className="flex items-center gap-2"><FileText size={16} className="text-flame-2" /> Every booking: GST e-invoice + e-way bill ready</span>
          <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-leaf" /> ₹6.2 Cr disbursed to LSP partners, zero payment defaults</span>
        </div>
      </section>
    </div>
  );
}
