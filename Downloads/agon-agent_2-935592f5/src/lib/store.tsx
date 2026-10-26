import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import type {
  Booking, Container, ChatMessage, LspApplicant, AppNotification, Dispute, Role, Toast, CargoDetails,
} from './types';
import {
  SEED_BOOKINGS, SEED_CONTAINERS, SEED_LSP_APPLICANTS,
} from './data';

/* ═══════════════════════════════════════════════════════════
   CargoShare local engine.
   Mirrors the server semantics 1:1 so the UI behaves like the
   real stack: Redis-style lock manager (SETNX + TTL), atomic
   capacity commit under a row lock, booking state machine,
   Socket.io-equivalent live events via BroadcastChannel.
   ═══════════════════════════════════════════════════════════ */

interface UserAccount {
  id: string;
  role: Role;
  name: string;
  company?: string;
  email: string;
  phone: string;
  password: string;
  gstin?: string;
  businessType?: string;
  address?: string;
  avatarColor: string;
}

const SEED_USERS: UserAccount[] = [
  { id: 'u-admin-1', role: 'admin', name: 'CargoShare Admin', company: 'CargoShare Labs', email: 'admin@cargoshare.io', phone: '+91 90000 00001', password: 'admin123', address: 'Bengaluru', avatarColor: '#E8622C' },
  { id: 'u-trader-1', role: 'trader', name: 'Ananya Sharma', company: 'Sharma Exports', email: 'ananya@sharmaexports.in', phone: '+91 98123 45678', password: 'trader123', gstin: '27AABFS4426P1Z5', businessType: 'Exporter', address: 'Surat, Gujarat', avatarColor: '#0E6BA8' },
  { id: 'u-trader-2', role: 'trader', name: 'Rohit Mehta', company: 'Mehta Agro Foods', email: 'rohit@mehthaagro.in', phone: '+91 98765 43210', password: 'trader123', gstin: '24AAECM2230Q1Z2', businessType: 'Manufacturer', address: 'Nashik, Maharashtra', avatarColor: '#217A4B' },
  { id: 'u-lsp-1', role: 'lsp', name: 'Karthik Rao', company: 'Deccan Rail Freight', email: 'karthik@deccanrail.in', phone: '+91 99000 01111', password: 'lsp12345', address: 'Secunderabad, Telangana', avatarColor: '#7C3AED' },
  { id: 'u-lsp-2', role: 'lsp', name: 'Vikram Singh', company: 'Singh Roadways', email: 'vikram@singhroadways.in', phone: '+91 99000 02222', password: 'lsp12345', address: 'Delhi NCR', avatarColor: '#B4530A' },
  { id: 'u-lsp-3', role: 'lsp', name: 'Lakshmi Iyer', company: 'Coastal Shipping Co', email: 'lakshmi@coastalship.in', phone: '+91 99000 03333', password: 'lsp12345', address: 'Chennai, Tamil Nadu', avatarColor: '#0F766E' },
];

interface LockRecord { lockId: string; containerId: string; qty: number; userId: string; expiresAt: number }

