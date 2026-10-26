import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Lock, ShieldCheck, ChevronLeft, Timer, CheckCircle2, XCircle, Loader2,
  CreditCard, Smartphone, Building2, Wallet, FileText, Printer, PackageCheck,
  ArrowRight, CircleAlert, IndianRupee, Sparkles,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { CapacityBar, ModeBadge, inr, Modal } from '../components/ui';

type Phase = 'fill' | 'paying' | 'success' | 'failed';

const CARGO_OPTIONS = ['Agri — Grains & Pulses', 'Agri — Fruits & Vegetables', 'FMCG', 'Pharma', 'Electronics', 'Textiles & Garments', 'Chemicals (non-haz)', 'Auto Parts', 'Industrial Goods', 'Other'];

export default function Checkout() {
  const { containerId } = useParams<{ containerId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const {
    containers, user, acquireLock, releaseLock, createPendingBooking, updateBookingCargo, confirmBooking, failPayment, liveCapacity, notify,
  } = useStore();

  const qty = Math.max(1, Number(params.get('qty') || 1));
  const container = containers.find((c) => c.id === containerId);

  const [phase, setPhase] = useState<Phase>('fill');
  const [lock, setLock] = useState<{ lockId: string; expiresAt: number } | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const lockAcquired = useRef(false);

  // cargo form
  const [commodity, setCommodity] = useState('Agri — Grains & Pulses');
  const [packages, setPackages] = useState(50);
  const [cargoWeight, setCargoWeight] = useState(qty);
  const [notes, setNotes] = useState('');

  // checkout modal
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [upiId, setUpiId] = useState('ananya@okhdfc');
  const [cardNo, setCardNo] = useState('4111 1111 1111 1111');
  const [cardName, setCardName] = useState('ANANYA SHARMA');
  const [cardExp, setCardExp] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('•••');
  const [bank, setBank] = useState('HDFC Bank');
  const [payStep, setPayStep] = useState<'idle' | 'processing' | 'authorized'>('idle');
  const [failMode, setFailMode] = useState(false);
  const [result, setResult] = useState<{ booking?: any; txnId?: string; invoiceNo?: string } | null>(null);

  // ════ ACQUIRE THE REDIS-STYLE LOCK ON MOUNT (SETNX) — once per page load ════
  useEffect(() => {
    if (!container || lock || phase !== 'fill' || lockAcquired.current) return;
    lockAcquired.current = true;
    const res = acquireLock(container.id, qty);
    if (!res.ok) { setLockError(res.error || 'Unable to lock space.'); return; }
    setLock({ lockId: res.lockId!, expiresAt: res.expiresAt! });
    // create the pending booking row now (mirrors server behavior: lock → INSERT payment_pending)
    const booking = createPendingBooking({
      containerId: container.id, qty,
      cargoDetails: { commodity, packages, weight: cargoWeight, notes },
      lockId: res.lockId!,
    });
    setBookingId(booking.id);
    // NOTE: cargo details are editable until payment; we re-create details at confirm time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container?.id]);

  // ════ COUNTDOWN TIMER (TTL) ════
  useEffect(() => {
    if (!lock) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((lock.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && phase === 'fill') {
        setLockError('Your 10-minute lock expired. The space was released back to the marketplace.');
        setPhase('failed');
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lock, phase]);

  const releaseAndExit = () => {
    if (lock) releaseLock(lock.lockId);
    navigate(-1);
  };

  const proceedToPay = () => {
    if (!user) { navigate(`/login?next=/checkout/${containerId}?qty=${qty}`); return; }
    if (bookingId) updateBookingCargo(bookingId, { commodity, packages, weight: cargoWeight, notes });
    setPayOpen(true);
    setPayStep('idle');
  };

  // ════ RAZORPAY-STYLE SANDBOX CHECKOUT ════
  const runPayment = async () => {
    setPayStep('processing');
    await new Promise((r) => setTimeout(r, 1600)); // "bank authorization"
    if (failMode) {
      setPayStep('idle');
      setPayOpen(false);
      if (bookingId) failPayment(bookingId);
      setPhase('failed');
      return;
    }
    setPayStep('authorized');
    await new Promise((r) => setTimeout(r, 800));
    const txnId = `pay_${Math.random().toString(36).slice(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const res = confirmBooking(bookingId!, { method: payMethod === 'upi' ? `UPI ${upiId}` : payMethod === 'card' ? `Card •••• ${cardNo.slice(-4)}` : payMethod === 'netbanking' ? `NetBanking — ${bank}` : 'Wallet', txnId });
    setPayOpen(false);
    if (res.ok) {
      setResult({ booking: res.booking, txnId, invoiceNo: (res as any).booking?.invoiceNo });
      setPhase('success');
    } else {
      setPhase('failed');
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const urgent = secondsLeft <= 60;

  // ══════ container missing ══════
  if (!container) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <CircleAlert size={40} className="mx-auto text-flame" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Listing not found</h1>
        <p className="mt-1 text-sm text-ink/60">This container may have been fully booked or delisted.</p>
        <Link to="/search" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 font-bold text-paper"><ChevronLeft size={16} /> Back to search</Link>
      </div>
    );
  }

  const total = Math.round(container.ratePerUnit * qty);
  const fee = Math.round(total * 0.025);
  const gst = Math.round((total + fee) * 0.18);
  const grand = total + fee + gst;

  // ══════ SUCCESS SCREEN ══════
  if (phase === 'success') {
    const booking = result?.booking;
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="overflow-hidden rounded-3xl border border-leaf/30 bg-white shadow-xl">
          <div className="bg-leaf px-8 py-8 text-center text-white">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20"><CheckCircle2 size={38} /></span>
            <h1 className="mt-4 font-display text-3xl font-semibold">Space secured. Chakka jammed.</h1>
            <p className="mt-1 text-[13px] text-white/85">Payment captured · capacity committed atomically · e-invoice generated</p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Booking ref', booking?.bookingRef],
                ['Payment txn', result?.txnId],
                ['Invoice no', result?.invoiceNo],
                ['Route', `${container.origin} → ${container.destination}`],
                ['Mode / container', `${container.mode.toUpperCase()} · ${container.containerRef}`],
                ['Departure', new Date(container.departure).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })],
                ['Quantity', `${qty} ${container.unit} of ${commodity}`],
                ['Grand total', `${inr(grand)} (incl. GST)`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-xl bg-paper-2/60 px-4 py-3">
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink/50">{k}</p>
                  <p className="mt-0.5 break-words font-mono text-[13px] font-semibold text-ink">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link to="/my-bookings" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 font-bold text-paper transition hover:bg-ink-2"><PackageCheck size={18} /> View booking & invoice</Link>
              <Link to="/search" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink/15 px-5 py-3.5 font-bold text-ink transition hover:bg-paper-2">Book more space <ArrowRight size={17} /></Link>
            </div>
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink/40">A confirmation SMS + email with the e-way bill is on its way</p>
          </div>
        </div>
      </div>
    );
  }

  // ══════ FAILED SCREEN ══════
  if (phase === 'failed') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50"><XCircle size={36} className="text-red-500" /></span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">{lockError ? 'Reservation lost' : 'Payment failed'}</h1>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink/65">
          {lockError ?? 'The bank declined the transaction. Your Redis lock has been released and the space is back on the market — you were not charged.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/search" className="rounded-xl bg-ink px-5 py-3 font-bold text-paper">Find another listing</Link>
          <button onClick={() => navigate(0)} className="rounded-xl border border-ink/15 px-5 py-3 font-bold text-ink">Retry</button>
        </div>
      </div>
    );
  }

  // ══════ MAIN CHECKOUT ══════
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button onClick={releaseAndExit} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink/60 hover:text-ink"><ChevronLeft size={15} /> Cancel and release space</button>

      <div className="mt-3 grid gap-5 lg:grid-cols-12">
        {/* ═══════ LEFT: cargo + summary ═══════ */}
        <div className="lg:col-span-7">
          {/* lock countdown banner */}
          <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${urgent ? 'border-red-300 bg-red-50' : 'border-gold/50 bg-[#fdf6dd]'}`}>
            <div className="flex items-center gap-2.5">
              <Lock size={17} className={urgent ? 'text-red-500' : 'text-[#8a6d0a]'} />
              <div>
                <p className="text-[12px] font-bold text-ink">Space locked — Redis SETNX · TTL 10 min</p>
                <p className="text-[10.5px] font-medium text-ink/60">Only you can book {qty} {container.unit} of {container.containerRef} right now</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 font-mono text-[26px] font-semibold tabular-nums ${urgent ? 'text-red-600' : 'text-[#8a6d0a]'}`}>
              <Timer size={19} />{mm}:{ss}
            </div>
          </div>

          {/* route card */}
          <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ModeBadge mode={container.mode} />
                <span className="font-mono text-[12px] font-bold text-ink/55">{container.containerRef}</span>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-leaf-2"><ShieldCheck size={13} /> Yield-managed rate</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div><p className="font-display text-xl font-semibold text-ink">{container.origin}</p><p className="text-[10.5px] text-ink/55">{new Date(container.departure).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
              <div className="relative flex-1 border-t-2 border-dashed border-ink/25"><span className="absolute -right-1.5 -top-[7px] h-3 w-3 rotate-45 border-r-2 border-t-2 border-ink/25" /></div>
              <div className="text-right"><p className="font-display text-xl font-semibold text-ink">{container.destination}</p><p className="text-[10.5px] text-ink/55">{new Date(container.arrival).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
            </div>
            <div className="mt-4"><CapacityBar total={container.totalCapacity} booked={container.bookedCapacity + (liveCapacity[container.id] || 0)} unit={container.unit} /></div>
          </div>

          {/* cargo details */}
          <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="font-display text-[17px] font-semibold text-ink">Cargo details</h2>
            <p className="text-[11px] text-ink/55">Used for the e-way bill and LSP manifest. All fields GST-compliant.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Commodity</span>
                <select value={commodity} onChange={(e) => setCommodity(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 bg-paper-2/50 px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-flame">
                  {CARGO_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Packages</span>
                <input type="number" min={1} value={packages} onChange={(e) => setPackages(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-ink/15 bg-paper-2/50 px-3 py-2.5 font-mono text-[13px] font-semibold outline-none focus:border-flame" />
              </label>
              <label>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Cargo weight (MT)</span>
                <input type="number" min={0} step={0.5} value={cargoWeight} onChange={(e) => setCargoWeight(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-ink/15 bg-paper-2/50 px-3 py-2.5 font-mono text-[13px] font-semibold outline-none focus:border-flame" />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Special instructions <em className="not-italic text-ink/35">(optional)</em></span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Keep dry · stack max 4 high · FRAGILE marking on 3 pallets" className="mt-1 w-full rounded-xl border border-ink/15 bg-paper-2/50 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-leaf/10 px-3 py-2 text-[11px] font-semibold text-leaf-2">
              <ShieldCheck size={13} /> Goods insured up to ₹25,00,000 under the platform transit policy at no extra cost.
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT: price summary ═══════ */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-ink/10 bg-ink text-paper shadow-xl">
            <div className="border-b border-paper/10 px-6 py-4">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-paper/60"><IndianRupee size={13} /> Order summary</p>
              <p className="mt-1 font-mono text-[11px] text-paper/45">Booking will be {bookingId ? `#${bookingId.slice(-6).toUpperCase()}` : 'pending'} · {qty} {container.unit} · {commodity.split(' — ')[0]}</p>
            </div>
            <div className="space-y-2.5 px-6 py-5 text-[13px]">
              <div className="flex justify-between text-paper/80"><span>Freight · {qty} {container.unit} × {inr(container.ratePerUnit)}</span><span className="font-mono">{inr(total)}</span></div>
              <div className="flex justify-between text-paper/80"><span>Platform fee (2.5%)</span><span className="font-mono">{inr(fee)}</span></div>
              <div className="flex justify-between text-paper/80"><span>GST @ 18% (HSN 9965)</span><span className="font-mono">{inr(gst)}</span></div>
              <div className="flex justify-between text-paper/80"><span>Transit insurance</span><span className="font-mono text-emerald-400">FREE</span></div>
              <div className="flex justify-between border-t border-paper/15 pt-3 text-[17px] font-bold"><span>Total payable</span><span className="font-mono text-gold">{inr(grand)}</span></div>
              <p className="text-right font-mono text-[10px] text-paper/45">You save ≈ {inr(qty * 650)} vs full-charter rates</p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={proceedToPay} className="flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-4 font-display text-[18px] font-semibold text-white transition hover:bg-flame-2">
                <Sparkles size={19} /> Pay {inr(grand)}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-semibold text-paper/50">
                <span className="flex items-center gap-1.5 rounded-lg border border-paper/10 px-2 py-1.5"><ShieldCheck size={11} className="text-emerald-400" /> Razorpay escrow</span>
                <span className="flex items-center gap-1.5 rounded-lg border border-paper/10 px-2 py-1.5"><FileText size={11} className="text-emerald-400" /> Instant GST e-invoice</span>
                <span className="flex items-center gap-1.5 rounded-lg border border-paper/10 px-2 py-1.5"><Lock size={11} className="text-emerald-400" /> Lock released on payment</span>
                <span className="flex items-center gap-1.5 rounded-lg border border-paper/10 px-2 py-1.5"><CheckCircle2 size={11} className="text-emerald-400" /> Webhook-verified capture</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══════════════ RAZORPAY SANDBOX MODAL ═══════════════ */}
      <Modal open={payOpen} onClose={() => payStep === 'idle' && setPayOpen(false)} size="sm" label="Razorpay secure checkout">
        <div className="overflow-hidden">
          {/* Razorpay-style header */}
          <div className="flex items-center justify-between bg-[#072654] px-5 py-4 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3395FF] font-mono text-[15px] font-bold">R</div>
              <div>
                <p className="text-[12.5px] font-bold leading-tight">Razorpay <span className="ml-1 rounded bg-[#00A651] px-1.5 py-0.5 text-[8.5px] font-bold uppercase align-middle">Test Mode</span></p>
                <p className="font-mono text-[9.5px] text-white/60">CargoShare bookings · order_rcpt_{bookingId?.slice(-6).toUpperCase()}</p>
              </div>
            </div>
            <p className="font-mono text-[15px] font-bold">{inr(grand)}</p>
          </div>

          {payStep === 'authorized' ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00A651]/15"><CheckCircle2 size={30} className="text-[#00A651]" /></span>
              <p className="mt-3 font-bold text-ink">Payment authorized by bank</p>
              <p className="mt-0.5 text-[11.5px] text-ink/55">Capturing funds & committing capacity…</p>
              <Loader2 size={18} className="mt-4 animate-spin text-ink/40" />
            </div>
          ) : (
            <>
              {/* method tabs */}
              <div className="grid grid-cols-4 border-b border-ink/10 text-center">
                {([
                  ['upi', 'UPI', Smartphone], ['card', 'Card', CreditCard], ['netbanking', 'NetBanking', Building2], ['wallet', 'Wallet', Wallet],
                ] as const).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setPayMethod(key)} disabled={payStep !== 'idle'}
                    className={`flex flex-col items-center gap-0.5 border-b-2 px-2 py-3 text-[10.5px] font-bold transition ${payMethod === key ? 'border-[#3395FF] text-[#072654]' : 'border-transparent text-ink/50 hover:text-ink'}`}>
                    <Icon size={17} />{label}
                  </button>
                ))}
              </div>

              <div className="space-y-3 px-5 py-4">
                {payMethod === 'upi' && (
                  <label className="block">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-ink/55">UPI ID</span>
                    <input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[#3395FF]" />
                    <span className="mt-1 block text-[9.5px] text-ink/45">Test UPI: success@razorpay · decline@razorpay</span>
                  </label>
                )}
                {payMethod === 'card' && (
                  <>
                    <label className="block">
                      <span className="text-[9.5px] font-bold uppercase tracking-widest text-ink/55">Card number</span>
                      <input value={cardNo} onChange={(e) => setCardNo(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2.5 font-mono text-[13px] tracking-wider outline-none focus:border-[#3395FF]" />
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="col-span-1"><span className="text-[9.5px] font-bold uppercase tracking-widest text-ink/55">Expiry</span><input value={cardExp} onChange={(e) => setCardExp(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[#3395FF]" /></label>
                      <label className="col-span-1"><span className="text-[9.5px] font-bold uppercase tracking-widest text-ink/55">CVV</span><input value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[#3395FF]" /></label>
                      <label className="col-span-1"><span className="text-[9.5px] font-bold uppercase tracking-widest text-ink/55">Name</span><input value={cardName} onChange={(e) => setCardName(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2.5 font-mono text-[10px] outline-none focus:border-[#3395FF]" /></label>
                    </div>
                    <p className="text-[9.5px] text-ink/45">Test card: 4111 1111 1111 1111 · any future expiry · any CVV</p>
                  </>
                )}
                {payMethod === 'netbanking' && (
                  <label className="block">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-ink/55">Bank</span>
                    <select value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-[#3395FF]">
                      {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Bank of Baroda'].map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </label>
                )}
                {payMethod === 'wallet' && (
                  <div className="grid grid-cols-3 gap-2">
                    {['Paytm', 'PhonePe', 'Amazon Pay', 'Mobikwik', 'Freecharge', 'Airtel Money'].map((w) => (
                      <button key={w} className="rounded-lg border border-ink/15 px-2 py-3 text-[11px] font-bold text-ink/75 transition hover:border-[#3395FF] hover:text-[#072654]">{w}</button>
                    ))}
                  </div>
                )}

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-ink/20 bg-paper-2/40 px-3 py-2">
                  <span className="text-[10.5px] font-semibold text-ink/70">Simulate <strong>bank decline</strong> (test failure path)</span>
                  <input type="checkbox" checked={failMode} onChange={(e) => setFailMode(e.target.checked)} className="h-4 w-4 accent-red-500" />
                </label>

                <button onClick={runPayment} disabled={payStep === 'processing'}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3395FF] px-6 py-3.5 font-bold text-white transition hover:bg-[#072654] disabled:opacity-70">
                  {payStep === 'processing' ? (<><Loader2 size={17} className="animate-spin" /> Contacting bank…</>) : (<>Pay {inr(grand)} securely</>)}
                </button>
                <p className="text-center font-mono text-[8.5px] uppercase tracking-widest text-ink/40">PCI-DSS L1 · 3-D Secure · Sandbox — no real money moves</p>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
