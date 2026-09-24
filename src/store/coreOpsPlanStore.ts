import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listActivities } from "@/lib/api/activities";
import { listFarms, type FarmSummary } from "@/lib/api/benchmark-surveys";
import { getBlocks } from "@/lib/api/org-map";
import { listProgramRateCardProposals } from "@/lib/api/rate-card-proposals";
import { enrichActivityAxes } from "@/lib/cropfort/activity-axes";
import { resolveManualRef, resolveServiceType } from "@/lib/cropfort/activity-manuals";
import {
  PLAN_MONTHS,
  budgetYearLabel,
  type PlanMonth,
} from "@/lib/cropfort/ethiopian-year";
import { useSpendBandStore } from "@/store/spendBandStore";
import type {
  AfpPromotion,
  CoreOpsActivity,
  CoreOpsPlan,
  CoreOpsPlanStatus,
  CoreOpsStep,
  EligibleRateActivity,
  MonthIntensity,
  PlanBlockOption,
  PlanCompletion,
  ReviewIssue,
  ScheduleStatus,
  AfpPromotionStatus,
} from "@/types/core-ops";

const STORAGE_KEY = "cropfort.core-ops.plan.v2";

/** Offline / empty-API seed aligned with cropfortOpsStore Sheka estate. */
const DEMO_FARM_ID = "farm-1";

const DEMO_FARMS: FarmSummary[] = [
  {
    id: DEMO_FARM_ID,
    name: "Sheka Estate",
    approverUserId: null,
    status: "active",
    isApprover: true,
  },
];

const DEMO_BLOCKS: PlanBlockOption[] = [
  { id: "blk-sh01", code: "SH-01", name: "SH-01 Ridge", farmAreaId: DEMO_FARM_ID },
  { id: "blk-sh04", code: "SH-04", name: "SH-04 Riverside", farmAreaId: DEMO_FARM_ID },
  { id: "blk-sh07", code: "SH-07", name: "SH-07 Upper", farmAreaId: DEMO_FARM_ID },
  { id: "blk-sh09", code: "SH-09", name: "SH-09 Nursery", farmAreaId: DEMO_FARM_ID },
  { id: "blk-nur04", code: "NUR-04", name: "NUR-04", farmAreaId: DEMO_FARM_ID },
  { id: "blk-sh12", code: "SH-12", name: "SH-12 Terrace", farmAreaId: DEMO_FARM_ID },
  { id: "blk-t1032", code: "T1-032", name: "T1-032", farmAreaId: DEMO_FARM_ID },
  { id: "blk-can12", code: "CAN-12", name: "CAN-12", farmAreaId: DEMO_FARM_ID },
];

function demoEligibleForFarm(
  farmId: string,
  farmName: string | null,
): EligibleRateActivity[] {
  const approvedAt = "2026-09-03T14:30:00.000Z";
  return [
    {
      activityId: "act-prune",
      activityCode: "LAB-PRN",
      activityName: "Selective pruning",
      category: "Canopy",
      uom: "ha",
      costKind: "labor",
      rateCardId: "rc-demo-prune",
      unitRateEtb: 1850,
      normMdPerUnit: 12,
      farmEstateId: farmId,
      farmEstateName: farmName,
      approvedAt,
    },
    {
      activityId: "act-weed",
      activityCode: "LAB-WED",
      activityName: "Weeding cycle",
      category: "Weeding",
      uom: "ha",
      costKind: "labor",
      rateCardId: "rc-demo-weed",
      unitRateEtb: 410,
      normMdPerUnit: 8,
      farmEstateId: farmId,
      farmEstateName: farmName,
      approvedAt,
    },
    {
      activityId: "act-stump",
      activityCode: "LAB-STP",
      activityName: "Stumping",
      category: "Rehabilitation",
      uom: "ha",
      costKind: "labor",
      rateCardId: "rc-demo-stump",
      unitRateEtb: 3200,
      normMdPerUnit: 18,
      farmEstateId: farmId,
      farmEstateName: farmName,
      approvedAt,
    },
    {
      activityId: "act-fert",
      activityCode: "MAT-FER",
      activityName: "Fertilizer application",
      category: "Nutrition",
      uom: "ha",
      costKind: "materials",
      rateCardId: "rc-demo-fert",
      unitRateEtb: 2450,
      normMdPerUnit: null,
      farmEstateId: farmId,
      farmEstateName: farmName,
      approvedAt,
    },
    {
      activityId: "act-transplant",
      activityCode: "LAB-TRN",
      activityName: "Seedling transplant",
      category: "Nursery",
      uom: "md",
      costKind: "labor",
      rateCardId: "rc-demo-trn",
      unitRateEtb: 280,
      normMdPerUnit: 1,
      farmEstateId: farmId,
      farmEstateName: farmName,
      approvedAt,
    },
    {
      activityId: "act-road",
      activityCode: "SVC-RD",
      activityName: "Block road repair",
      category: "Access",
      uom: "km",
      costKind: "services",
      rateCardId: "rc-demo-road",
      unitRateEtb: 12500,
      normMdPerUnit: null,
      farmEstateId: farmId,
      farmEstateName: farmName,
      approvedAt,
    },
  ];
}

