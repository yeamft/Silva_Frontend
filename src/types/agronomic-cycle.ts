/** Agronomic operating cycle (Agreement Process Map Phases B–E). */

import type { PlanMonth } from "@/lib/cropfort/ethiopian-year";
import type { MissCause } from "@/lib/cropfort/miss-cause";

export type { MissCause };

export type MonthlyWoStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "returned"
  | "active";

export type WeeklyPlanStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "returned"
  | "active";

export type DfrStatus =
  | "draft"
  | "submitted"
  | "site_checked"
  | "validated"
  | "returned";

export type DfrEntrySource = "bagro_platform" | "import_from_chaka";

/** Process Map loops A–H (Chaka Buna Estate Farm Management Process Map). */
export type ProcessLoop =
  | "none"
  | "A_plan_return"
  | "B_out_of_plan"
  | "C_budget_overrun"
  | "D_non_compliance"
  | "E_unplanned_event"
  | "F_dfr_correction"
  | "G_monthly_feedback"
  | "H_six_month";

/** Mandate-exclusion stages under Loop D (Agreement A clause 26). */
export type MandateExclusionStage = "none" | "stage_1" | "stage_2" | "stage_3_excluded";

export type MonthlyWoLine = {
  id: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  blockId: string;
  blockCode: string;
  plannedQty: number;
  unit: string;
  etb: number;
  /** Linked activity manual on the Platform (RB03.6 / RB09.3). */
  manualsRef: string;
  /** False triggers Loop B (out-of-plan) approval. */
  inPlan: boolean;
};

export type MonthlyWorkOrder = {
  id: string;
  code: string;
  farmId: string;
  farmName: string;
  programId: string;
  ethiopianMonth: PlanMonth;
  yearGc: number;
  status: MonthlyWoStatus;
  lines: MonthlyWoLine[];
  sourcePlanId: string | null;
  outOfPlanReason: string;
  loop: ProcessLoop;
  totalEtb: number;
  /** Prior monthly report insights / variance (RB03.1 / RB04.10). */
  lastMonthInsights: string;
  createdAt: string;
  updatedAt: string;
  note: string;
};

export type WeeklyPlanLine = {
  id: string;
  monthlyLineId: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  blockId: string;
  blockCode: string;
  qty: number;
  unit: string;
  crew: string;
  materials: string;
  manualsRef: string;
  etb: number;
};

export type WeeklyPlan = {
  id: string;
  code: string;
  /** Same monthly WO id for every weekly slice (RB03 / RB09.6). */
  monthlyWoId: string;
  /** Human monthly WO code carried on every slice. */
  monthlyWoCode: string;
  weekLabel: string;
  status: WeeklyPlanStatus;
  lines: WeeklyPlanLine[];
  /** Bridged AFE work-order ids after activate. */
  bridgedWorkOrderIds: string[];
  /** Direct Instruction ids rolled into this week (RB03.7). */
  directInstructionIds: string[];
  loop: ProcessLoop;
  createdAt: string;
  updatedAt: string;
  note: string;
};

export type DailyFieldRecord = {
  id: string;
  code: string;
  weeklyPlanId: string;
  weeklyPlanLineId: string;
  /** Lineage back to monthly WO (RB03 / RB09.10). */
  monthlyWoId: string;
  monthlyWoCode: string;
  monthlyLineId: string;
  workOrderId: string | null;
  date: string;
  blockId: string;
  blockCode: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  plannedQty: number;
  actualQty: number;
  unit: string;
  laborHours: number;
  materialsUsed: string[];
  notes: string;
  status: DfrStatus;
  variancePct: number;
  linkedTicketId: string | null;
  /** % of planned quantity done (RB04 checked record). */
  pctDone: number | null;
  /** % of units inspected that meet the manual (RB04 quality score). */
  qualityScore: number | null;
  /** Append-only version; corrections create a new row. */
  version: number;
  supersedesId: string | null;
  failedCriteria: string[];
  entrySource: DfrEntrySource;
  missCause: MissCause | null;
  loop: ProcessLoop;
  createdAt: string;
  updatedAt: string;
  validationNotes: string;
};

/** Direct Instruction — small change / urgent job under DI value (RB03.7–8). */
export type DirectInstructionStatus =
  | "draft"
  | "issued"
  | "confirmed"
  | "rolled_into_weekly"
  | "escalated";

export type DirectInstruction = {
  id: string;
  code: string;
  title: string;
  description: string;
  monthlyWoId: string | null;
  monthlyWoCode: string | null;
  weeklyPlanId: string | null;
  weeklyPlanLineId: string | null;
  workOrderId: string | null;
  blockId: string;
  blockCode: string;
  amountEtb: number;
  /** True when amount exceeds Operating Standards DI value → Intervention / Approvals. */
  overThreshold: boolean;
  oralPendingConfirm: boolean;
  status: DirectInstructionStatus;
  issuedAt: string;
  confirmedAt: string | null;
  rolledIntoWeeklyPlanId: string | null;
  note: string;
};

