export const queryKeys = {
  activities: {
    all: ["activities"] as const,
    list: (params?: { tier?: number | ""; category?: string; q?: string }) =>
      [...queryKeys.activities.all, "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.activities.all, "detail", id] as const,
  },
  labor: {
    all: ["labor-activities"] as const,
    list: (includeInactive?: boolean) =>
      [...queryKeys.labor.all, "list", { includeInactive: !!includeInactive }] as const,
  },
  equipment: {
    all: ["equipment-resources"] as const,
    list: (includeInactive?: boolean) =>
      [...queryKeys.equipment.all, "list", { includeInactive: !!includeInactive }] as const,
  },
  materials: {
    all: ["materials"] as const,
    list: (includeInactive?: boolean) =>
      [...queryKeys.materials.all, "list", { includeInactive: !!includeInactive }] as const,
  },
  rateCards: {
    all: ["rate-cards"] as const,
    list: (status?: string) => [...queryKeys.rateCards.all, "list", status ?? "all"] as const,
    summary: () => [...queryKeys.rateCards.all, "summary"] as const,
    detail: (id: string) => [...queryKeys.rateCards.all, "detail", id] as const,
  },
  farms: {
    all: ["farms"] as const,
    list: () => [...queryKeys.farms.all, "list"] as const,
    activities: (farmId: string) => [...queryKeys.farms.all, "activities", farmId] as const,
    resolvedRate: (farmId: string, activityId: string) =>
      [...queryKeys.farms.all, "resolved-rate", farmId, activityId] as const,
  },
  benchmarkSurveys: {
    all: ["benchmark-surveys"] as const,
    list: (farmId: string, opts?: { activityId?: string; status?: string }) =>
      [...queryKeys.benchmarkSurveys.all, "list", farmId, opts ?? {}] as const,
    detail: (id: string) => [...queryKeys.benchmarkSurveys.all, "detail", id] as const,
  },
  standingCards: {
    all: ["standing-cards"] as const,
    labor: (farmId: string) => [...queryKeys.standingCards.all, "labor", farmId] as const,
    material: (farmId: string) => [...queryKeys.standingCards.all, "material", farmId] as const,
    service: (farmId: string) => [...queryKeys.standingCards.all, "service", farmId] as const,
  },
  users: {
    all: ["users"] as const,
    list: () => [...queryKeys.users.all, "list"] as const,
    meta: () => [...queryKeys.users.all, "meta"] as const,
    audit: (id: string) => [...queryKeys.users.all, "audit", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => [...queryKeys.notifications.all, "list"] as const,
  },
  programs: {
    all: ["programs"] as const,
    list: () => [...queryKeys.programs.all, "list"] as const,
  },
  orgMap: {
    all: ["org-map"] as const,
    blocks: () => [...queryKeys.orgMap.all, "blocks"] as const,
    organizations: () => [...queryKeys.orgMap.all, "organizations"] as const,
    farmAreas: () => [...queryKeys.orgMap.all, "farm-areas"] as const,
    vendors: () => [...queryKeys.orgMap.all, "vendors"] as const,
    assetOwners: () => [...queryKeys.orgMap.all, "asset-owners"] as const,
    overview: () => [...queryKeys.orgMap.all, "overview"] as const,
  },
} as const;