function uuid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function emptyIntensities(): Record<PlanMonth, MonthIntensity> {
  return Object.fromEntries(PLAN_MONTHS.map((m) => [m, "none"])) as Record<
    PlanMonth,
    MonthIntensity
  >;
}

/** blank → Light → Active → Peak → blank */
function cycleIntensity(cur: MonthIntensity): MonthIntensity {
  if (cur === "none") return "light";
  if (cur === "light") return "active";
  if (cur === "active") return "peak";
  return "none";
}

function isNurseryCategory(category: string) {
  return category.toLowerCase().includes("nursery");
}

export function recomputeActivity(act: CoreOpsActivity): CoreOpsActivity {
  const plannedQty = Math.max(0, act.plannedQty);
  const rate = act.agreedRate?.unitRateEtb ?? 0;
  const plannedCost = Math.round(plannedQty * rate * 100) / 100;
  const manualsRef =
    act.manualsRef?.trim() ||
    resolveManualRef({
      id: act.activityId,
      code: act.activityCode,
      name: act.activityName,
    });
  const serviceType =
    act.serviceType ||
    resolveServiceType({
      id: act.activityId,
      code: act.activityCode,
      name: act.activityName,
      category: act.category,
    });
  return { ...act, plannedQty, plannedCost, manualsRef, serviceType };
}

export function scheduleStatusOf(act: CoreOpsActivity): ScheduleStatus {
  const any = PLAN_MONTHS.some((m) => act.intensities[m] !== "none");
  return any ? "scheduled" : "not_scheduled";
}

export function scheduleLabel(act: CoreOpsActivity): string {
  const months = PLAN_MONTHS.filter((m) => act.intensities[m] !== "none");
  if (months.length === 0) return "Not scheduled";
  if (months.length === 1) {
    const labels: Record<PlanMonth, string> = {
      oct: "Oct",
      nov: "Nov",
      dec: "Dec",
      jan: "Jan",
      feb: "Feb",
      mar: "Mar",
      apr: "Apr",
      may: "May",
      jun: "Jun",
      jul: "Jul",
      aug: "Aug",
      sep: "Sep",
    };
    return labels[months[0]];
  }
  const labels: Record<PlanMonth, string> = {
    oct: "Oct",
    nov: "Nov",
    dec: "Dec",
    jan: "Jan",
    feb: "Feb",
    mar: "Mar",
    apr: "Apr",
    may: "May",
    jun: "Jun",
    jul: "Jul",
    aug: "Aug",
    sep: "Sep",
  };
  return `${labels[months[0]]}–${labels[months[months.length - 1]]}`;
}

function newEmptyPlan(
  farm: FarmSummary,
  yearGc: number,
  blockIds: string[],
  programBandSetId: string | null = null,
): CoreOpsPlan {
  const label = budgetYearLabel(yearGc);
  return {
    id: uuid("cop"),
    farmEstateId: farm.id,
    farmName: farm.name,
    budgetYearGc: yearGc,
    budgetYearLabel: label.label,
    programBandSetId,
    totalHa: 0,
    vendorLabel: "",
    notes: "",
    status: "draft",
    applicableBlockIds: blockIds,
    activityIds: [],
    activities: {},
    promotions: [],
    updatedAt: nowIso(),
  };
}

