import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityAssignment,
  ActivityTemplate,
  FarmBlock,
  FarmSettings,
  LaborRole,
  Material,
  PlanChange,
  ProgressEntry,
} from "@/types/farm";

const SEED_VERSION = "farm-os-v1";

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const laborRoles: LaborRole[] = [
  { id: "lr-picker", name: "Cherry Picker", dailyRate: 250, currency: "ETB", active: true },
  { id: "lr-pruner", name: "Pruner", dailyRate: 280, currency: "ETB", active: true },
  { id: "lr-sprayer", name: "Sprayer / Applicator", dailyRate: 320, currency: "ETB", active: true },
  { id: "lr-supervisor", name: "Field Supervisor", dailyRate: 450, currency: "ETB", active: true },
  { id: "lr-general", name: "General Labor", dailyRate: 220, currency: "ETB", active: true },
];

const materials: Material[] = [
  { id: "mat-fert", sku: "FERT-NPK", name: "NPK Fertilizer", unit: "kg", unitCost: 85, stockQty: 4200, currency: "ETB", active: true },
  { id: "mat-compost", sku: "COMP-01", name: "Compost", unit: "kg", unitCost: 12, stockQty: 18000, currency: "ETB", active: true },
  { id: "mat-fung", sku: "CHEM-FUNG", name: "Copper Fungicide", unit: "L", unitCost: 420, stockQty: 180, currency: "ETB", active: true },
  { id: "mat-seed", sku: "SEED-SL14", name: "SL14 Seedlings", unit: "pcs", unitCost: 35, stockQty: 2500, currency: "ETB", active: true },
  { id: "mat-mulch", sku: "MULCH-01", name: "Mulch / Cover", unit: "bale", unitCost: 95, stockQty: 640, currency: "ETB", active: true },
];

const activityTemplates: ActivityTemplate[] = [
  {
    id: "act-prune",
    code: "PRUNE",
    name: "Pruning & Canopy Management",
    category: "Crop Care",
    baseDurationDays: 7,
    laborRoleIds: ["lr-pruner", "lr-general"],
    laborDaysPerHa: 4,
    materialNeeds: [],
    description: "Shape canopy and remove unproductive wood",
    active: true,
  },
  {
    id: "act-fert",
    code: "FERT",
    name: "Fertilizer Application",
    category: "Nutrition",
    baseDurationDays: 3,
    laborRoleIds: ["lr-general", "lr-supervisor"],
    laborDaysPerHa: 2,
    materialNeeds: [
      { materialId: "mat-fert", qtyPerHa: 120 },
      { materialId: "mat-compost", qtyPerHa: 400 },
    ],
    active: true,
  },
  {
    id: "act-spray",
    code: "SPRAY",
    name: "Disease Control Spray",
    category: "Plant Health",
    baseDurationDays: 2,
    laborRoleIds: ["lr-sprayer"],
    laborDaysPerHa: 1.5,
    materialNeeds: [{ materialId: "mat-fung", qtyPerHa: 2.5 }],
    active: true,
  },
  {
    id: "act-weed",
    code: "WEED",
    name: "Weeding & Mulching",
    category: "Crop Care",
    baseDurationDays: 5,
    laborRoleIds: ["lr-general"],
    laborDaysPerHa: 5,
    materialNeeds: [{ materialId: "mat-mulch", qtyPerHa: 8 }],
    active: true,
  },
  {
    id: "act-harvest",
    code: "HARVEST",
    name: "Selective Cherry Harvest",
    category: "Harvest",
    baseDurationDays: 14,
    laborRoleIds: ["lr-picker", "lr-supervisor"],
    laborDaysPerHa: 12,
    materialNeeds: [],
    active: true,
  },
  {
    id: "act-plant",
    code: "PLANT",
    name: "Gap Filling / Planting",
    category: "Establishment",
    baseDurationDays: 4,
    laborRoleIds: ["lr-general", "lr-supervisor"],
    laborDaysPerHa: 6,
    materialNeeds: [{ materialId: "mat-seed", qtyPerHa: 80 }],
    active: true,
  },
];

