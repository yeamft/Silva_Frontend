/**
 * Modular rate-cards + catalog API — `/api/v1/rate-cards`, labor, equipment, materials.
 */
import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

export type CatalogResource = {
  id: string;
  programId: string;
  name: string;
  description: string | null;
  defaultUnit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MaterialResource = CatalogResource & {
  stockQuantity: number;
};

export type ModularRateCardStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "published"
  | "archived";

export type RateCardLineCategory = "labor" | "equipment" | "material";

export type RateCardLineItem = {
  id: string;
  rateCardId: string;
  category: RateCardLineCategory;
  laborActivityId: string | null;
  equipmentResourceId: string | null;
  materialId: string | null;
  resourceId: string | null;
  resourceName: string | null;
  unit: string;
  rate: number;
  overtimeMultiplier: number | null;
  minimumQty: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModularRateCard = {
  id: string;
  programId: string;
  name: string;
  status: ModularRateCardStatus;
  effectiveDate: string;
  endDate: string | null;
  currency: string;
  createdByUserId: string;
  approvedByUserId: string | null;
  lineItemCount?: number;
  lineItems?: RateCardLineItem[];
  approvalLog?: Array<{
    id: string;
    action: string;
    actorUserId: string;
    actorName: string | null;
    comment: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type RateCardSummary = {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  published: number;
  archived: number;
  pendingApproval: number;
  active: number;
};

async function call<T>(path: string, options?: Parameters<typeof apiFetch>[1]): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    throw asError(err);
  }
}

export const getLaborActivities = (includeInactive?: boolean) =>
  call<CatalogResource[]>(
    `/labor-activities${includeInactive ? "?includeInactive=true" : ""}`,
  );
export const createLaborActivity = (input: {
  name: string;
  description?: string | null;
  defaultUnit: string;
}) => call<CatalogResource>("/labor-activities", { method: "POST", body: input });
export const updateLaborActivity = (
  id: string,
  input: Partial<{ name: string; description: string | null; defaultUnit: string; isActive: boolean }>,
) => call<CatalogResource>(`/labor-activities/${id}`, { method: "PATCH", body: input });
export const deleteLaborActivity = (id: string) =>
  call(`/labor-activities/${id}`, { method: "DELETE" });

export const getEquipmentResources = (includeInactive?: boolean) =>
  call<CatalogResource[]>(
    `/equipment-resources${includeInactive ? "?includeInactive=true" : ""}`,
  );
export const createEquipmentResource = (input: {
  name: string;
  description?: string | null;
  defaultUnit: string;
}) => call<CatalogResource>("/equipment-resources", { method: "POST", body: input });
export const updateEquipmentResource = (
  id: string,
  input: Partial<{ name: string; description: string | null; defaultUnit: string; isActive: boolean }>,
) => call<CatalogResource>(`/equipment-resources/${id}`, { method: "PATCH", body: input });
export const deleteEquipmentResource = (id: string) =>
  call(`/equipment-resources/${id}`, { method: "DELETE" });

export const getMaterials = (includeInactive?: boolean) =>
  call<MaterialResource[]>(`/materials${includeInactive ? "?includeInactive=true" : ""}`);
export const createMaterial = (input: {
  name: string;
  description?: string | null;
  defaultUnit: string;
  stockQuantity?: number;
}) => call<MaterialResource>("/materials", { method: "POST", body: input });
export const updateMaterial = (
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    defaultUnit: string;
    stockQuantity: number;
    isActive: boolean;
  }>,
) => call<MaterialResource>(`/materials/${id}`, { method: "PATCH", body: input });
export const deleteMaterial = (id: string) => call(`/materials/${id}`, { method: "DELETE" });

export const getRateCards = (status?: string) =>
  call<ModularRateCard[]>(`/rate-cards${status && status !== "all" ? `?status=${status}` : ""}`);
export const getRateCardsSummary = () => call<RateCardSummary>("/rate-cards/summary");
export const getRateCard = (id: string) => call<ModularRateCard>(`/rate-cards/${id}`);
export const createRateCard = (input: {
  name: string;
  effectiveDate?: string;
  endDate?: string | null;
  currency?: string;
}) => call<ModularRateCard>("/rate-cards", { method: "POST", body: input });
export const updateRateCard = (
  id: string,
  input: Partial<{ name: string; effectiveDate: string; endDate: string | null; currency: string }>,
) => call<ModularRateCard>(`/rate-cards/${id}`, { method: "PATCH", body: input });

export const addRateCardLineItem = (
  cardId: string,
  input: {
    category: RateCardLineCategory;
    laborActivityId?: string | null;
    equipmentResourceId?: string | null;
    materialId?: string | null;
    unit?: string;
    rate: number;
    overtimeMultiplier?: number | null;
    minimumQty?: number | null;
    notes?: string | null;
  },
) => call<RateCardLineItem>(`/rate-cards/${cardId}/line-items`, { method: "POST", body: input });

export const updateRateCardLineItem = (
  cardId: string,
  lineId: string,
  input: Record<string, unknown>,
) =>
  call<RateCardLineItem>(`/rate-cards/${cardId}/line-items/${lineId}`, {
    method: "PATCH",
    body: input,
  });

export const deleteRateCardLineItem = (cardId: string, lineId: string) =>
  call(`/rate-cards/${cardId}/line-items/${lineId}`, { method: "DELETE" });

export const submitRateCard = (id: string) =>
  call<ModularRateCard>(`/rate-cards/${id}/submit`, { method: "POST" });
export const approveRateCard = (id: string) =>
  call<ModularRateCard>(`/rate-cards/${id}/approve`, { method: "POST" });
export const rejectRateCard = (id: string, comment: string) =>
  call<ModularRateCard>(`/rate-cards/${id}/reject`, { method: "POST", body: { comment } });
export const publishRateCard = (id: string) =>
  call<ModularRateCard>(`/rate-cards/${id}/publish`, { method: "POST" });
export const archiveRateCard = (id: string) =>
  call<ModularRateCard>(`/rate-cards/${id}/archive`, { method: "POST" });
export const restoreRateCard = (id: string) =>
  call<ModularRateCard>(`/rate-cards/${id}/restore`, { method: "POST" });
