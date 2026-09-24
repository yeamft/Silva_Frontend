/**
 * Chaka Buna Estate — Farm Management Process Map (source of truth).
 * Steps 0–13 + Loops A–H as published in the Agreement Process Map.
 */

import type { ProcessLoop } from "@/types/agronomic-cycle";
import { CROPFORT_ROUTES } from "@/config/navigation";

export type ProcessMapPhase = "0" | "A" | "B" | "C" | "D" | "E";

export type ProcessMapDesk =
  | "spx"
  | "silva"
  | "chaka_buna"
  | "rfsp"
  | "decision";

export type ProcessMapStep = {
  id: number | "0";
  phase: ProcessMapPhase;
  desk: ProcessMapDesk;
  title: string;
  summary: string;
  output: string;
  timing: string;
  /** CropFort route when implemented. */
  href?: string;
};

export const PROCESS_MAP_PHASES: {
  id: ProcessMapPhase;
  label: string;
  cadence: string;
}[] = [
  { id: "0", label: "Establishment", cadence: "First 90 days after signature (longstop 120)" },
  { id: "A", label: "Annual & six-month planning", cadence: "Annually; refreshed each six months" },
  { id: "B", label: "Monthly & weekly scheduling", cadence: "Monthly, then weekly" },
  { id: "C", label: "Field execution", cadence: "Daily, within each week" },
  { id: "D", label: "Recording, validation & monthly reporting", cadence: "Daily records, monthly analysis" },
  { id: "E", label: "Formal six-month review", cadence: "End of each six-month period" },
];

export const PROCESS_MAP_STEPS: ProcessMapStep[] = [
  {
    id: "0",
    phase: "0",
    desk: "spx",
    title: "Establishment programme build",
    summary:
      "SPX builds baseline, first annual plan/budget, standards annex, KPIs, approval thresholds and dependency register. Silva approves each deliverable (deemed approved if silent). Interim: every spend to Silva; no KPI effect until close.",
    output: "Approved establishment pack · interim rules",
    timing: "Within 90 days; all approved within 120 or either party may walk away",
    href: CROPFORT_ROUTES.agreementLifecycle,
  },
  {
    id: 1,
    phase: "A",
    desk: "spx",
    title: "Farm assessment",
    summary:
      "Full assessment of agronomic condition, infrastructure, labour and inputs. Full assessment in establishment; update before each later programme year.",
    output: "Farm status report",
    timing: "Establishment; update before each programme year",
    href: CROPFORT_ROUTES.agreementLifecycle,
  },
  {
    id: 2,
    phase: "A",
    desk: "spx",
    title: "Annual & six-month workplan, budget and targets",
    summary:
      "Prepare workplan, budget and target outcomes from the farm status report and latest six-month review. Submit package to Silva.",
    output: "Draft workplan · budget · target outcomes",
    timing: "Within 20 working days of assessment; six-month refresh 4 weeks before period",
    href: CROPFORT_ROUTES.coreOperations,
  },
  {
    id: 3,
    phase: "A",
    desk: "silva",
    title: "Review of the plan package",
    summary:
      "Review workplan, budget and targets against owner objectives and funding. Written approval or rationale per revision. Loop A if not approved.",
    output: "Written approval or revision rationale",
    timing: "10 working days (5 on resubmission)",
    href: CROPFORT_ROUTES.approvals,
  },
  {
    id: 4,
    phase: "A",
    desk: "spx",
    title: "Programme standards annex (Schedule 5)",
    summary:
      "Validation criteria (±10% qty, quality per manual, labour vs attendance, inputs within issued). Platform access & escalation / mandate-exclusion rules. Acknowledged by Provider and Chaka Buna.",
    output: "Standards annex",
    timing: "Within 10 working days of plan approval; reviewed each six months",
    href: CROPFORT_ROUTES.agreementLifecycle,
  },
  {
    id: 5,
    phase: "B",
    desk: "spx",
    title: "Monthly work order",
    summary:
      "Convert approved six-month plan into monthly WO; fold in last month's insights (Loop G). Flag any activity/spend outside plan → Silva (Loop B).",
    output: "Draft monthly work order",
    timing: "By the 20th of the preceding month",
    href: CROPFORT_ROUTES.monthlyWorkOrders,
  },
  {
    id: 6,
    phase: "B",
    desk: "spx",
    title: "Weekly implementation plan",
    summary:
      "Break monthly WO into weekly plans with manuals, labour/tools, procurement specs and proposed spend. Issue to Provider and Chaka Buna Farm Manager / Agronomist.",
    output: "Weekly plan · manuals · procurement · proposed spend",
    timing: "By Thursday for the following week (if prior week validated by Wednesday)",
    href: CROPFORT_ROUTES.weeklySubmissions,
  },
  {
    id: 7,
    phase: "C",
    desk: "chaka_buna",
    title: "Spend approval, procurement & labour",
    summary:
      "Farm Manager checks proposed spend vs budget; procures; administers labour as sole employer. Excess spend → Process C (budget overrun).",
    output: "Approved spend · procurement record · labour ready",
    timing: "Spend check within 1 working day; resources on site by Monday",
    href: CROPFORT_ROUTES.weeklySubmissions,
  },
  {
    id: 8,
    phase: "C",
    desk: "rfsp",
    title: "On-site guidance & quality check",
    summary:
      "Provider guides Farm Manager / Agronomist / labour using SPX manuals; corrective direction on site. Refusal → Process D. Unplanned event → Process E.",
    output: "Work to specification · same-day exception reports",
    timing: "Daily, on site",
    href: CROPFORT_ROUTES.fieldTickets,
  },
  {
    id: 9,
    phase: "D",
    desk: "chaka_buna",
    title: "Daily field records",
    summary:
      "Block Manager records activities, labour, inputs and outputs by block, including agreed deviations. Submit to Provider and SPX.",
    output: "Raw daily data by block",
    timing: "By end of each working day",
    href: CROPFORT_ROUTES.dailyFieldRecords,
  },
  {
    id: 10,
    phase: "D",
    desk: "rfsp",
    title: "Validation against SPX criteria",
    summary:
      "Provider validates each daily record against work observed and Schedule 5 criteria. Fail → Loop F (Daily Record Correction).",
    output: "Sign-off or written rationale per criterion",
    timing: "Next working day",
    href: CROPFORT_ROUTES.validationQueue,
  },
  {
    id: 11,
    phase: "D",
    desk: "spx",
    title: "Monthly analysis & reconciliation",
    summary:
      "Analyse signed data; insights; financial report and budget reconciliation; PDF summary to Silva. Insights feed next monthly WO (Loop G).",
    output: "Updated platform · insights · reconciliation · Silva summary",
    timing: "By the 15th of the following month",
    href: CROPFORT_ROUTES.reports,
  },
  {
    id: 12,
    phase: "E",
    desk: "spx",
    title: "Six-month performance report",
    summary:
      "Consolidate six monthly reports vs targets and budget; propose adjustments; convene review.",
    output: "Six-month performance report · proposed adjustments",
    timing: "Within 20 working days after the period ends",
    href: CROPFORT_ROUTES.agreementLifecycle,
  },
  {
    id: 13,
    phase: "E",
    desk: "silva",
    title: "Formal six-month review",
    summary:
      "Review with SPX, Provider and Chaka Buna Farm Manager. Confirm/revise targets and funding. Not accepted → Loop H.",
    output: "Written review outcome · direction for next period",
    timing: "Meeting within 2 weeks; written outcome within 5 working days",
    href: CROPFORT_ROUTES.agreementLifecycle,
  },
];

