/**
 * Wihda API Client
 * Connects directly to the backend (Cloudflare Workers / Hono.js).
 * Replaces the previous Supabase integration entirely.
 *
 * Base URL:
 *   - Development: http://localhost:8787  (run: cd Wihda-App-Backend && npm run dev)
 *   - Production:  set VITE_API_URL in .env to the deployed Cloudflare Workers URL
 */

export const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8787';

// ─── Token storage ─────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'wihda_access_token';
const REFRESH_TOKEN_KEY = 'wihda_refresh_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/** Store a restricted token (issued at signup / unverified login) */
export function setRestrictedToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── Token refresh ──────────────────────────────────────────────────────────────

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    if (data.success && data.data?.access_token) {
      setTokens(data.data.access_token, data.data.refresh_token);
      return data.data.access_token;
    }

    clearTokens();
    return null;
  } catch {
    return null;
  }
}

// ─── API Error class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code: string | undefined;
  data: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// ─── Main fetch wrapper ─────────────────────────────────────────────────────────

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  let token = getStoredToken();

  const makeRequest = async (t: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (t) {
      headers['Authorization'] = `Bearer ${t}`;
    }
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  };

  let res = await makeRequest(token);

  // Attempt token refresh on 401
  if (res.status === 401 && token) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      clearTokens();
    }
  }

  if (!res.ok) {
    let errData: any;
    try {
      errData = await res.json();
    } catch {
      errData = { message: `Request failed with status ${res.status}` };
    }

    const message = errData?.error?.message || errData?.message || `Request failed with status ${res.status}`;
    const code = errData?.error?.code;

    if (res.status === 401) {
      console.log(`Auth required for ${path} — not logged in or session expired`);
    } else {
      console.error(`API error ${res.status} on ${path}:`, errData);
    }

    throw new ApiError(message, res.status, code, errData);
  }

  return res.json();
}

// ─── File upload wrapper ────────────────────────────────────────────────────────

export async function apiUpload(path: string, formData: FormData): Promise<any> {
  let token = getStoredToken();

  const makeRequest = async (t: string | null) => {
    const headers: Record<string, string> = {};
    if (t) {
      headers['Authorization'] = `Bearer ${t}`;
    }
    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  };

  let res = await makeRequest(token);

  if (res.status === 401 && token) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      clearTokens();
    }
  }

  if (!res.ok) {
    let errData: any;
    try {
      errData = await res.json();
    } catch {
      errData = { message: `Upload failed with status ${res.status}` };
    }
    const message = errData?.error?.message || errData?.message || `Upload failed with status ${res.status}`;
    throw new ApiError(message, res.status, errData?.error?.code, errData);
  }

  return res.json();
}

// ─── Convenience: upload file directly to a presigned R2 URL ───────────────────

export async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload to presigned URL failed: ${res.status}`);
  }
}
