/** Platform Activity taxonomy (labor / materials / services). */
import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

async function call<T>(path: string, options?: Parameters<typeof apiFetch>[1]): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    throw asError(err);
  }
}

export type PlatformActivity = {
  id: string;
  code: string;
  tier: number;
  category: string;
  subgroup?: string;
  name: string;
  nameAm?: string;
  unitOfMeasure: string;
  description?: string;
  defaultAnnualFrequency?: number | null;
  planningCategory?: string | null;
  planningNotes?: string;
  active?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
};

export type ListActivitiesParams = {
  tier?: number | "";
  category?: string;
  q?: string;
  includeInactive?: boolean;
};

export type CreateActivityInput = {
  code: string;
  name: string;
  nameAm?: string;
  tier: 1 | 2 | 3;
  category: string;
  subgroup?: string;
  unitOfMeasure: string;
  description?: string;
  defaultAnnualFrequency?: number | null;
  planningCategory?: string;
  planningNotes?: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpdateActivityInput = Partial<CreateActivityInput>;

export const listActivities = (params: ListActivitiesParams = {}) => {
  const q = new URLSearchParams();
  if (params.tier != null && params.tier !== "") q.set("tier", String(params.tier));
  if (params.category) q.set("category", params.category);
  if (params.q) q.set("q", params.q);
  if (params.includeInactive) q.set("includeInactive", "1");
  const qs = q.toString();
  return call<PlatformActivity[]>(`/activities${qs ? `?${qs}` : ""}`);
};

export const getActivity = (id: string) => call<PlatformActivity>(`/activities/${id}`);

export const createActivity = (payload: CreateActivityInput) =>
  call<PlatformActivity>("/activities", {
    method: "POST",
    body: payload,
  });

export const updateActivity = (id: string, patch: UpdateActivityInput) =>
  call<PlatformActivity>(`/activities/${id}`, {
    method: "PATCH",
    body: patch,
  });

export const bulkUpdateActivities = (ids: string[], patch: UpdateActivityInput) =>
  call<PlatformActivity[]>("/activities/bulk", {
    method: "PATCH",
    body: { ids, patch },
  });

export const deactivateActivities = (ids: string[]) =>
  call<{ deactivatedCount: number }>("/activities/bulk/deactivate", {
    method: "POST",
    body: { ids },
  });

export type ActivityWorkbookImportRow = Omit<CreateActivityInput, "tier"> & {
  tier: number | null;
  sourceRow: number;
};

export type ActivityWorkbookImportPreview = {
  newActivities: ActivityWorkbookImportRow[];
  matches: (ActivityWorkbookImportRow & { existingId: string; existingActive: boolean })[];
  conflicts: (ActivityWorkbookImportRow & {
    existingId: string;
    existing: Partial<PlatformActivity>;
  })[];
  invalid: (ActivityWorkbookImportRow & { reason: string })[];
  aggregates: ActivityWorkbookImportRow[];
};

export function previewActivityWorkbookImport(file: File) {
  const body = new FormData();
  body.append("file", file);
  return call<ActivityWorkbookImportPreview>("/activities/import/preview", {
    method: "POST",
    body,
  });
}

export function commitActivityWorkbookImport(activities: CreateActivityInput[]) {
  return call<{ importedCount: number }>("/activities/import/commit", {
    method: "POST",
    body: { activities },
  });
}
