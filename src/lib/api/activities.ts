/**
 * Read-only platform Activity taxonomy (labor / materials / services).
 */
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
  tier: number;
  category: string;
  name: string;
  unitOfMeasure: string;
  createdAt: string;
  updatedAt: string;
};

export type ListActivitiesParams = {
  tier?: number | "";
  category?: string;
  q?: string;
};

export const listActivities = (params: ListActivitiesParams = {}) => {
  const q = new URLSearchParams();
  if (params.tier != null && params.tier !== "") q.set("tier", String(params.tier));
  if (params.category) q.set("category", params.category);
  if (params.q) q.set("q", params.q);
  const qs = q.toString();
  return call<PlatformActivity[]>(`/activities${qs ? `?${qs}` : ""}`);
};

export const getActivity = (id: string) => call<PlatformActivity>(`/activities/${id}`);
