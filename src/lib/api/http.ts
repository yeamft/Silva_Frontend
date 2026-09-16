import { API_BASE_URL } from "./config";
import { clearTokens, readTokens, writeTokens, type AuthTokens } from "./token-storage";
import { ApiError } from "./types";

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Skip refresh retry (used by refresh itself). */
  skipRefresh?: boolean;
  headers?: Record<string, string>;
};

let refreshPromise: Promise<AuthTokens | null> | null = null;

async function parseError(res: Response): Promise<ApiError> {
  try {
    const json = await res.json();
    const err = json?.error;
    return new ApiError(
      res.status,
      err?.code || "HTTP_ERROR",
      err?.message || res.statusText || "Request failed",
      Array.isArray(err?.details) ? err.details : [],
    );
  } catch {
    return new ApiError(res.status, "HTTP_ERROR", res.statusText || "Request failed");
  }
}

async function refreshAccessToken(): Promise<AuthTokens | null> {
  const current = readTokens();
  if (!current?.refreshToken) {
    clearTokens();
    return null;
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const json = await res.json();
  const data = json?.data;
  if (!data?.accessToken || !data?.refreshToken) {
    clearTokens();
    return null;
  }

  const next: AuthTokens = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    sessionId: data.sessionId,
  };
  writeTokens(next);
  return next;
}

function enqueueRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth !== false) {
    const tokens = readTokens();
    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    headers["X-App-Base-Url"] = window.location.origin;
  }

  const res = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method: options.method || (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && options.auth !== false && !options.skipRefresh) {
    const refreshed = await enqueueRefresh();
    if (refreshed?.accessToken) {
      return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return (json?.data !== undefined ? json.data : json) as T;
}

export { enqueueRefresh as refreshSession };