const blocks: FarmBlock[] = [
  {
    id: "blk-a1",
    code: "A-01",
    name: "Upper Slope North",
    hectares: 4.2,
    location: "North ridge · 1,920m",
    cropVariety: "Heirloom / Mixed Arabica",
    supervisorId: "u-sup",
    supervisorName: "Dawit Bekele",
    active: true,
  },
  {
    id: "blk-a2",
    code: "A-02",
    name: "River Bench",
    hectares: 3.1,
    location: "West creek · 1,860m",
    cropVariety: "SL14",
    supervisorId: "u-sup",
    supervisorName: "Dawit Bekele",
    active: true,
  },
  {
    id: "blk-b1",
    code: "B-01",
    name: "Shade Lot East",
    hectares: 5.5,
    location: "East shade corridor · 1,900m",
    cropVariety: "74110",
    supervisorId: "u-sup2",
    supervisorName: "Hanna Tadesse",
    active: true,
  },
  {
    id: "blk-b2",
    code: "B-02",
    name: "Nursery Adjacent",
    hectares: 2.4,
    location: "Near nursery · 1,880m",
    cropVariety: "Heirloom",
    supervisorId: "u-sup2",
    supervisorName: "Hanna Tadesse",
    active: true,
  },
  {
    id: "blk-c1",
    code: "C-01",
    name: "Lower Terrace",
    hectares: 6.0,
    location: "South terrace · 1,840m",
    cropVariety: "Mixed Arabica",
    supervisorId: "u-sup",
    supervisorName: "Dawit Bekele",
    active: true,
  },
];

function estimateCosts(template: ActivityTemplate, hectares: number) {
  const avgLaborRate =
    template.laborRoleIds.reduce((sum, id) => {
      const role = laborRoles.find((r) => r.id === id);
      return sum + (role?.dailyRate ?? 220);
    }, 0) / Math.max(template.laborRoleIds.length, 1);

  const plannedLaborDays = template.laborDaysPerHa * hectares;
  const plannedLaborCost = plannedLaborDays * avgLaborRate;
  const plannedMaterialCost = template.materialNeeds.reduce((sum, need) => {
    const mat = materials.find((m) => m.id === need.materialId);
    return sum + (mat?.unitCost ?? 0) * need.qtyPerHa * hectares;
  }, 0);

  return { plannedLaborDays, plannedLaborCost, plannedMaterialCost };
}

function buildAssignments(): ActivityAssignment[] {
  const plan: { blockId: string; templateId: string; startOffset: number; sequence: number; progress: number; status: ActivityAssignment["status"] }[] = [
    { blockId: "blk-a1", templateId: "act-prune", startOffset: -10, sequence: 1, progress: 100, status: "completed" },
    { blockId: "blk-a1", templateId: "act-fert", startOffset: -2, sequence: 2, progress: 60, status: "in_progress" },
    { blockId: "blk-a1", templateId: "act-weed", startOffset: 4, sequence: 3, progress: 0, status: "planned" },
    { blockId: "blk-a2", templateId: "act-spray", startOffset: -1, sequence: 1, progress: 40, status: "in_progress" },
    { blockId: "blk-a2", templateId: "act-harvest", startOffset: 8, sequence: 2, progress: 0, status: "planned" },
    { blockId: "blk-b1", templateId: "act-weed", startOffset: -5, sequence: 1, progress: 85, status: "in_progress" },
    { blockId: "blk-b1", templateId: "act-fert", startOffset: 2, sequence: 2, progress: 0, status: "planned" },
    { blockId: "blk-b2", templateId: "act-plant", startOffset: -3, sequence: 1, progress: 70, status: "in_progress" },
    { blockId: "blk-c1", templateId: "act-prune", startOffset: -12, sequence: 1, progress: 100, status: "completed" },
    { blockId: "blk-c1", templateId: "act-spray", startOffset: -4, sequence: 2, progress: 25, status: "rolled_over" },
    { blockId: "blk-c1", templateId: "act-harvest", startOffset: 10, sequence: 3, progress: 0, status: "planned" },
  ];

  return plan.map((row, idx) => {
    const block = blocks.find((b) => b.id === row.blockId)!;
    const template = activityTemplates.find((t) => t.id === row.templateId)!;
    const costs = estimateCosts(template, block.hectares);
    const plannedStart = daysFromToday(row.startOffset);
    const plannedEnd = addDays(plannedStart, template.baseDurationDays - 1);
    const actualLaborDays = costs.plannedLaborDays * (row.progress / 100);
    const actualLaborCost = costs.plannedLaborCost * (row.progress / 100);
    const actualMaterialCost = costs.plannedMaterialCost * (row.progress / 100);

    return {
      id: `asg-${idx + 1}`,
      blockId: row.blockId,
      templateId: row.templateId,
      name: template.name,
      sequence: row.sequence,
      plannedStart,
      plannedEnd,
      ...costs,
      status: row.status,
      actualStart: row.progress > 0 ? plannedStart : undefined,
      actualEnd: row.status === "completed" ? plannedEnd : undefined,
      progressPct: row.progress,
      actualLaborDays,
      actualLaborCost,
      actualMaterialCost,
      updatedAt: Date.now() - idx * 3600000,
    };
  });
}