export type EstablishmentDeliverable = {
  id: string;
  title: string;
  dueDay: number;
  done: boolean;
  doneAt: string | null;
};

export type EstablishmentPhase = {
  id: string;
  programId: string;
  farmName: string;
  startDate: string;
  day90Due: string;
  day120Due: string;
  status: "not_started" | "in_progress" | "complete" | "overdue";
  deliverables: EstablishmentDeliverable[];
  notes: string;
};

export type SixMonthReview = {
  id: string;
  planId: string;
  farmName: string;
  budgetYearLabel: string;
  status: "draft" | "submitted" | "accepted" | "corrective_action";
  findings: string;
  varianceEtb: number;
  variancePct: number;
  correctiveActions: string;
  createdAt: string;
  updatedAt: string;
};

export type ProcessCalendarItem = {
  id: string;
  phase: "0" | "A" | "B" | "C" | "D" | "E";
  label: string;
  dueOffsetDays: number;
  ownerDesk: "spx" | "rfsp" | "farm_co" | "silva";
};

/** Schedule 7 dependency gates before Monthly/Weekly submit. */
export type Schedule7Dependency = {
  id: string;
  label: string;
  required: boolean;
  met: boolean;
};

export type Schedule5Config = {
  qtyVariancePctMax: number;
  requireLaborHours: boolean;
  requireBlockMatch: boolean;
  requireNotesIfVariance: boolean;
};

export type ReservedMatterFlags = {
  procurementAboveBand: boolean;
  permanentHire: boolean;
  relatedParty: boolean;
  landDisposition: boolean;
  financing: boolean;
};

export const DEFAULT_SCHEDULE5: Schedule5Config = {
  qtyVariancePctMax: 10,
  requireLaborHours: true,
  requireBlockMatch: true,
  requireNotesIfVariance: true,
};

export const DEFAULT_SCHEDULE7: Schedule7Dependency[] = [
  { id: "s7-rate", label: "Standing rate card current", required: true, met: true },
  { id: "s7-manual", label: "Operating manuals available", required: true, met: true },
  { id: "s7-hse", label: "HSE briefing complete", required: true, met: true },
  { id: "s7-inputs", label: "Inputs / materials confirmed", required: false, met: false },
];

export const DEFAULT_ESTABLISHMENT_DELIVERABLES: Omit<EstablishmentDeliverable, "done" | "doneAt">[] = [
  { id: "ed-1", title: "Farm assessment / baseline status report", dueDay: 30 },
  { id: "ed-2", title: "First annual workplan, budget & targets", dueDay: 60 },
  { id: "ed-3", title: "Silva approval of establishment pack", dueDay: 90 },
  { id: "ed-4", title: "Standards annex Schedule 5", dueDay: 90 },
  { id: "ed-5", title: "KPI set & attribution codes", dueDay: 90 },
  { id: "ed-6", title: "Approval thresholds & dependency register", dueDay: 90 },
  { id: "ed-7", title: "All establishment deliverables approved (120-day longstop)", dueDay: 120 },
];

export const DEFAULT_PROCESS_CALENDAR: ProcessCalendarItem[] = [
  { id: "pc-0", phase: "0", label: "Establishment kickoff", dueOffsetDays: 0, ownerDesk: "spx" },
  { id: "pc-0b", phase: "0", label: "Day-90 establishment pack", dueOffsetDays: 90, ownerDesk: "spx" },
  { id: "pc-0c", phase: "0", label: "Day-120 longstop", dueOffsetDays: 120, ownerDesk: "silva" },
  { id: "pc-a", phase: "A", label: "Workplan package to Silva", dueOffsetDays: 20, ownerDesk: "spx" },
  { id: "pc-b", phase: "B", label: "Monthly WO (by 20th)", dueOffsetDays: 20, ownerDesk: "spx" },
  { id: "pc-c", phase: "B", label: "Weekly plan (Thursday)", dueOffsetDays: 4, ownerDesk: "spx" },
  { id: "pc-d", phase: "D", label: "DFR validate (next day)", dueOffsetDays: 1, ownerDesk: "rfsp" },
  { id: "pc-e", phase: "D", label: "Monthly analysis (by 15th)", dueOffsetDays: 15, ownerDesk: "spx" },
  { id: "pc-f", phase: "E", label: "Six-month review", dueOffsetDays: 180, ownerDesk: "silva" },
];
