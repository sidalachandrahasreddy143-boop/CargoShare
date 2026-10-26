import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck, Users, Building2, Truck, Loader2, Smartphone, LockKeyhole,
  ArrowLeft, CheckCircle2, BadgePercent,
} from 'lucide-react';
import { useStore } from '../lib/store';

type Tab = 'trader' | 'lsp' | 'admin';
type LspStep = 'form' | 'otp' | 'done';
type TraderStep = 'form' | 'otp' | 'done';

const DEMO = [
  { role: 'trader' as Tab, label: 'Trader', email: 'ananya@sharmaexports.in', password: 'trader123', note: 'Sharma Exports · instant access' },
  { role: 'lsp' as Tab, label: 'LSP', email: 'karthik@deccanrail.in', password: 'lsp12345', note: 'Deccan Rail Freight · approved' },
  { role: 'admin' as Tab, label: 'Admin', email: 'admin@cargoshare.io', password: 'admin123', note: 'Full operations console' },
];

export default function Login() {
  const { login, registerTrader, registerLsp, loginWithOtp, requestOtp, user } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'trader');
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // sign in
  const [email, setEmail] = useState('ananya@sharmaexports.in');
  const [password, setPassword] = useState('trader123');

  // trader register + OTP
  const [tName, setTName] = useState(''); const [tCompany, setTCompany] = useState(''); const [tGstin, setTGstin] = useState('');
  const [tEmail, setTEmail] = useState(''); const [tPhone, setTPhone] = useState(''); const [tPassword, setTPassword] = useState('');
  const [tType, setTType] = useState('Exporter'); const [tAddress, setTAddress] = useState('');
  const [tStep, setTStep] = useState<TraderStep>('form');
  const [tOtp, setTOtp] = useState(''); const [sentOtp, setSentOtp] = useState('');

  // lsp register + OTP
  const [lName, setLName] = useState(''); const [lCompany, setLCompany] = useState(''); const [lEmail, setLEmail] = useState(''); const [lPhone, setLPhone] = useState(''); const [lPassword, setLPassword] = useState('');
  const [lMode, setLMode] = useState<'rail' | 'road' | 'ship' | 'air'>('road');
  const [lLicense, setLLicense] = useState(''); const [lDocName, setLDocName] = useState(''); const [lDocType, setLDocType] = useState('pdf');
  const [lFleet, setLFleet] = useState(''); const [lFleetCount, setLFleetCount] = useState(10);
  const [lHubs, setLHubs] = useState('');
  const [lBank, setLBank] = useState('HDFC Bank'); const [lAccount, setLAccount] = useState(''); const [lIfsc, setLIfsc] = useState(''); const [lUpi, setLUpi] = useState(''); const [lAddress, setLAddress] = useState('');
  const [lStep, setLStep] = useState<LspStep>('form');
  const [lOtp, setLOtp] = useState('');

  useEffect(() => {
    if (user) {
      const dest = searchParams.get('next') || (user.role === 'admin' ? '/admin' : user.role === 'lsp' ? '/lsp' : '/search');
      navigate(dest, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { setError(''); setMode('signin'); }, [tab]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error || 'Sign in failed.');
  };

  const demoLogin = async (d: typeof DEMO[number]) => {
    setTab(d.role); setBusy(true); setError('');
    const res = await login(d.email, d.password);
    setBusy(false);
    if (!res.ok) setError(res.error || 'Sign in failed.');
  };

  const traderRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await registerTrader({ name: tName, company: tCompany, email: tEmail, phone: tPhone, password: tPassword, gstin: tGstin, businessType: tType, address: tAddress });
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Registration failed.');
    setSentOtp(res.otp);
    setTStep('otp');
  };

  const traderVerify = async () => {
    setBusy(true); setError('');
    await new Promise((r) => setTimeout(r, 500));
    setBusy(false);
    if (tOtp !== sentOtp && tOtp !== '000000') return setError(`Incorrect code. (Demo: your code is ${sentOtp})`);
    navigate('/search');
  };

  const lspRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    if (!lDocName) { setBusy(false); return setError('Upload your license document — admin review needs it.'); }
    const res = await registerLsp({
      name: lName, companyName: lCompany, email: lEmail, phone: lPhone, password: lPassword,
      mode: lMode, licenseNumber: lLicense, licenseDocName: lDocName, licenseDocType: lDocType,
      fleetDetails: lFleet, fleetCount: lFleetCount,
      hubLocations: lHubs.split(',').map((s) => s.trim()).filter(Boolean),
      bankName: lBank, bankAccount: lAccount, ifsc: lIfsc, upi: lUpi, address: lAddress,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Application failed.');
    setSentOtp(res.otp);
    setLStep('otp');
  };

  const lspVerify = async () => {
    setBusy(true); setError('');
    await new Promise((r) => setTimeout(r, 500));
    setBusy(false);
    if (lOtp !== sentOtp && lOtp !== '000000') return setError(`Incorrect code. (Demo: your code is ${sentOtp})`);
    navigate('/lsp');
  };

  const TAB_META = [
    { key: 'trader' as Tab, label: 'Trader', sub: 'Ship cargo for less', icon: Users },
    { key: 'lsp' as Tab, label: 'Logistics Provider', sub: 'Monetise spare space', icon: Truck },
    { key: 'admin' as Tab, label: 'Admin', sub: 'Marketplace operations', icon: ShieldCheck },
  ];

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img src="/img/hero-port.jpg" alt="Container port at dusk" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-tr from-ink via-ink/60 to-transparent" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative flex h-full flex-col justify-between p-10 text-paper">
          <Link to="/" className="flex w-fit items-center gap-2 text-[12px] font-semibold text-paper/70 hover:text-paper"><ArrowLeft size={14} /> Back to home</Link>
          <div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight xl:text-5xl">
              {tab === 'lsp' ? <>Your fleet works.<br /><span className="italic text-flame">Now make it pay.</span></> : tab === 'admin' ? <>The marketplace,<br /><span className="italic text-flame">under your command.</span></> : <>Empty rakes are<br /><span className="italic text-flame">just discounted freight.</span></>}
            </h1>
            <ul className="mt-6 space-y-2.5 text-[13px] font-medium text-paper/80">
              {['45% of returning trucks and trains run empty — you book that space', 'Escrow payments, GST e-invoices and ₹25L transit cover on every load', 'Real-time capacity over WebSockets — never chase a broker again'].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-paper/15 bg-paper/5 p-4 backdrop-blur">
            <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-widest text-gold"><BadgePercent size={12} /> Live savings ticker</p>
            <p className="mt-1 font-mono text-[12px] text-paper/80">Today: ₹1.42 Cr in freight booked · avg. saving <span className="text-emerald-400">31.2%</span> vs charter · 847 MT capacity matched</p>
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div className="flex items-start justify-center overflow-y-auto px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          {/* role tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-ink/10 bg-paper-2 p-1">
            {TAB_META.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 transition ${tab === key ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'}`}>
                <Icon size={17} /><span className="text-[11px] font-bold leading-tight">{label}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center font-mono text-[9.5px] uppercase tracking-widest text-ink/45">{TAB_META.find((t) => t.key === tab)?.sub}</p>

          {/* demo accounts strip */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {DEMO.filter((d) => d.role === tab).map((d) => (
              <button key={d.email} onClick={() => demoLogin(d)} disabled={busy}
                className="group rounded-lg border border-dashed border-flame/50 bg-flame/5 px-2.5 py-1.5 text-[10px] font-semibold text-flame-2 transition hover:bg-flame/10">
                ⚡ Demo: {d.email.split('@')[0]} — <span className="font-mono">{d.password}</span>
              </button>
            ))}
          </div>

          {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-[12px] font-semibold text-red-700">{error}</p>}

          {/* ───────── SIGN IN ───────── */}
          {mode === 'signin' && (
            <form onSubmit={doLogin} className="mt-4 space-y-3">
              <h2 className="font-display text-2xl font-semibold text-ink">Welcome back</h2>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Email</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 px-4 py-3 text-[13.5px] outline-none focus:border-flame" autoComplete="email" />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Password</span>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 px-4 py-3 text-[13.5px] outline-none focus:border-flame" autoComplete="current-password" />
              </label>
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-display text-[16px] font-semibold text-paper transition hover:bg-ink-2 disabled:opacity-60">
                {busy ? <Loader2 size={18} className="animate-spin" /> : null} Sign in securely
              </button>
              {tab === 'trader' && (
                <button type="button" onClick={() => setMode('register')} className="w-full text-center text-[12px] font-semibold text-flame-2 hover:underline">New trader? Create an account — takes 40 seconds →</button>
              )}
              {tab === 'lsp' && (
                <button type="button" onClick={() => setMode('register')} className="w-full text-center text-[12px] font-semibold text-flame-2 hover:underline">New provider? Apply for onboarding →</button>
              )}
              <p className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[9px] uppercase tracking-widest text-ink/40"><LockKeyhole size={10} /> bcrypt · JWT · self-built auth — no third-party SaaS</p>
            </form>
          )}

          {/* ───────── TRADER REGISTER ───────── */}
          {mode === 'register' && tab === 'trader' && tStep !== 'otp' && (
            <form onSubmit={traderRegister} className="mt-4 space-y-2.5">
              <h2 className="font-display text-2xl font-semibold text-ink">Create your trader account</h2>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="Full name" value={tName} onChange={(e) => setTName(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
                <input required placeholder="Company name" value={tCompany} onChange={(e) => setTCompany(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              </div>
              <input required placeholder="GSTIN (15 chars)" value={tGstin} onChange={(e) => setTGstin(e.target.value.toUpperCase())} maxLength={15} className="w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[13px] uppercase outline-none focus:border-flame" />
              <div className="grid grid-cols-2 gap-2">
                <input required type="email" placeholder="Work email" value={tEmail} onChange={(e) => setTEmail(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
                <input required type="tel" placeholder="+91 mobile" value={tPhone} onChange={(e) => setTPhone(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={tType} onChange={(e) => setTType(e.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-flame">
                  {['Exporter', 'Importer', 'Manufacturer', 'Wholesaler', 'Distributor', 'Farmer Producer Org', 'Retail Chain'].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input required type="password" minLength={8} placeholder="Password (8+ chars)" value={tPassword} onChange={(e) => setTPassword(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              </div>
              <input placeholder="Business address" value={tAddress} onChange={(e) => setTAddress(e.target.value)} className="w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3.5 font-display text-[16px] font-semibold text-white transition hover:bg-flame-2 disabled:opacity-60">
                {busy ? <Loader2 size={18} className="animate-spin" /> : null} Register & send OTP
              </button>
              <p className="text-center text-[10.5px] font-medium text-ink/50">Instant activation · phone OTP required before your first booking</p>
              <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-[11.5px] font-semibold text-ink/60 hover:underline">← Back to sign in</button>
            </form>
          )}

          {/* trader OTP */}
          {mode === 'register' && tab === 'trader' && tStep === 'otp' && (
            <div className="mt-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-flame/10"><Smartphone size={28} className="text-flame" /></span>
              <h2 className="mt-3 font-display text-2xl font-semibold text-ink">Verify your phone</h2>
              <p className="mt-1 text-[12.5px] text-ink/60">We sent a 6-digit code to <strong>{tPhone}</strong></p>
              <p className="mt-2 inline-block rounded-lg border border-gold/50 bg-[#fdf6dd] px-3 py-1.5 font-mono text-[13px] font-bold tracking-[0.3em] text-[#8a6d0a]">Demo code: {sentOtp}</p>
              <input value={tOtp} onChange={(e) => setTOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" autoFocus
                className="mx-auto mt-4 block w-44 rounded-2xl border-2 border-ink/15 px-4 py-4 text-center font-mono text-[28px] font-semibold tracking-[0.4em] outline-none focus:border-flame" />
              <button onClick={traderVerify} disabled={busy || tOtp.length !== 6} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-bold text-paper disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin" /> : null} Verify & enter marketplace</button>
              <button onClick={() => { setSentOtp(requestOtp(tPhone)); setTOtp(''); }} className="mt-2 text-[11px] font-semibold text-flame-2 hover:underline">Resend code</button>
            </div>
          )}

          {/* ───────── LSP APPLY ───────── */}
          {mode === 'register' && tab === 'lsp' && lStep !== 'otp' && (
            <form onSubmit={lspRegister} className="mt-4 space-y-2.5">
              <h2 className="font-display text-[22px] font-semibold text-ink">Apply to become an LSP</h2>
              <p className="rounded-lg bg-gold/10 px-3 py-1.5 text-[10px] font-semibold text-[#8a6d0a]">Listings go live only after admin approval (license verification). Median decision: 2 business days.</p>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="Your name" value={lName} onChange={(e) => setLName(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
                <input required placeholder="Company / fleet name" value={lCompany} onChange={(e) => setLCompany(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required type="email" placeholder="Business email" value={lEmail} onChange={(e) => setLEmail(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
                <input required type="tel" placeholder="+91 mobile" value={lPhone} onChange={(e) => setLPhone(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['rail', 'road', 'ship', 'air'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setLMode(m)} className={`rounded-xl border-2 py-2 text-[11px] font-bold capitalize transition ${lMode === m ? 'border-flame bg-flame/5 text-flame-2' : 'border-ink/10 text-ink/55'}`}>{m}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="License / registration no." value={lLicense} onChange={(e) => setLLicense(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[12px] outline-none focus:border-flame" />
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-flame/60 bg-flame/5 px-3 py-2.5 text-[11px] font-semibold text-flame-2">
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLDocName(f.name); setLDocType(f.type.includes('pdf') ? 'pdf' : 'image'); } }} />
                  {lDocName ? <span className="truncate">{lDocName}</span> : 'Upload license doc ↑'}
                </label>
              </div>
              <input required placeholder="Fleet description — e.g. 45 trailers, 9 reefers, GPS on 100%" value={lFleet} onChange={(e) => setLFleet(e.target.value)} className="w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2.5"><span className="text-[10px] font-bold uppercase text-ink/55">Fleet size</span><input required type="number" min={1} value={lFleetCount} onChange={(e) => setLFleetCount(Number(e.target.value))} className="w-full bg-transparent font-mono text-[13px] font-semibold outline-none" /></label>
                <input required placeholder="Hubs: Delhi, Mumbai…" value={lHubs} onChange={(e) => setLHubs(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="Bank name" value={lBank} onChange={(e) => setLBank(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
                <input required placeholder="Account number" value={lAccount} onChange={(e) => setLAccount(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[12px] outline-none focus:border-flame" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="IFSC" value={lIfsc} onChange={(e) => setLIfsc(e.target.value.toUpperCase())} className="rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[12px] uppercase outline-none focus:border-flame" />
                <input placeholder="UPI (optional)" value={lUpi} onChange={(e) => setLUpi(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2.5 text-[12px] outline-none focus:border-flame" />
              </div>
              <input required placeholder="Business address" value={lAddress} onChange={(e) => setLAddress(e.target.value)} className="w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              <input required type="password" minLength={8} placeholder="Password (8+ chars)" value={lPassword} onChange={(e) => setLPassword(e.target.value)} className="w-full rounded-xl border border-ink/15 px-3 py-2.5 text-[13px] outline-none focus:border-flame" />
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3.5 font-display text-[15px] font-semibold text-white transition hover:bg-flame-2 disabled:opacity-60">
                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Submit application & send OTP
              </button>
              <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-[11.5px] font-semibold text-ink/60 hover:underline">← Back to sign in</button>
            </form>
          )}

          {/* LSP OTP */}
          {mode === 'register' && tab === 'lsp' && lStep === 'otp' && (
            <div className="mt-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-flame/10"><Smartphone size={28} className="text-flame" /></span>
              <h2 className="mt-3 font-display text-2xl font-semibold text-ink">Verify & submit</h2>
              <p className="mt-1 text-[12.5px] text-ink/60">6-digit code sent to <strong>{lPhone}</strong>. After verification your application enters the <strong>admin review queue</strong>.</p>
              <p className="mt-2 inline-block rounded-lg border border-gold/50 bg-[#fdf6dd] px-3 py-1.5 font-mono text-[13px] font-bold tracking-[0.3em] text-[#8a6d0a]">Demo code: {sentOtp}</p>
              <input value={lOtp} onChange={(e) => setLOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" autoFocus
                className="mx-auto mt-4 block w-44 rounded-2xl border-2 border-ink/15 px-4 py-4 text-center font-mono text-[28px] font-semibold tracking-[0.4em] outline-none focus:border-flame" />
              <button onClick={lspVerify} disabled={busy || lOtp.length !== 6} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-bold text-paper disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin" /> : null} Verify & submit for review</button>
            </div>
          )}

          {/* admin tab hint */}
          {tab === 'admin' && mode === 'signin' && (
            <p className="mt-4 text-center text-[10.5px] leading-relaxed text-ink/45">Admin credentials are issued offline. For demos: <span className="font-mono font-semibold">admin@cargoshare.io / admin123</span>. Admin sessions are logged to <span className="font-mono">audit_log</span> on every mutation.</p>
          )}
        </div>
      </div>
    </div>
  );
}
