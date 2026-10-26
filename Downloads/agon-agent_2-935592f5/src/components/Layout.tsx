import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Bell, ChevronDown, LogOut, Package, LayoutDashboard, Search,
  Ship, UserRound, MessageSquare, ShieldCheck, CheckCheck, ArrowRight,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, Toasts, timeAgo } from './ui';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, notifications, markNotificationsRead, unreadCount } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileOpen(false); setBellOpen(false); setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const roleLinks = user?.role === 'trader'
    ? [
        { to: '/search', label: 'Find Space' },
        { to: '/my-bookings', label: 'My Bookings' },
        { to: '/chat', label: 'Messages', badge: unreadCount },
      ]
    : user?.role === 'lsp'
      ? [
          { to: '/lsp', label: 'LSP Console' },
          { to: '/lsp/containers/new', label: 'List Space' },
          { to: '/chat', label: 'Messages', badge: unreadCount },
        ]
      : [
          { to: '/admin', label: 'Admin Panel' },
          { to: '/admin/lsp-queue', label: 'LSP Approvals' },
          { to: '/admin/disputes', label: 'Disputes' },
        ];

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'lsp' ? '/lsp' : '/search';

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* ══════════ TOP BAR ══════════ */}
      <header className="sticky top-0 z-[70] border-b border-ink/10 bg-paper/90 backdrop-blur-lg">
        {/* ticker strip */}
        <div className="hidden border-b border-ink/10 bg-ink py-1 md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-[10.5px] font-medium tracking-wide text-paper/80">
            <div className="flex items-center gap-2">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-leaf" style={{ background: '#34D399' }} />
              Live: 1,254 containers open · 38,200 MT spare capacity on 6 corridors
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-paper/55">GIM→LDH ₹1,450/MT</span>
              <span className="text-paper/55">INMAA→LKCMB ₹62,000/TEU</span>
              <span className="text-gold">Platform fill rate 74.2%</span>
            </div>
          </div>
        </div>

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
          {/* logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#0E242D" />
              <path d="M10 22h20v20H10z" fill="none" stroke="#E8622C" strokeWidth="3.5" strokeLinejoin="round" />
              <path d="M10 32h20" stroke="#E8622C" strokeWidth="3.5" />
              <path d="M30 26h14l10 10v6H30z" fill="none" stroke="#F4F1E6" strokeWidth="3.5" strokeLinejoin="round" />
              <circle cx="18" cy="46" r="3.6" fill="#F4F1E6" /><circle cx="44" cy="46" r="3.6" fill="#F4F1E6" />
            </svg>
            <span className="leading-none">
              <span className="block font-display text-[21px] font-semibold tracking-tight text-ink">CargoShare</span>
              <span className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/50 sm:block">Spare-capacity exchange</span>
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {roleLinks.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) =>
                  `relative rounded-lg px-3 py-2 text-[13.5px] font-semibold transition ${isActive ? 'text-flame-2' : 'text-ink/75 hover:bg-ink/5 hover:text-ink'}`}>
                {l.label}
                {!!l.badge && l.badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-flame px-1 text-[9px] font-bold text-white">{l.badge}</span>
                )}
              </NavLink>
            ))}
            <NavLink to="/open-source" className={({ isActive }) => `rounded-lg px-3 py-2 text-[13.5px] font-semibold transition ${isActive ? 'text-flame-2' : 'text-ink/75 hover:bg-ink/5 hover:text-ink'}`}>
              Open Source
            </NavLink>
          </nav>

          <div className="flex items-center gap-1.5">
            {/* notifications bell */}
            {user && (
              <div className="relative" ref={bellRef}>
                <button onClick={() => setBellOpen((v) => !v)}
                  className="relative rounded-lg p-2 text-ink/75 transition hover:bg-ink/5 hover:text-ink"
                  aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                  <Bell size={20} />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-flame px-1 text-[9px] font-bold text-white">{unread}</span>
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-ink/8 bg-paper-2/60 px-4 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink/60">Notifications</p>
                      <button onClick={markNotificationsRead} className="flex items-center gap-1 text-[11px] font-semibold text-flame-2 hover:underline">
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                      {notifications.slice(0, 6).map((n) => (
                        <div key={n.id} className={`border-b border-ink/5 px-4 py-3 transition ${n.read ? 'opacity-65' : 'bg-flame/[0.04]'}`}>
                          <div className="flex items-start gap-2.5">
                            {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />}
                            <div className={n.read ? 'pl-4' : ''}>
                              <p className="text-[12.5px] font-semibold leading-snug text-ink">{n.title}</p>
                              <p className="mt-0.5 text-[11.5px] leading-snug text-ink/65">{n.body}</p>
                              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wide text-ink/40">{timeAgo(n.timestamp)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* account / sign in */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white py-1.5 pl-1.5 pr-2 shadow-sm transition hover:shadow">
                  <Avatar name={user.name} color={user.avatarColor} size={30} />
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block max-w-[110px] truncate text-[11.5px] font-bold text-ink">{user.company || user.name}</span>
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-flame-2">{user.role === 'lsp' ? 'Provider' : user.role}</span>
                  </span>
                  <ChevronDown size={14} className="text-ink/50" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-ink/10 bg-white py-1.5 shadow-2xl">
                    <div className="border-b border-ink/8 px-4 py-2.5">
                      <p className="truncate text-[13px] font-bold text-ink">{user.name}</p>
                      <p className="truncate text-[11px] text-ink/55">{user.email}</p>
                    </div>
                    <button onClick={() => navigate(dashboardPath)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink/80 hover:bg-paper-2">
                      <LayoutDashboard size={15} /> Dashboard
                    </button>
                    <button onClick={() => navigate('/my-bookings')} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink/80 hover:bg-paper-2">
                      <Package size={15} /> My Bookings
                    </button>
                    <button onClick={() => navigate('/chat')} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink/80 hover:bg-paper-2">
                      <MessageSquare size={15} /> Messages {unreadCount > 0 && <span className="ml-auto rounded-full bg-flame px-1.5 text-[10px] font-bold text-white">{unreadCount}</span>}
                    </button>
                    <button onClick={logout} className="flex w-full items-center gap-2.5 border-t border-ink/8 px-4 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-50">
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="rounded-xl bg-flame px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-flame-2">
                Sign in
              </Link>
            )}

            <button onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-2 text-ink lg:hidden" aria-label="Toggle menu">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {mobileOpen && (
          <div className="border-t border-ink/10 bg-paper px-4 py-4 lg:hidden">
            <nav className="grid gap-1" aria-label="Mobile">
              <Link to="/search" className="flex items-center justify-between rounded-xl bg-ink px-4 py-3 font-semibold text-paper">
                <span className="flex items-center gap-2"><Search size={17} /> Find spare capacity</span><ArrowRight size={16} />
              </Link>
              {roleLinks.map((l) => (
                <NavLink key={l.to} to={l.to} className="flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold text-ink/85 hover:bg-ink/5">
                  {l.label}
                  {!!l.badge && <span className="rounded-full bg-flame px-2 text-[11px] font-bold text-white">{l.badge}</span>}
                </NavLink>
              ))}
              <NavLink to="/open-source" className="rounded-xl px-4 py-3 text-[15px] font-semibold text-ink/85 hover:bg-ink/5">Open Source Hub</NavLink>
              {!user && <NavLink to="/login" className="rounded-xl px-4 py-3 text-[15px] font-bold text-flame-2">Sign in / Register →</NavLink>}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-ink text-paper">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <div className="flex items-center gap-2">
                <Ship size={20} className="text-flame" />
                <span className="font-display text-xl font-semibold">CargoShare</span>
              </div>
              <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-paper/65">
                The open-source exchange for spare logistics capacity. 45% empty rakes and trucks now earn;
                MSMEs get freight rates only giants used to get.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-mono text-paper/50">
                <span className="rounded border border-paper/15 px-2 py-1">AGPL-3.0</span>
                <span className="rounded border border-paper/15 px-2 py-1">100% Open Source</span>
                <span className="rounded border border-paper/15 px-2 py-1">Self-hostable</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-8">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-paper/45">Marketplace</p>
                <ul className="mt-2 space-y-1.5 text-[12.5px] text-paper/75">
                  <li><Link to="/search" className="hover:text-flame">Find Space</Link></li>
                  <li><Link to="/search?mode=rail" className="hover:text-flame">Rail Freight</Link></li>
                  <li><Link to="/search?mode=road" className="hover:text-flame">Road Freight</Link></li>
                  <li><Link to="/search?mode=ship" className="hover:text-flame">Ocean Freight</Link></li>
                  <li><Link to="/search?mode=air" className="hover:text-flame">Air Cargo</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-paper/45">Platform</p>
                <ul className="mt-2 space-y-1.5 text-[12.5px] text-paper/75">
                  <li><Link to="/open-source" className="hover:text-flame">Open Source Hub</Link></li>
                  <li><Link to="/open-source#architecture" className="hover:text-flame">Architecture</Link></li>
                  <li><Link to="/open-source#deploy" className="hover:text-flame">Deploy (Docker/K8s)</Link></li>
                  <li><Link to="/login" className="hover:text-flame">Register as LSP</Link></li>
                  <li><a href="http://localhost:4000/api/docs" className="hover:text-flame">API Docs (Swagger)</a></li>
                </ul>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-paper/45">Trust & Safety</p>
                <ul className="mt-2 space-y-1.5 text-[12.5px] text-paper/75">
                  <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-leaf" /> KYC-verified LSPs</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-leaf" /> Escrow payments</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-leaf" /> Insured transit</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-leaf" /> Dispute resolution</li>
                  <li className="flex items-center gap-1.5"><UserRound size={12} className="text-flame" /> 24×7 ops desk</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-paper/10 pt-5 text-[11px] text-paper/45 sm:flex-row sm:items-center">
            <p>© 2026 CargoShare Labs · Built in the open. MIT/AGPL licensed components listed in the Open Source Hub.</p>
            <p className="font-mono">Node · React · PostgreSQL · Redis · MinIO · Socket.io · Leaflet · OSM</p>
          </div>
        </div>
      </footer>

      <Toasts />
    </div>
  );
}
