/** Client-side Rate Card workflow model (B–F). Backend swap later. */

export type WorkflowStatus = "draft" | "submitted" | "approved" | "returned" | "archived";

export type StandingKind = "labor" | "materials" | "services";

/** @deprecated Use StandingKind — rate cards cover labor, materials, and services. */
export type DirectRateCardKind = StandingKind;

export type ResolutionSource =
  | "block"
  | "farm_area"
  | "program_standing"
  | "fallback"
  | "norm_wage"
  | "none";

export interface WorkflowProgram {
  id: string;
  name: string;
}

export interface WorkflowBudgetYear {
  id: string;
  name: string;
  programId: string;
}

export interface WorkflowFarmArea {
  id: string;
  name: string;
  programId: string;
}

export interface WorkflowBlock {
  id: string;
  name: string;
  farmAreaId: string;
}

export interface WorkflowActivity {
  id: string;
  code: string;
  name: string;
  category: string;
  uom: string;
  tier: 1 | 2 | 3;
  defaultNorm: number | null;
  /** Wage used with norm × wage fallback when no approved benchmark. */
  defaultWage?: number | null;
}

export interface EligibleChecker {
  userId: string;
  name: string;
  roleLabel: string;
  assignmentLabel: string;
  orgName: string;
}

export type WorkflowParty = "spx" | "asset_owner";

export interface WorkflowAuditEvent {
  id: string;
  entityType: "benchmark_survey" | "rate_card" | "standing_line";
  entityId: string;
  action: string;
  actorName: string;
  comment?: string | null;
  at: string;
  meta?: Record<string, unknown>;
}

/**
 * Benchmark Survey — neighbor evidence for any kind.
 * Lock → recommended rate. Rate Card is created from this and goes to Silva.
 */
export interface BenchmarkSurveyRecord {
  id: string;
  programId: string;
  budgetYearId: string;
  farmAreaId: string;
  farmAreaName?: string | null;
  activityId: string;
  kind: StandingKind;
  neighbor1Name: string;
  neighbor2Name: string;
  neighbor1Rate: number;
  neighbor2Rate: number;
  lockedAt: string | null;
  recommendedRate: number;
  /** Prefill for rate card proposed rate after lock. */
  proposedRate: number;
  variancePct: number | null;
  flagged: boolean;
  availableFrom: string;
  availableTo: string | null;
  fallbackRate: number | null;
  justificationNote: string;
  surveyDate: string;
  sourceEvidence: string;
  notes: string;
  status: WorkflowStatus;
  returnComment?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Rate card draft → Silva approve → Standing.
 * Created from a locked Benchmark Survey (evidence + recommended rate).
 * Field shape mirrors Standing: Code/Activity/Scope/UoM/Norm/Approved/Fallback/Source/Effective/Status.
 */
export interface RateCardProposal {
  id: string;
  programId: string;
  budgetYearId: string;
  farmAreaId: string;
  /** Display name when resolved from API (never show raw farmEstateId). */
  farmAreaName?: string | null;
  blockId: string | null;
  activityId: string;
  kind: StandingKind;
  /** Locked benchmark this rate card is built from; null when created via rate-card Excel import. */
  sourceSurveyId: string | null;
  /** Snapshot of benchmark recommended rate at create time. */
  recommendedRate: number | null;
  proposedRate: number;
  variancePct: number | null;
  flagged: boolean;
  norm: number | null;
  fallbackRate: number | null;
  sourceBasis: string;
  availableFrom: string;
  availableTo: string | null;
  justificationNote: string;
  sourceEvidence: string;
  notes: string;
  status: WorkflowStatus;
  returnComment?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StandingLineRecord {
  id: string;
  kind: StandingKind;
  programId: string;
  budgetYearId: string;
  farmAreaId: string | null;
  blockId: string | null;
  activityId: string;
  norm: number | null;
  approvedRate: number;
  fallbackRate: number | null;
  sourceBasis: string;
  sourceSurveyId: string | null;
  sourceRateCardId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: WorkflowStatus;
  version: number;
  supersedesId: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolutionStep {
  source: ResolutionSource;
  label: string;
  matched: boolean;
  rate: number | null;
  standingLineId: string | null;
  version: number | null;
}

export interface ResolutionResult {
  rate: number | null;
  source: ResolutionSource;
  standingLineId: string | null;
  version: number | null;
  chain: ResolutionStep[];
  why: string;
}

export interface WorkflowContextFilters {
  programId: string;
  budgetYearId: string;
  farmAreaId: string | "all";
}

export const USE_RATE_CARD_MOCK = true;
