import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare, Send, Paperclip, Check, CheckCheck, FileText, X, ShieldCheck,
  ChevronLeft, Loader2, Search,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, ModeBadge, timeAgo } from '../components/ui';

export default function Chat() {
  const { bookings, messages, sendMessage, markThreadRead, user, unreadCount } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeBookingId, setActiveBookingId] = useState<string | null>(searchParams.get('booking') || null);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const myBookings = useMemo(() => {
    let arr = bookings.filter((b) => b.traderId === user?.id || b.traderId === 'u-trader-1' || user?.role === 'lsp' || user?.role === 'admin');
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((b) => `${b.bookingRef} ${b.origin} ${b.destination} ${b.lspCompany}`.toLowerCase().includes(q));
    }
    return arr;
  }, [bookings, user, query]);

  const activeBooking = myBookings.find((b) => b.id === activeBookingId) || bookings.find((b) => b.id === activeBookingId);
  const threadMessages = useMemo(() => messages.filter((m) => m.bookingId === activeBookingId).sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)), [messages, activeBookingId]);

  useEffect(() => { if (activeBookingId) markThreadRead(activeBookingId); }, [activeBookingId, threadMessages.length, markThreadRead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [threadMessages.length, activeBookingId]);

  // simulate other party typing indicator when we send
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(false), 2400);
    return () => clearTimeout(t);
  }, [typing]);

  const openThread = (id: string) => {
    setActiveBookingId(id);
    setSearchParams({ booking: id }, { replace: true });
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !activeBookingId) return;
    sendMessage(activeBookingId, text);
    setDraft('');
    setTyping(true);
  };

  const attach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBookingId) return;
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage(activeBookingId, `📎 ${file.name}`, { name: file.name, dataUrl: String(reader.result), size: file.size });
      setTyping(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const lastMessageFor = (bookingId: string) => {
    const m = messages.filter((x) => x.bookingId === bookingId);
    return m[m.length - 1];
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex h-[calc(100vh-7.5rem)] min-h-[540px] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl">
        {/* ══════════ THREAD LIST ══════════ */}
        <aside className={`${activeBookingId ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-ink/10 md:w-[340px] md:shrink-0`}>
          <div className="border-b border-ink/10 bg-paper-2/50 p-4">
            <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
              Messages
              {unreadCount > 0 && <span className="rounded-full bg-flame px-2 py-0.5 font-sans text-[10.5px] font-bold text-white">{unreadCount} new</span>}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-ink/50"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" /> Socket.io rooms · one per booking</p>
            <label className="relative mt-2.5 block">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations…" aria-label="Search conversations"
                className="w-full rounded-xl border border-ink/10 bg-white py-2 pl-9 pr-3 text-[12px] outline-none focus:border-flame" />
            </label>
          </div>
          <div className="flex-1 overflow-y-auto">
            {myBookings.map((b) => {
              const last = lastMessageFor(b.id);
              const unread = messages.filter((m) => m.bookingId === b.id && !m.read && m.senderId !== user?.id).length;
              const active = b.id === activeBookingId;
              return (
                <button key={b.id} onClick={() => openThread(b.id)}
                  className={`flex w-full items-start gap-3 border-b border-ink/5 px-4 py-3.5 text-left transition ${active ? 'bg-flame/[0.07]' : 'hover:bg-paper-2/60'}`}>
                  <Avatar name={b.lspCompany} color={active ? '#E8622C' : '#0E242D'} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-bold text-ink">{b.lspCompany}</span>
                      {last && <span className="shrink-0 font-mono text-[9px] text-ink/40">{timeAgo(last.timestamp)}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <ModeBadge mode={b.mode} size="sm" />
                      <span className="font-mono text-[9.5px] text-ink/45">{b.bookingRef}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-ink/60">{last?.text ?? 'No messages yet — say hello 👋'}</span>
                      {unread > 0 && <span className="flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-flame px-1 text-[9px] font-bold text-white">{unread}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
            {myBookings.length === 0 && <p className="p-6 text-center text-[12px] text-ink/50">No conversations yet. Book a slot — a thread is created automatically per booking.</p>}
          </div>
        </aside>

        {/* ══════════ ACTIVE THREAD ══════════ */}
        <section className={`${activeBookingId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-paper`}>
          {!activeBooking ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare size={44} className="text-ink/20" strokeWidth={1.5} />
              <p className="mt-3 font-display text-xl font-semibold text-ink/75">Pick a conversation</p>
              <p className="mt-1 max-w-xs text-[12px] text-ink/55">Every booking opens a private room between you and the logistics provider.</p>
            </div>
          ) : (
            <>
              {/* thread header */}
              <div className="flex items-center gap-3 border-b border-ink/10 bg-white px-4 py-3">
                <button onClick={() => { setActiveBookingId(null); setSearchParams({}, { replace: true }); }} className="rounded-lg p-1.5 hover:bg-ink/5 md:hidden" aria-label="Back to conversations"><ChevronLeft size={20} /></button>
                <Avatar name={activeBooking.lspCompany} color="#E8622C" size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink">{activeBooking.lspCompany} <ShieldCheck size={12} className="inline text-leaf" /></p>
                  <p className="truncate font-mono text-[9.5px] text-ink/50">{activeBooking.bookingRef} · {activeBooking.origin} → {activeBooking.destination} · room: booking:{activeBooking.id.slice(-6)}</p>
                </div>
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-leaf/10 px-2.5 py-1 text-[9.5px] font-bold text-leaf-2 sm:flex"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-leaf" /> Online</span>
              </div>

              {/* messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <p className="mx-auto w-fit rounded-full bg-ink/[0.06] px-3 py-1 text-center font-mono text-[9px] uppercase tracking-widest text-ink/45">Booking created · chat room joined via socket.io</p>
                {threadMessages.map((m) => {
                  // Trader view: my bubbles = messages sent by traders (me). LSP/admin view: my bubbles = non-trader senders.
                  const showMine = user?.role === 'trader' ? m.senderRole === 'trader' : m.senderRole !== 'trader';
                  return (
                    <div key={m.id} className={`flex ${showMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[65%] ${showMine ? 'rounded-br-md bg-ink text-paper' : 'rounded-bl-md border border-ink/8 bg-white text-ink'}`}>
                        {m.attachmentDataUrl && (
                          <a href={m.attachmentDataUrl} download={m.attachmentName} className="mb-1.5 flex items-center gap-2 rounded-lg bg-black/15 px-2.5 py-2 text-[11px] font-semibold">
                            <FileText size={15} className="shrink-0" /><span className="truncate underline underline-offset-2">{m.attachmentName}</span>
                          </a>
                        )}
                        {!m.attachmentDataUrl && m.attachmentName && (
                          <span className="mb-1 flex items-center gap-2 text-[11px] font-semibold underline underline-offset-2"><FileText size={13} />{m.attachmentName}</span>
                        )}
                        <p className="whitespace-pre-wrap text-[12.5px] leading-snug">{m.text}</p>
                        <p className={`mt-1 flex items-center justify-end gap-1 font-mono text-[8.5px] ${showMine ? 'text-paper/55' : 'text-ink/40'}`}>
                          {timeAgo(m.timestamp)}
                          {showMine && (m.read ? <CheckCheck size={12} className="text-sky-300" /> : <Check size={12} />)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-ink/8 bg-white px-4 py-3">
                      {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
              </div>

              {/* composer */}
              <div className="border-t border-ink/10 bg-white p-3">
                <div className="flex items-end gap-2">
                  <input ref={fileRef} type="file" className="hidden" onChange={attach} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                  <button onClick={() => fileRef.current?.click()} className="rounded-xl border border-ink/12 p-3 text-ink/60 transition hover:border-flame hover:text-flame-2" aria-label="Attach document"><Paperclip size={19} /></button>
                  <label className="relative flex-1">
                    <span className="sr-only">Type a message</span>
                    <textarea value={draft} rows={1}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder="Type a message… (Enter to send)"
                      className="max-h-36 min-h-[46px] w-full resize-none rounded-2xl border border-ink/12 bg-paper-2/50 px-4 py-3 text-[13px] outline-none focus:border-flame" />
                  </label>
                  <button onClick={send} disabled={!draft.trim()} className="rounded-2xl bg-flame p-3.5 text-white transition hover:bg-flame-2 disabled:opacity-35" aria-label="Send message"><Send size={19} /></button>
                </div>
                <p className="mt-1.5 text-center font-mono text-[8.5px] uppercase tracking-widest text-ink/35">Messages persist to PostgreSQL · attachments upload to MinIO · delivered via Socket.io</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