interface StoreShape {
  // auth
  user: UserAccount | null;
  role: Role | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  registerTrader: (f: Omit<UserAccount, 'id' | 'role' | 'avatarColor'>) => Promise<{ ok: boolean; otp: string; error?: string }>;
  registerLsp: (f: RegisterLspForm) => Promise<{ ok: boolean; otp: string; error?: string }>;
  loginWithOtp: (phone: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
  requestOtp: (phone: string) => string;

  // marketplace
  containers: Container[];
  searchContainers: (q: SearchFilters) => Container[];
  liveCapacity: Record<string, number>; // containerId -> live locked qty

  // booking lifecycle
  bookings: Booking[];
  acquireLock: (containerId: string, qty: number) => { ok: boolean; lockId?: string; error?: string; expiresAt?: number };
  releaseLock: (lockId: string) => void;
  createPendingBooking: (input: PendingBookingInput) => Booking;
  updateBookingCargo: (bookingId: string, cargoDetails: CargoDetails) => void;
  confirmBooking: (bookingId: string, payment: { method: string; txnId: string }) => { ok: boolean; booking?: Booking; error?: string };
  failPayment: (bookingId: string) => void;
  getLockFor: (bookingId: string) => LockRecord | undefined;

  // chat
  messages: ChatMessage[];
  threads: { bookingId: string; unread: number }[];
  sendMessage: (bookingId: string, text: string, attachment?: { name: string; dataUrl: string; size: number }) => void;
  markThreadRead: (bookingId: string) => void;
  unreadCount: number;

  // LSP
  lspProfileFor: (userId: string) => LspApplicant | undefined;
  lspContainers: Container[];
  upsertContainer: (c: Partial<Container> & { containerRef?: string }) => void;
  deleteContainer: (id: string) => { ok: boolean; error?: string };
  toggleContainerStatus: (id: string) => void;

  // admin
  lspApplications: LspApplicant[];
  reviewApplication: (id: string, decision: 'approved' | 'rejected' | 'under_review', opts: { reason?: string; notes?: string; quality?: number }) => void;
  disputes: Dispute[];
  resolveDispute: (id: string, status: Dispute['status'], resolution: string) => void;
  raiseDispute: (bookingId: string, reason: string, description: string) => void;

  // notifications & toasts
  notifications: AppNotification[];
  notify: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsRead: () => void;
  toasts: Toast[];
  toast: (kind: Toast['kind'], title: string, message?: string) => void;
  dismissToast: (id: number) => void;

  // invoice
  invoiceFor: (booking: Booking) => InvoiceData;
}

export interface RegisterLspForm {
  name: string; companyName: string; email: string; phone: string; password: string;
  mode: 'rail' | 'road' | 'ship' | 'air'; licenseNumber: string; licenseDocName: string; licenseDocType: string;
  fleetDetails: string; fleetCount: number; hubLocations: string[];
  bankName: string; bankAccount: string; ifsc: string; upi?: string; address: string;
}

export interface SearchFilters {
  origin?: string; destination?: string; mode?: string; date?: string; minSpace?: number; cargo?: string;
}

export interface PendingBookingInput {
  containerId: string; qty: number; cargoDetails: CargoDetails; lockId: string;
}

export interface InvoiceData {
  invoiceNo: string; date: string; dueDate: string; gst: number; grandTotal: number;
  hsn: string; placeOfSupply: string; unitPrice: number; qty: number; unit: string;
}

const StoreCtx = createContext<StoreShape | null>(null);

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`cargoshare.${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};
const loadArr = <T,>(key: string, fallback: T[]): T[] => {
  try {
    const raw = localStorage.getItem(`cargoshare.${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};
const save = (key: string, value: unknown) => {
  try { localStorage.setItem(`cargoshare.${key}`, JSON.stringify(value)); } catch { /* quota */ }
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(() => load('user', SEED_USERS[1] as UserAccount | null));
  const [containers, setContainers] = useState<Container[]>(() => loadArr('containers', SEED_CONTAINERS));
  const [bookings, setBookings] = useState<Booking[]>(() => loadArr('bookings', SEED_BOOKINGS));
  const [applications, setApplications] = useState<LspApplicant[]>(() => loadArr('lspApplications', SEED_LSP_APPLICANTS));
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadArr('messages', seedMessages()));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadArr('notifications', seedNotifications()));
  const [disputes, setDisputes] = useState<Dispute[]>(() => loadArr('disputes', seedDisputes()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [locks, setLocks] = useState<LockRecord[]>([]);
  const [liveLocked, setLiveLocked] = useState<Record<string, number>>({});
  const channel = useRef<BroadcastChannel | null>(null);
  const toastId = useRef(0);

  // ── persistence
  useEffect(() => { save('user', user); }, [user]);
  useEffect(() => { save('containers', containers); }, [containers]);
  useEffect(() => { save('bookings', bookings); }, [bookings]);
  useEffect(() => { save('lspApplications', applications); }, [applications]);
  useEffect(() => { save('messages', messages); }, [messages]);
  useEffect(() => { save('notifications', notifications); }, [notifications]);
  useEffect(() => { save('disputes', disputes); }, [disputes]);

  // ── BroadcastChannel = our Socket.io stand-in for cross-tab live capacity
  useEffect(() => {
    try {
      channel.current = new BroadcastChannel('cargoshare-live');
      channel.current.onmessage = (ev) => {
        const msg = ev.data;
        if (msg?.type === 'capacity') {
          setContainers((prev) => prev.map((c) => c.id === msg.containerId ? { ...c, bookedCapacity: msg.bookedCapacity } : c));
        }
        if (msg?.type === 'locks') setLiveLocked(msg.locked);
        if (msg?.type === 'chat') setMessages((prev) => prev.some((m) => m.id === msg.message.id) ? prev : [...prev, msg.message]);
      };
      return () => channel.current?.close();
    } catch { /* unsupported */ }
  }, []);

  const broadcastCapacity = useCallback((containerId: string, bookedCapacity: number) => {
    setContainers((prev) => prev.map((c) => c.id === containerId ? { ...c, bookedCapacity } : c));
    channel.current?.postMessage({ type: 'capacity', containerId, bookedCapacity });
  }, []);

  // ── live marketplace drift: every ~6s simulate other traders booking tiny
  // increments so "live capacity" visibly moves (mirrors socket 'capacity:update')
  useEffect(() => {
    const t = setInterval(() => {
      setContainers((prev) => {
        const actives = prev.filter((c) => c.status === 'active' && c.totalCapacity - c.bookedCapacity > c.minBookingQty * 3);
        if (!actives.length) return prev;
        const pick = actives[Math.floor(Math.random() * actives.length)];
        const delta = pick.unit === 'TEU' ? 1 : Math.max(pick.minBookingQty, Math.round(pick.totalCapacity * 0.004));
        const booked = Math.min(pick.totalCapacity, pick.bookedCapacity + delta);
        channel.current?.postMessage({ type: 'capacity', containerId: pick.id, bookedCapacity: booked });
        return prev.map((c) => c.id === pick.id ? { ...c, bookedCapacity: booked, status: booked >= c.totalCapacity ? 'full' : c.status } : c);
      });
    }, 7000);
    return () => clearInterval(t);
  }, []);

  // ── lock bookkeeping: sweep expired locks (Redis TTL eviction equivalent)
  useEffect(() => {
    const t = setInterval(() => {
      setLocks((prev) => {
        const nowTs = Date.now();
        const alive = prev.filter((l) => l.expiresAt > nowTs);
        const expired = prev.filter((l) => l.expiresAt <= nowTs);
        expired.forEach((l) => {
          setBookings((bs) => bs.map((b) =>
            b.bookingStatus === 'payment_pending' && b.containerId === l.containerId && b.qtyBooked === l.qty
              ? { ...b, bookingStatus: 'cancelled', paymentStatus: 'failed' }
              : b));
        });
        return alive;
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const locked: Record<string, number> = {};
    locks.forEach((l) => { locked[l.containerId] = (locked[l.containerId] || 0) + l.qty; });
    setLiveLocked(locked);
    channel.current?.postMessage({ type: 'locks', locked });
  }, [locks]);

  const dismissToast = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  const toast = useCallback((kind: Toast['kind'], title: string, message?: string) => {
    const id = ++toastId.current;
    setToasts((p) => [...p.slice(-2), { id, kind, title, message }]);
    window.setTimeout(() => dismissToast(id), 5200);
  }, [dismissToast]);

  const notify = useCallback((n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications((p) => [{ ...n, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date().toISOString(), read: false }, ...p]);
  }, []);

  // ── auth
  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 650));
    const u = [...SEED_USERS, ...loadArr<UserAccount>('registeredUsers', [])]
      .find((x) => x.email.toLowerCase() === email.toLowerCase().trim());
    if (!u || u.password !== password) return { ok: false as const, error: 'Invalid email or password. Try demo accounts below.' };
    setUser(u);
    toast('success', `Welcome back, ${u.name.split(' ')[0]}`, u.role === 'trader' ? 'Find spare capacity and book it in minutes.' : u.role === 'lsp' ? 'Your manifest is up to date.' : 'Admin console unlocked.');
    return { ok: true as const };
  }, [toast]);

  const logout = useCallback(() => setUser(null), []);

  const registerTrader = useCallback(async (f: Omit<UserAccount, 'id' | 'role' | 'avatarColor'>) => {
    await new Promise((r) => setTimeout(r, 700));
    const registered = loadArr<UserAccount>('registeredUsers', []);
    if (registered.some((u) => u.email.toLowerCase() === f.email.toLowerCase()) || SEED_USERS.some((u) => u.email.toLowerCase() === f.email.toLowerCase())) {
      return { ok: false as const, otp: '', error: 'An account with this email already exists.' };
    }
    const newUser: UserAccount = { ...f, id: `u-trader-${Date.now()}`, role: 'trader', avatarColor: '#0E6BA8' };
    save('registeredUsers', [...registered, newUser]);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setUser(newUser);
    notify({ type: 'welcome', title: 'Welcome to CargoShare', body: 'Your trader account is active. Complete phone OTP to unlock payments.' });
    return { ok: true as const, otp };
  }, [notify]);

  const registerLsp = useCallback(async (f: RegisterLspForm) => {
    await new Promise((r) => setTimeout(r, 800));
    const registered = loadArr<UserAccount>('registeredUsers', []);
    if ([...registered, ...SEED_USERS].some((u) => u.email.toLowerCase() === f.email.toLowerCase())) {
      return { ok: false as const, otp: '', error: 'An account with this email already exists.' };
    }
    const newUser: UserAccount = {
      id: `u-lsp-${Date.now()}`, role: 'lsp', name: f.name, company: f.companyName,
      email: f.email, phone: f.phone, password: f.password, address: f.address, avatarColor: '#7C3AED',
    };
    save('registeredUsers', [...registered, newUser]);
    const application: LspApplicant = {
      id: `lsp-${Date.now()}`, userId: newUser.id, companyName: f.companyName, applicantName: f.name,
      email: f.email, phone: f.phone, address: f.address, mode: f.mode,
      licenseNumber: f.licenseNumber, licenseDocName: f.licenseDocName, licenseDocType: f.licenseDocType,
      fleetDetails: f.fleetDetails, fleetCount: f.fleetCount, hubLocations: f.hubLocations,
      bankName: f.bankName, bankAccount: f.bankAccount, ifsc: f.ifsc, upi: f.upi,
      approvalStatus: 'pending', appliedAt: new Date().toISOString(),
    };
    setApplications((p) => [application, ...p]);
    setUser(newUser);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    notify({ type: 'lsp_submitted', title: 'Application received', body: 'Your LSP application is pending admin review. Average decision time: 2 business days.' });
    return { ok: true as const, otp };
  }, [notify]);

  const requestOtp = useCallback((phone: string) => {
    void phone;
    return String(Math.floor(100000 + Math.random() * 900000));
  }, []);

  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    await new Promise((r) => setTimeout(r, 500));
    if (otp.length !== 6) return { ok: false as const, error: 'Enter the 6-digit code.' };
    const u = SEED_USERS.find((x) => x.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''));
    if (!u) return { ok: false as const, error: 'No account found for this phone number.' };
    setUser(u);
    return { ok: true as const };
  }, []);

  // ── search
  const searchContainers = useCallback((q: SearchFilters) => {
    const nowTs = Date.now();
    return containers
      .map((c) => ({ ...c, available: Math.max(0, c.totalCapacity - c.bookedCapacity - (liveLocked[c.id] || 0)) }))
      .filter((c) => {
        if (c.status !== 'active') return false;
        if (new Date(c.departure).getTime() < nowTs) return false;
        if (c.available <= 0) return false;
        const matchText = (hay: string, needle?: string) => !needle || hay.toLowerCase().includes(needle.toLowerCase().trim());
        if (!matchText(`${c.origin} ${c.originCode}`, q.origin)) return false;
        if (!matchText(`${c.destination} ${c.destinationCode}`, q.destination)) return false;
        if (q.mode && c.mode !== q.mode) return false;
        if (q.date && !c.departure.startsWith(q.date)) return false;
        if (q.minSpace && c.available < q.minSpace) return false;
        if (q.cargo && !c.cargoTypes.some((ct) => ct.toLowerCase().includes(q.cargo!.toLowerCase()))) return false;
        return true;
      })
      .sort((a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
  }, [containers, liveLocked]);

  // ── booking lifecycle (Redis SETNX-style lock)
  const acquireLockFn = useCallback((containerId: string, qty: number) => {
    const c = containers.find((x) => x.id === containerId);
    if (!c) return { ok: false as const, error: 'Container not found.' };
    if (c.status !== 'active') return { ok: false as const, error: 'This listing is no longer bookable.' };
    const avail = c.totalCapacity - c.bookedCapacity - (liveLocked[containerId] || 0);
    if (avail < qty) return { ok: false as const, error: `Only ${avail} ${c.unit} available right now.` };
    if (qty < c.minBookingQty) return { ok: false as const, error: `Minimum booking is ${c.minBookingQty} ${c.unit}.` };
    // SETNX: fail if the same user already holds a pending lock on this container
    if (locks.some((l) => l.containerId === containerId && l.userId === user?.id)) {
      return { ok: false as const, error: 'You already hold an active lock on this listing. Complete or release it first.' };
    }
    const lockId = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = Date.now() + 10 * 60 * 1000;
    setLocks((p) => [...p, { lockId, containerId, qty, userId: user?.id || 'anon', expiresAt }]);
    toast('lock', 'Space reserved', `${qty} ${c.unit} held for you for 10 minutes (Redis lock).`);
    return { ok: true as const, lockId, expiresAt };
  }, [containers, liveLocked, locks, user?.id, toast]);

  const releaseLockFn = useCallback((lockId: string) => {
    setLocks((p) => p.filter((l) => l.lockId !== lockId));
  }, []);

  const createPendingBooking = useCallback((input: PendingBookingInput): Booking => {
    const c = containers.find((x) => x.id === input.containerId)!;
    const total = Math.round(c.ratePerUnit * input.qty);
    const fee = Math.round(total * 0.025 * 100) / 100;
    const booking: Booking = {
      id: `b-${Date.now()}`,
      bookingRef: `CS-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      containerId: c.id, traderId: user?.id || 'u-trader-1', traderName: user?.company || user?.name || 'Trader',
      lspId: c.lspId, lspCompany: c.lspCompany,
      origin: c.origin, destination: c.destination, mode: c.mode, departure: c.departure,
      cargoDetails: input.cargoDetails, qtyBooked: input.qty, unit: c.unit,
      ratePerUnit: c.ratePerUnit, totalPrice: total, platformFee: fee,
      bookingStatus: 'payment_pending', paymentStatus: 'created', paymentMethod: '',
      invoiceNo: '', createdAt: new Date().toISOString(),
      lockExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
    setBookings((p) => [booking, ...p]);
    return booking;
  }, [containers, user]);

  const updateBookingCargo = useCallback((bookingId: string, cargoDetails: CargoDetails) => {
    setBookings((prev) => prev.map((b) => (b.id === bookingId && b.bookingStatus === 'payment_pending' ? { ...b, cargoDetails } : b)));
  }, []);

  const confirmBooking = useCallback((bookingId: string, payment: { method: string; txnId: string }) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return { ok: false as const, error: 'Booking not found.' };
    if (b.bookingStatus === 'confirmed') return { ok: true as const, booking: b };
    const c = containers.find((x) => x.id === b.containerId);
    const avail = c ? c.totalCapacity - c.bookedCapacity : 0;
    if (!c || avail < b.qtyBooked) {
      setBookings((prev) => prev.map((x) => x.id === bookingId ? { ...x, bookingStatus: 'cancelled', paymentStatus: 'refunded' } : x));
      return { ok: false as const, error: 'Capacity ran out while you were paying. Payment refunded automatically.' };
    }
    // Atomic capacity commit — mirrors `SELECT … FOR UPDATE` + decrement on the server
    broadcastCapacity(c.id, c.bookedCapacity + b.qtyBooked);
    const confirmed: Booking = {
      ...b, bookingStatus: 'confirmed', paymentStatus: 'captured',
      paymentMethod: payment.method, invoiceNo: `INV-${b.bookingRef}`,
    };
    setBookings((prev) => prev.map((x) => x.id === bookingId ? confirmed : x));
    // Release the user's Redis-style lock — space is now durably committed
    setLocks((p) => p.filter((l) => !(l.containerId === b.containerId && l.userId === (user?.id || 'anon'))));
    notify({ type: 'booking_confirmed', title: 'Booking confirmed', body: `${payment.txnId} · Invoice generated and available in My Bookings.` });
    return { ok: true as const, booking: confirmed };
  }, [bookings, containers, broadcastCapacity, notify, user?.id]);

  const failPayment = useCallback((bookingId: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    setBookings((prev) => prev.map((x) => x.id === bookingId ? { ...x, bookingStatus: 'cancelled', paymentStatus: 'failed' } : x));
    if (b) setLocks((p) => p.filter((l) => !(l.containerId === b.containerId && l.userId === (user?.id || 'anon'))));
    toast('error', 'Payment failed', 'Your reserved space has been released back to the marketplace.');
  }, [bookings, toast, user?.id]);

  const getLockFor = useCallback((bookingId: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    return b ? locks.find((l) => l.containerId === b.containerId && l.userId === (user?.id || 'anon')) : undefined;
  }, [bookings, locks, user?.id]);

  // ── chat
  const sendMessage = useCallback((bookingId: string, text: string, attachment?: { name: string; dataUrl: string; size: number }) => {
    const b = bookings.find((x) => x.id === bookingId);
    const lspUser = b ? SEED_USERS.find((u) => u.company === b.lspCompany) : undefined;
    const isTrader = user?.role === 'trader';
    const altUserId = isTrader ? (lspUser?.id || 'u-lsp-1') : (b?.traderId || 'u-trader-1');
    const altRole: 'lsp' | 'trader' = isTrader ? 'lsp' : 'trader';
    const msg: ChatMessage = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bookingId, senderId: user?.id || 'me', senderRole: user?.role || 'trader',
      text, attachmentName: attachment?.name, attachmentDataUrl: attachment?.dataUrl, attachmentSize: attachment?.size,
      timestamp: new Date().toISOString(), read: false,
    };
    setMessages((p) => [...p, msg]);
    channel.current?.postMessage({ type: 'chat', message: msg });

    // LSP/trader auto-reply so conversations feel alive (production: real socket peers)
    window.setTimeout(() => {
      const replies = [
        'Received, thank you! We will confirm gate-in slot timing today.',
        'Noted on our manifest. Please ensure cargo reaches the CFS 6 hours before cutoff.',
        'Copy that. Sending the revised arrival window once the rake departs.',
        'Acknowledged. Our ops team has flagged your cargo on the loading plan.',
      ];
      const reply: ChatMessage = {
        id: `m-${Date.now()}-r`, bookingId, senderId: altUserId, senderRole: altRole,
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date().toISOString(), read: false,
      };
      setMessages((p) => [...p, reply]);
      channel.current?.postMessage({ type: 'chat', message: reply });
      notify({ type: 'chat_message', title: altRole === 'lsp' ? 'New message from LSP' : 'New message from trader', body: reply.text.slice(0, 90) });
    }, 1800 + Math.random() * 1500);
  }, [bookings, user, notify]);

  const markThreadRead = useCallback((bookingId: string) => {
    setMessages((p) => p.map((m) => m.bookingId === bookingId ? { ...m, read: true } : m));
  }, []);

  const threads = useMemo(() => {
    const map = new Map<string, { bookingId: string; unread: number }>();
    messages.forEach((m) => {
      const t = map.get(m.bookingId) || { bookingId: m.bookingId, unread: 0 };
      if (!m.read && m.senderId !== user?.id) t.unread += 1;
      map.set(m.bookingId, t);
    });
    return [...map.values()];
  }, [messages, user?.id]);

  const unreadCount = useMemo(() => messages.filter((m) => !m.read && m.senderId !== user?.id).length, [messages, user?.id]);

  // ── LSP workspace
  const lspProfileFor = useCallback((userId: string) => applications.find((a) => a.userId === userId), [applications]);

  const lspContainers = useMemo(() => {
    if (!user || user.role !== 'lsp') return [];
    const lspIdsForUser = new Set<string>();
    // match seed LSPs by company; new registrants get a synthetic lspId = their user id
    if (user.company === 'Deccan Rail Freight') lspIdsForUser.add('lsp-1');
    if (user.company === 'Singh Roadways') lspIdsForUser.add('lsp-2');
    if (user.company === 'Coastal Shipping Co') lspIdsForUser.add('lsp-3');
    lspIdsForUser.add(user.id); // self-created listings
    return containers.filter((c) => lspIdsForUser.has(c.lspId));
  }, [containers, user]);

  const upsertContainer = useCallback((c: Partial<Container> & { containerRef?: string }) => {
    setContainers((prev) => {
      if (c.id) return prev.map((x) => (x.id === c.id ? { ...x, ...c } as Container : x));
      const lspId = user?.id || 'u-lsp-1';
      const newC: Container = {
        id: `c-${Date.now()}`,
        containerRef: c.containerRef || `NEW-${Math.floor(Math.random() * 10000)}`,
        mode: c.mode || 'road', lspId,
        lspCompany: user?.company || 'Your Fleet', lspQuality: 80, lspRating: 4.5, lspReviews: 0,
        origin: c.origin || 'Origin', originCode: c.originCode || 'ORG', destination: c.destination || 'Destination', destinationCode: c.destinationCode || 'DST',
        originLat: c.originLat ?? 19.07, originLng: c.originLng ?? 72.87,
        destinationLat: c.destinationLat ?? 28.61, destinationLng: c.destinationLng ?? 77.20,
        departure: c.departure || new Date(Date.now() + 3 * 86400_000).toISOString(),
        arrival: c.arrival || new Date(Date.now() + 5 * 86400_000).toISOString(),
        totalCapacity: c.totalCapacity || 20, bookedCapacity: 0,
        unit: c.unit || 'MT', ratePerUnit: c.ratePerUnit || 5000, minBookingQty: c.minBookingQty || 1,
        cutoff: c.cutoff || new Date(Date.now() + 2 * 86400_000).toISOString(),
        cargoTypes: c.cargoTypes || ['FMCG'], status: 'active',
      };
      return [newC, ...prev];
    });
    toast('success', 'Listing saved', 'Your spare capacity is now live for traders.');
  }, [toast, user]);

  const deleteContainer = useCallback((id: string) => {
    const hasActive = bookings.some((b) => b.containerId === id && ['confirmed', 'payment_pending'].includes(b.bookingStatus));
    if (hasActive) return { ok: false as const, error: 'Containers with active bookings cannot be removed.' };
    setContainers((p) => p.filter((c) => c.id !== id));
    toast('info', 'Listing removed');
    return { ok: true as const };
  }, [bookings, toast]);

  const toggleContainerStatus = useCallback((id: string) => {
    setContainers((p) => p.map((c) => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c));
  }, []);

  // ── admin
  const reviewApplication = useCallback((id: string, decision: 'approved' | 'rejected' | 'under_review', opts: { reason?: string; notes?: string; quality?: number }) => {
    setApplications((prev) => {
      const app = prev.find((a) => a.id === id);
      if (app) {
        notify({
          type: decision === 'approved' ? 'lsp_approved' : decision === 'rejected' ? 'lsp_rejected' : 'lsp_review',
          title: decision === 'approved' ? 'LSP application approved' : decision === 'rejected' ? 'LSP application rejected' : 'LSP application under review',
          body: `${app.companyName}${opts.reason ? ` — ${opts.reason}` : ''}`,
        });
      }
      return prev.map((a) => a.id === id ? {
        ...a, approvalStatus: decision,
        rejectionReason: decision === 'rejected' ? opts.reason : a.rejectionReason,
        inspectionNotes: opts.notes ?? a.inspectionNotes,
        dataQualityScore: opts.quality ?? a.dataQualityScore,
        reviewedAt: new Date().toISOString(),
      } : a);
    });
    toast(decision === 'approved' ? 'success' : decision === 'rejected' ? 'error' : 'info',
      decision === 'approved' ? 'Application approved' : decision === 'rejected' ? 'Application rejected' : 'Marked under review',
      'Decision recorded and applicant notified by email + SMS.');
  }, [notify, toast]);

  const raiseDispute = useCallback((bookingId: string, reason: string, description: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    setDisputes((p) => [{
      id: `d-${Date.now()}`, bookingId, bookingRef: b?.bookingRef || bookingId,
      raisedBy: user?.company || user?.name || 'Trader', reason, description,
      status: 'open', createdAt: new Date().toISOString(),
    }, ...p]);
    toast('info', 'Dispute raised', 'Our resolution team will pick this up within 24 hours.');
  }, [bookings, user, toast]);

  const resolveDispute = useCallback((id: string, status: Dispute['status'], resolution: string) => {
    setDisputes((p) => p.map((d) => d.id === id ? { ...d, status, resolution } : d));
    toast('success', 'Dispute updated', resolution.slice(0, 80));
  }, [toast]);

  const markNotificationsRead = useCallback(() => setNotifications((p) => p.map((n) => ({ ...n, read: true }))), []);

  // ── invoice computation (mirrors server pdfkit generation)
  const invoiceFor = useCallback((booking: Booking): InvoiceData => {
    const gst = Math.round((booking.totalPrice + booking.platformFee) * 0.18);
    return {
      invoiceNo: booking.invoiceNo || `INV-${booking.bookingRef}`,
      date: booking.createdAt,
      dueDate: booking.createdAt,
      gst, grandTotal: booking.totalPrice + booking.platformFee + gst,
      hsn: '9965', placeOfSupply: 'Gujarat (24)',
      unitPrice: booking.ratePerUnit, qty: booking.qtyBooked, unit: booking.unit,
    };
  }, []);

  const value: StoreShape = {
    user, role: user?.role ?? null,
    login, logout, registerTrader, registerLsp, loginWithOtp, requestOtp,
    containers, searchContainers, liveCapacity: liveLocked,
    bookings, acquireLock: acquireLockFn, releaseLock: releaseLockFn, createPendingBooking, updateBookingCargo,
    confirmBooking, failPayment, getLockFor,
    messages, threads, sendMessage, markThreadRead, unreadCount,
    lspProfileFor, lspContainers, upsertContainer, deleteContainer, toggleContainerStatus,
    lspApplications: applications, reviewApplication, disputes, resolveDispute, raiseDispute,
    notifications, notify, markNotificationsRead, toasts, toast, dismissToast,
    invoiceFor,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

function seedMessages(): ChatMessage[] {
  const t = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();
  return [
    { id: 'm-seed-1', bookingId: 'b-9001', senderId: 'u-lsp-1', senderRole: 'lsp', text: 'Namaste Ananya — your 40 MT rice is earmarked for wagon DRF-WGN-1042. Gate-in closes 06:00 on departure day.', timestamp: t(210), read: true },
    { id: 'm-seed-2', bookingId: 'b-9001', senderId: 'u-trader-1', senderRole: 'trader', text: 'Perfect. Our trailer will reach GIM ICD by 04:30 with e-way bills.', timestamp: t(198), read: true },
    { id: 'm-seed-3', bookingId: 'b-9001', senderId: 'u-lsp-1', senderRole: 'lsp', text: 'Copy that. Live weight bridge slot confirmed for 04:40–05:10. Any special lashing requirements?', timestamp: t(190), read: true },
    { id: 'm-seed-4', bookingId: 'b-9001', senderId: 'u-trader-1', senderRole: 'trader', text: 'Standard cross-strapping is fine. Sharing the packing list PDF here.', timestamp: t(181), read: true, attachmentName: 'packing-list-rice.pdf' },
    { id: 'm-seed-5', bookingId: 'b-9002', senderId: 'u-lsp-3', senderRole: 'lsp', text: 'Booking CS-2B7E9D10 received. Chennai CFS stuffing slot Friday 08:00–13:00 works for us.', timestamp: t(95), read: true },
    { id: 'm-seed-6', bookingId: 'b-9002', senderId: 'u-trader-1', senderRole: 'trader', text: 'Friday 08:00 works. We will pre-alert customs tonight.', timestamp: t(80), read: false },
  ];
}

function seedNotifications(): AppNotification[] {
  const t = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();
  return [
    { id: 'n-seed-1', type: 'capacity_alert', title: 'Space nearly gone', body: 'DRF-WGN-1042 (Gandhidham → Ludhiana) is 65% booked and filling fast.', timestamp: t(32), read: false },
    { id: 'n-seed-2', type: 'booking_confirmed', title: 'Booking confirmed', body: 'CS-8F3A21C4 · 40 MT Basmati Rice · Invoice INV-CS-8F3A21C4 is ready.', timestamp: t(400), read: false },
    { id: 'n-seed-3', type: 'payment_captured', title: 'Payment captured', body: '₹59,450 received via UPI for booking CS-8F3A21C4.', timestamp: t(400), read: true },
    { id: 'n-seed-4', type: 'price_drop', title: 'Rate drop on your route', body: 'Mundra → Colombo TEU rates dropped 4% this week.', timestamp: t(1500), read: true },
  ];
}

function seedDisputes(): Dispute[] {
  const t = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400_000).toISOString();
  return [
    { id: 'd-1', bookingId: 'b-8881', bookingRef: 'CS-77AA109C', raisedBy: 'Mehta Agro Foods', reason: 'Short delivery', description: 'Received 36 MT against 40 MT booked on booking CS-77AA109C. Weighbridge slips attached.', status: 'investigating', createdAt: t(2) },
    { id: 'd-2', bookingId: 'b-8842', bookingRef: 'CS-61F2B330', raisedBy: 'Kutch Textile Mills', reason: 'Damaged cargo', description: 'Two bales of cotton yarn torn during stuffing at Mundra CFS. Claim ₹48,000.', status: 'open', createdAt: t(0.8) },
    { id: 'd-3', bookingId: 'b-8701', bookingRef: 'CS-40D1E9A7', raisedBy: 'Singh Roadways', reason: 'Cargo not ready', description: 'Trader missed the gate-in window by 9 hours; detention charges ₹18,500 pending.', status: 'resolved', resolution: 'Detention waived 50%; trader counselled on cutoff discipline.', createdAt: t(9) },
  ];
}
