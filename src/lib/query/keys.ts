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
    directory: () => [...queryKeys.users.all, "directory"] as const,
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
  workOrders: {
    all: ["work-orders"] as const,
    list: (params?: { status?: string; farmEstateId?: string }) =>
      [...queryKeys.workOrders.all, "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.workOrders.all, "detail", id] as const,
  },
  afes: {
    all: ["afes"] as const,
    list: (status?: string) => [...queryKeys.afes.all, "list", status ?? "all"] as const,
    detail: (id: string) => [...queryKeys.afes.all, "detail", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (status?: string) => [...queryKeys.projects.all, "list", status ?? "all"] as const,
    detail: (id: string) => [...queryKeys.projects.all, "detail", id] as const,
  },
  interventions: {
    all: ["interventions"] as const,
    list: (status?: string) => [...queryKeys.interventions.all, "list", status ?? "all"] as const,
    detail: (id: string) => [...queryKeys.interventions.all, "detail", id] as const,
  },
  planScenarios: {
    all: ["plan-scenarios"] as const,
    list: () => [...queryKeys.planScenarios.all, "list"] as const,
  },
  reports: {
    all: ["reports"] as const,
    list: (status?: string) => [...queryKeys.reports.all, "list", status ?? "all"] as const,
  },
  messageThreads: {
    all: ["message-threads"] as const,
    list: () => [...queryKeys.messageThreads.all, "list"] as const,
  },
  agreementConfig: {
    all: ["agreement-config"] as const,
    current: () => [...queryKeys.agreementConfig.all, "current"] as const,
  },
  paymentRequests: {
    all: ["payment-requests"] as const,
    list: (status?: string) =>
      [...queryKeys.paymentRequests.all, "list", status ?? "all"] as const,
    settlements: () => [...queryKeys.paymentRequests.all, "settlements"] as const,
  },
  weeklyPlans: {
    all: ["weekly-plans"] as const,
    list: (status?: string) => [...queryKeys.weeklyPlans.all, "list", status ?? "all"] as const,
    detail: (id: string) => [...queryKeys.weeklyPlans.all, "detail", id] as const,
  },
  monthlyWorkOrders: {
    all: ["monthly-work-orders"] as const,
    list: (status?: string) =>
      [...queryKeys.monthlyWorkOrders.all, "list", status ?? "all"] as const,
  },
  dailyFieldRecords: {
    all: ["daily-field-records"] as const,
    list: (status?: string) =>
      [...queryKeys.dailyFieldRecords.all, "list", status ?? "all"] as const,
  },
  directInstructions: {
    all: ["direct-instructions"] as const,
    list: (params?: { status?: string; monthlyWoId?: string }) =>
      [...queryKeys.directInstructions.all, "list", params ?? {}] as const,
    pending: (monthlyWoId: string) =>
      [...queryKeys.directInstructions.all, "pending", monthlyWoId] as const,
  },
  programmePlans: {
    all: ["programme-plans"] as const,
    list: (params?: {
      status?: string;
      farmEstateId?: string;
      planYear?: number;
      q?: string;
      includeArchived?: boolean;
      /** Workspace id — plans are scoped by active-program auth headers. */
      programId?: string | null;
    }) => [...queryKeys.programmePlans.all, "list", params ?? {}] as const,
  },
  auditLog: {
    all: ["audit-log"] as const,
    list: (params?: { entityType?: string; entityId?: string; limit?: number }) =>
      [...queryKeys.auditLog.all, "list", params ?? {}] as const,
  },
} as const;