const seedAssignments = buildAssignments();

const seedProgress: ProgressEntry[] = seedAssignments
  .filter((a) => a.progressPct > 0)
  .flatMap((a, i) => {
    const steps = Math.max(1, Math.round(a.progressPct / 25));
    return Array.from({ length: steps }, (_, step) => {
      const pct = Math.min(a.progressPct, (step + 1) * Math.round(a.progressPct / steps));
      return {
        id: `prog-${i}-${step}`,
        assignmentId: a.id,
        blockId: a.blockId,
        date: addDays(a.plannedStart, step),
        progressPct: pct,
        laborHours: Math.round((a.plannedLaborDays * 8 * (1 / steps)) * 10) / 10,
        materialCost: Math.round((a.plannedMaterialCost / steps) * 100) / 100,
        notes: step === 0 ? "Started field work" : "Daily progress update",
        enteredBy: "Dawit Bekele",
        createdAt: Date.now() - (i * 3 + step) * 86400000,
      } satisfies ProgressEntry;
    });
  });

const seedChanges: PlanChange[] = [
  {
    id: "chg-1",
    assignmentId: "asg-2",
    blockId: "blk-a1",
    field: "plannedEnd",
    fromValue: daysFromToday(0),
    toValue: daysFromToday(2),
    reason: "Rain delay — extend fertilizer window",
    costDelta: 1800,
    durationDeltaDays: 2,
    status: "pending",
    requestedBy: "Liya Gebremariam",
    requestedAt: Date.now() - 86400000,
  },
  {
    id: "chg-2",
    assignmentId: "asg-10",
    blockId: "blk-c1",
    field: "status",
    fromValue: "in_progress",
    toValue: "rolled_over",
    reason: "Unfinished spray rolled to next day",
    costDelta: 0,
    durationDeltaDays: 1,
    status: "approved",
    requestedBy: "System",
    requestedAt: Date.now() - 2 * 86400000,
    reviewedBy: "System Admin",
    reviewedAt: Date.now() - 2 * 86400000,
  },
];

interface FarmState {
  seedVersion: string;
  settings: FarmSettings;
  blocks: FarmBlock[];
  laborRoles: LaborRole[];
  materials: Material[];
  activityTemplates: ActivityTemplate[];
  assignments: ActivityAssignment[];
  progressEntries: ProgressEntry[];
  planChanges: PlanChange[];

  upsertBlock: (block: FarmBlock) => void;
  upsertLaborRole: (role: LaborRole) => void;
  upsertMaterial: (material: Material) => void;
  upsertTemplate: (template: ActivityTemplate) => void;
  assignActivity: (input: {
    blockId: string;
    templateId: string;
    plannedStart: string;
    sequence?: number;
  }) => ActivityAssignment | null;
  recordProgress: (input: {
    assignmentId: string;
    date: string;
    progressPct: number;
    laborHours: number;
    materialCost: number;
    notes?: string;
    enteredBy: string;
  }) => void;
  rolloverOverdue: () => number;
  requestChange: (input: Omit<PlanChange, "id" | "status" | "requestedAt">) => PlanChange;
  reviewChange: (id: string, status: "approved" | "rejected", reviewedBy: string) => void;
  getBlockBudget: (blockId: string) => {
    planned: number;
    actual: number;
    progressPct: number;
    remaining: number;
  };
  getFarmTotals: () => {
    planned: number;
    actual: number;
    blocksActive: number;
    overdue: number;
    pendingApprovals: number;
    avgProgress: number;
  };
}

function plannedTotal(a: ActivityAssignment) {
  return a.plannedLaborCost + a.plannedMaterialCost;
}