type CoreOpsPlanStore = {
  farms: FarmSummary[];
  blocks: PlanBlockOption[];
  eligible: EligibleRateActivity[];
  loading: boolean;
  error: string | null;
  plan: CoreOpsPlan | null;
  step: CoreOpsStep;
  focusActivityId: string | null;
  loadContext: () => Promise<void>;
  ensurePlan: (farmEstateId: string, yearGc?: number) => void;
  /** Replace live plan (e.g. apply a saved scenario). */
  replacePlan: (plan: CoreOpsPlan) => void;
  setStep: (s: CoreOpsStep) => void;
  setFocusActivityId: (id: string | null) => void;
  updatePlanMeta: (
    patch: Partial<
      Pick<
        CoreOpsPlan,
        | "totalHa"
        | "vendorLabel"
        | "notes"
        | "budgetYearGc"
        | "budgetYearLabel"
        | "farmEstateId"
        | "farmName"
        | "applicableBlockIds"
        | "programBandSetId"
      >
    >,
  ) => void;
  syncActivitiesFromEligible: () => void;
  setActivityIncluded: (activityRowId: string, included: boolean) => void;
  setActivitiesIncluded: (activityRowIds: string[], included: boolean) => number;
  setPlannedQty: (activityRowId: string, qty: number) => void;
  setActivitiesPlannedQty: (activityRowIds: string[], qty: number) => number;
  setBlockAllocations: (
    activityRowId: string,
    allocations: { blockId: string; blockCode: string; qty: number }[],
  ) => void;
  cycleMonthIntensity: (activityRowId: string, month: PlanMonth) => void;
  setMonthIntensity: (
    activityRowId: string,
    month: PlanMonth,
    intensity: MonthIntensity,
  ) => void;
  applySectionSchedule: (
    category: string,
    from: PlanMonth,
    to: PlanMonth,
    intensity: MonthIntensity,
  ) => void;
  applyScheduleToActivities: (
    activityRowIds: string[],
    from: PlanMonth,
    to: PlanMonth,
    intensity: MonthIntensity,
  ) => number;
  planCompletion: () => PlanCompletion;
  reviewIssues: () => ReviewIssue[];
  saveDraft: () => void;
  finalize: () => void;
  submitToAfps: () => AfpPromotion;
  decidePromotion: (
    id: string,
    status: Extract<AfpPromotionStatus, "approved" | "returned">,
    note?: string,
  ) => void;
  blocksForPlan: () => PlanBlockOption[];
  categories: () => string[];
  activitiesByCategory: (category: string) => CoreOpsActivity[];
};

