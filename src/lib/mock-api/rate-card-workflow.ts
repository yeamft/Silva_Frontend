/**
 * Rate workflow mock API.
 * Benchmark Survey = neighbor evidence (lock → recommended).
 * Rate Card = standing-shaped form referencing a locked survey → Silva approve → Standing.
 * Resolver: standing → fallback → norm×wage (labor).
 */
import type {
  BenchmarkSurveyRecord,
  EligibleChecker,
  RateCardProposal,
  ResolutionResult,
  ResolutionStep,
  StandingKind,
  StandingLineRecord,
  WorkflowActivity,
  WorkflowAuditEvent,
  WorkflowBlock,
  WorkflowBudgetYear,
  WorkflowContextFilters,
  WorkflowFarmArea,
  WorkflowParty,
  WorkflowProgram,
  WorkflowStatus,
} from "@/types/rate-card-workflow";
import { isoNow, mockDelay, newId } from "./delay";

const SPX_ACTOR = { id: "u-spx-1", name: "Ada Mengistu", party: "spx" as const };

const ASSET_OWNERS: Record<string, EligibleChecker> = {
  "fa-tumi": {
    userId: "u-ao-tumi",
    name: "Samuel Bekele",
    roleLabel: "Chaka Buna reviewer",
    orgName: "Sheka Holdings (Silva)",
    assignmentLabel: "Tumi Estate",
  },
  "fa-gura": {
    userId: "u-ao-gura",
    name: "Hanna Desta",
    roleLabel: "Chaka Buna reviewer",
    orgName: "Sheka Holdings (Silva)",
    assignmentLabel: "Gura Farm Area",
  },
  "fa-bench-n": {
    userId: "u-ao-bench",
    name: "Yonas Alemu",
    roleLabel: "Chaka Buna reviewer",
    orgName: "Bench Maji Coffee PLC (Silva)",
    assignmentLabel: "Bench North",
  },
};

const DEFAULT_CHECKER: EligibleChecker = {
  userId: "u-ao-default",
  name: "Samuel Bekele",
  roleLabel: "Chaka Buna reviewer",
  orgName: "Sheka Holdings (Silva)",
  assignmentLabel: "Program Asset Owner",
};

const VARIANCE_FLAG_THRESHOLD_PCT = 10;

function avgRecommended(n1: number, n2: number) {
  return Math.round(((n1 + n2) / 2) * 100) / 100;
}

function varianceFields(proposed: number, recommended: number | null | undefined) {
  if (recommended == null || !recommended || !Number.isFinite(proposed)) {
    return { variancePct: null as number | null, flagged: false };
  }
  const variancePct = Math.round(((proposed - recommended) / recommended) * 1000) / 10;
  return {
    variancePct,
    flagged: Math.abs(variancePct) > VARIANCE_FLAG_THRESHOLD_PCT,
  };
}

