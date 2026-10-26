import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Save, Train, Truck, Ship, Plane, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import type { TransportMode } from '../lib/types';

const CARGO = ['Agri', 'FMCG', 'Pharma', 'Electronics', 'Textiles', 'Chemicals', 'Auto Parts', 'Industrial Goods'];

const MODE_DEFAULTS: Record<TransportMode, { unit: string; cap: number; rate: number }> = {
  rail: { unit: 'MT', cap: 1000, rate: 1450 },
  road: { unit: 'MT', cap: 22, rate: 8800 },
  ship: { unit: 'TEU', cap: 500, rate: 60000 },
  air: { unit: 'MT', cap: 15, rate: 85000 },
};

// A few well-known Indian corridor endpoints for sensible lat/lng
const HUBS: Record<string, { lat: number; lng: number; code: string }> = {
  'Delhi NCR': { lat: 28.61, lng: 77.20, code: 'IN-DEL' },
  'Mumbai': { lat: 19.07, lng: 72.87, code: 'IN-BOM' },
  'Ahmedabad': { lat: 23.02, lng: 72.57, code: 'IN-AMD' },
  'Chennai (INMAA)': { lat: 13.08, lng: 80.29, code: 'INMAA' },
  'Gandhidham (ICD)': { lat: 23.08, lng: 70.13, code: 'IN-GIM' },
  'Ludhiana (ICD)': { lat: 30.90, lng: 75.86, code: 'IN-LDH' },
  'Secunderabad': { lat: 17.43, lng: 78.50, code: 'IN-SC' },
  'Mundra (INMUN)': { lat: 22.74, lng: 69.71, code: 'INMUN' },
  'Colombo (LKCMB)': { lat: 6.93, lng: 79.84, code: 'LKCMB' },
  'Bengaluru': { lat: 13.19, lng: 77.70, code: 'IN-BLR' },
  'Kolkata': { lat: 22.57, lng: 88.36, code: 'IN-CCU' },
  'Hyderabad': { lat: 17.38, lng: 78.48, code: 'IN-HYD' },
};

