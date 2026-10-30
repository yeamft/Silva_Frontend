/**
 * Files attached to a programme plan — `/api/v1/programme-plans/:id/files`.
 */
import { apiFetch, refreshSession } from "@/lib/api/http";
import { API_BASE_URL } from "@/lib/api/config";
import { readTokens } from "@/lib/api/token-storage";
import { ApiError } from "@/lib/api/types";

export type PlanFileDto = {
  id: string;
  planId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string | null;
  createdAt: string;
};

/** Types the server accepts (kept in step with middleware/uploadPlanFile.js). */
export const PLAN_FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic,.zip,.kml,.kmz";
export const PLAN_FILE_MAX_MB = 10;

const base = (planId: string) => `/programme-plans/${encodeURIComponent(planId)}/files`;

/** Authenticated request that isn't JSON (multipart upload, binary download). */
async function request(url: string, options: RequestInit = {}) {
  const run = () => {
    const headers = new Headers(options.headers);
    const tokens = readTokens();
    if (tokens?.accessToken) headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    return fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  };
  let response = await run();
  if (response.status === 401) {
    const tokens = await refreshSession();
    if (tokens?.accessToken) response = await run();
  }
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new ApiError(response.status, json?.error?.code || "HTTP_ERROR", json?.error?.message || "Could not transfer the file");
  }
  return response;
}

export function listPlanFiles(planId: string) {
  return apiFetch<PlanFileDto[]>(base(planId));
}

export async function uploadPlanFile(planId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await request(base(planId), { method: "POST", body: form });
  return (await response.json()).data as PlanFileDto;
}

export function deletePlanFile(planId: string, fileId: string) {
  return apiFetch<{ id: string }>(`${base(planId)}/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

export async function downloadPlanFile(planId: string, file: Pick<PlanFileDto, "id" | "fileName">) {
  const response = await request(`${base(planId)}/${encodeURIComponent(file.id)}`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