function withSurveyDerived(
  row: Omit<BenchmarkSurveyRecord, "recommendedRate" | "variancePct" | "flagged"> & {
    recommendedRate?: number;
    variancePct?: number | null;
    flagged?: boolean;
  },
): BenchmarkSurveyRecord {
  const recommended =
    row.recommendedRate ?? avgRecommended(row.neighbor1Rate, row.neighbor2Rate);
  const { variancePct, flagged } = varianceFields(row.proposedRate, recommended);
  return { ...row, recommendedRate: recommended, variancePct, flagged };
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function checkerForArea(farmAreaId?: string | null): EligibleChecker {
  if (farmAreaId && ASSET_OWNERS[farmAreaId]) return clone(ASSET_OWNERS[farmAreaId]);
  return clone(DEFAULT_CHECKER);
}

function assertParty(party: WorkflowParty | undefined, allowed: WorkflowParty, action: string) {
  if (!party) return;
  if (party !== allowed) {
    throw new Error(
      allowed === "spx"
        ? `Only SPX can ${action}`
        : `Only the Chaka Buna reviewer (Asset Owner) can ${action}`,
    );
  }
}

export const WORKFLOW_PROGRAMS: WorkflowProgram[] = [
  { id: "prog-sheka", name: "Sheka Program" },
  { id: "prog-bench", name: "Bench Maji Program" },
];

export const WORKFLOW_YEARS: WorkflowBudgetYear[] = [
  { id: "by-2027-sheka", name: "BY 2027", programId: "prog-sheka" },
  { id: "by-2026-sheka", name: "BY 2026", programId: "prog-sheka" },
  { id: "by-2027-bench", name: "BY 2027", programId: "prog-bench" },
];

export const WORKFLOW_AREAS: WorkflowFarmArea[] = [
  { id: "fa-tumi", name: "Tumi Estate", programId: "prog-sheka" },
  { id: "fa-gura", name: "Gura Farm Area", programId: "prog-sheka" },
  { id: "fa-bench-n", name: "Bench North", programId: "prog-bench" },
];

export const WORKFLOW_BLOCKS: WorkflowBlock[] = [
  { id: "blk-a1", name: "Block A1", farmAreaId: "fa-tumi" },
  { id: "blk-a2", name: "Block A2", farmAreaId: "fa-tumi" },
  { id: "blk-b1", name: "Block B1", farmAreaId: "fa-gura" },
];

export const WORKFLOW_ACTIVITIES: WorkflowActivity[] = [
  {
    id: "act-prune",
    code: "LAB-PRN-01",
    name: "Pruning",
    category: "Pruning & canopy",
    uom: "ha",
    tier: 1,
    defaultNorm: 12,
    defaultWage: 150,
  },
  {
    id: "act-weed",
    code: "LAB-WED-02",
    name: "Weeding",
    category: "Weed control",
    uom: "ha",
    tier: 1,
    defaultNorm: 8,
    defaultWage: 120,
  },
  {
    id: "act-harvest",
    code: "LAB-HAR-03",
    name: "Harvesting",
    category: "Harvest",
    uom: "kg",
    tier: 1,
    defaultNorm: 0.02,
    defaultWage: 100,
  },
  {
    id: "act-fert",
    code: "MAT-FER-01",
    name: "Fertilizer application",
    category: "Fertilizer & inputs",
    uom: "bag",
    tier: 2,
    defaultNorm: null,
  },
  {
    id: "act-transport",
    code: "SRV-TRN-01",
    name: "Transport",
    category: "Haulage & logistics",
    uom: "trip",
    tier: 3,
    defaultNorm: null,
  },
];

let surveys: BenchmarkSurveyRecord[] = [
  withSurveyDerived({
    id: "bs-001",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    activityId: "act-prune",
    kind: "labor",
    neighbor1Name: "Neighbor Estate Alpha",
    neighbor2Name: "Neighbor Estate Beta",
    neighbor1Rate: 1800,
    neighbor2Rate: 1900,
    lockedAt: "2026-09-02T09:00:00.000Z",
    proposedRate: 1850,
    availableFrom: "2026-09-03",
    availableTo: "2027-06-30",
    fallbackRate: 1750,
    justificationNote: "",
    surveyDate: "2026-09-01",
    sourceEvidence: "Field quote sheet #QA-091",
    notes: "Dry-season rate; includes tools.",
    status: "draft",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-02T09:00:00.000Z",
  }),
  withSurveyDerived({
    id: "bs-002",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    activityId: "act-prune",
    kind: "labor",
    neighbor1Name: "Neighbor Estate Alpha",
    neighbor2Name: "Neighbor Estate Gamma",
    neighbor1Rate: 2000,
    neighbor2Rate: 2200,
    lockedAt: "2026-09-05T08:00:00.000Z",
    proposedRate: 2100,
    availableFrom: "2026-09-05",
    availableTo: "2027-06-30",
    fallbackRate: 2000,
    justificationNote: "",
    surveyDate: "2026-09-04",
    sourceEvidence: "Phone quote log",
    notes: "Higher due to slope blocks.",
    status: "draft",
    createdAt: "2026-09-04T11:00:00.000Z",
    updatedAt: "2026-09-05T08:00:00.000Z",
  }),
  withSurveyDerived({
    id: "bs-003",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-gura",
    activityId: "act-weed",
    kind: "labor",
    neighbor1Name: "Local cooperative",
    neighbor2Name: "Gura neighbor farm",
    neighbor1Rate: 960,
    neighbor2Rate: 1000,
    lockedAt: "2026-09-06T12:00:00.000Z",
    proposedRate: 980,
    availableFrom: "2026-09-06",
    availableTo: null,
    fallbackRate: 900,
    justificationNote: "",
    surveyDate: "2026-09-06",
    sourceEvidence: "Co-op rate card PDF",
    notes: "",
    status: "draft",
    createdAt: "2026-09-06T07:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z",
  }),
  withSurveyDerived({
    id: "bs-004",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    activityId: "act-weed",
    kind: "labor",
    neighbor1Name: "Neighbor Estate Alpha",
    neighbor2Name: "Neighbor Estate Beta",
    neighbor1Rate: 350,
    neighbor2Rate: 380,
    lockedAt: "2026-08-21T10:00:00.000Z",
    proposedRate: 390,
    availableFrom: "2026-09-01",
    availableTo: "2027-06-30",
    fallbackRate: 365,
    justificationNote: "Slight uplift for wet-season access.",
    surveyDate: "2026-08-20",
    sourceEvidence: "Field notes",
    notes: "Manual weeding example.",
    status: "draft",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
  }),
  withSurveyDerived({
    id: "bs-mat-001",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    activityId: "act-fert",
    kind: "materials",
    neighbor1Name: "AgriSupply PLC",
    neighbor2Name: "GreenInputs Ltd",
    neighbor1Rate: 2400,
    neighbor2Rate: 2500,
    lockedAt: "2026-09-01T10:00:00.000Z",
    proposedRate: 2450,
    availableFrom: "2026-09-01",
    availableTo: "2027-06-30",
    fallbackRate: 2300,
    justificationNote: "",
    surveyDate: "2026-08-28",
    sourceEvidence: "Supplier quote Q-882",
    notes: "DAP 50kg delivered to gate.",
    status: "draft",
    createdAt: "2026-08-28T09:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  }),
  withSurveyDerived({
    id: "bs-srv-001",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    activityId: "act-transport",
    kind: "services",
    neighbor1Name: "HaulCo",
    neighbor2Name: "Estate Logistics",
    neighbor1Rate: 3000,
    neighbor2Rate: 3400,
    lockedAt: "2026-09-07T09:00:00.000Z",
    proposedRate: 3200,
    availableFrom: "2026-01-01",
    availableTo: null,
    fallbackRate: 3000,
    justificationNote: "",
    surveyDate: "2026-09-07",
    sourceEvidence: "Haulage schedule",
    notes: "",
    status: "draft",
    createdAt: "2026-09-07T08:00:00.000Z",
    updatedAt: "2026-09-07T09:00:00.000Z",
  }),
];

/** Rate cards (all kinds) — created from locked benchmarks; Silva approves these. */
let rateCards: RateCardProposal[] = [
  {
    id: "rc-lab-001",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-prune",
    kind: "labor",
    sourceSurveyId: "bs-001",
    recommendedRate: 1850,
    proposedRate: 1850,
    variancePct: 0,
    flagged: false,
    norm: 12,
    fallbackRate: 1750,
    sourceBasis: "Approved benchmark bs-001",
    availableFrom: "2026-09-03",
    availableTo: "2027-06-30",
    justificationNote: "",
    sourceEvidence: "Field quote sheet #QA-091",
    notes: "Dry-season rate; includes tools.",
    status: "approved",
    submittedAt: "2026-09-02T10:00:00.000Z",
    approvedAt: "2026-09-03T14:30:00.000Z",
    approvedByName: DEFAULT_CHECKER.name,
    createdAt: "2026-09-02T09:30:00.000Z",
    updatedAt: "2026-09-03T14:30:00.000Z",
  },
  {
    id: "rc-mat-001",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-fert",
    kind: "materials",
    sourceSurveyId: "bs-mat-001",
    recommendedRate: 2450,
    proposedRate: 2450,
    variancePct: 0,
    flagged: false,
    norm: null,
    fallbackRate: 2300,
    sourceBasis: "Supplier quote Q-882 · Benchmark bs-mat-001",
    availableFrom: "2026-09-01",
    availableTo: "2027-06-30",
    justificationNote: "",
    sourceEvidence: "Supplier quote Q-882",
    notes: "DAP 50kg delivered to gate. Submitted for asset owner review with full benchmark packet.",
    status: "submitted",
    submittedAt: "2026-09-02T11:00:00.000Z",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-02T11:00:00.000Z",
  },
  {
    id: "rc-lab-pending",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-weed",
    kind: "labor",
    sourceSurveyId: "bs-004",
    recommendedRate: 365,
    proposedRate: 410,
    variancePct: 12.3,
    flagged: true,
    norm: 8,
    fallbackRate: 350,
    sourceBasis: "Benchmark bs-004 + wet-season uplift",
    availableFrom: "2026-09-01",
    availableTo: "2027-06-30",
    justificationNote: "Wet-season access requires uplift above neighbor AVG.",
    sourceEvidence: "Field notes",
    notes: "Pending asset owner review variance flagged.",
    status: "submitted",
    submittedAt: "2026-09-10T09:00:00.000Z",
    createdAt: "2026-09-09T14:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
  },
  {
    id: "rc-srv-001",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-transport",
    kind: "services",
    sourceSurveyId: "bs-srv-001",
    recommendedRate: 3200,
    proposedRate: 3200,
    variancePct: 0,
    flagged: false,
    norm: null,
    fallbackRate: 3000,
    sourceBasis: "Haulage schedule",
    availableFrom: "2026-01-01",
    availableTo: null,
    justificationNote: "",
    sourceEvidence: "Haulage schedule",
    notes: "",
    status: "draft",
    createdAt: "2026-09-07T08:00:00.000Z",
    updatedAt: "2026-09-07T08:00:00.000Z",
  },
  {
    id: "rc-lab-002",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-prune",
    kind: "labor",
    sourceSurveyId: "bs-002",
    recommendedRate: 2100,
    proposedRate: 2100,
    variancePct: 0,
    flagged: false,
    norm: 12,
    fallbackRate: 2000,
    sourceBasis: "Neighbor AVG + slope uplift",
    availableFrom: "2026-09-05",
    availableTo: "2027-06-30",
    justificationNote: "",
    sourceEvidence: "Phone quote log",
    notes: "Higher due to slope blocks.",
    status: "draft",
    createdAt: "2026-09-05T09:00:00.000Z",
    updatedAt: "2026-09-05T09:00:00.000Z",
  },
  {
    id: "rc-lab-arch-001",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-weed",
    kind: "labor",
    sourceSurveyId: "bs-004",
    recommendedRate: 365,
    proposedRate: 370,
    variancePct: 1.4,
    flagged: false,
    norm: 8,
    fallbackRate: 350,
    sourceBasis: "Prior year weeding rate",
    availableFrom: "2026-01-01",
    availableTo: "2026-08-31",
    justificationNote: "",
    sourceEvidence: "Carry-forward",
    notes: "Superseded for wet season.",
    status: "archived",
    submittedAt: "2026-01-10T10:00:00.000Z",
    approvedAt: "2026-01-12T14:00:00.000Z",
    approvedByName: DEFAULT_CHECKER.name,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  },
];

let standing: StandingLineRecord[] = [
  {
    id: "sl-lab-prune-v2",
    kind: "labor",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-prune",
    norm: 12,
    approvedRate: 1850,
    fallbackRate: 1750,
    sourceBasis: "Approved benchmark bs-001",
    sourceSurveyId: "bs-001",
    sourceRateCardId: "rc-lab-001",
    effectiveFrom: "2026-09-03",
    effectiveTo: "2027-06-30",
    status: "approved",
    version: 2,
    supersedesId: "sl-lab-prune-v1",
    approvedByName: DEFAULT_CHECKER.name,
    approvedAt: "2026-09-03T14:30:00.000Z",
    createdAt: "2026-09-03T14:30:00.000Z",
    updatedAt: "2026-09-03T14:30:00.000Z",
  },
  {
    id: "sl-lab-prune-v1",
    kind: "labor",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-prune",
    norm: 12,
    approvedRate: 1800,
    fallbackRate: 1700,
    sourceBasis: "Prior year carry-forward",
    sourceSurveyId: null,
    sourceRateCardId: null,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-09-02",
    status: "archived",
    version: 1,
    supersedesId: null,
    approvedByName: DEFAULT_CHECKER.name,
    approvedAt: "2026-01-05T10:00:00.000Z",
    createdAt: "2026-01-05T10:00:00.000Z",
    updatedAt: "2026-09-03T14:30:00.000Z",
  },
  {
    id: "sl-lab-prune-blk",
    kind: "labor",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: "blk-a1",
    activityId: "act-prune",
    norm: 14,
    approvedRate: 2050,
    fallbackRate: null,
    sourceBasis: "Block A1 steep terrain uplift",
    sourceSurveyId: null,
    sourceRateCardId: null,
    effectiveFrom: "2026-09-05",
    effectiveTo: null,
    status: "approved",
    version: 1,
    supersedesId: null,
    approvedByName: DEFAULT_CHECKER.name,
    approvedAt: "2026-09-05T11:00:00.000Z",
    createdAt: "2026-09-05T11:00:00.000Z",
    updatedAt: "2026-09-05T11:00:00.000Z",
  },
  {
    id: "sl-mat-fert",
    kind: "materials",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: "fa-tumi",
    blockId: null,
    activityId: "act-fert",
    norm: null,
    approvedRate: 2400,
    fallbackRate: 2300,
    sourceBasis: "Prior approved material rate",
    sourceSurveyId: null,
    sourceRateCardId: null,
    effectiveFrom: "2026-03-01",
    effectiveTo: null,
    status: "approved",
    version: 1,
    supersedesId: null,
    approvedByName: DEFAULT_CHECKER.name,
    approvedAt: "2026-03-02T12:00:00.000Z",
    createdAt: "2026-03-02T12:00:00.000Z",
    updatedAt: "2026-03-02T12:00:00.000Z",
  },
  {
    id: "sl-srv-transport",
    kind: "services",
    programId: "prog-sheka",
    budgetYearId: "by-2027-sheka",
    farmAreaId: null,
    blockId: null,
    activityId: "act-transport",
    norm: null,
    approvedRate: 3100,
    fallbackRate: 3000,
    sourceBasis: "Contract haulage schedule",
    sourceSurveyId: null,
    sourceRateCardId: null,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    status: "approved",
    version: 1,
    supersedesId: null,
    approvedByName: DEFAULT_CHECKER.name,
    approvedAt: "2026-01-15T08:00:00.000Z",
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T08:00:00.000Z",
  },
];

let audit: WorkflowAuditEvent[] = [
  {
    id: "aud-1",
    entityType: "benchmark_survey",
    entityId: "bs-001",
    action: "submitted",
    actorName: SPX_ACTOR.name,
    at: "2026-09-02T10:00:00.000Z",
  },
  {
    id: "aud-2",
    entityType: "benchmark_survey",
    entityId: "bs-001",
    action: "approved",
    actorName: DEFAULT_CHECKER.name,
    at: "2026-09-03T14:00:00.000Z",
  },
  {
    id: "aud-3",
    entityType: "standing_line",
    entityId: "sl-lab-prune-v2",
    action: "promoted_from_survey",
    actorName: DEFAULT_CHECKER.name,
    comment: "From Silva-approved benchmark bs-001",
    at: "2026-09-03T14:30:00.000Z",
    meta: { version: 2, supersedesId: "sl-lab-prune-v1" },
  },
  {
    id: "aud-4",
    entityType: "benchmark_survey",
    entityId: "bs-004",
    action: "returned",
    actorName: DEFAULT_CHECKER.name,
    comment: "Attach wet-season access note.",
    at: "2026-08-22T16:00:00.000Z",
  },
];

function pushAudit(
  partial: Omit<WorkflowAuditEvent, "id" | "at"> & { at?: string },
): WorkflowAuditEvent {
  const event: WorkflowAuditEvent = {
    id: newId("aud"),
    at: partial.at ?? isoNow(),
    entityType: partial.entityType,
    entityId: partial.entityId,
    action: partial.action,
    actorName: partial.actorName,
    comment: partial.comment ?? null,
    meta: partial.meta,
  };
  audit = [event, ...audit];
  return event;
}

function activityById(id: string) {
  return WORKFLOW_ACTIVITIES.find((a) => a.id === id);
}

/** Register a platform taxonomy activity so mock create/enrich can resolve it. */
export function registerWorkflowActivity(input: {
  id: string;
  code?: string;
  name: string;
  category: string;
  unitOfMeasure?: string;
  tier: number;
}) {
  if (activityById(input.id)) return;
  const tier = (input.tier === 2 || input.tier === 3 ? input.tier : 1) as 1 | 2 | 3;
  WORKFLOW_ACTIVITIES.push({
    id: input.id,
    code: input.code || input.id,
    name: input.name,
    category: input.category,
    uom: input.unitOfMeasure || "unit",
    tier,
    defaultNorm: null,
    defaultWage: null,
  });
}

export function getWorkflowPrograms() {
  return clone(WORKFLOW_PROGRAMS);
}

export function getWorkflowBudgetYears(programId?: string) {
  const rows = programId
    ? WORKFLOW_YEARS.filter((y) => y.programId === programId)
    : WORKFLOW_YEARS;
  return clone(rows);
}

export function getWorkflowFarmAreas(programId?: string) {
  const rows = programId
    ? WORKFLOW_AREAS.filter((a) => a.programId === programId)
    : WORKFLOW_AREAS;
  return clone(rows);
}

export function getWorkflowBlocks(farmAreaId?: string) {
  const rows = farmAreaId
    ? WORKFLOW_BLOCKS.filter((b) => b.farmAreaId === farmAreaId)
    : WORKFLOW_BLOCKS;
  return clone(rows);
}

export function getWorkflowActivities(kind?: StandingKind, category?: string) {
  let rows = WORKFLOW_ACTIVITIES;
  if (kind === "labor") rows = rows.filter((a) => a.tier === 1);
  if (kind === "materials") rows = rows.filter((a) => a.tier === 2);
  if (kind === "services") rows = rows.filter((a) => a.tier === 3);
  if (category) rows = rows.filter((a) => a.category === category);
  return clone(rows);
}

export function getEligibleChecker(programId: string, farmAreaId?: string | null): EligibleChecker {
  void programId;
  return checkerForArea(farmAreaId);
}

/* ─── Benchmark Surveys (all kinds) ─── */

export async function listBenchmarkSurveys(
  filters: WorkflowContextFilters & {
    status?: WorkflowStatus | "all";
    kind?: StandingKind | "all";
  },
): Promise<BenchmarkSurveyRecord[]> {
  await mockDelay(120);
  return clone(
    surveys
      .filter((s) => s.programId === filters.programId)
      .filter((s) => s.budgetYearId === filters.budgetYearId)
      .filter((s) => filters.farmAreaId === "all" || s.farmAreaId === filters.farmAreaId)
      .filter((s) => !filters.status || filters.status === "all" || s.status === filters.status)
      .filter((s) => !filters.kind || filters.kind === "all" || s.kind === filters.kind)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export async function getBenchmarkSurvey(id: string): Promise<BenchmarkSurveyRecord | null> {
  await mockDelay(80);
  const row = surveys.find((s) => s.id === id);
  return row ? clone(row) : null;
}

export async function createBenchmarkSurvey(
  input: {
    programId: string;
    budgetYearId: string;
    farmAreaId: string;
    activityId: string;
    kind: StandingKind;
    neighbor1Name: string;
    neighbor2Name: string;
    neighbor1Rate: number;
    neighbor2Rate: number;
    surveyDate: string;
    sourceEvidence: string;
    notes: string;
    availableFrom?: string;
    availableTo?: string | null;
  },
  party: WorkflowParty = "spx",
): Promise<BenchmarkSurveyRecord> {
  assertParty(party, "spx", "create benchmark surveys");
  await mockDelay(160);
  const act = activityById(input.activityId);
  if (!act) throw new Error("Activity not found in Activity Taxonomy");
  if (input.kind === "labor" && act.tier !== 1) {
    throw new Error("Labor benchmarks require a tier 1 (labor) activity");
  }
  if (input.kind === "materials" && act.tier !== 2) {
    throw new Error("Materials benchmarks require a tier 2 (materials) activity");
  }
  if (input.kind === "services" && act.tier !== 3) {
    throw new Error("Services benchmarks require a tier 3 (services) activity");
  }
  if (!input.neighbor1Name.trim() || !input.neighbor2Name.trim()) {
    throw new Error("Both neighbor names are required");
  }
  if (
    !Number.isFinite(input.neighbor1Rate) ||
    !Number.isFinite(input.neighbor2Rate) ||
    input.neighbor1Rate < 0 ||
    input.neighbor2Rate < 0
  ) {
    throw new Error("Neighbor rates must be non-negative numbers");
  }
  const recommended = avgRecommended(input.neighbor1Rate, input.neighbor2Rate);
  const now = isoNow();
  const day = now.slice(0, 10);
  const fallback =
    input.kind === "labor" && act.defaultNorm != null && act.defaultWage != null
      ? Math.round(act.defaultNorm * act.defaultWage)
      : Math.round(recommended * 0.95);
  const row = withSurveyDerived({
    id: newId("bs"),
    programId: input.programId,
    budgetYearId: input.budgetYearId,
    farmAreaId: input.farmAreaId,
    activityId: input.activityId,
    kind: input.kind,
    neighbor1Name: input.neighbor1Name.trim(),
    neighbor2Name: input.neighbor2Name.trim(),
    neighbor1Rate: input.neighbor1Rate,
    neighbor2Rate: input.neighbor2Rate,
    lockedAt: null,
    proposedRate: recommended,
    availableFrom: input.availableFrom?.trim() || day,
    availableTo: input.availableTo?.trim() ? input.availableTo.trim() : null,
    fallbackRate: fallback,
    justificationNote: "",
    surveyDate: input.surveyDate,
    sourceEvidence: input.sourceEvidence.trim(),
    notes: input.notes.trim(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
  surveys = [row, ...surveys];
  pushAudit({
    entityType: "benchmark_survey",
    entityId: row.id,
    action: "created",
    actorName: SPX_ACTOR.name,
    meta: { party: "spx", kind: input.kind },
  });
  return clone(row);
}

export async function updateBenchmarkSurvey(
  id: string,
  patch: Partial<
    Pick<
      BenchmarkSurveyRecord,
      | "neighbor1Name"
      | "neighbor2Name"
      | "neighbor1Rate"
      | "neighbor2Rate"
      | "proposedRate"
      | "availableFrom"
      | "availableTo"
      | "fallbackRate"
      | "justificationNote"
      | "surveyDate"
      | "sourceEvidence"
      | "notes"
      | "farmAreaId"
    >
  >,
  party: WorkflowParty = "spx",
): Promise<BenchmarkSurveyRecord> {
  assertParty(party, "spx", "edit benchmark surveys");
  await mockDelay(140);
  const idx = surveys.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Survey not found");
  const current = surveys[idx];
  if (current.status !== "draft" && current.status !== "returned") {
    throw new Error("Only draft or returned surveys can be edited");
  }

  const locked = Boolean(current.lockedAt);
  if (
    locked &&
    (patch.neighbor1Name !== undefined ||
      patch.neighbor2Name !== undefined ||
      patch.neighbor1Rate !== undefined ||
      patch.neighbor2Rate !== undefined)
  ) {
    throw new Error("Neighbor rates are locked and cannot be changed");
  }

  const nextN1 = patch.neighbor1Rate ?? current.neighbor1Rate;
  const nextN2 = patch.neighbor2Rate ?? current.neighbor2Rate;
  const recommended = avgRecommended(nextN1, nextN2);
  let proposed = patch.proposedRate ?? current.proposedRate;
  if (
    !locked &&
    (patch.neighbor1Rate !== undefined || patch.neighbor2Rate !== undefined) &&
    patch.proposedRate === undefined &&
    current.proposedRate === current.recommendedRate
  ) {
    proposed = recommended;
  }

  const availableFrom = (patch.availableFrom ?? current.availableFrom).trim();
  const availableToRaw =
    patch.availableTo !== undefined ? patch.availableTo : current.availableTo;
  const availableTo =
    availableToRaw == null || String(availableToRaw).trim() === ""
      ? null
      : String(availableToRaw).trim();
  if (availableTo && availableFrom && availableTo < availableFrom) {
    throw new Error("Available to must be on or after available from");
  }

  const updated = withSurveyDerived({
    ...current,
    ...patch,
    neighbor1Rate: nextN1,
    neighbor2Rate: nextN2,
    recommendedRate: recommended,
    proposedRate: proposed,
    availableFrom: availableFrom || current.availableFrom,
    availableTo,
    justificationNote:
      patch.justificationNote !== undefined
        ? patch.justificationNote.trim()
        : current.justificationNote,
    updatedAt: isoNow(),
    status: current.status === "returned" ? "draft" : current.status,
    returnComment: current.status === "returned" ? null : current.returnComment,
  });
  surveys = [...surveys.slice(0, idx), updated, ...surveys.slice(idx + 1)];
  pushAudit({
    entityType: "benchmark_survey",
    entityId: id,
    action: "updated",
    actorName: SPX_ACTOR.name,
    meta: { party: "spx" },
  });
  return clone(updated);
}

export async function lockBenchmarkSurvey(
  id: string,
  party: WorkflowParty = "spx",
): Promise<BenchmarkSurveyRecord> {
  assertParty(party, "spx", "lock neighbor rates");
  await mockDelay(120);
  const idx = surveys.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Survey not found");
  const current = surveys[idx];
  if (current.status !== "draft" && current.status !== "returned") {
    throw new Error("Only draft or returned surveys can be locked");
  }
  if (current.lockedAt) throw new Error("Neighbor rates are already locked");
  if (!current.neighbor1Name || !current.neighbor2Name) {
    throw new Error("Enter both neighbor names before locking");
  }
  const now = isoNow();
  const updated = withSurveyDerived({
    ...current,
    lockedAt: now,
    updatedAt: now,
    status: current.status === "returned" ? "draft" : current.status,
  });
  surveys = [...surveys.slice(0, idx), updated, ...surveys.slice(idx + 1)];
  pushAudit({
    entityType: "benchmark_survey",
    entityId: id,
    action: "locked",
    actorName: SPX_ACTOR.name,
    meta: { party: "spx" },
  });
  return clone(updated);
}

async function transitionSurvey(
  id: string,
  to: WorkflowStatus,
  opts?: { comment?: string; party?: WorkflowParty },
): Promise<BenchmarkSurveyRecord> {
  await mockDelay(140);
  const idx = surveys.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Survey not found");
  const current = surveys[idx];
  const now = isoNow();
  const ao = checkerForArea(current.farmAreaId);

  if (to === "submitted") {
    assertParty(opts?.party, "spx", "submit surveys");
    if (current.status !== "draft" && current.status !== "returned") {
      throw new Error("Only draft or returned surveys can be submitted");
    }
    if (!current.lockedAt) {
      throw new Error("Lock neighbor rates before submitting to Silva");
    }
    if (current.proposedRate == null || !Number.isFinite(current.proposedRate)) {
      throw new Error("SPX proposed rate is required before submit");
    }
    if (!current.availableFrom?.trim()) {
      throw new Error("Available from date is required before submit");
    }
    if (current.flagged && !current.justificationNote?.trim()) {
      throw new Error("Justification is required when variance is flagged (±10%)");
    }
  }
  if (to === "approved") {
    assertParty(opts?.party, "asset_owner", "approve surveys");
    if (current.status !== "submitted") {
      throw new Error("Only submitted surveys can be approved");
    }
  }
  if (to === "returned") {
    assertParty(opts?.party, "asset_owner", "return surveys");
    if (current.status !== "submitted") throw new Error("Only submitted surveys can be returned");
    if (!opts?.comment?.trim()) throw new Error("Return comment is required");
  }

  const actor = to === "approved" || to === "returned" ? ao.name : SPX_ACTOR.name;
  const updated = withSurveyDerived({
    ...current,
    status: to,
    updatedAt: now,
    submittedAt: to === "submitted" ? now : current.submittedAt,
    approvedAt: to === "approved" ? now : current.approvedAt,
    approvedByName: to === "approved" ? actor : current.approvedByName,
    returnComment: to === "returned" ? opts?.comment?.trim() : current.returnComment,
  });
  surveys = [...surveys.slice(0, idx), updated, ...surveys.slice(idx + 1)];
  pushAudit({
    entityType: "benchmark_survey",
    entityId: id,
    action: to,
    actorName: actor,
    comment: opts?.comment,
    meta: {
      party: to === "submitted" ? "spx" : "asset_owner",
      assetOwnerId: ao.userId,
    },
  });

  if (to === "approved") {
    await promoteSurveyToStandingInternal(id, ao);
  }

  return clone(updated);
}

export const submitBenchmarkSurvey = (id: string, party: WorkflowParty = "spx") =>
  transitionSurvey(id, "submitted", { party });
export const approveBenchmarkSurvey = (id: string, party: WorkflowParty = "asset_owner") =>
  transitionSurvey(id, "approved", { party });
export const returnBenchmarkSurvey = (
  id: string,
  comment: string,
  party: WorkflowParty = "asset_owner",
) => transitionSurvey(id, "returned", { comment, party });

async function promoteSurveyToStandingInternal(
  surveyId: string,
  ao: EligibleChecker,
): Promise<StandingLineRecord> {
  const survey = surveys.find((s) => s.id === surveyId);
  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "approved") throw new Error("Only approved surveys can become standing");

  const already = standing.find((s) => s.sourceSurveyId === surveyId && s.status === "approved");
  if (already) return clone(already);

  const act = activityById(survey.activityId);
  const siblings = standing.filter(
    (s) =>
      s.kind === survey.kind &&
      s.programId === survey.programId &&
      s.budgetYearId === survey.budgetYearId &&
      s.activityId === survey.activityId &&
      s.farmAreaId === survey.farmAreaId &&
      s.blockId === null &&
      s.status === "approved",
  );
  const latest = siblings.sort((a, b) => b.version - a.version)[0];
  const now = isoNow();
  const day = now.slice(0, 10);
  const effectiveFrom = survey.availableFrom || day;
  const effectiveTo = survey.availableTo;

  if (latest) {
    standing = standing.map((s) =>
      s.id === latest.id
        ? {
            ...latest,
            status: "archived" as const,
            effectiveTo: effectiveFrom < day ? effectiveFrom : day,
            updatedAt: now,
          }
        : s,
    );
  }

  const row: StandingLineRecord = {
    id: newId("sl"),
    kind: survey.kind,
    programId: survey.programId,
    budgetYearId: survey.budgetYearId,
    farmAreaId: survey.farmAreaId,
    blockId: null,
    activityId: survey.activityId,
    norm: act?.defaultNorm ?? null,
    approvedRate: survey.proposedRate,
    fallbackRate:
      survey.fallbackRate ??
      (survey.kind === "labor" &&
      act?.defaultNorm != null &&
      act?.defaultWage != null
        ? Math.round(act.defaultNorm * act.defaultWage)
        : Math.round(survey.proposedRate * 0.95)),
    sourceBasis: `Approved ${survey.kind} benchmark ${survey.id} · neighbors ${survey.neighbor1Name}/${survey.neighbor2Name}`,
    sourceSurveyId: survey.id,
    sourceRateCardId: null,
    effectiveFrom,
    effectiveTo,
    status: "approved",
    version: (latest?.version ?? 0) + 1,
    supersedesId: latest?.id ?? null,
    approvedByName: ao.name,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  standing = [row, ...standing];
  pushAudit({
    entityType: "standing_line",
    entityId: row.id,
    action: "promoted_from_survey",
    actorName: ao.name,
    meta: { surveyId, version: row.version, party: "asset_owner" },
  });
  return clone(row);
}

/* ─── Rate Cards (from locked benchmarks → Silva → Standing) ─── */

export async function listRateCardProposals(
  filters: WorkflowContextFilters & {
    status?: WorkflowStatus | "all";
    kind?: StandingKind | "all";
  },
): Promise<RateCardProposal[]> {
  await mockDelay(120);
  return clone(
    rateCards
      .filter((r) => r.programId === filters.programId)
      .filter((r) => r.budgetYearId === filters.budgetYearId)
      .filter((r) => filters.farmAreaId === "all" || r.farmAreaId === filters.farmAreaId)
      .filter((r) => {
        if (!filters.status || filters.status === "all") return r.status !== "archived";
        return r.status === filters.status;
      })
      .filter((r) => !filters.kind || filters.kind === "all" || r.kind === filters.kind)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export async function getRateCardProposal(id: string): Promise<RateCardProposal | null> {
  await mockDelay(80);
  const row = rateCards.find((r) => r.id === id);
  return row ? clone(row) : null;
}

/** Locked benchmarks available to build a rate card from. */
export async function listLockedBenchmarksForRateCard(
  filters: WorkflowContextFilters & { kind?: StandingKind | "all" },
): Promise<BenchmarkSurveyRecord[]> {
  await mockDelay(100);
  const used = new Set(
    rateCards
      .filter((r) => r.status !== "archived" && r.sourceSurveyId)
      .map((r) => r.sourceSurveyId as string),
  );
  return clone(
    surveys
      .filter((s) => s.programId === filters.programId)
      .filter((s) => s.budgetYearId === filters.budgetYearId)
      .filter((s) => filters.farmAreaId === "all" || s.farmAreaId === filters.farmAreaId)
      .filter((s) => !filters.kind || filters.kind === "all" || s.kind === filters.kind)
      .filter((s) => Boolean(s.lockedAt))
      .filter((s) => !used.has(s.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

function withRateCardDerived(
  row: Omit<RateCardProposal, "variancePct" | "flagged"> & {
    variancePct?: number | null;
    flagged?: boolean;
  },
): RateCardProposal {
  const { variancePct, flagged } = varianceFields(row.proposedRate, row.recommendedRate);
  return { ...row, variancePct, flagged };
}

export async function createRateCardProposal(
  input: {
    sourceSurveyId: string;
    proposedRate?: number;
    availableFrom?: string;
    availableTo?: string | null;
    fallbackRate?: number | null;
    norm?: number | null;
    sourceBasis?: string;
    blockId?: string | null;
    justificationNote?: string;
    sourceEvidence?: string;
    notes?: string;
  },
  party: WorkflowParty = "spx",
): Promise<RateCardProposal> {
  assertParty(party, "spx", "create rate cards");
  await mockDelay(160);
  const survey = surveys.find((s) => s.id === input.sourceSurveyId);
  if (!survey) throw new Error("Benchmark survey not found");
  if (!survey.lockedAt) throw new Error("Lock the benchmark before creating a rate card");
  const existing = rateCards.find(
    (r) => r.sourceSurveyId === survey.id && r.status !== "archived",
  );
  if (existing) {
    throw new Error(`Rate card ${existing.id} already references this benchmark`);
  }

  const recommended = survey.recommendedRate;
  const proposed =
    input.proposedRate != null && Number.isFinite(input.proposedRate)
      ? input.proposedRate
      : survey.proposedRate || recommended;
  if (!Number.isFinite(proposed) || proposed < 0) {
    throw new Error("Proposed rate must be a non-negative number");
  }
  const availableFrom = (input.availableFrom ?? survey.availableFrom).trim();
  if (!availableFrom) throw new Error("Effective from is required");
  const availableToRaw =
    input.availableTo !== undefined ? input.availableTo : survey.availableTo;
  const availableTo =
    availableToRaw == null || String(availableToRaw).trim() === ""
      ? null
      : String(availableToRaw).trim();
  if (availableTo && availableTo < availableFrom) {
    throw new Error("Effective to must be on or after effective from");
  }

  const act = activityById(survey.activityId);
  const now = isoNow();
  const row = withRateCardDerived({
    id: newId("rc"),
    programId: survey.programId,
    budgetYearId: survey.budgetYearId,
    farmAreaId: survey.farmAreaId,
    blockId: input.blockId !== undefined ? input.blockId : null,
    activityId: survey.activityId,
    kind: survey.kind,
    sourceSurveyId: survey.id,
    recommendedRate: recommended,
    proposedRate: proposed,
    norm: input.norm !== undefined ? input.norm : act?.defaultNorm ?? null,
    fallbackRate:
      input.fallbackRate !== undefined
        ? input.fallbackRate
        : survey.fallbackRate ?? Math.round(proposed * 0.95),
    sourceBasis: (input.sourceBasis ?? `Benchmark ${survey.id}`).trim(),
    availableFrom,
    availableTo,
    justificationNote: (input.justificationNote ?? survey.justificationNote ?? "").trim(),
    sourceEvidence: (input.sourceEvidence ?? survey.sourceEvidence).trim(),
    notes: (input.notes ?? survey.notes).trim(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
  rateCards = [row, ...rateCards];
  pushAudit({
    entityType: "rate_card",
    entityId: row.id,
    action: "created",
    actorName: SPX_ACTOR.name,
    meta: { party: "spx", kind: row.kind, sourceSurveyId: survey.id },
  });
  return clone(row);
}

/** Draft rate card from annual Labor/Material/Service CSV import (no linked survey). */
export async function createRateCardFromImport(
  input: {
    programId: string;
    budgetYearId: string;
    farmAreaId: string;
    activityId: string;
    kind: StandingKind;
    proposedRate: number;
    norm?: number | null;
    sourceBasis?: string;
    availableFrom?: string;
    availableTo?: string | null;
    fallbackRate?: number | null;
    blockId?: string | null;
    justificationNote?: string;
    sourceEvidence?: string;
    notes?: string;
  },
  party: WorkflowParty = "spx",
): Promise<RateCardProposal> {
  assertParty(party, "spx", "import rate cards");
  await mockDelay(80);
  const act = activityById(input.activityId);
  if (!act) throw new Error("Activity not found");
  if (input.kind === "labor" && act.tier !== 1) {
    throw new Error("Labor rate cards require a labor activity");
  }
  if (input.kind === "materials" && act.tier !== 2) {
    throw new Error("Materials rate cards require a materials activity");
  }
  if (input.kind === "services" && act.tier !== 3) {
    throw new Error("Services rate cards require a services activity");
  }
  if (!Number.isFinite(input.proposedRate) || input.proposedRate < 0) {
    throw new Error("Proposed rate must be a non-negative number");
  }
  const day = isoNow().slice(0, 10);
  const availableFrom = (input.availableFrom ?? day).trim();
  if (!availableFrom) throw new Error("Effective from is required");
  const availableTo =
    input.availableTo == null || String(input.availableTo).trim() === ""
      ? null
      : String(input.availableTo).trim();
  if (availableTo && availableTo < availableFrom) {
    throw new Error("Effective to must be on or after effective from");
  }

  const now = isoNow();
  const proposed = input.proposedRate;
  const row = withRateCardDerived({
    id: newId("rc"),
    programId: input.programId,
    budgetYearId: input.budgetYearId,
    farmAreaId: input.farmAreaId,
    blockId: input.blockId ?? null,
    activityId: input.activityId,
    kind: input.kind,
    sourceSurveyId: null,
    recommendedRate: null,
    proposedRate: proposed,
    norm: input.norm !== undefined ? input.norm : act.defaultNorm ?? null,
    fallbackRate:
      input.fallbackRate !== undefined
        ? input.fallbackRate
        : Math.round(proposed * 0.95),
    sourceBasis: (input.sourceBasis ?? "Rate card import").trim(),
    availableFrom,
    availableTo,
    justificationNote: (input.justificationNote ?? "").trim(),
    sourceEvidence: (input.sourceEvidence ?? input.sourceBasis ?? "Rate card import").trim(),
    notes: (input.notes ?? "").trim(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
  rateCards = [row, ...rateCards];
  pushAudit({
    entityType: "rate_card",
    entityId: row.id,
    action: "created",
    actorName: SPX_ACTOR.name,
    meta: { party: "spx", kind: row.kind, import: true },
  });
  return clone(row);
}

export async function updateRateCardProposal(
  id: string,
  patch: Partial<
    Pick<
      RateCardProposal,
      | "proposedRate"
      | "availableFrom"
      | "availableTo"
      | "fallbackRate"
      | "norm"
      | "sourceBasis"
      | "blockId"
      | "justificationNote"
      | "sourceEvidence"
      | "notes"
    >
  >,
  party: WorkflowParty = "spx",
): Promise<RateCardProposal> {
  assertParty(party, "spx", "edit rate cards");
  await mockDelay(140);
  const idx = rateCards.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Rate card not found");
  const current = rateCards[idx];
  if (current.status !== "draft" && current.status !== "returned") {
    throw new Error("Only draft or returned rate cards can be edited");
  }
  const proposed = patch.proposedRate ?? current.proposedRate;
  if (!Number.isFinite(proposed) || proposed < 0) {
    throw new Error("Proposed rate must be a non-negative number");
  }
  const availableFrom = (patch.availableFrom ?? current.availableFrom).trim();
  if (!availableFrom) throw new Error("Effective from is required");
  const availableToRaw =
    patch.availableTo !== undefined ? patch.availableTo : current.availableTo;
  const availableTo =
    availableToRaw == null || String(availableToRaw).trim() === ""
      ? null
      : String(availableToRaw).trim();
  if (availableTo && availableTo < availableFrom) {
    throw new Error("Effective to must be on or after effective from");
  }

  const next = withRateCardDerived({
    ...current,
    ...patch,
    proposedRate: proposed,
    availableFrom,
    availableTo,
    updatedAt: isoNow(),
    status: current.status === "returned" ? "draft" : current.status,
    returnComment: current.status === "returned" ? null : current.returnComment,
  });
  if (next.flagged && !(next.justificationNote || "").trim()) {
    // allow save while drafting; submit will enforce
  }
  rateCards = [...rateCards.slice(0, idx), next, ...rateCards.slice(idx + 1)];
  pushAudit({
    entityType: "rate_card",
    entityId: id,
    action: "updated",
    actorName: SPX_ACTOR.name,
    meta: { party: "spx" },
  });
  return clone(next);
}

async function transitionRateCard(
  id: string,
  to: WorkflowStatus,
  opts?: { comment?: string; party?: WorkflowParty },
): Promise<RateCardProposal> {
  await mockDelay(140);
  const idx = rateCards.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Rate card not found");
  const current = rateCards[idx];
  const now = isoNow();
  const ao = checkerForArea(current.farmAreaId);

  if (to === "submitted") {
    assertParty(opts?.party, "spx", "submit rate cards");
    if (current.status !== "draft" && current.status !== "returned") {
      throw new Error("Only draft or returned rate cards can be submitted");
    }
    // Import drafts may have no linked survey; form-created cards keep the survey link.
    if (!current.availableFrom?.trim()) {
      throw new Error("Effective from date is required before submit");
    }
    if (current.flagged && !current.justificationNote?.trim()) {
      throw new Error("Justification is required when variance is flagged (±10%)");
    }
  }
  if (to === "approved") {
    assertParty(opts?.party, "asset_owner", "approve rate cards");
    if (current.status !== "submitted") {
      throw new Error("Only submitted rate cards can be approved");
    }
  }
  if (to === "returned") {
    assertParty(opts?.party, "asset_owner", "return rate cards");
    if (current.status !== "submitted") throw new Error("Only submitted rate cards can be returned");
    if (!opts?.comment?.trim()) throw new Error("Return comment is required");
  }

  const actor = to === "approved" || to === "returned" ? ao.name : SPX_ACTOR.name;
  const updated: RateCardProposal = {
    ...current,
    status: to,
    updatedAt: now,
    submittedAt: to === "submitted" ? now : current.submittedAt,
    approvedAt: to === "approved" ? now : current.approvedAt,
    approvedByName: to === "approved" ? actor : current.approvedByName,
    returnComment: to === "returned" ? opts?.comment?.trim() : current.returnComment,
  };
  rateCards = [...rateCards.slice(0, idx), updated, ...rateCards.slice(idx + 1)];
  pushAudit({
    entityType: "rate_card",
    entityId: id,
    action: to,
    actorName: actor,
    comment: opts?.comment,
    meta: { party: to === "submitted" ? "spx" : "asset_owner" },
  });

  if (to === "approved") {
    await promoteRateCardToStandingInternal(id, ao);
  }

  return clone(updated);
}

export const submitRateCardProposal = (id: string, party: WorkflowParty = "spx") =>
  transitionRateCard(id, "submitted", { party });
export const approveRateCardProposal = (id: string, party: WorkflowParty = "asset_owner") =>
  transitionRateCard(id, "approved", { party });
export const returnRateCardProposal = (
  id: string,
  comment: string,
  party: WorkflowParty = "asset_owner",
) => transitionRateCard(id, "returned", { comment, party });

export async function archiveRateCardProposal(
  id: string,
  party: WorkflowParty = "asset_owner",
): Promise<RateCardProposal> {
  assertParty(party, "asset_owner", "archive rate cards");
  await mockDelay(120);
  const idx = rateCards.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Rate card not found");
  const current = rateCards[idx];
  if (current.status === "archived") return clone(current);
  if (current.status !== "approved") {
    throw new Error("Only approved rate cards can be archived");
  }
  const now = isoNow();
  const day = now.slice(0, 10);
  const ao = checkerForArea(current.farmAreaId);
  const updated: RateCardProposal = {
    ...current,
    status: "archived",
    availableTo: current.availableTo && current.availableTo < day ? current.availableTo : day,
    updatedAt: now,
  };
  rateCards = [...rateCards.slice(0, idx), updated, ...rateCards.slice(idx + 1)];

  // Archive linked standing lines from this card
  standing = standing.map((s) =>
    s.sourceRateCardId === id && s.status === "approved"
      ? { ...s, status: "archived" as const, effectiveTo: day, updatedAt: now }
      : s,
  );

  pushAudit({
    entityType: "rate_card",
    entityId: id,
    action: "archived",
    actorName: ao.name,
    meta: { party: "asset_owner" },
  });
  return clone(updated);
}

/** Restore archived rate card → approved and re-activate linked standing lines. */
export async function restoreRateCardProposal(
  id: string,
  party: WorkflowParty = "spx",
): Promise<RateCardProposal> {
  if (party !== "spx" && party !== "asset_owner") {
    throw new Error("Not allowed to restore rate cards");
  }
  await mockDelay(120);
  const idx = rateCards.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Rate card not found");
  const current = rateCards[idx];
  if (current.status !== "archived") {
    throw new Error("Only archived rate cards can be restored");
  }
  const now = isoNow();
  const day = now.slice(0, 10);
  const actor = party === "asset_owner" ? checkerForArea(current.farmAreaId).name : SPX_ACTOR.name;

  const updated: RateCardProposal = {
    ...current,
    status: "approved",
    // Re-open effective window (archive stamped availableTo to the archive day).
    availableTo: current.availableTo === day ? null : current.availableTo,
    updatedAt: now,
  };
  rateCards = [...rateCards.slice(0, idx), updated, ...rateCards.slice(idx + 1)];

  const linked = standing.filter((s) => s.sourceRateCardId === id);
  if (linked.length > 0) {
    standing = standing.map((s) =>
      s.sourceRateCardId === id
        ? {
            ...s,
            status: "approved" as const,
            effectiveTo: updated.availableTo,
            updatedAt: now,
          }
        : s,
    );
  } else {
    await promoteRateCardToStandingInternal(id, checkerForArea(current.farmAreaId));
  }

  pushAudit({
    entityType: "rate_card",
    entityId: id,
    action: "restored",
    actorName: actor,
    meta: { party },
  });
  return clone(rateCards.find((r) => r.id === id)!);
}

async function promoteRateCardToStandingInternal(
  rateCardId: string,
  ao: EligibleChecker,
): Promise<StandingLineRecord> {
  const card = rateCards.find((r) => r.id === rateCardId);
  if (!card) throw new Error("Rate card not found");
  if (card.status !== "approved") throw new Error("Only approved rate cards can become standing");

  const already = standing.find((s) => s.sourceRateCardId === rateCardId && s.status === "approved");
  if (already) return clone(already);

  const siblings = standing.filter(
    (s) =>
      s.kind === card.kind &&
      s.programId === card.programId &&
      s.budgetYearId === card.budgetYearId &&
      s.activityId === card.activityId &&
      s.farmAreaId === card.farmAreaId &&
      s.blockId === (card.blockId ?? null) &&
      s.status === "approved",
  );
  const latest = siblings.sort((a, b) => b.version - a.version)[0];
  const now = isoNow();
  const day = now.slice(0, 10);
  const effectiveFrom = card.availableFrom || day;
  const effectiveTo = card.availableTo;

  if (latest) {
    standing = standing.map((s) =>
      s.id === latest.id
        ? {
            ...latest,
            status: "archived" as const,
            effectiveTo: effectiveFrom < day ? effectiveFrom : day,
            updatedAt: now,
          }
        : s,
    );
  }

  const row: StandingLineRecord = {
    id: newId("sl"),
    kind: card.kind,
    programId: card.programId,
    budgetYearId: card.budgetYearId,
    farmAreaId: card.farmAreaId,
    blockId: card.blockId ?? null,
    activityId: card.activityId,
    norm: card.norm,
    approvedRate: card.proposedRate,
    fallbackRate: card.fallbackRate ?? Math.round(card.proposedRate * 0.95),
    sourceBasis: card.sourceBasis || `Silva approved rate card ${card.id}`,
    sourceSurveyId: card.sourceSurveyId,
    sourceRateCardId: card.id,
    effectiveFrom,
    effectiveTo,
    status: "approved",
    version: (latest?.version ?? 0) + 1,
    supersedesId: latest?.id ?? null,
    approvedByName: ao.name,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  standing = [row, ...standing];
  pushAudit({
    entityType: "standing_line",
    entityId: row.id,
    action: "promoted_from_rate_card",
    actorName: ao.name,
    meta: { rateCardId, version: row.version, party: "asset_owner" },
  });
  return clone(row);
}

/* ─── Standing + resolve ─── */

export async function listStandingLines(
  filters: WorkflowContextFilters & { kind: StandingKind; includeArchived?: boolean },
): Promise<StandingLineRecord[]> {
  await mockDelay(120);
  return clone(
    standing
      .filter((s) => s.programId === filters.programId)
      .filter((s) => s.budgetYearId === filters.budgetYearId)
      .filter((s) => s.kind === filters.kind)
      .filter((s) => {
        if (filters.farmAreaId === "all") return true;
        return s.farmAreaId === null || s.farmAreaId === filters.farmAreaId;
      })
      .filter((s) => filters.includeArchived || s.status !== "archived")
      .sort((a, b) => {
        const act = (activityById(a.activityId)?.code || "").localeCompare(
          activityById(b.activityId)?.code || "",
        );
        if (act !== 0) return act;
        return b.version - a.version;
      }),
  );
}

export async function getStandingLine(id: string): Promise<StandingLineRecord | null> {
  await mockDelay(60);
  const row = standing.find((s) => s.id === id);
  return row ? clone(row) : null;
}

export async function listStandingVersions(lineId: string): Promise<StandingLineRecord[]> {
  await mockDelay(80);
  const seed = standing.find((s) => s.id === lineId);
  if (!seed) return [];
  const family = standing.filter(
    (s) =>
      s.kind === seed.kind &&
      s.programId === seed.programId &&
      s.budgetYearId === seed.budgetYearId &&
      s.activityId === seed.activityId &&
      s.farmAreaId === seed.farmAreaId &&
      s.blockId === seed.blockId,
  );
  return clone(family.sort((a, b) => b.version - a.version));
}

export async function reviseStandingLine(
  id: string,
  patch: { approvedRate: number; fallbackRate?: number | null; sourceBasis?: string; norm?: number | null },
): Promise<StandingLineRecord> {
  await mockDelay(180);
  const current = standing.find((s) => s.id === id);
  if (!current) throw new Error("Standing line not found");
  if (current.status !== "approved") throw new Error("Only approved lines can be revised");

  const now = isoNow();
  const day = now.slice(0, 10);
  standing = standing.map((s) =>
    s.id === id ? { ...current, status: "archived" as const, effectiveTo: day, updatedAt: now } : s,
  );

  const next: StandingLineRecord = {
    ...current,
    id: newId("sl"),
    approvedRate: patch.approvedRate,
    fallbackRate: patch.fallbackRate !== undefined ? patch.fallbackRate : current.fallbackRate,
    sourceBasis: patch.sourceBasis?.trim() || current.sourceBasis,
    norm: patch.norm !== undefined ? patch.norm : current.norm,
    effectiveFrom: day,
    effectiveTo: null,
    status: "approved",
    version: current.version + 1,
    supersedesId: current.id,
    approvedByName: DEFAULT_CHECKER.name,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  standing = [next, ...standing];
  pushAudit({
    entityType: "standing_line",
    entityId: next.id,
    action: "version_created",
    actorName: DEFAULT_CHECKER.name,
    comment: `Revised from v${current.version}`,
    meta: { version: next.version, supersedesId: current.id },
  });
  return clone(next);
}

export async function archiveStandingLine(id: string): Promise<StandingLineRecord> {
  await mockDelay(120);
  const idx = standing.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Standing line not found");
  const current = standing[idx];
  if (current.status === "archived") return clone(current);
  const now = isoNow();
  const updated: StandingLineRecord = {
    ...current,
    status: "archived",
    effectiveTo: now.slice(0, 10),
    updatedAt: now,
  };
  standing = [...standing.slice(0, idx), updated, ...standing.slice(idx + 1)];
  pushAudit({
    entityType: "standing_line",
    entityId: id,
    action: "archived",
    actorName: SPX_ACTOR.name,
  });
  return clone(updated);
}

export async function listAuditEvents(entityId: string): Promise<WorkflowAuditEvent[]> {
  await mockDelay(60);
  return clone(audit.filter((e) => e.entityId === entityId).sort((a, b) => b.at.localeCompare(a.at)));
}

export async function listAllAuditEvents(): Promise<WorkflowAuditEvent[]> {
  await mockDelay(80);
  return clone([...audit].sort((a, b) => b.at.localeCompare(a.at)));
}

/**
 * Precedence: Block → Farm Area → Program standing → approved fallback → norm × wage (labor).
 */
export async function resolveRate(input: {
  programId: string;
  budgetYearId: string;
  activityId: string;
  farmAreaId?: string | null;
  blockId?: string | null;
  asOf?: string;
}): Promise<ResolutionResult> {
  await mockDelay(100);
  const asOf = input.asOf ?? isoNow().slice(0, 10);
  const act = activityById(input.activityId);
  const active = standing.filter(
    (s) =>
      s.programId === input.programId &&
      s.budgetYearId === input.budgetYearId &&
      s.activityId === input.activityId &&
      s.status === "approved" &&
      s.effectiveFrom <= asOf &&
      (s.effectiveTo == null || s.effectiveTo >= asOf),
  );

  const pick = (pred: (s: StandingLineRecord) => boolean) =>
    active.filter(pred).sort((a, b) => b.version - a.version)[0] ?? null;

  const blockHit = input.blockId != null ? pick((s) => s.blockId === input.blockId) : null;
  const areaHit =
    input.farmAreaId != null
      ? pick((s) => s.farmAreaId === input.farmAreaId && s.blockId == null)
      : null;
  const programHit = pick((s) => s.farmAreaId == null && s.blockId == null);

  const chain: ResolutionStep[] = [
    {
      source: "block",
      label: "Block rate",
      matched: Boolean(blockHit),
      rate: blockHit?.approvedRate ?? null,
      standingLineId: blockHit?.id ?? null,
      version: blockHit?.version ?? null,
    },
    {
      source: "farm_area",
      label: "Farm Area rate",
      matched: Boolean(areaHit),
      rate: areaHit?.approvedRate ?? null,
      standingLineId: areaHit?.id ?? null,
      version: areaHit?.version ?? null,
    },
    {
      source: "program_standing",
      label: "Program standing rate",
      matched: Boolean(programHit),
      rate: programHit?.approvedRate ?? null,
      standingLineId: programHit?.id ?? null,
      version: programHit?.version ?? null,
    },
  ];

  const winner = blockHit ?? areaHit ?? programHit;
  if (winner) {
    const source = blockHit ? "block" : areaHit ? "farm_area" : "program_standing";
    return {
      rate: winner.approvedRate,
      source,
      standingLineId: winner.id,
      version: winner.version,
      chain,
      why: `Resolved via ${chain.find((c) => c.source === source)?.label} v${winner.version} (${winner.id}).`,
    };
  }

  const fallbackCandidate =
    pick((s) => s.fallbackRate != null) ??
    standing
      .filter(
        (s) =>
          s.programId === input.programId &&
          s.budgetYearId === input.budgetYearId &&
          s.activityId === input.activityId &&
          s.fallbackRate != null,
      )
      .sort((a, b) => b.version - a.version)[0] ??
    null;

  if (fallbackCandidate?.fallbackRate != null) {
    chain.push({
      source: "fallback",
      label: "Approved fallback rate",
      matched: true,
      rate: fallbackCandidate.fallbackRate,
      standingLineId: fallbackCandidate.id,
      version: fallbackCandidate.version,
    });
    return {
      rate: fallbackCandidate.fallbackRate,
      source: "fallback",
      standingLineId: fallbackCandidate.id,
      version: fallbackCandidate.version,
      chain,
      why: `No active standing rate; using fallback on ${fallbackCandidate.id} v${fallbackCandidate.version}.`,
    };
  }

  chain.push({
    source: "fallback",
    label: "Approved fallback rate",
    matched: false,
    rate: null,
    standingLineId: null,
    version: null,
  });

  if (act?.defaultNorm != null && act.defaultWage != null) {
    const normWage = Math.round(act.defaultNorm * act.defaultWage * 100) / 100;
    chain.push({
      source: "norm_wage",
      label: "Norm × wage",
      matched: true,
      rate: normWage,
      standingLineId: null,
      version: null,
    });
    return {
      rate: normWage,
      source: "norm_wage",
      standingLineId: null,
      version: null,
      chain,
      why: `No approved benchmark/standing rate; using norm × wage (${act.defaultNorm} × ${act.defaultWage}).`,
    };
  }

  chain.push({
    source: "norm_wage",
    label: "Norm × wage",
    matched: false,
    rate: null,
    standingLineId: null,
    version: null,
  });

  return {
    rate: null,
    source: "none",
    standingLineId: null,
    version: null,
    chain,
    why: "No resolvable rate for this program / year / activity context.",
  };
}

export function enrichRateCard(row: RateCardProposal) {
  const activity =
    activityById(row.activityId) ||
    ({
      id: row.activityId,
      code: (row as { activityCode?: string }).activityCode || row.activityId,
      name: (row as { activityName?: string }).activityName || row.activityId,
      category: row.kind === "labor" ? "Labor" : row.kind === "materials" ? "Materials" : "Services",
      uom: (row as { activityUnit?: string }).activityUnit || "unit",
      tier: row.kind === "labor" ? 1 : row.kind === "materials" ? 2 : 3,
      defaultNorm: null,
    } as WorkflowActivity);
  const farmArea =
    WORKFLOW_AREAS.find((a) => a.id === row.farmAreaId) ||
    ({
      id: row.farmAreaId,
      name: row.farmAreaName || "Farm",
      programId: row.programId,
    } as {
      id: string;
      name: string;
      programId: string;
    });
  const block = row.blockId ? WORKFLOW_BLOCKS.find((b) => b.id === row.blockId) : null;
  const program =
    WORKFLOW_PROGRAMS.find((p) => p.id === row.programId) ||
    ({ id: row.programId, name: row.programId } as { id: string; name: string });
  const year =
    WORKFLOW_YEARS.find((y) => y.id === row.budgetYearId) ||
    ({
      id: row.budgetYearId,
      name: row.budgetYearId,
      programId: row.programId,
    } as { id: string; name: string; programId: string });
  const survey = row.sourceSurveyId
    ? surveys.find((s) => s.id === row.sourceSurveyId) ?? null
    : null;
  return { ...row, activity, farmArea, block, program, year, survey };
}

export function enrichSurvey(row: BenchmarkSurveyRecord) {
  const activity =
    activityById(row.activityId) ||
    ({
      id: row.activityId,
      code: (row as { activityCode?: string }).activityCode || row.activityId,
      name: (row as { activityName?: string }).activityName || row.activityId,
      category: "Labor",
      uom: (row as { activityUnit?: string }).activityUnit || "unit",
      tier: (row as { activityTier?: number }).activityTier ?? 1,
      defaultNorm: null,
    } as WorkflowActivity);
  const farmArea =
    WORKFLOW_AREAS.find((a) => a.id === row.farmAreaId) ||
    ({
      id: row.farmAreaId || (row as { farmEstateId?: string }).farmEstateId || "",
      name:
        (row as { farmAreaName?: string | null }).farmAreaName ||
        (row as { farmEstateName?: string | null }).farmEstateName ||
        "Farm",
      programId: row.programId,
    } as { id: string; name: string; programId: string });
  const program =
    WORKFLOW_PROGRAMS.find((p) => p.id === row.programId) ||
    ({ id: row.programId, name: row.programId } as { id: string; name: string });
  const year =
    WORKFLOW_YEARS.find((y) => y.id === row.budgetYearId) ||
    ({
      id: row.budgetYearId || "year",
      name: row.budgetYearId || "Year",
      programId: row.programId,
    } as { id: string; name: string; programId: string });
  return { ...row, activity, farmArea, program, year };
}

export function enrichStanding(row: StandingLineRecord) {
  const activity = activityById(row.activityId);
  const farmArea = row.farmAreaId
    ? WORKFLOW_AREAS.find((a) => a.id === row.farmAreaId)
    : null;
  const block = row.blockId ? WORKFLOW_BLOCKS.find((b) => b.id === row.blockId) : null;
  const program = WORKFLOW_PROGRAMS.find((p) => p.id === row.programId);
  const year = WORKFLOW_YEARS.find((y) => y.id === row.budgetYearId);
  return { ...row, activity, farmArea, block, program, year };
}
