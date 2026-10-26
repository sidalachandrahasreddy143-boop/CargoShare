import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, FileText, FileImage, CheckCircle2, XCircle, Search, ChevronDown,
  Building2, Star, MapPin, Phone, Mail, CalendarClock, BadgeCheck, Filter,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, ModeBadge, Modal, timeAgo } from '../components/ui';
import type { LspApplicant, LspApproval } from '../lib/types';

const STATUS_STYLE: Record<LspApproval, string> = {
  pending: 'bg-red-50 text-red-600 border-red-200',
  under_review: 'bg-gold/15 text-[#8a6d0a] border-gold/40',
  approved: 'bg-leaf/10 text-leaf-2 border-leaf/30',
  rejected: 'bg-ink/8 text-ink/55 border-ink/15',
};

export default function AdminLspQueue() {
  const { user, lspApplications, reviewApplication } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | LspApproval>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LspApplicant | null>(null);
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState(80);
  const [reason, setReason] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let arr = [...lspApplications];
    if (filter !== 'all') arr = arr.filter((a) => a.approvalStatus === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((a) => `${a.companyName} ${a.applicantName} ${a.email} ${a.licenseNumber} ${a.mode}`.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => {
      const rank = { pending: 0, under_review: 1, approved: 2, rejected: 3 };
      return rank[a.approvalStatus] - rank[b.approvalStatus] || +new Date(b.appliedAt) - +new Date(a.appliedAt);
    });
  }, [lspApplications, filter, query]);

  const counts = useMemo(() => ({
    all: lspApplications.length,
    pending: lspApplications.filter((a) => a.approvalStatus === 'pending').length,
    under_review: lspApplications.filter((a) => a.approvalStatus === 'under_review').length,
    approved: lspApplications.filter((a) => a.approvalStatus === 'approved').length,
    rejected: lspApplications.filter((a) => a.approvalStatus === 'rejected').length,
  }), [lspApplications]);

  const open = (a: LspApplicant) => {
    setSelected(a);
    setNotes(a.inspectionNotes || '');
    setQuality(a.dataQualityScore ?? 80);
    setReason(a.rejectionReason || '');
  };

  const decide = (decision: 'approved' | 'rejected' | 'under_review') => {
    if (!selected) return;
    if (decision === 'rejected' && !reason.trim()) { setFlash('A rejection reason is required — it is sent to the applicant.'); return; }
    reviewApplication(selected.id, decision, { reason: reason.trim() || undefined, notes: notes.trim() || undefined, quality });
    setSelected(null);
    setFlash(decision === 'approved' ? `${selected.companyName} approved — onboarding email + SMS sent.` : decision === 'rejected' ? `${selected.companyName} rejected with reason shared.` : 'Application moved to under review.');
    window.setTimeout(() => setFlash(null), 4200);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldCheck size={38} className="mx-auto text-flame" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Admin access only</h1>
        <button onClick={() => navigate('/login')} className="mt-4 rounded-xl bg-ink px-6 py-3 font-bold text-paper">Sign in as admin</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-flame-2">Verification desk</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">LSP Approval Queue</h1>
          <p className="mt-0.5 text-[12px] text-ink/55">Review license documents, inspection notes & data quality. Decisions trigger email + SMS automatically.</p>
        </div>
        {flash && <div className="rounded-xl border border-leaf/40 bg-leaf/10 px-4 py-2.5 text-[12px] font-semibold text-leaf-2">{flash}</div>}
      </div>

      {/* filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-ink/45" />
        {([['all', 'All'], ['pending', 'Pending'], ['under_review', 'Under review'], ['approved', 'Approved'], ['rejected', 'Rejected']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition ${filter === key ? 'border-ink bg-ink text-paper' : 'border-ink/12 bg-white text-ink/65 hover:border-ink/30'}`}>
            {label} <span className="font-mono opacity-70">{counts[key]}</span>
          </button>
        ))}
        <label className="relative ml-auto min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, license, email…" aria-label="Search applications"
            className="w-full rounded-xl border border-ink/10 bg-white py-2 pl-9 pr-3 text-[12px] outline-none focus:border-flame" />
        </label>
      </div>

      {/* table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[12px]">
            <thead>
              <tr className="border-b border-ink/10 bg-paper-2/50 text-left text-[9.5px] font-bold uppercase tracking-widest text-ink/50">
                <th className="px-5 py-3">Applicant</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Hubs</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Quality</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {filtered.map((a) => (
                <tr key={a.id} className="transition hover:bg-paper-2/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.companyName} color="#16303A" size={36} />
                      <span><span className="block max-w-[170px] truncate font-bold text-ink">{a.companyName}</span><span className="block text-[10px] text-ink/55">{a.applicantName} · {a.phone}</span></span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><ModeBadge mode={a.mode} size="sm" /></td>
                  <td className="px-4 py-3 font-mono text-[10px] font-semibold text-ink/65">{a.licenseNumber}</td>
                  <td className="max-w-[140px] px-4 py-3"><span className="line-clamp-2 text-[10px] text-ink/60">{a.hubLocations.join(' · ')}</span></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-ink/60">{timeAgo(a.appliedAt)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] font-bold text-ink/75">{a.dataQualityScore ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-wider ${STATUS_STYLE[a.approvalStatus]}`}>{a.approvalStatus.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => open(a)} className="inline-flex items-center gap-1 rounded-lg bg-ink px-3.5 py-2 text-[11px] font-bold text-paper transition hover:bg-ink-3">Open file <ChevronDown size={13} className="-rotate-90" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-[12px] text-ink/50">No applications match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════ APPLICATION DETAIL / DECISION MODAL ═══════════ */}
      <Modal open={!!selected} onClose={() => setSelected(null)} size="xl" label="LSP application review">
        {selected && (
          <div className="grid max-h-[92vh] overflow-y-auto md:grid-cols-5">
            {/* left: application file */}
            <div className="border-b border-ink/10 p-6 md:col-span-3 md:border-b-0 md:border-r">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Application · {selected.id.slice(-8).toUpperCase()}</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold leading-tight text-ink">{selected.companyName}</h2>
                  <p className="text-[12px] font-medium text-ink/60">{selected.address} · applied {timeAgo(selected.appliedAt)}</p>
                </div>
                <ModeBadge mode={selected.mode} />
              </div>

              {/* uploaded license doc viewer */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-ink/12">
                <div className="flex items-center justify-between border-b border-ink/10 bg-ink-2 px-4 py-2.5 text-paper">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">{selected.licenseDocType === 'pdf' ? <FileText size={14} /> : <FileImage size={14} />} {selected.licenseDocName}</p>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-paper/55">MinIO · cargoshare-docs</span>
                </div>
                {selected.licenseDocType === 'pdf' ? (
                  <div className="bg-[#e8e6da] p-5">
                    <div className="mx-auto max-w-sm rounded-lg bg-white p-5 shadow-md" style={{ aspectRatio: '0.82' }}>
                      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
                        <p className="font-display text-[15px] font-bold text-ink">TRANSPORT LICENSE</p>
                        <Building2 size={20} className="text-ink/40" />
                      </div>
                      {[['License No.', selected.licenseNumber], ['Holder', selected.companyName], ['Applicant', selected.applicantName], ['Address', selected.address], ['Category', `${selected.mode.toUpperCase()} — Goods carriage`], ['Issued', '12-Mar-2024'], ['Valid upto', '11-Mar-2029']].map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between gap-3 border-b border-ink/10 py-1.5 text-[10.5px]">
                          <span className="font-mono uppercase text-ink/50">{k}</span>
                          <span className="text-right font-semibold text-ink">{v}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="h-8 w-8 border-2 border-dashed border-ink/30" title="QR" />
                        <p className="font-[cursive] text-[13px] italic text-ink/60">sgd. Licensing Authority</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-[#e8e6da] p-6">
                    <div className="rounded-lg bg-white p-6 text-center shadow-md">
                      <FileImage size={64} className="mx-auto text-ink/30" strokeWidth={1.4} />
                      <p className="mt-2 font-mono text-[10px] text-ink/55">{selected.licenseDocName}</p>
                      <p className="text-[9px] text-ink/40">1.2 MB · image/jpeg · 4032×3024</p>
                    </div>
                  </div>
                )}
              </div>

              {/* structured details */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-[11.5px]">
                <div className="rounded-xl border border-ink/10 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Contact</p>
                  <p className="mt-1 flex items-center gap-1.5 text-ink/80"><Phone size={11} />{selected.phone}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 break-all text-ink/80"><Mail size={11} />{selected.email}</p>
                </div>
                <div className="rounded-xl border border-ink/10 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Fleet ({selected.fleetCount})</p>
                  <p className="mt-1 leading-snug text-ink/75">{selected.fleetDetails}</p>
                </div>
                <div className="rounded-xl border border-ink/10 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Hub locations</p>
                  <p className="mt-1 flex items-start gap-1.5 leading-snug text-ink/75"><MapPin size={11} className="mt-0.5 shrink-0" />{selected.hubLocations.join(' · ')}</p>
                </div>
                <div className="rounded-xl border border-ink/10 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Bank details</p>
                  <p className="mt-1 leading-snug text-ink/75">{selected.bankName}<br />A/C {selected.bankAccount}<br /><span className="font-mono text-[10px]">IFSC {selected.ifsc}</span></p>
                </div>
              </div>
            </div>

            {/* right: admin decision panel */}
            <div className="flex flex-col bg-paper-2/40 p-6 md:col-span-2">
              <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-widest text-ink/55"><BadgeCheck size={14} /> Admin review</p>

              <label className="mt-4 block">
                <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-ink/55">Inspection notes <span className="font-mono normal-case text-ink/35">admin-only</span></span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Document authenticity check, physical inspection findings, GPS fleet sample, on-time record…"
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[12px] leading-relaxed outline-none focus:border-flame" />
              </label>

              <label className="mt-3 block">
                <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-ink/55">Data quality score <span className="font-mono text-[13px] font-bold text-flame-2">{quality}/100</span></span>
                <input type="range" min={0} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-2 w-full accent-[#e8622c]" aria-label="Data quality score" />
                <span className="mt-0.5 block text-[9px] text-ink/45">Feeds listing rank in search. &lt;60 = listing capped at 30 results/day.</span>
              </label>

              <label className="mt-3 block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/55">Rejection reason <em className="not-italic text-ink/40">(required to reject)</em></span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. License number not found in transport authority registry…"
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-flame" />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => decide('under_review')} className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-gold/60 bg-gold/15 px-4 py-3 text-[12px] font-bold text-[#8a6d0a] transition hover:bg-gold/25"><CalendarClock size={15} /> Mark under review</button>
                <button onClick={() => decide('approved')} className="flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3.5 text-[13px] font-bold text-white transition hover:bg-leaf-2"><CheckCircle2 size={17} /> Approve</button>
                <button onClick={() => decide('rejected')} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-[13px] font-bold text-white transition hover:bg-red-700"><XCircle size={17} /> Reject</button>
              </div>
              <p className="mt-3 text-center font-mono text-[8.5px] uppercase tracking-widest text-ink/40">Decision logged to audit_log · applicant notified via email + SMS webhook</p>

              {/* stars preview */}
              <div className="mt-auto hidden pt-4 md:block">
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink/45">Predicted marketplace impact</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-ink/60"><Star size={12} className="text-gold" fill="#D9A227" /> High-quality LSPs fill 81% of listed capacity within 21 days.</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
