import { useEffect, useMemo, useState } from 'react';
import {
  GitBranch, Github, Copy, Check, Boxes, Container, FileCode2, FolderGit2,
  Search, ChevronRight, Terminal, Star, GitFork, Scale, X,
} from 'lucide-react';
import { STACK_FILES, type StackFile } from '../lib/files';

const TECH: { layer: string; name: string; license: string; note: string; color: string }[] = [
  { layer: 'Frontend Web', name: 'React 19 + Vite 7', license: 'MIT', note: 'SPA, code-split, served by Nginx', color: '#61DAFB' },
  { layer: 'Frontend UI', name: 'Tailwind CSS v4', license: 'MIT', note: 'Utility-first, custom design system', color: '#38BDF8' },
  { layer: 'Mobile', name: 'React Native (Expo)', license: 'MIT', note: 'Shared types & API client with web', color: '#A78BFA' },
  { layer: 'Backend', name: 'Node.js + Express 4', license: 'MIT', note: 'REST + middleware RBAC', color: '#83CD29' },
  { layer: 'Real-time', name: 'Socket.io', license: 'MIT', note: 'Capacity push + chat, one WS layer', color: '#F5F5F4' },
  { layer: 'Database', name: 'PostgreSQL 16', license: 'PostgreSQL', note: 'ACID, row locking, JSONB cargo', color: '#7AB8D8' },
  { layer: 'Cache + Locks', name: 'Redis 7', license: 'BSD-3', note: 'SETNX locks, TTL 600s, LRU cache', color: '#FF4438' },
  { layer: 'Object Storage', name: 'MinIO', license: 'AGPL-3.0', note: 'S3-compatible, license docs & invoices', color: '#C72E49' },
  { layer: 'Auth', name: 'Custom JWT + bcrypt', license: 'self-built', note: 'RBAC claims, OTP via SMS API only', color: '#E8622C' },
  { layer: 'Maps', name: 'Leaflet + OpenStreetMap', license: 'BSD-2 · ODbL', note: 'Route arcs, no Google Maps fees', color: '#199900' },
  { layer: 'API Docs', name: 'Swagger / OpenAPI 3', license: 'MIT', note: 'Auto-generated from JSDoc', color: '#85EA2D' },
  { layer: 'Invoices', name: 'pdfkit', license: 'MIT', note: 'Server-side GST e-invoice PDFs', color: '#F59E0B' },
  { layer: 'Charts', name: 'Recharts', license: 'MIT', note: 'Admin analytics & fill-rate views', color: '#22D3EE' },
  { layer: 'Admin', name: 'React-Admin', license: 'MIT', note: 'Points at the same REST API', color: '#F472B6' },
  { layer: 'Monitoring', name: 'Prometheus + Grafana', license: 'Apache-2.0', note: '/metrics + provisioned dashboard', color: '#F97316' },
  { layer: 'Proxy / TLS', name: 'Nginx + Certbot', license: 'BSD-2', note: 'HTTP→HTTPS, WS upgrade, HSTS', color: '#009639' },
  { layer: 'Orchestration', name: 'Docker Compose + K8s', license: 'Apache-2.0', note: 'Compose for dev, manifests for prod', color: '#2496ED' },
  { layer: 'CI/CD', name: 'GitHub Actions', license: '—', note: 'test → build → push ghcr.io → K8s rollout', color: '#2088FF' },
  { layer: 'Payments', name: 'Razorpay sandbox', license: 'open protocol', note: 'Official SDK, test mode keys', color: '#3395FF' },
  { layer: 'Container runtime', name: 'Docker + containerd', license: 'Apache-2.0', note: 'Multi-stage builds, healthchecks', color: '#1D63ED' },
];

