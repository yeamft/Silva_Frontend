/**
 * Shared catalog import/export API client.
 */
import { API_BASE_URL } from "@/lib/api/config";
import { ApiError } from "@/lib/api/types";
import { readTokens, clearTokens } from "@/lib/api/token-storage";
import { refreshSession } from "@/lib/api/http";

export type CatalogResourceType = "labor" | "equipment" | "materials";

const PATHS: Record<CatalogResourceType, string> = {
  labor: "/labor-activities",
  equipment: "/equipment-resources",
  materials: "/materials",
};

export type CatalogImportPreviewRow = {
  rowNumber: number;
  name: string | null;
  description?: string | null;
  defaultUnit: string | null;
  stockQuantity?: number | null;
  status: "new" | "update" | "error";
  reason?: string;
  existingId?: string | null;
};

export type CatalogImportPreview = {
  catalogType: CatalogResourceType;
  validRows: CatalogImportPreviewRow[];
  errorRows: CatalogImportPreviewRow[];
  summary: {
    total: number;
    valid: number;
    errors: number;
    toCreate: number;
    toUpdate: number;
  };
};

export type CatalogImportCommitResult = {
  created: number;
  updated: number;
  total: number;
};

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

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

async function authHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  headers.set("Accept", "application/json");
  const tokens = readTokens();
  if (tokens?.accessToken) headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  if (typeof window !== "undefined" && window.location?.origin) {
    headers.set("X-App-Base-Url", window.location.origin);
  }
  return headers;
}

async function withRefreshRetry(run: () => Promise<Response>): Promise<Response> {
  let res = await run();
  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed?.accessToken) {
      res = await run();
    } else {
      clearTokens();
    }
  }
  return res;
}

export async function previewCatalogImport(
  resource: CatalogResourceType,
  file: File,
): Promise<CatalogImportPreview> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await withRefreshRetry(async () => {
      const headers = await authHeaders();
      // Let browser set multipart boundary — do not set Content-Type
      return fetch(`${API_BASE_URL}${PATHS[resource]}/import/preview`, {
        method: "POST",
        headers,
        body: form,
      });
    });
    if (!res.ok) throw await parseError(res);
    const json = await res.json();
    return (json?.data ?? json) as CatalogImportPreview;
  } catch (err) {
    throw asError(err);
  }
}

export async function commitCatalogImport(
  resource: CatalogResourceType,
  rows: CatalogImportPreviewRow[],
): Promise<CatalogImportCommitResult> {
  try {
    const res = await withRefreshRetry(async () => {
      const headers = await authHeaders({ "Content-Type": "application/json" });
      return fetch(`${API_BASE_URL}${PATHS[resource]}/import/commit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          rows: rows.map((r) => ({
            rowNumber: r.rowNumber,
            name: r.name,
            description: r.description ?? null,
            defaultUnit: r.defaultUnit,
            stockQuantity: r.stockQuantity,
          })),
        }),
      });
    });
    if (!res.ok) throw await parseError(res);
    const json = await res.json();
    return (json?.data ?? json) as CatalogImportCommitResult;
  } catch (err) {
    throw asError(err);
  }
}

export async function exportCatalog(
  resource: CatalogResourceType,
  filters?: { q?: string; isActive?: boolean },
): Promise<void> {
  try {
    const params = new URLSearchParams();
    if (filters?.q) params.set("q", filters.q);
    if (filters?.isActive === true) params.set("isActive", "true");
    if (filters?.isActive === false) params.set("isActive", "false");
    const qs = params.toString();
    const res = await withRefreshRetry(async () => {
      const headers = await authHeaders();
      return fetch(`${API_BASE_URL}${PATHS[resource]}/export${qs ? `?${qs}` : ""}`, {
        method: "GET",
        headers,
      });
    });
    if (!res.ok) throw await parseError(res);
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename = match?.[1] || `${resource}-export.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    throw asError(err);
  }
}
