const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
export const AI_API_URL = (import.meta.env.VITE_AI_URL as string | undefined) || 'http://localhost:4001';
const ACCESS_TOKEN_KEY = 'caloriepal_access_token';
const REFRESH_TOKEN_KEY = 'caloriepal_refresh_token';

/** Resolve a server-relative upload path (e.g. "/uploads/x.jpg") to a full URL. */
export function aiAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('blob:') || path.startsWith('data:')) return path;
  return `${AI_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Build a URL query string from a plain object, skipping undefined/empty values. */
export function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string | FormData;
}

/** Paths that should never trigger a refresh loop. */
function isAuthPath(path: string): boolean {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/logout')
  );
}

// Deduplicates concurrent 401s: only one refresh request runs at a time.
let refreshInFlight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;
        const data = (await response.json()) as { accessToken: string; refreshToken: string };
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Central auth-failure interceptor: clear credentials and notify the app. The
 * AuthContext listens for this event, sets the user to null, and ProtectedRoute
 * then redirects to /login.
 */
function handleAuthFailure(): void {
  clearTokens();
  window.dispatchEvent(new Event('caloriepal:unauthorized'));
}

async function request<T>(path: string, options: RequestOptions, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method,
    headers,
    body: options.body,
  });

  // Transparently refresh once on 401 for protected endpoints.
  if (response.status === 401 && retry && !isAuthPath(path)) {
    const newToken = await tryRefresh();
    if (newToken) return request<T>(path, options, false);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) handleAuthFailure();
    throw new ApiError(
      response.status,
      (data as { error?: string } | null)?.error ?? 'Something went wrong',
      (data as { details?: unknown } | null)?.details,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * Client for the standalone AI service (vision/text extraction + chat). It lives
 * on a separate port but reuses the same access token, so it shares the same
 * 401 interceptor: refresh once, retry, and on final failure log out + redirect.
 */
async function aiRequest<T>(path: string, options: RequestOptions, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${AI_API_URL}${path}`, {
      method: options.method,
      headers,
      body: options.body,
    });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the AI service at ${AI_API_URL}. Is it running? Start it with "./dev.sh" or "cd ai-services && npm run dev".`,
    );
  }

  // Interceptor: transparently refresh the access token once on 401, then retry.
  if (response.status === 401 && retry) {
    const newToken = await tryRefresh();
    if (newToken) return aiRequest<T>(path, options, false);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) handleAuthFailure();
    throw new ApiError(
      response.status,
      (data as { error?: string } | null)?.error ?? 'AI service error',
      (data as { details?: unknown } | null)?.details,
    );
  }

  return data as T;
}

export const aiApi = {
  get: <T>(path: string) => aiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    aiRequest<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
};
