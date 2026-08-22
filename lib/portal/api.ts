import { API_BASE } from '../env.ts';
/**
 * The portal's API client.
 *
 * One wrapper, one job: attach the bearer token, and when the backend says the
 * access token has expired, refresh once and retry - without letting twenty
 * concurrent widgets each start their own refresh.
 *
 * WHY SINGLE-FLIGHT IS LOAD-BEARING HERE, not just an optimisation. The refresh
 * endpoint ROTATES and treats a replayed token as a compromise: presenting a
 * refresh token that has already been exchanged revokes the whole token family.
 * A dashboard that fires five requests at once, gets five 401s, and starts five
 * refreshes would have four of them present the same token the first already
 * spent - and the backend would correctly sign the resident out of everything.
 * So exactly one refresh runs, and the rest wait on it.
 */

import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokens';



export const LOGIN_PATH = '/portal/login';

/** In-flight refresh, shared by every caller that arrives while it runs. */
let refreshInFlight: Promise<string | null> | null = null;

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  /**
   * The first human-readable message the backend offered, if any.
   *
   * DRF returns either `{detail: "..."}` or `{field: ["..."]}`, and a form that
   * renders `[object Object]` at someone trying to pay their rent is worse than
   * one that says nothing.
   */
  get userMessage(): string | null {
    const data = this.data;
    if (typeof data === 'string') return data;
    if (!data || typeof data !== 'object') return null;

    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;

    for (const value of Object.values(record)) {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
    return null;
  }
}

function endSession() {
  clearTokens();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith(LOGIN_PATH)) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Full navigation deliberately: this runs inside the fetch wrapper, which
    // has no React context and therefore no router. It also has to tear down
    // whatever component state was mid-render when the session died.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${LOGIN_PATH}?next=${next}`;
  }
}

async function runRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const response = await fetch(`${API_BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) return null;

  // The endpoint answers `{tokens: {access, refresh}}`, and BOTH are stored -
  // see the note in tokens.ts about rotation.
  const body = (await response.json()) as { tokens?: { access: string; refresh: string } };
  if (!body.tokens?.access || !body.tokens?.refresh) return null;

  saveTokens(body.tokens);
  return body.tokens.access;
}

function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

type FetchOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/**
 * Call the API as the signed-in resident.
 *
 * `path` is relative to the API root: `apiFetch('/portal/maintenance/')`.
 */
export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, headers: initialHeaders, ...rest } = options;

  const buildRequest = (token: string | null): RequestInit => {
    const headers = new Headers(initialHeaders);
    if (token) headers.set('Authorization', `Bearer ${token}`);

    // FormData sets its own multipart boundary; setting the header by hand
    // produces a boundary-less content type and the upload silently arrives empty.
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return {
      ...rest,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    };
  };

  const url = `${API_BASE}${path}`;
  let response = await fetch(url, buildRequest(getAccessToken()));

  if (response.status === 401 && getRefreshToken()) {
    const token = await refreshOnce();
    if (!token) {
      endSession();
      throw new ApiError(401, null, 'Your session has ended. Please sign in again.');
    }
    response = await fetch(url, buildRequest(token));
    if (response.status === 401) {
      endSession();
      throw new ApiError(401, null, 'Your session has ended. Please sign in again.');
    }
  }

  if (response.status === 204) return undefined as T;

  const payload = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) throw new ApiError(response.status, payload);
  return payload as T;
}

/**
 * Sign in. Deliberately not routed through `apiFetch` - there is no session to
 * attach yet, and a 401 here means "wrong password", not "token expired".
 */
export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, payload);

  const { user, tokens } = payload as {
    user: PortalUser;
    tokens: { access: string; refresh: string };
  };
  saveTokens(tokens);
  return user;
}

export function logout() {
  clearTokens();
  // Full navigation so nothing cached in a client component survives the sign
  // out - a router push would keep the tree, and the previous resident's data
  // with it.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (typeof window !== 'undefined') window.location.href = LOGIN_PATH;
}

export type PortalUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'ACCOUNTANT' | 'CLIENT';
  is_email_verified: boolean;
  onboarding_completed?: boolean;
  preferences?: Record<string, unknown>;
};
