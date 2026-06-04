// Lightweight, typed HTTP client for the MySlotMate backend.
//
// - Base URL comes from VITE_API_BASE_URL (falls back to the local backend on :5000).
// - Bearer token is attached automatically from localStorage for authenticated calls.
// - The backend wraps successful responses as { success, data }; this unwraps `data`.
// - Non-2xx responses are thrown as ApiError carrying the status and server message.

const BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000'
).replace(/\/+$/, '');

const TOKEN_KEY = 'msm_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// ApiError surfaces the HTTP status and the server-provided message so callers
// (and the UI) can react to specific failures such as 401 Unauthorized.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Raised when an authenticated request fails because the session is missing,
// invalid, or expired. Lets the auth layer clear state and redirect to login.
export class UnauthorizedError extends ApiError {
  constructor(message = 'Session expired') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  // When true (default), attach the stored bearer token.
  auth?: boolean;
  // Plain object is JSON-encoded; string/FormData is sent as-is.
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, body, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || body instanceof FormData) {
      payload = body as BodyInit;
    } else {
      finalHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, { ...rest, headers: finalHeaders, body: payload });
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Check your connection and try again.');
  }

  // Parse body (may be empty for 204 etc.).
  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message = extractMessage(parsed) ?? response.statusText ?? 'Request failed';
    if (response.status === 401) {
      // Stale/invalid token — drop it so the app falls back to login.
      setToken(null);
      throw new UnauthorizedError(message);
    }
    throw new ApiError(response.status, message);
  }

  return unwrap<T>(parsed);
}

// The backend's standard envelope is { success, data, message, error }.
// Unwrap to `data` when present; otherwise return the parsed body as-is.
function unwrap<T>(parsed: unknown): T {
  if (parsed && typeof parsed === 'object' && 'success' in parsed) {
    const envelope = parsed as { data?: unknown };
    return (envelope.data ?? null) as T;
  }
  return parsed as T;
}

function extractMessage(parsed: unknown): string | null {
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as { error?: unknown; message?: unknown };
    if (typeof obj.error === 'string' && obj.error) return obj.error;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
  }
  if (typeof parsed === 'string' && parsed) return parsed;
  return null;
}

export const apiBaseUrl = BASE_URL;