export const useCoreOpsPlanStore = create<CoreOpsPlanStore>()(
  persist(
    (set, get) => ({
      farms: [],
      blocks: [],
      eligible: [],
      loading: false,
      error: null,
      plan: null,
      step: "setup",
      focusActivityId: null,

      setStep: (step) => set({ step }),
      setFocusActivityId: (focusActivityId) => set({ focusActivityId }),

      blocksForPlan: () => {
        const plan = get().plan;
        if (!plan) return [];
        const all = get().blocks;
        const forFarm = all.filter(
          (b) => !b.farmAreaId || b.farmAreaId === plan.farmEstateId,
        );
        const pool = forFarm.length > 0 ? forFarm : all;
        if (plan.applicableBlockIds.length === 0) return pool;
        const idSet = new Set(plan.applicableBlockIds);
        return pool.filter((b) => idSet.has(b.id));
      },

      categories: () => {
        const plan = get().plan;
        if (!plan) return [];
        const seen: string[] = [];
        for (const id of plan.activityIds) {
          const cat = plan.activities[id]?.category;
          if (cat && !seen.includes(cat)) seen.push(cat);
        }
        return seen;
      },

      activitiesByCategory: (category) => {
        const plan = get().plan;
        if (!plan) return [];
        return plan.activityIds
          .map((id) => plan.activities[id])
          .filter((a): a is CoreOpsActivity => Boolean(a && a.category === category));
      },

      loadContext: async () => {
        set({ loading: true, error: null });
        try {
          const [farmsRes, approvedRes, taxonomyRes, blocksRes] = await Promise.all([
            listFarms().catch(() => [] as FarmSummary[]),
            listProgramRateCardProposals({
              status: "approved",
              programWide: true,
            }).catch(() => [] as Awaited<ReturnType<typeof listProgramRateCardProposals>>),
            listActivities({ tier: 1 })
              .catch(() => listActivities({}).catch(() => [])),
            getBlocks().catch(() => [] as Awaited<ReturnType<typeof getBlocks>>),
          ]);

          let farms = farmsRes.length > 0 ? farmsRes : DEMO_FARMS;
          let blocks: PlanBlockOption[] =
            blocksRes.length > 0
              ? blocksRes.map((b) => ({
                  id: b.id,
                  code: b.code,
                  name: b.name,
                  farmAreaId: b.farmAreaId ?? null,
                }))
              : DEMO_BLOCKS.map((b) => ({
                  ...b,
                  farmAreaId: farms[0]?.id ?? DEMO_FARM_ID,
                }));

          const taxonomy = taxonomyRes;
          const coreOpsIds = new Set(
            taxonomy
              .filter(
                (a) =>
                  enrichActivityAxes(a).operationalArea === "core_ops" || a.tier === 1,
              )
              .map((a) => a.id),
          );
          const taxById = new Map(taxonomy.map((a) => [a.id, a]));

          const eligibleMap = new Map<string, EligibleRateActivity>();
          for (const card of approvedRes) {
            const farmId = card.farmEstateId || card.farmAreaId;
            if (!farmId) continue;
            if (coreOpsIds.size > 0 && !coreOpsIds.has(card.activityId)) continue;
            const key = `${farmId}:${card.activityId}`;
            const prev = eligibleMap.get(key);
            if (prev && (prev.approvedAt || "") >= (card.approvedAt || "")) continue;
            const tax = taxById.get(card.activityId);
            const axes = tax ? enrichActivityAxes(tax) : null;
            eligibleMap.set(key, {
              activityId: card.activityId,
              activityCode: card.activityCode || card.activityId,
              activityName: card.activityName || tax?.name || card.activityId,
              category: tax?.category || "Core Operations",
              uom: card.activityUnit || tax?.unitOfMeasure || "unit",
              costKind: card.kind || axes?.costKind || "labor",
              rateCardId: card.id,
              unitRateEtb: card.proposedRate,
              normMdPerUnit: card.norm,
              farmEstateId: farmId,
              farmEstateName: card.farmEstateName || null,
              approvedAt: card.approvedAt,
            });
          }

          let eligible = [...eligibleMap.values()];
          // Seed demo rates when API has none — cover every farm so setup works offline.
          if (eligible.length === 0) {
            eligible = farms.flatMap((f) => demoEligibleForFarm(f.id, f.name));
          } else {
            // Farms with zero approved rates still need a workable set.
            for (const f of farms) {
              const has = eligible.some((e) => e.farmEstateId === f.id);
              if (!has) {
                eligible = [...eligible, ...demoEligibleForFarm(f.id, f.name)];
              }
            }
          }

          eligible.sort(
            (a, b) =>
              a.category.localeCompare(b.category) ||
              a.activityName.localeCompare(b.activityName),
          );

          set({
            farms,
            blocks,
            eligible,
            loading: false,
            error: null,
          });

          const plan = get().plan;
          if (!plan && farms[0]) {
            get().ensurePlan(farms[0].id);
          } else if (plan) {
            const farm = farms.find((f) => f.id === plan.farmEstateId);
            if (!farm) {
              get().ensurePlan(farms[0].id, plan.budgetYearGc);
            } else {
              if (farm.name !== plan.farmName) {
                get().updatePlanMeta({ farmName: farm.name });
              }
              get().syncActivitiesFromEligible();
            }
          }
        } catch (err) {
          // Last-resort offline seed so the workspace stays usable.
          const farms = DEMO_FARMS;
          const blocks = DEMO_BLOCKS;
          const eligible = demoEligibleForFarm(DEMO_FARM_ID, farms[0].name);
          set({
            farms,
            blocks,
            eligible,
            loading: false,
            error: err instanceof Error ? err.message : "Using offline Core Ops data",
          });
          const plan = get().plan;
          if (!plan || !farms.some((f) => f.id === plan.farmEstateId)) {
            get().ensurePlan(farms[0].id);
          } else {
            get().syncActivitiesFromEligible();
          }
        }
      },

      ensurePlan: (farmEstateId, yearGc) => {
        const farm = get().farms.find((f) => f.id === farmEstateId);
        if (!farm) return;
        const year = yearGc ?? get().plan?.budgetYearGc ?? new Date().getFullYear();
        const existing = get().plan;
        if (
          existing &&
          existing.farmEstateId === farmEstateId &&
          existing.budgetYearGc === year
        ) {
          get().syncActivitiesFromEligible();
          return;
        }
        const farmBlocks = get().blocks.filter(
          (b) => !b.farmAreaId || b.farmAreaId === farmEstateId,
        );
        const blockIds = (farmBlocks.length > 0 ? farmBlocks : get().blocks).map((b) => b.id);
        const bandSet = useSpendBandStore.getState().getActiveSet();
        set({
          plan: newEmptyPlan(farm, year, blockIds, bandSet?.id ?? null),
          step: "setup",
        });
        get().syncActivitiesFromEligible();
      },

      replacePlan: (next) => {
        set({
          plan: { ...next, updatedAt: nowIso() },
          step: "review",
          focusActivityId: null,
        });
      },

      updatePlanMeta: (patch) => {
        const plan = get().plan;
        if (!plan) return;
        let next: CoreOpsPlan = { ...plan, ...patch, updatedAt: nowIso() };
        if (patch.budgetYearGc != null) {
          next.budgetYearLabel = budgetYearLabel(patch.budgetYearGc).label;
        }
        if (patch.farmEstateId && patch.farmEstateId !== plan.farmEstateId) {
          const farm = get().farms.find((f) => f.id === patch.farmEstateId);
          if (!farm) return;
          const farmBlocks = get().blocks.filter(
            (b) => !b.farmAreaId || b.farmAreaId === farm.id,
          );
          const blockIds = (farmBlocks.length > 0 ? farmBlocks : get().blocks).map(
            (b) => b.id,
          );
          next = {
            ...newEmptyPlan(
              farm,
              next.budgetYearGc,
              blockIds,
              plan.programBandSetId ??
                useSpendBandStore.getState().getActiveSet()?.id ??
                null,
            ),
            totalHa: patch.totalHa ?? plan.totalHa,
            vendorLabel: patch.vendorLabel ?? plan.vendorLabel,
            notes: patch.notes ?? plan.notes,
          };
          set({ plan: next });
          get().syncActivitiesFromEligible();
          return;
        }
        set({ plan: next });
      },

      syncActivitiesFromEligible: () => {
        const plan = get().plan;
        if (!plan) return;
        const farmEligible = get().eligible.filter(
          (e) => e.farmEstateId === plan.farmEstateId,
        );
        const activities = { ...plan.activities };
        const activityIds = [...plan.activityIds];
        const byActivityId = new Map(
          Object.values(activities).map((a) => [a.activityId, a.id] as const),
        );

        for (const e of farmEligible) {
          const existingRowId = byActivityId.get(e.activityId);
          if (existingRowId) {
            const row = activities[existingRowId];
            activities[existingRowId] = recomputeActivity({
              ...row,
              activityCode: e.activityCode,
              activityName: e.activityName,
              uom: e.uom,
              category: e.category,
              agreedRate: {
                rateCardId: e.rateCardId,
                unitRateEtb: e.unitRateEtb,
                costKind: e.costKind,
                normMdPerUnit: e.normMdPerUnit,
                approvedAt: e.approvedAt,
              },
            });
            continue;
          }
          const id = uuid("coa");
          const scope = isNurseryCategory(e.category) ? "off_block" : "block";
          let row: CoreOpsActivity = {
            id,
            category: e.category,
            activityId: e.activityId,
            activityCode: e.activityCode,
            activityName: e.activityName,
            uom: e.uom,
            scope,
            included: false,
            plannedQty: 0,
            blockAllocations: [],
            agreedRate: {
              rateCardId: e.rateCardId,
              unitRateEtb: e.unitRateEtb,
              costKind: e.costKind,
              normMdPerUnit: e.normMdPerUnit,
              approvedAt: e.approvedAt,
            },
            plannedCost: 0,
            intensities: emptyIntensities(),
            manualsRef: resolveManualRef({
              id: e.activityId,
              code: e.activityCode,
              name: e.activityName,
            }),
            serviceType: resolveServiceType({
              id: e.activityId,
              code: e.activityCode,
              name: e.activityName,
              category: e.category,
            }),
          };
          row = recomputeActivity(row);
          activities[id] = row;
          activityIds.push(id);
        }

        set({
          plan: {
            ...plan,
            activities,
            activityIds,
            updatedAt: nowIso(),
          },
        });
      },

      setActivityIncluded: (activityRowId, included) => {
        const plan = get().plan;
        if (!plan || !plan.activities[activityRowId]) return;
        const act = plan.activities[activityRowId];
        if (included && !act.agreedRate) return;
        let next = { ...act, included };
        if (included && next.plannedQty <= 0) {
          const defaultQty =
            next.uom === "ha"
              ? Math.max(1, plan.totalHa || 10)
              : next.uom === "md"
                ? 40
                : next.uom === "km"
                  ? 2
                  : 10;
          next = recomputeActivity({ ...next, plannedQty: defaultQty });
        }
        set({
          plan: {
            ...plan,
            activities: {
              ...plan.activities,
              [activityRowId]: next,
            },
            status: plan.status === "submitted" ? plan.status : "draft",
            updatedAt: nowIso(),
          },
        });
      },

      setActivitiesIncluded: (activityRowIds, included) => {
        const plan = get().plan;
        if (!plan || activityRowIds.length === 0) return 0;
        const activities = { ...plan.activities };
        let changed = 0;
        for (const id of activityRowIds) {
          const act = activities[id];
          if (!act) continue;
          if (included && !act.agreedRate) continue;
          if (act.included === included && !(included && act.plannedQty <= 0)) continue;
          let next = { ...act, included };
          if (included && next.plannedQty <= 0) {
            const defaultQty =
              next.uom === "ha"
                ? Math.max(1, plan.totalHa || 10)
                : next.uom === "md"
                  ? 40
                  : next.uom === "km"
                    ? 2
                    : 10;
            next = recomputeActivity({ ...next, plannedQty: defaultQty });
          }
          activities[id] = next;
          changed += 1;
        }
        if (changed === 0) return 0;
        set({
          plan: {
            ...plan,
            activities,
            status: plan.status === "submitted" ? plan.status : "draft",
            updatedAt: nowIso(),
          },
        });
        return changed;
      },

      setPlannedQty: (activityRowId, qty) => {
        const plan = get().plan;
        if (!plan || !plan.activities[activityRowId]) return;
        let act = { ...plan.activities[activityRowId], plannedQty: Math.max(0, qty) };
        // Keep a single allocation in sync when not split
        if (act.blockAllocations.length <= 1) {
          if (act.blockAllocations.length === 1) {
            act.blockAllocations = [
              { ...act.blockAllocations[0], qty: act.plannedQty },
            ];
          }
        }
        act = recomputeActivity(act);
        set({
          plan: {
            ...plan,
            activities: { ...plan.activities, [activityRowId]: act },
            status: plan.status === "submitted" ? plan.status : "draft",
            updatedAt: nowIso(),
          },
        });
      },

      setActivitiesPlannedQty: (activityRowIds, qty) => {
        const plan = get().plan;
        if (!plan || activityRowIds.length === 0) return 0;
        const plannedQty = Math.max(0, qty);
        const activities = { ...plan.activities };
        let changed = 0;
        for (const id of activityRowIds) {
          const prev = activities[id];
          if (!prev) continue;
          let act = { ...prev, plannedQty };
          if (act.blockAllocations.length === 1) {
            act.blockAllocations = [
              { ...act.blockAllocations[0], qty: plannedQty },
            ];
          }
          activities[id] = recomputeActivity(act);
          changed += 1;
        }
        if (changed === 0) return 0;
        set({
          plan: {
            ...plan,
            activities,
            status: plan.status === "submitted" ? plan.status : "draft",
            updatedAt: nowIso(),
          },
        });
        return changed;
      },

      setBlockAllocations: (activityRowId, allocations) => {
        const plan = get().plan;
        if (!plan || !plan.activities[activityRowId]) return;
        const plannedQty = allocations.reduce((s, a) => s + Math.max(0, a.qty), 0);
        let act = recomputeActivity({
          ...plan.activities[activityRowId],
          blockAllocations: allocations.map((a) => ({
            ...a,
            qty: Math.max(0, a.qty),
          })),
          plannedQty,
        });
        set({
          plan: {
            ...plan,
            activities: { ...plan.activities, [activityRowId]: act },
            updatedAt: nowIso(),
          },
        });
      },

      cycleMonthIntensity: (activityRowId, month) => {
        const plan = get().plan;
        if (!plan || !plan.activities[activityRowId]) return;
        const act = plan.activities[activityRowId];
        const intensities = {
          ...act.intensities,
          [month]: cycleIntensity(act.intensities[month]),
        };
        set({
          plan: {
            ...plan,
            activities: {
              ...plan.activities,
              [activityRowId]: { ...act, intensities },
            },
            updatedAt: nowIso(),
          },
        });
      },

      setMonthIntensity: (activityRowId, month, intensity) => {
        const plan = get().plan;
        if (!plan || !plan.activities[activityRowId]) return;
        const act = plan.activities[activityRowId];
        if (act.intensities[month] === intensity) return;
        set({
          plan: {
            ...plan,
            activities: {
              ...plan.activities,
              [activityRowId]: {
                ...act,
                intensities: { ...act.intensities, [month]: intensity },
              },
            },
            status: plan.status === "submitted" ? plan.status : "draft",
            updatedAt: nowIso(),
          },
        });
      },

      applySectionSchedule: (category, from, to, intensity) => {
        const plan = get().plan;
        if (!plan) return;
        const fromIdx = PLAN_MONTHS.indexOf(from);
        const toIdx = PLAN_MONTHS.indexOf(to);
        if (fromIdx < 0 || toIdx < 0) return;
        const lo = Math.min(fromIdx, toIdx);
        const hi = Math.max(fromIdx, toIdx);
        const activities = { ...plan.activities };
        for (const id of plan.activityIds) {
          const act = activities[id];
          if (!act?.included || act.category !== category) continue;
          const intensities = { ...act.intensities };
          for (let i = lo; i <= hi; i++) {
            intensities[PLAN_MONTHS[i]] = intensity;
          }
          activities[id] = { ...act, intensities };
        }
        set({ plan: { ...plan, activities, updatedAt: nowIso() } });
      },

      applyScheduleToActivities: (activityRowIds, from, to, intensity) => {
        const plan = get().plan;
        if (!plan || activityRowIds.length === 0) return 0;
        const fromIdx = PLAN_MONTHS.indexOf(from);
        const toIdx = PLAN_MONTHS.indexOf(to);
        if (fromIdx < 0 || toIdx < 0) return 0;
        const lo = Math.min(fromIdx, toIdx);
        const hi = Math.max(fromIdx, toIdx);
        const activities = { ...plan.activities };
        let changed = 0;
        for (const id of activityRowIds) {
          const act = activities[id];
          if (!act?.agreedRate) continue;
          const intensities = { ...act.intensities };
          for (let i = lo; i <= hi; i++) {
            intensities[PLAN_MONTHS[i]] = intensity;
          }
          let next: CoreOpsActivity = {
            ...act,
            included: true,
            intensities,
          };
          if (act.plannedQty <= 0) {
            const defaultQty =
              act.uom === "ha"
                ? Math.max(1, plan.totalHa || 10)
                : act.uom === "md"
                  ? 40
                  : act.uom === "km"
                    ? 2
                    : 10;
            next = recomputeActivity({ ...next, plannedQty: defaultQty });
          }
          activities[id] = next;
          changed += 1;
        }
        if (changed === 0) return 0;
        set({
          plan: {
            ...plan,
            activities,
            status: plan.status === "submitted" ? plan.status : "draft",
            updatedAt: nowIso(),
          },
        });
        return changed;
      },

      planCompletion: () => {
        const plan = get().plan;
        const empty: PlanCompletion = {
          eligibleCount: 0,
          includedCount: 0,
          ratesOkCount: 0,
          ratesNeededCount: 0,
          scheduledCount: 0,
          missingQtyCount: 0,
          unresolvedRateCount: 0,
          unscheduledCount: 0,
          budgetEtb: 0,
        };
        if (!plan) return empty;
        const eligibleCount = plan.activityIds.length;
        let includedCount = 0;
        let ratesOkCount = 0;
        let scheduledCount = 0;
        let missingQtyCount = 0;
        let unresolvedRateCount = 0;
        let unscheduledCount = 0;
        let budgetEtb = 0;
        for (const id of plan.activityIds) {
          const act = plan.activities[id];
          if (!act) continue;
          if (act.agreedRate) ratesOkCount += 1;
          if (!act.included) continue;
          includedCount += 1;
          budgetEtb += act.plannedCost;
          if (!act.agreedRate) unresolvedRateCount += 1;
          if (act.plannedQty <= 0) missingQtyCount += 1;
          if (scheduleStatusOf(act) === "scheduled") scheduledCount += 1;
          else unscheduledCount += 1;
        }
        return {
          eligibleCount,
          includedCount,
          ratesOkCount,
          ratesNeededCount: includedCount,
          scheduledCount,
          missingQtyCount,
          unresolvedRateCount,
          unscheduledCount,
          budgetEtb: Math.round(budgetEtb * 100) / 100,
        };
      },

      reviewIssues: () => {
        const plan = get().plan;
        if (!plan) return [];
        const issues: ReviewIssue[] = [];
        for (const id of plan.activityIds) {
          const act = plan.activities[id];
          if (!act?.included) continue;
          if (!act.agreedRate) {
            issues.push({
              id: `rate-${id}`,
              severity: "block",
              message: `${act.activityName} has no approved rate`,
              step: "activities",
              activityId: id,
            });
          }
          if (act.plannedQty <= 0) {
            issues.push({
              id: `qty-${id}`,
              severity: "block",
              message: `${act.activityName} needs a quantity`,
              step: "activities",
              activityId: id,
            });
          }
          if (scheduleStatusOf(act) === "not_scheduled") {
            issues.push({
              id: `sched-${id}`,
              severity: "warn",
              message: `${act.activityName} is not scheduled`,
              step: "calendar",
              activityId: id,
            });
          }
        }
        return issues;
      },

      saveDraft: () => {
        const plan = get().plan;
        if (!plan) return;
        set({
          plan: { ...plan, status: "draft" as CoreOpsPlanStatus, updatedAt: nowIso() },
        });
      },

      finalize: () => {
        const plan = get().plan;
        if (!plan) return;
        const blocking = get().reviewIssues().filter((i) => i.severity === "block");
        if (blocking.length > 0) {
          throw new Error(blocking[0].message);
        }
        const c = get().planCompletion();
        if (c.includedCount === 0) {
          throw new Error("Include at least one activity before finalizing");
        }
        set({ plan: { ...plan, status: "finalized", updatedAt: nowIso() } });
      },

      submitToAfps: () => {
        const plan = get().plan;
        if (!plan) throw new Error("No plan");
        const blocking = get().reviewIssues().filter((i) => i.severity === "block");
        if (blocking.length > 0) throw new Error(blocking[0].message);
        const c = get().planCompletion();
        if (c.includedCount === 0 || c.budgetEtb <= 0) {
          throw new Error("Plan has no cost to promote");
        }
        const missingManuals = Object.values(plan.activities).filter(
          (a) => a.included && !(a.manualsRef || "").trim(),
        );
        if (missingManuals.length) {
          throw new Error(
            `Upload a manual for every selected activity before submit (RB09.3): ${missingManuals
              .slice(0, 3)
              .map((a) => a.activityCode)
              .join(", ")}`,
          );
        }
        if (plan.status === "draft") {
          set({ plan: { ...plan, status: "finalized", updatedAt: nowIso() } });
        }
        const p = get().plan!;
        const band = useSpendBandStore.getState().bandForEtb(c.budgetEtb);
        const auto = useSpendBandStore.getState().bandAutoApproves(band);
        const promo: AfpPromotion = {
          id: uuid("afpp"),
          planId: p.id,
          totalEtb: c.budgetEtb,
          band,
          status: auto ? "auto_approved" : "pending_silva",
          createdAt: nowIso(),
          note: auto
            ? `Band ${band}: auto-approved into AFPs.`
            : `Band ${band}: sent to Silva for approval.`,
        };
        set({
          plan: {
            ...p,
            status: "submitted",
            promotions: [promo, ...p.promotions],
            updatedAt: nowIso(),
          },
        });
        return promo;
      },

      decidePromotion: (id, status, note) => {
        const plan = get().plan;
        if (!plan) return;
        const remark = note?.trim();
        set({
          plan: {
            ...plan,
            promotions: plan.promotions.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status,
                    note:
                      remark ||
                      (status === "approved"
                        ? `Band ${p.band}: approved by Silva.`
                        : `Band ${p.band}: returned for revision.`),
                  }
                : p,
            ),
            updatedAt: nowIso(),
          },
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        plan: s.plan,
        step: s.step,
      }),
    },
  ),
);
