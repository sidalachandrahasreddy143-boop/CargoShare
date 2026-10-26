import { useEffect } from 'react';
import {
  Train, Truck, Ship, Plane, X, CheckCircle2, AlertCircle, Info, Lock,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../lib/store';
import type { TransportMode } from '../lib/types';

export const MODE_META: Record<TransportMode, { label: string; icon: LucideIcon; color: string; bg: string; img: string }> = {
  rail: { label: 'Rail', icon: Train, color: '#7C3AED', bg: '#F0E9FD', img: '/img/mode-rail.jpg' },
  road: { label: 'Road', icon: Truck, color: '#B4530A', bg: '#FDEBD7', img: '/img/mode-road.jpg' },
  ship: { label: 'Ship', icon: Ship, color: '#0F766E', bg: '#D9F3EF', img: '/img/mode-ship.jpg' },
  air: { label: 'Air', icon: Plane, color: '#0E6BA8', bg: '#DEEEFA', img: '/img/mode-air.jpg' },
};

/** ₹ in Indian numbering format */
export const inr = (n: number) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export function ModeBadge({ mode, size = 'md' }: { mode: TransportMode; size?: 'sm' | 'md' }) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ color: meta.color, background: meta.bg }}
    >
      <Icon size={size === 'sm' ? 12 : 13} strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#D9A227' : 'none'} stroke="#D9A227" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/** The signature marketplace capacity bar — animated shimmer on the booked portion */
export function CapacityBar({ total, booked, unit, showLabel = true }: { total: number; booked: number; unit: string; showLabel?: boolean }) {
  const pct = Math.min(100, (booked / total) * 100);
  const avail = Math.max(0, total - booked);
  const hot = pct >= 80;
  return (
    <div className="w-full">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${hot ? 'bg-gradient-to-r from-flame to-flame-2' : 'capacity-fill'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="font-mono font-semibold text-ink/70">
            <span className={hot ? 'text-flame-2' : 'text-leaf-2'}>{avail} {unit}</span> free of {total} {unit}
          </span>
          <span className={`font-semibold ${hot ? 'text-flame-2' : 'text-ink/50'}`}>
            {hot ? 'Filling fast · ' : ''}{pct.toFixed(0)}% booked
          </span>
        </div>
      )}
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : t.kind === 'lock' ? Lock : Info;
        const tone = t.kind === 'success' ? 'border-leaf/40 bg-[#0f2b1e] text-[#b8ecd2]' : t.kind === 'error' ? 'border-red-400/40 bg-[#2e1414] text-red-200' : t.kind === 'lock' ? 'border-gold/40 bg-[#2b2310] text-[#f5e3a8]' : 'border-mist/30 bg-ink text-paper';
        return (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3 pr-2 shadow-2xl backdrop-blur ${tone} animate-[slidein_.3s_ease]`} role="alert">
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug">{t.title}</p>
              {t.message && <p className="mt-0.5 text-[11px] leading-snug opacity-80">{t.message}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="rounded-md p-1 opacity-70 transition hover:opacity-100" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{'@keyframes slidein { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }'}</style>
    </div>
  );
}

export function Modal({ open, onClose, children, size = 'md', label }: {
  open: boolean; onClose: () => void; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; label?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-6xl' }[size];
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-[3px]" onClick={onClose} />
      <div className={`relative flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-2xl bg-paper shadow-2xl sm:rounded-2xl ${width}`}>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-paper-2/50 px-6 py-14 text-center">
      <Icon size={36} className="mx-auto text-ink/30" strokeWidth={1.5} />
      <p className="mt-3 font-display text-lg font-semibold text-ink/80">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-ink/55">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