export default function LspContainerForm() {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { containers, upsertContainer, user } = useStore();
  const editing = !!containerId;
  const existing = editing ? containers.find((c) => c.id === containerId) : undefined;

  const [mode, setMode] = useState<TransportMode>(existing?.mode ?? 'road');
  const [containerRef, setContainerRef] = useState(existing?.containerRef ?? '');
  const [origin, setOrigin] = useState(existing?.origin ?? 'Delhi NCR');
  const [destination, setDestination] = useState(existing?.destination ?? 'Mumbai');
  const [departure, setDeparture] = useState(existing ? existing.departure.slice(0, 16) : defaultDateTime(4));
  const [arrival, setArrival] = useState(existing ? existing.arrival.slice(0, 16) : defaultDateTime(6));
  const [cutoff, setCutoff] = useState(existing ? existing.cutoff.slice(0, 16) : defaultDateTime(3));
  const [totalCapacity, setTotalCapacity] = useState(existing?.totalCapacity ?? MODE_DEFAULTS[existing?.mode ?? 'road'].cap);
  const [unit, setUnit] = useState(existing?.unit ?? MODE_DEFAULTS[existing?.mode ?? 'road'].unit);
  const [ratePerUnit, setRatePerUnit] = useState(existing?.ratePerUnit ?? MODE_DEFAULTS[existing?.mode ?? 'road'].rate);
  const [minBookingQty, setMinBookingQty] = useState(existing?.minBookingQty ?? 1);
  const [cargoTypes, setCargoTypes] = useState<string[]>(existing?.cargoTypes ?? ['FMCG']);
  const [error, setError] = useState('');

  function defaultDateTime(daysAhead: number) {
    const d = new Date(Date.now() + daysAhead * 86400_000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  useEffect(() => {
    if (!editing) {
      const def = MODE_DEFAULTS[mode];
      setUnit(def.unit); setTotalCapacity(def.cap); setRatePerUnit(def.rate);
      setMinBookingQty(mode === 'rail' ? 10 : 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const toggleCargo = (c: string) => setCargoTypes((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!containerRef.trim()) return setError('Container/wagon reference is required (e.g. SR-TRI-4490).');
    if (origin === destination) return setError('Origin and destination must differ.');
    if (new Date(departure) <= new Date()) return setError('Departure must be in the future.');
    if (totalCapacity <= 0 || ratePerUnit <= 0) return setError('Capacity and rate must be positive.');
    const payload = {
      id: existing?.id,
      containerRef: containerRef.trim().toUpperCase(),
      mode, origin, destination,
      originCode: HUBS[origin]?.code ?? origin.slice(0, 6).toUpperCase(),
      destinationCode: HUBS[destination]?.code ?? destination.slice(0, 6).toUpperCase(),
      originLat: HUBS[origin]?.lat, originLng: HUBS[origin]?.lng,
      destinationLat: HUBS[destination]?.lat, destinationLng: HUBS[destination]?.lng,
      departure: new Date(departure).toISOString(),
      arrival: new Date(arrival).toISOString(),
      cutoff: new Date(cutoff).toISOString(),
      totalCapacity, unit, ratePerUnit, minBookingQty, cargoTypes,
    };
    upsertContainer(existing ? payload : payload);
    navigate('/lsp');
  };

  const MODES: { key: TransportMode; icon: typeof Train; label: string }[] = [
    { key: 'rail', icon: Train, label: 'Rail' }, { key: 'road', icon: Truck, label: 'Road' },
    { key: 'ship', icon: Ship, label: 'Ship' }, { key: 'air', icon: Plane, label: 'Air' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/lsp" className="flex w-fit items-center gap-1.5 text-[12.5px] font-semibold text-ink/60 hover:text-ink"><ChevronLeft size={15} /> Back to console</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">{editing ? 'Edit listing' : 'List spare capacity'}</h1>
      <p className="mt-0.5 text-[12.5px] text-ink/55">{user?.company} · listings are visible to 9,400+ verified traders instantly after save.</p>

      <form onSubmit={submit} className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        {/* mode picker */}
        <div className="border-b border-ink/8 bg-paper-2/40 p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Mode of transport</span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {MODES.map(({ key, icon: Icon, label }) => (
              <button key={key} type="button" onClick={() => setMode(key)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition ${mode === key ? 'border-flame bg-flame/5 text-flame-2' : 'border-ink/10 text-ink/60 hover:border-ink/25'}`}>
                <Icon size={21} /><span className="text-[11.5px] font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Container / wagon / vehicle reference *</span>
            <input value={containerRef} onChange={(e) => setContainerRef(e.target.value)} placeholder="e.g. SR-TRI-4490" className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[13px] font-semibold uppercase outline-none focus:border-flame" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Origin</span>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-flame">
              {Object.keys(HUBS).map((h) => <option key={h}>{h}</option>)}
            </select>
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Destination</span>
            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-flame">
              {Object.keys(HUBS).map((h) => <option key={h}>{h}</option>)}
            </select>
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Departure</span>
            <input type="datetime-local" value={departure} onChange={(e) => setDeparture(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[12px] outline-none focus:border-flame" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Arrival (est.)</span>
            <input type="datetime-local" value={arrival} onChange={(e) => setArrival(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[12px] outline-none focus:border-flame" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Booking cutoff</span>
            <input type="datetime-local" value={cutoff} onChange={(e) => setCutoff(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[12px] outline-none focus:border-flame" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Total capacity</span>
              <input type="number" min={1} value={totalCapacity} onChange={(e) => setTotalCapacity(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[13px] font-semibold outline-none focus:border-flame" />
            </label>
            <label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Unit</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-flame">
                {['MT', 'CBM', 'TEU', 'Pallets'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Rate per {unit} (₹)</span>
            <input type="number" min={0} value={ratePerUnit} onChange={(e) => setRatePerUnit(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[13px] font-semibold outline-none focus:border-flame" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Min booking qty</span>
            <input type="number" min={1} value={minBookingQty} onChange={(e) => setMinBookingQty(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[13px] font-semibold outline-none focus:border-flame" />
          </label>
          <div className="sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Accepted cargo</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CARGO.map((c) => (
                <button key={c} type="button" onClick={() => toggleCargo(c)}
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${cargoTypes.includes(c) ? 'border-flame bg-flame/10 text-flame-2' : 'border-ink/12 text-ink/60 hover:border-ink/30'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-700">{error}</p>}

          <div className="flex items-start gap-2 rounded-xl bg-paper-2/60 p-3 text-[10.5px] leading-relaxed text-ink/60 sm:col-span-2">
            <Info size={14} className="mt-0.5 shrink-0 text-flame-2" />
            Traders see this listing with live capacity. When a trader pays, your dashboard updates over WebSocket instantly — no refresh needed. Payout settles T+1 minus 2.5% platform fee.
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-6 py-4 font-display text-[16px] font-semibold text-paper transition hover:bg-ink-2"><Save size={18} /> {editing ? 'Save changes' : 'Publish listing'}</button>
            <Link to="/lsp" className="rounded-xl border border-ink/15 px-6 py-4 text-center font-bold text-ink">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
