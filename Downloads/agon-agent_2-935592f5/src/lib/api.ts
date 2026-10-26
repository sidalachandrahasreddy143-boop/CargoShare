/**
 * Thin client for the real CargoShare REST API (Express + Socket.io backend
 * in /server). The app is designed backend-first: when the API is reachable
 * it uses live data; when not, it falls back to a deterministic local engine
 * so the product experience is fully explorable offline (e.g. static preview).
 */
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

const TOKEN_KEY = 'cargoshare.jwt';

export const apiToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, opts: RequestInit = {}, timeoutMs = 4000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...opts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken.get() ? { Authorization: `Bearer ${apiToken.get()}` } : {}),
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.error || 'REQUEST_FAILED', body);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, public body: unknown) {
    super(code);
  }
}

export const api = {
  health: () => request<{ status: string }>('/api/health', {}, 2500),

  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  registerTrader: (payload: Record<string, unknown>) =>
    request<{ token: string; user: any }>('/api/auth/register/trader', { method: 'POST', body: JSON.stringify(payload) }),

  registerLsp: (payload: Record<string, unknown>) =>
    request<{ token: string; user: any }>('/api/auth/register/lsp', { method: 'POST', body: JSON.stringify(payload) }),

  searchContainers: (params: URLSearchParams) =>
    request<{ containers: any[] }>(`/api/containers/search?${params}`),

  lockBooking: (containerId: string, qty: number, cargoDetails: unknown) =>
    request('/api/bookings/lock', { method: 'POST', body: JSON.stringify({ containerId, qty, cargoDetails }) }),

  createOrder: (bookingId: string) =>
    request(`/api/bookings/${bookingId}/order`, { method: 'POST' }),

  confirmBooking: (bookingId: string, payload: Record<string, unknown>) =>
    request(`/api/bookings/${bookingId}/confirm`, { method: 'POST', body: JSON.stringify(payload) }),

  myBookings: () => request<{ bookings: any[] }>('/api/bookings/mine'),

  adminAnalytics: () => request('/api/admin/analytics'),
  adminLspApplications: (status?: string) =>
    request<{ applications: any[] }>(`/api/admin/lsp-applications${status ? `?status=${status}` : ''}`),
};

export const IS_FALLBACK = { current: false };
