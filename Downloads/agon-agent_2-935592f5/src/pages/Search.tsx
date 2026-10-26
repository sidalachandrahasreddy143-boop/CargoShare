import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, ArrowRight, ArrowUpDown, Star, ShieldCheck,
  CalendarDays, Package, IndianRupee, CheckCircle2, Lock, Map as MapIcon,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { CapacityBar, MODE_META, ModeBadge, Stars, inr, shortDate, Modal } from '../components/ui';
import MapView from '../components/MapView';
import type { Container, TransportMode } from '../lib/types';

const SORTS = [
  { key: 'departure', label: 'Soonest departure' },
  { key: 'rate', label: 'Lowest rate' },
  { key: 'availability', label: 'Most space free' },
  { key: 'rating', label: 'Best LSP rating' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];

export default function SearchPage() {
  const { searchContainers, liveCapacity, containers } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [origin, setOrigin] = useState(params.get('origin') || '');
  const [destination, setDestination] = useState(params.get('destination') || '');
  const [mode, setMode] = useState(params.get('mode') || '');
  const [date, setDate] = useState(params.get('date') || '');
  const [minSpace, setMinSpace] = useState(Number(params.get('minSpace') || 0));
  const [cargo, setCargo] = useState(params.get('cargo') || '');
  const [sort, setSort] = useState<SortKey>('departure');
  const [selected, setSelected] = useState<Container | null>(null);
  const [qty, setQty] = useState(1);
  const [showMapMobile, setShowMapMobile] = useState(false);

  const results = useMemo(
    () => searchContainers({ origin, destination, mode, date, minSpace: minSpace || undefined, cargo: cargo || undefined }),
    [searchContainers, origin, destination, mode, date, minSpace, cargo],
  );

  const sorted = useMemo(() => {
    const arr = [...results];
    switch (sort) {
      case 'rate': return arr.sort((a, b) => a.ratePerUnit - b.ratePerUnit);
      case 'availability': return arr.sort((a, b) => (b.totalCapacity - b.bookedCapacity) - (a.totalCapacity - a.bookedCapacity));
      case 'rating': return arr.sort((a, b) => b.lspRating - a.lspRating);
      default: return arr.sort((a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
    }
  }, [results, sort]);

  // sync URL <-> filters (shareable searches)
  useEffect(() => {
    const p = new URLSearchParams();
    if (origin) p.set('origin', origin);
    if (destination) p.set('destination', destination);
    if (mode) p.set('mode', mode);
    if (date) p.set('date', date);
    if (minSpace) p.set('minSpace', String(minSpace));
    if (cargo) p.set('cargo', cargo);
    setParams(p, { replace: true });
  }, [origin, destination, mode, date, minSpace, cargo, setParams]);

  useEffect(() => {
    if (selected) {
      const c = containers.find((x) => x.id === selected.id);
      setQty(Math.max(c?.minBookingQty ?? 1, Math.min(qty, c ? c.totalCapacity - c.bookedCapacity - (liveCapacity[c.id] || 0) : 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const activeFilters = [origin, destination, mode, date, cargo].filter(Boolean).length + (minSpace ? 1 : 0);
  const clearAll = () => { setOrigin(''); setDestination(''); setMode(''); setDate(''); setMinSpace(0); setCargo(''); };

  const liveSelected = selected ? containers.find((c) => c.id === selected.id) ?? selected : null;
  const availLive = liveSelected ? Math.max(0, liveSelected.totalCapacity - liveSelected.bookedCapacity - (liveCapacity[liveSelected.id] || 0)) : 0;
  const totalPrice = liveSelected ? Math.round(liveSelected.ratePerUnit * qty) : 0;
  const fee = Math.round(totalPrice * 0.025);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* ════ filter bar ════ */}
      <div className="rounded-2xl border border-ink/10 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-12">
          <label className="relative md:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/45">From</span>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="City or code" aria-label="Origin"
              className="w-full rounded-xl border border-ink/10 bg-paper-2/60 pb-1.5 pl-3 pr-2 pt-5 text-[13px] font-semibold outline-none focus:border-flame" />
          </label>
          <label className="relative md:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/45">To</span>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City or code" aria-label="Destination"
              className="w-full rounded-xl border border-ink/10 bg-paper-2/60 pb-1.5 pl-3 pr-2 pt-5 text-[13px] font-semibold outline-none focus:border-flame" />
          </label>
          <label className="relative md:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/45">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Departure date"
              className="w-full rounded-xl border border-ink/10 bg-paper-2/60 pb-1.5 pl-3 pr-2 pt-5 text-[13px] font-semibold outline-none focus:border-flame" />
          </label>
          <label className="relative md:col-span-1">
            <span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/45">Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Mode"
              className="w-full appearance-none rounded-xl border border-ink/10 bg-paper-2/60 pb-1.5 pl-3 pr-2 pt-5 text-[13px] font-semibold outline-none focus:border-flame">
              <option value="">All</option>
              <option value="rail">Rail</option><option value="road">Road</option><option value="ship">Ship</option><option value="air">Air</option>
            </select>
          </label>
          <label className="relative md:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/45">Min space (MT/TEU)</span>
            <input type="number" min={0} value={minSpace || ''} onChange={(e) => setMinSpace(Number(e.target.value) || 0)} placeholder="Any" aria-label="Minimum space"
              className="w-full rounded-xl border border-ink/10 bg-paper-2/60 pb-1.5 pl-3 pr-2 pt-5 text-[13px] font-semibold outline-none focus:border-flame" />
          </label>
          <label className="relative md:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/45">Cargo</span>
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="FMCG, pharma…" aria-label="Cargo type"
              className="w-full rounded-xl border border-ink/10 bg-paper-2/60 pb-1.5 pl-3 pr-2 pt-5 text-[13px] font-semibold outline-none focus:border-flame" />
          </label>
          <div className="flex gap-2 md:col-span-1">
            <button onClick={clearAll} disabled={!activeFilters} title="Clear filters"
              className="flex flex-1 items-center justify-center rounded-xl border border-ink/10 text-ink/60 transition hover:bg-ink/5 disabled:opacity-30"><X size={17} /></button>
          </div>
        </div>
      </div>

      {/* ════ results header ════ */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {sorted.length} spare-capacity {sorted.length === 1 ? 'listing' : 'listings'}
            {activeFilters > 0 && <span className="ml-2 rounded-full bg-flame/10 px-2 py-0.5 align-middle font-sans text-[11px] font-bold text-flame-2">{activeFilters} filter{activeFilters > 1 ? 's' : ''}</span>}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-ink/55"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" /> Capacity updates live — booked by other traders in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMapMobile((v) => !v)} className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-[12px] font-semibold lg:hidden"><MapIcon size={15} /> Map</button>
          <div className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white py-2 pl-3 pr-2 text-[12px] font-semibold text-ink/75">
            <ArrowUpDown size={13} className="text-ink/45" />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="bg-transparent outline-none" aria-label="Sort results">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* ════ results list ════ */}
        <div className="space-y-3 lg:col-span-7 xl:col-span-8">
          {sorted.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/20 bg-white py-16 text-center">
              <Search size={34} className="mx-auto text-ink/25" strokeWidth={1.5} />
              <p className="mt-3 font-display text-lg font-semibold text-ink/80">No space matches those filters</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-ink/55">Try widening the date range, clearing the cargo filter, or reducing the minimum space.</p>
              <button onClick={clearAll} className="mt-4 rounded-xl bg-ink px-5 py-2.5 text-[13px] font-bold text-paper">Clear all filters</button>
            </div>
          )}
          {sorted.map((c) => {
            const live = c.totalCapacity - c.bookedCapacity - (liveCapacity[c.id] || 0);
            const pct = (c.bookedCapacity / c.totalCapacity) * 100;
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className="group block w-full overflow-hidden rounded-2xl border border-ink/10 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-flame/50 hover:shadow-xl">
                <div className="grid sm:grid-cols-[118px_1fr_auto]">
                  {/* mode image strip */}
                  <div className="relative hidden min-h-[150px] sm:block">
                    <img src={MODE_META[c.mode].img} alt={c.mode} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-ink/10 to-ink/55" />
                    <span className="absolute bottom-2 left-2"><ModeBadge mode={c.mode} size="sm" /></span>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-mono text-[13px] font-bold tracking-tight text-ink">{c.containerRef}</p>
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-ink/55"><ShieldCheck size={11} className="text-leaf" />{c.lspCompany} · <Stars rating={c.lspRating} size={10} /> {c.lspRating} ({c.lspReviews})</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[15px] font-bold text-ink">
                      {c.origin} <ArrowRight size={15} className="text-flame" /> {c.destination}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-ink/60">
                      <span className="flex items-center gap-1"><CalendarDays size={11} /> Departs {shortDate(c.departure)}</span>
                      <span className="flex items-center gap-1"><Package size={11} /> Arrives {shortDate(c.arrival)}</span>
                    </p>
                    <div className="mt-2.5 max-w-sm">
                      <CapacityBar total={c.totalCapacity} booked={c.bookedCapacity + (liveCapacity[c.id] || 0)} unit={c.unit} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.cargoTypes.slice(0, 4).map((t) => <span key={t} className="rounded bg-paper-2 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink/55">{t}</span>)}
                    </div>
                  </div>
                  <div className="flex min-w-[118px] flex-col items-end justify-between border-t border-ink/8 bg-paper-2/40 p-4 sm:border-l sm:border-t-0">
                    <div className="text-right">
                      <p className="font-mono text-[19px] font-semibold leading-none text-ink">{inr(c.ratePerUnit)}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/50">per {c.unit}</p>
                      <p className={`mt-1.5 font-mono text-[10.5px] font-bold ${pct >= 80 ? 'text-flame-2' : 'text-leaf-2'}`}>{live} {c.unit} FREE</p>
                    </div>
                    <span className="mt-2 rounded-lg bg-flame px-4 py-2 text-[12px] font-bold text-white transition group-hover:bg-flame-2">Book now</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ════ map panel ════ */}
        <aside className={`lg:col-span-5 xl:col-span-4 ${showMapMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="sticky top-24">
            <MapView containers={sorted} height={430} selectedId={liveSelected?.id} onRouteClick={(o, d) => { setOrigin(o); setDestination(d); }} />
            <div className="mt-3 flex items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-[10.5px] font-semibold text-ink/55">
              <span className="flex items-center gap-1.5"><SlidersHorizontal size={12} /> Click a route to filter corridor</span>
              <span className="font-mono">OpenStreetMap · Leaflet</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══════════════ DETAIL + BOOKING MODAL ═══════════════ */}
      <Modal open={!!selected} onClose={() => setSelected(null)} size="xl" label="Container details and booking">
        {liveSelected && (
          <div className="grid overflow-y-auto md:grid-cols-2">
            {/* left: detail */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <ModeBadge mode={liveSelected.mode} />
                <span className="font-mono text-[11px] font-bold text-ink/50">{liveSelected.containerRef}</span>
              </div>
              <h2 className="mt-3 font-display text-[26px] font-semibold leading-tight text-ink">{liveSelected.origin} <ArrowRight className="inline" size={20} /> {liveSelected.destination}</h2>
              <p className="mt-1 text-[12px] font-medium text-ink/60">Departs <strong className="text-ink">{shortDate(liveSelected.departure)}</strong> · Arrives {shortDate(liveSelected.arrival)} · Cutoff {shortDate(liveSelected.cutoff)}</p>

              <div className="mt-4 rounded-xl border border-ink/10 bg-paper-2/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink/55">Live availability</p>
                  <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-1.5 font-mono text-3xl font-semibold text-ink">{availLive} <span className="text-base text-ink/50">/ {liveSelected.totalCapacity} {liveSelected.unit} free</span></p>
                <div className="mt-2"><CapacityBar total={liveSelected.totalCapacity} booked={liveSelected.bookedCapacity + (liveCapacity[liveSelected.id] || 0)} unit={liveSelected.unit} showLabel={false} /></div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-xl border border-ink/10 p-3">
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink/50">Provider</p>
                  <p className="mt-0.5 font-bold text-ink">{liveSelected.lspCompany}</p>
                  <Stars rating={liveSelected.lspRating} size={11} /> <span className="text-[10px] text-ink/55">{liveSelected.lspRating} · {liveSelected.lspReviews} reviews</span>
                </div>
                <div className="rounded-xl border border-ink/10 p-3">
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink/50">LSP data quality</p>
                  <p className="mt-0.5 font-mono text-[19px] font-semibold text-ink">{liveSelected.lspQuality}<span className="text-xs text-ink/45">/100</span></p>
                  <p className="text-[10px] text-ink/55">Admin-verified listing accuracy</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink/50">Accepted cargo</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{liveSelected.cargoTypes.map((t) => <span key={t} className="rounded-md bg-ink/[0.06] px-2 py-1 text-[10.5px] font-semibold text-ink/70">{t}</span>)}</div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10.5px] font-semibold text-ink/55">
                <ShieldCheck size={13} className="text-leaf" /> KYC-verified LSP · GST invoice · Razorpay escrow · Transit insured up to ₹25L
              </div>
            </div>

            {/* right: booking panel */}
            <div className="flex flex-col border-t border-ink/10 bg-ink p-6 text-paper md:border-l md:border-t-0">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-paper/60"><Lock size={12} /> Reserve space</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <label htmlFor="qty" className="text-[10px] font-bold uppercase tracking-widest text-paper/55">Quantity ({liveSelected.unit})</label>
                  <div className="mt-1 flex items-center rounded-xl border border-paper/20 bg-paper/5">
                    <button onClick={() => setQty((v) => Math.max(liveSelected.minBookingQty, v - liveSelected.minBookingQty))} className="px-4 py-3 text-lg font-bold text-paper/70 hover:text-paper" aria-label="Decrease">−</button>
                    <input id="qty" type="number" value={qty} min={liveSelected.minBookingQty} max={availLive}
                      onChange={(e) => setQty(Math.max(liveSelected.minBookingQty, Math.min(availLive, Number(e.target.value) || liveSelected.minBookingQty)))}
                      className="w-20 bg-transparent text-center font-mono text-2xl font-semibold outline-none" />
                    <button onClick={() => setQty((v) => Math.min(availLive, v + liveSelected.minBookingQty))} className="px-4 py-3 text-lg font-bold text-paper/70 hover:text-paper" aria-label="Increase">+</button>
                  </div>
                  <p className="mt-1 text-[9.5px] text-paper/45">Min {liveSelected.minBookingQty} {liveSelected.unit} · step {liveSelected.minBookingQty}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-paper/55">Rate</p>
                  <p className="mt-1 font-mono text-[19px] font-semibold text-gold">{inr(liveSelected.ratePerUnit)}</p>
                  <p className="text-[9.5px] text-paper/45">per {liveSelected.unit}</p>
                </div>
              </div>

              <div className="mt-5 space-y-1.5 border-t border-paper/15 pt-4 text-[12.5px]">
                <div className="flex justify-between text-paper/75"><span>Freight ({qty} × {inr(liveSelected.ratePerUnit)})</span><span className="font-mono">{inr(totalPrice)}</span></div>
                <div className="flex justify-between text-paper/75"><span>Platform fee (2.5%)</span><span className="font-mono">{inr(fee)}</span></div>
                <div className="flex justify-between border-t border-paper/15 pt-1.5 text-[15px] font-bold"><span>Total payable</span><span className="font-mono text-gold">{inr(totalPrice + fee)}</span></div>
              </div>

              <button onClick={() => navigate(`/checkout/${liveSelected.id}?qty=${qty}`)}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-flame px-6 py-4 font-display text-[18px] font-semibold text-white shadow-lg transition hover:bg-flame-2">
                Book Now — {inr(totalPrice + fee)} <ArrowRight size={19} />
              </button>
              <p className="mt-2 text-center text-[10px] leading-relaxed text-paper/50">Next: 10-minute Redis lock → Razorpay sandbox checkout → instant GST e-invoice.<br />Free cancellation until payment. Lock auto-expires, no charge.</p>

              <div className="mt-auto hidden items-center gap-2 pt-4 text-[9.5px] font-mono uppercase tracking-wider text-paper/35 md:flex">
                <CheckCircle2 size={12} className="text-emerald-400" /> Lock: SETNX lock:container:{liveSelected.id.slice(0, 8)}… · TTL 600s
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