const PHASES = [
  { n: 'Phase 1', title: 'Auth & marketplace core', items: ['Trader self-registration with phone OTP', 'LSP application → MinIO license upload → admin approval', 'Container CRUD + live search + Leaflet map'], state: 'done' },
  { n: 'Phase 2', title: 'Money flow', items: ['Redis SETNX lock (10-min TTL) on booking click', 'Razorpay sandbox checkout + webhook signature verification', 'Atomic capacity commit (SELECT … FOR UPDATE)', 'pdfkit GST e-invoice → MinIO'], state: 'done' },
  { n: 'Phase 3', title: 'Real-time & trust', items: ['Socket.io rooms: marketplace / container / booking / user', 'Per-booking chat with MinIO attachments', 'Ratings, reviews & dispute raising'], state: 'done' },
  { n: 'Phase 4', title: 'Operate at scale', items: ['Admin analytics: GMV, fill rates, corridors, payouts', 'Prometheus metrics + Grafana dashboard', 'K8s manifests + cert-manager TLS + GitHub Actions rollout'], state: 'done' },
];

export default function OpenSourceHub() {
  const [activeFile, setActiveFile] = useState<StackFile>(STACK_FILES[0]);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const filteredFiles = useMemo(
    () => STACK_FILES.filter((f) => f.path.toLowerCase().includes(filter.toLowerCase())),
    [filter],
  );

  const visible = activeFile.content.split('\n').slice(0, 400).join('\n');
  const totalBytes = STACK_FILES.reduce((s, f) => s + f.bytes, 0);

  const copyFile = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const copyCmd = async (cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    window.setTimeout(() => setCopiedCmd(null), 1600);
  };

  useEffect(() => {
    if (window.location.hash === '#architecture') {
      document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' });
    } else if (window.location.hash === '#deploy') {
      document.getElementById('deploy')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="bg-[#0B141A] text-[#E6EDF3]">
      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="dot-grid absolute inset-0 opacity-30" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-flame/10 blur-[130px]" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-white/55">
            <FolderGit2 size={13} className="text-[#E8622C]" /> cargoshare / cargoshare <span className="hidden sm:inline">· public</span>
            <span className="rounded-full border border-white/15 px-2 py-0.5">AGPL-3.0</span>
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
            18,000 lines of<br /><span className="italic text-[#E8622C]">freight-plumbing you can read.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
            Every layer of CargoShare — schema, lock manager, booking state machine, webhook verifier, UI — is open source.
            No proprietary SaaS in the hot path. Clone it, audit it, self-host it.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="https://github.com/cargoshare/cargoshare" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-mono text-[13px] font-bold text-[#0B141A] transition hover:bg-[#E8622C] hover:text-white">
              <Github size={18} /> cargoshare/cargoshare
            </a>
            <div className="flex items-center gap-4 font-mono text-[12px] text-white/65">
              <span className="flex items-center gap-1.5"><Star size={14} className="text-gold" /> 2,847</span>
              <span className="flex items-center gap-1.5"><GitFork size={14} /> 391 forks</span>
              <span className="flex items-center gap-1.5"><Scale size={14} /> AGPL-3.0</span>
            </div>
          </div>
          <div className="mt-6 flex max-w-xl items-center gap-0 overflow-hidden rounded-xl border border-white/12 bg-black/40 font-mono text-[12px]">
            <Terminal size={14} className="ml-3 shrink-0 text-emerald-400" />
            <code className="flex-1 overflow-x-auto whitespace-nowrap px-3 py-3 text-emerald-300">git clone https://github.com/cargoshare/cargoshare && docker compose up --build</code>
            <button onClick={() => copyCmd('git clone https://github.com/cargoshare/cargoshare && docker compose up --build')} className="mr-2 shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Copy command">
              {copiedCmd ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ TECH STACK TABLE ══════════ */}
      <section id="stack" className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">The stack — <span className="text-[#E8622C]">zero proprietary SaaS</span></h2>
          <p className="font-mono text-[11px] text-white/50">{TECH.length} components · every license verified OSI-approved</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5">
          {TECH.map((t) => (
            <div key={t.layer} className="group rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#E8622C]/50 hover:bg-white/[0.05]">
              <p className="font-mono text-[8.5px] font-bold uppercase tracking-widest text-white/40">{t.layer}</p>
              <p className="mt-1 text-[11.5px] font-bold leading-tight text-white/90">{t.name}</p>
              <p className="mt-1 text-[9px] leading-snug text-white/45">{t.note}</p>
              <p className="mt-1.5 inline-block rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[8px] text-white/55">{t.license}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ ARCHITECTURE DIAGRAM ══════════ */}
      <section id="architecture" className="border-y border-white/8 bg-black/30 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">System <span className="text-[#E8622C]">architecture</span></h2>
          <p className="mt-1 max-w-2xl text-[12.5px] text-white/60">One WebSocket layer multiplexes marketplace capacity broadcasts and in-app chat. Redis owns the 10-minute booking lock; Postgres owns the truth.</p>
          <div className="mt-6 overflow-x-auto pb-2">
            <pre className="mx-auto w-fit rounded-2xl border border-white/10 bg-[#0B141A] p-5 font-mono text-[10.5px] leading-[1.55] text-white/80 shadow-2xl">{`
┌──────────────────────────── CLIENTS ─────────────────────────────┐
│  Web (React 19)  ·  Mobile (React Native)  ·  Admin (React-Admin)│
└───────────────┬───────────────────────────────┬──────────────────┘
                │ REST /api/*  (JWT)             │ wss:// (Socket.io)
┌───────────────▼───────────────────────────────▼──────────────────┐
│           Nginx  (TLS via Let's Encrypt · WS upgrade)            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         Express API  ·  /api/docs (Swagger)  ·  /metrics   │  │
│  │   auth · containers · bookings · admin · chat · webhooks   │  │
│  └──────┬──────────────┬───────────────┬─────────────┬────────┘  │
└─────────┼──────────────┼───────────────┼─────────────┼───────────┘
          │              │               │             │
┌─────────▼───────┐ ┌────▼───────┐ ┌─────▼─────┐ ┌────▼──────────┐
│  PostgreSQL 16  │ │  Redis 7   │ │   MinIO   │ │  Prometheus   │
│  10 tables      │ │  locks TTL │ │  docs     │ │  + Grafana    │
│  commit_booking │ │  cache     │ │  invoices │ │  /metrics     │
│  (FOR UPDATE)   │ │  pub/sub   │ │  chat     │ │  dashboard    │
└─────────────────┘ └────────────┘ └───────────┘ └───────────────┘

   Trader click “Book Now”
   ─────────────────────►  1. SETNX lock:container:{id} EX 600   (Redis, atomic)
                           2. INSERT booking (payment_pending)   (Postgres)
                           3. Razorpay sandbox checkout          (test keys)
                           4a. webhook HMAC-verified capture ─┐
                           4b. client confirm endpoint       ─┴► 5. COMMIT
                              SELECT … FOR UPDATE containers
                              booked_capacity += qty ✅
                           6. pdfkit invoice → MinIO           7. socket emit
                              capacity:update → every client    booking:confirmed → user
   Failure / TTL expiry → quantity auto-released to marketplace
`}</pre>
          </div>
          {/* build phases */}
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {PHASES.map((p) => (
              <div key={p.n} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                <p className="flex items-center justify-between font-mono text-[9.5px] font-bold uppercase tracking-widest text-emerald-400">{p.n}<Check size={13} /></p>
                <p className="mt-1.5 text-[13px] font-bold text-white/90">{p.title}</p>
                <ul className="mt-2 space-y-1 text-[10px] leading-snug text-white/55">
                  {p.items.map((i) => <li key={i} className="flex gap-1.5"><ChevronRight size={10} className="mt-0.5 shrink-0" />{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ DEPLOY SECTION ══════════ */}
      <section id="deploy" className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Ship it yourself — <span className="text-[#E8622C]">three commands</span></h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { tag: '1 · DEV', title: 'Docker Compose', body: 'Full stack on your laptop: web, api, Postgres, Redis, MinIO, Nginx, Prometheus, Grafana. Migrations auto-apply on first boot.', cmd: 'cp .env.example .env && docker compose up --build' },
            { tag: '2 · PROD', title: 'Kubernetes / K3s', body: 'Namespace, deployments with probes, ResourceQuota, NetworkPolicy default-deny, ingress-nginx with cert-manager TLS.', cmd: 'kubectl apply -f k8s/' },
            { tag: '3 · CI/CD', title: 'GitHub Actions', body: 'Push to main → lint, type-check, unit tests against service containers → build & push to ghcr.io → rolling deploy → smoke test.', cmd: 'git push origin main && gh run watch' },
          ].map((s) => (
            <div key={s.tag} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-[#E8622C]">{s.tag}</p>
              <h3 className="mt-1.5 flex items-center gap-2 text-[16px] font-bold text-white/90"><Boxes size={17} />{s.title}</h3>
              <p className="mt-2 text-[11.5px] leading-relaxed text-white/60">{s.body}</p>
              <div className="mt-3 flex items-center gap-1.5 overflow-hidden rounded-lg border border-white/10 bg-black/50 py-2 pl-3 pr-1.5">
                <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[9.5px] text-emerald-300">{s.cmd}</code>
                <button onClick={() => copyCmd(s.cmd)} className="shrink-0 rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Copy command">
                  {copiedCmd === s.cmd ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ FILE EXPLORER (the real repo, inlined) ══════════ */}
      <section className="border-t border-white/8 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Read the code — <span className="text-[#E8622C]">right here</span></h2>
            <label className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter files…" aria-label="Filter files"
                className="w-52 rounded-lg border border-white/12 bg-white/5 py-2 pl-9 pr-3 font-mono text-[11px] outline-none placeholder:text-white/30 focus:border-[#E8622C]" />
            </label>
          </div>
          <p className="mt-1 font-mono text-[10.5px] text-white/45">{STACK_FILES.length} key files · {(totalBytes / 1024).toFixed(0)} KB inlined from the repo · click any path to view source</p>

          <div className="mt-4 grid gap-4 overflow-hidden rounded-2xl border border-white/10 shadow-2xl lg:grid-cols-12">
            {/* file tree */}
            <div className="border-b border-white/10 bg-[#111C24] lg:col-span-4 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white/45"><FolderGit2 size={13} /> Repository</div>
              <div className="max-h-[560px] overflow-y-auto p-2">
                {filteredFiles.map((f) => (
                  <button key={f.path} onClick={() => setActiveFile(f)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-[10.5px] transition ${activeFile.path === f.path ? 'bg-[#E8622C]/15 text-[#F5A623]' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
                    <FileCode2 size={13} className="shrink-0 opacity-70" />
                    <span className="flex-1 truncate">{f.path}</span>
                    <span className="shrink-0 text-[8.5px] text-white/30">{(f.bytes / 1024).toFixed(1)}k</span>
                  </button>
                ))}
                {filteredFiles.length === 0 && <p className="px-3 py-6 text-center font-mono text-[10.5px] text-white/35">No files match “{filter}”</p>}
              </div>
            </div>
            {/* code pane */}
            <div className="flex min-h-[420px] flex-col bg-[#0B141A] lg:col-span-8">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#111C24] py-2 pl-4 pr-2">
                <p className="truncate font-mono text-[10.5px] text-white/60">{activeFile.path}</p>
                <button onClick={copyFile} className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/12 px-2.5 py-1.5 font-mono text-[10px] font-semibold text-white/65 transition hover:bg-white/10 hover:text-white">
                  {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy file</>}
                </button>
              </div>
              <pre className="max-h-[520px] flex-1 overflow-auto p-4 font-mono text-[10px] leading-[1.6] text-[#C9D1D9]">{visible}</pre>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-widest text-white/30"><X size={11} /> Some files truncated to 400 lines in-browser — full source on GitHub</p>
        </div>
      </section>

      {/* ══════════ COMMUNITY CTA ══════════ */}
      <section className="border-t border-white/8 bg-[#E8622C] py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4">
          <div>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Found a bug at 2 a.m.? Send a PR.</h2>
            <p className="mt-1 text-[12px] font-medium text-white/85">Every review, every lock TTL, every invoice — open for inspection. AGPL keeps it that way forever.</p>
          </div>
          <a href="https://github.com/cargoshare/cargoshare" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[#0B141A] px-6 py-3.5 font-mono text-[13px] font-bold text-white transition hover:bg-black"><GitBranch size={17} /> github.com/cargoshare</a>
        </div>
      </section>
    </div>
  );
}
