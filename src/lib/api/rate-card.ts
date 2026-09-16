/**
 * Rate Card API client — backed by `/api/v1/rate-card`.
 * Tenant/program is taken from the authenticated session on the server.
 */
import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";
import type {
  RateCardCategoryConfig,
  RateCardCategoryInput,
  RateCardLine,
  RateCardLineInput,
  RateCardStatus,
} from "@/types/cropfort-modules";

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

export async function getRateCardCategories(): Promise<RateCardCategoryConfig[]> {
  try {
    return await apiFetch<RateCardCategoryConfig[]>("/rate-card/categories");
  } catch (err) {
    throw asError(err);
  }
}

export async function createRateCardCategory(
  input: RateCardCategoryInput,
): Promise<RateCardCategoryConfig> {
  try {
    return await apiFetch<RateCardCategoryConfig>("/rate-card/categories", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function updateRateCardCategory(
  id: string,
  input: RateCardCategoryInput,
): Promise<RateCardCategoryConfig> {
  try {
    return await apiFetch<RateCardCategoryConfig>(`/rate-card/categories/${id}`, {
      method: "PATCH",
      body: input,
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function deleteRateCardCategory(id: string): Promise<void> {
  try {
    await apiFetch(`/rate-card/categories/${id}`, { method: "DELETE" });
  } catch (err) {
    throw asError(err);
  }
}

export async function getRateCardLines(): Promise<RateCardLine[]> {
  try {
    return await apiFetch<RateCardLine[]>("/rate-card/lines");
  } catch (err) {
    throw asError(err);
  }
}

export async function createRateCardLine(input: RateCardLineInput): Promise<RateCardLine> {
  try {
    return await apiFetch<RateCardLine>("/rate-card/lines", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function updateRateCardLine(
  id: string,
  input: RateCardLineInput,
): Promise<RateCardLine> {
  try {
    return await apiFetch<RateCardLine>(`/rate-card/lines/${id}`, {
      method: "PATCH",
      body: input,
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function deleteRateCardLine(id: string): Promise<void> {
  try {
    await apiFetch(`/rate-card/lines/${id}`, { method: "DELETE" });
  } catch (err) {
    throw asError(err);
  }
}

export async function submitRateCardLines(ids: string[]): Promise<{ submitted: number }> {
  try {
    return await apiFetch<{ submitted: number }>("/rate-card/lines/submit", {
      method: "POST",
      body: { ids },
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function approveRateCardLine(id: string): Promise<RateCardLine> {
  try {
    return await apiFetch<RateCardLine>(`/rate-card/lines/${id}/approve`, {
      method: "POST",
      body: {},
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function returnRateCardLine(id: string, comment: string): Promise<RateCardLine> {
  try {
    return await apiFetch<RateCardLine>(`/rate-card/lines/${id}/return`, {
      method: "POST",
      body: { comment },
    });
  } catch (err) {
    throw asError(err);
  }
}

export function getRateCardSummary(source: RateCardLine[]) {
  return {
    total: source.length,
    draft: source.filter((l) => l.status === "draft").length,
    submitted: source.filter((l) => l.status === "submitted").length,
    approved: source.filter((l) => l.status === "approved").length,
    returned: source.filter((l) => l.status === "returned").length,
    flagged: source.filter((l) => l.flagged).length,
  };
}

export type { RateCardStatus };