function actualTotal(a: ActivityAssignment) {
  return a.actualLaborCost + a.actualMaterialCost;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      seedVersion: SEED_VERSION,
      settings: {
        costApprovalThresholdPct: 10,
        durationApprovalThresholdDays: 2,
        farmName: "CropFort Coffee Estate",
        seasonLabel: "2026 Belg / Early harvest",
      },
      blocks,
      laborRoles,
      materials,
      activityTemplates,
      assignments: seedAssignments,
      progressEntries: seedProgress,
      planChanges: seedChanges,

      upsertBlock: (block) =>
        set((s) => {
          const exists = s.blocks.some((b) => b.id === block.id);
          return {
            blocks: exists ? s.blocks.map((b) => (b.id === block.id ? block : b)) : [...s.blocks, block],
          };
        }),

      upsertLaborRole: (role) =>
        set((s) => {
          const exists = s.laborRoles.some((r) => r.id === role.id);
          return {
            laborRoles: exists
              ? s.laborRoles.map((r) => (r.id === role.id ? role : r))
              : [...s.laborRoles, role],
          };
        }),

      upsertMaterial: (material) =>
        set((s) => {
          const exists = s.materials.some((m) => m.id === material.id);
          return {
            materials: exists
              ? s.materials.map((m) => (m.id === material.id ? material : m))
              : [...s.materials, material],
          };
        }),

      upsertTemplate: (template) =>
        set((s) => {
          const exists = s.activityTemplates.some((t) => t.id === template.id);
          return {
            activityTemplates: exists
              ? s.activityTemplates.map((t) => (t.id === template.id ? template : t))
              : [...s.activityTemplates, template],
          };
        }),

      assignActivity: ({ blockId, templateId, plannedStart, sequence }) => {
        const block = get().blocks.find((b) => b.id === blockId);
        const template = get().activityTemplates.find((t) => t.id === templateId);
        if (!block || !template) return null;

        const costs = estimateCosts(template, block.hectares);
        const plannedEnd = addDays(plannedStart, template.baseDurationDays - 1);
        const nextSeq =
          sequence ??
          Math.max(0, ...get().assignments.filter((a) => a.blockId === blockId).map((a) => a.sequence)) + 1;

        const assignment: ActivityAssignment = {
          id: `asg-${Date.now()}`,
          blockId,
          templateId,
          name: template.name,
          sequence: nextSeq,
          plannedStart,
          plannedEnd,
          ...costs,
          status: "planned",
          progressPct: 0,
          actualLaborDays: 0,
          actualLaborCost: 0,
          actualMaterialCost: 0,
          updatedAt: Date.now(),
        };

        set((s) => ({ assignments: [...s.assignments, assignment] }));
        return assignment;
      },

      recordProgress: ({ assignmentId, date, progressPct, laborHours, materialCost, notes, enteredBy }) => {
        const assignment = get().assignments.find((a) => a.id === assignmentId);
        if (!assignment) return;

        const entry: ProgressEntry = {
          id: `prog-${Date.now()}`,
          assignmentId,
          blockId: assignment.blockId,
          date,
          progressPct,
          laborHours,
          materialCost,
          notes,
          enteredBy,
          createdAt: Date.now(),
        };

        const laborCostAdd = (laborHours / 8) * 250;
        const nextProgress = Math.min(100, Math.max(assignment.progressPct, progressPct));
        const status =
          nextProgress >= 100 ? "completed" : nextProgress > 0 ? "in_progress" : assignment.status;

        set((s) => ({
          progressEntries: [entry, ...s.progressEntries],
          assignments: s.assignments.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  progressPct: nextProgress,
                  status,
                  actualStart: a.actualStart ?? date,
                  actualEnd: nextProgress >= 100 ? date : a.actualEnd,
                  actualLaborDays: a.actualLaborDays + laborHours / 8,
                  actualLaborCost: a.actualLaborCost + laborCostAdd,
                  actualMaterialCost: a.actualMaterialCost + materialCost,
                  updatedAt: Date.now(),
                }
              : a
          ),
        }));
      },

      rolloverOverdue: () => {
        const today = daysFromToday(0);
        const overdue = get().assignments.filter(
          (a) =>
            (a.status === "planned" || a.status === "in_progress" || a.status === "rolled_over") &&
            a.progressPct < 100 &&
            a.plannedEnd < today
        );
        if (overdue.length === 0) return 0;

        set((s) => ({
          assignments: s.assignments.map((a) => {
            const hit = overdue.find((o) => o.id === a.id);
            if (!hit) return a;
            const nextEnd = addDays(a.plannedEnd, 1);
            return {
              ...a,
              plannedEnd: nextEnd,
              status: "rolled_over" as const,
              updatedAt: Date.now(),
              notes: `${a.notes ? `${a.notes} · ` : ""}Rolled unfinished work to ${nextEnd}`,
            };
          }),
          planChanges: [
            ...overdue.map(
              (a, i): PlanChange => ({
                id: `chg-roll-${Date.now()}-${i}`,
                assignmentId: a.id,
                blockId: a.blockId,
                field: "plannedEnd",
                fromValue: a.plannedEnd,
                toValue: addDays(a.plannedEnd, 1),
                reason: "Automatic day rollover of unfinished work",
                costDelta: 0,
                durationDeltaDays: 1,
                status: "approved",
                requestedBy: "System",
                requestedAt: Date.now(),
                reviewedBy: "System",
                reviewedAt: Date.now(),
              })
            ),
            ...s.planChanges,
          ],
        }));
        return overdue.length;
      },

      requestChange: (input) => {
        const settings = get().settings;
        const needsApproval =
          Math.abs(input.costDelta) / 1000 > settings.costApprovalThresholdPct ||
          Math.abs(input.durationDeltaDays) >= settings.durationApprovalThresholdDays ||
          Math.abs(input.costDelta) > 0;

        // Threshold: cost delta above % of assignment planned, or duration days
        const assignment = get().assignments.find((a) => a.id === input.assignmentId);
        const planned = assignment ? plannedTotal(assignment) : 0;
        const costPct = planned > 0 ? (Math.abs(input.costDelta) / planned) * 100 : 0;
        const requireApproval =
          costPct >= settings.costApprovalThresholdPct ||
          Math.abs(input.durationDeltaDays) >= settings.durationApprovalThresholdDays;

        const change: PlanChange = {
          ...input,
          id: `chg-${Date.now()}`,
          status: requireApproval || needsApproval ? "pending" : "approved",
          requestedAt: Date.now(),
          reviewedBy: requireApproval ? undefined : "Auto",
          reviewedAt: requireApproval ? undefined : Date.now(),
        };

        set((s) => {
          let assignments = s.assignments;
          if (change.status === "approved") {
            assignments = applyChange(assignments, change);
          }
          return { planChanges: [change, ...s.planChanges], assignments };
        });

        return change;
      },

      reviewChange: (id, status, reviewedBy) => {
        set((s) => {
          const change = s.planChanges.find((c) => c.id === id);
          if (!change) return s;
          const updated: PlanChange = {
            ...change,
            status,
            reviewedBy,
            reviewedAt: Date.now(),
          };
          return {
            planChanges: s.planChanges.map((c) => (c.id === id ? updated : c)),
            assignments:
              status === "approved" ? applyChange(s.assignments, updated) : s.assignments,
          };
        });
      },

      getBlockBudget: (blockId) => {
        const rows = get().assignments.filter((a) => a.blockId === blockId);
        const planned = rows.reduce((s, a) => s + plannedTotal(a), 0);
        const actual = rows.reduce((s, a) => s + actualTotal(a), 0);
        const progressPct =
          rows.length === 0 ? 0 : Math.round(rows.reduce((s, a) => s + a.progressPct, 0) / rows.length);
        return { planned, actual, progressPct, remaining: Math.max(0, planned - actual) };
      },

      getFarmTotals: () => {
        const { assignments, blocks, planChanges } = get();
        const planned = assignments.reduce((s, a) => s + plannedTotal(a), 0);
        const actual = assignments.reduce((s, a) => s + actualTotal(a), 0);
        const today = daysFromToday(0);
        const overdue = assignments.filter(
          (a) => a.progressPct < 100 && a.plannedEnd < today && a.status !== "cancelled"
        ).length;
        const avgProgress =
          assignments.length === 0
            ? 0
            : Math.round(assignments.reduce((s, a) => s + a.progressPct, 0) / assignments.length);
        return {
          planned,
          actual,
          blocksActive: blocks.filter((b) => b.active).length,
          overdue,
          pendingApprovals: planChanges.filter((c) => c.status === "pending").length,
          avgProgress,
        };
      },
    }),
    {
      name: "cropfort-farm-os",
      version: 1,
      migrate: () =>
        ({
          seedVersion: SEED_VERSION,
          settings: {
            costApprovalThresholdPct: 10,
            durationApprovalThresholdDays: 2,
            farmName: "CropFort Coffee Estate",
            seasonLabel: "2026 Belg / Early harvest",
          },
          blocks,
          laborRoles,
          materials,
          activityTemplates,
          assignments: seedAssignments,
          progressEntries: seedProgress,
          planChanges: seedChanges,
        }) as FarmState,
    }
  )
);

function applyChange(assignments: ActivityAssignment[], change: PlanChange): ActivityAssignment[] {
  return assignments.map((a) => {
    if (a.id !== change.assignmentId) return a;
    if (change.field === "plannedEnd") {
      return { ...a, plannedEnd: change.toValue, updatedAt: Date.now() };
    }
    if (change.field === "plannedStart") {
      return { ...a, plannedStart: change.toValue, updatedAt: Date.now() };
    }
    if (change.field === "status") {
      return { ...a, status: change.toValue as ActivityAssignment["status"], updatedAt: Date.now() };
    }
    if (change.field === "notes") {
      return { ...a, notes: change.toValue, updatedAt: Date.now() };
    }
    return a;
  });
}

export function formatEtb(n: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(n);
}