export const PROCESS_MAP_LOOPS: {
  id: Exclude<ProcessLoop, "none">;
  letter: string;
  title: string;
  trigger: string;
  reentry: string;
}[] = [
  {
    id: "A_plan_return",
    letter: "A",
    title: "Plan Approval Rectification",
    trigger: "Silva does not approve the plan package (Step 3)",
    reentry: "SPX refines → resubmit Step 3",
  },
  {
    id: "B_out_of_plan",
    letter: "B",
    title: "Out-of-Plan Work Order Rectification",
    trigger: "Silva does not approve an out-of-plan monthly work order (Step 5)",
    reentry: "SPX revises → reissue Step 5",
  },
  {
    id: "C_budget_overrun",
    letter: "C",
    title: "Budget Overrun Approval",
    trigger: "Proposed weekly spend exceeds approved budget (Step 7)",
    reentry: "Silva approve → Step 7 · or SPX reissue weekly plan Step 6",
  },
  {
    id: "D_non_compliance",
    letter: "D",
    title: "Implementation Non-Compliance Rectification",
    trigger: "Chaka Buna does not implement a WO or refuses on-site corrective direction (Step 8)",
    reentry: "Stage 1→2→3 mandate exclusion · then Step 9",
  },
  {
    id: "E_unplanned_event",
    letter: "E",
    title: "Unplanned Event Deviation",
    trigger: "Weather, pests, disease or labour shortage forces a plan change (Step 8)",
    reentry: "Agree on site → SPX confirm · budget change → Process C · else Step 9",
  },
  {
    id: "F_dfr_correction",
    letter: "F",
    title: "Daily Record Correction",
    trigger: "Daily record fails Schedule 5 validation criteria (Step 10)",
    reentry: "Block Manager corrects → revalidate Step 10",
  },
  {
    id: "G_monthly_feedback",
    letter: "G",
    title: "Monthly Feedback",
    trigger: "Each month's insights and budget variance shape the next WO",
    reentry: "Carry forward into Step 5 next month",
  },
  {
    id: "H_six_month",
    letter: "H",
    title: "Six-Month Review Corrective Action",
    trigger: "Silva does not accept six-month performance (Step 13)",
    reentry: "SPX corrective action plan → resubmit Step 12",
  },
];

export const PROCESS_MAP_DESK_LABELS: Record<ProcessMapDesk, string> = {
  spx: "SPX — programme manager",
  silva: "Silva — owner / approver",
  chaka_buna: "Chaka Buna — farm company / employer",
  rfsp: "Resident Field Supervision Provider",
  decision: "Decision point",
};

export function processLoopLabel(loop: ProcessLoop): string {
  if (loop === "none") return "";
  const row = PROCESS_MAP_LOOPS.find((l) => l.id === loop);
  return row ? `Loop ${row.letter} · ${row.title}` : loop;
}

export function processLoopLetter(loop: ProcessLoop): string | null {
  if (loop === "none") return null;
  return PROCESS_MAP_LOOPS.find((l) => l.id === loop)?.letter ?? null;
}
