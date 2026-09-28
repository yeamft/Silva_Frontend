/**
 * Cropfort product map — each area has one best interface pattern.
 * Keep this as the source of truth for nav labels and workspace shells.
 */

export type CropfortInterfaceKind =
  | "attention_continue"
  | "hierarchy_explorer"
  | "searchable_list"
  | "focused_workflow"
  | "catalog"
  | "planning_workspace"
  | "project_workspace"
  | "action_workspace"
  | "structured_document"
  | "authorization_document"
  | "review_queue"
  | "ops_board"
  | "mobile_task"
  | "progress_tracker"
  | "financial_explorer"
  | "readable_report"
  | "timeline"
  | "searchable_library";

export type CropfortAreaId =
  | "home"
  | "programs"
  | "farm_structure"
  | "activity_taxonomy"
  | "benchmark_surveys"
  | "rate_cards"
  | "core_operations"
  | "projects"
  | "interventions"
  | "afp"
  | "afe"
  | "approvals"
  | "work_orders"
  | "field_execution"
  | "progress"
  | "budget"
  | "communications"
  | "reports"
  | "audit"
  | "archive"
  | "monthly_work_orders"
  | "weekly_plans"
  | "daily_field_records"
  | "validation_queue"
  | "agreement_lifecycle";

export type CropfortAreaDef = {
  id: CropfortAreaId;
  label: string;
  interfaceKind: CropfortInterfaceKind;
  interfaceLabel: string;
  description: string;
  href: string;
  /** Ready = real UI; shell = patterned placeholder with demo chrome */
  readiness: "ready" | "shell";
};

export const CROPFORT_AREAS: CropfortAreaDef[] = [
  {
    id: "home",
    label: "Home",
    interfaceKind: "attention_continue",
    interfaceLabel: "Attention + continue-work",
    description: "What needs you now, and where to continue.",
    href: "/cropfort/dashboard",
    readiness: "ready",
  },
  {
    id: "programs",
    label: "Programs",
    interfaceKind: "catalog",
    interfaceLabel: "Program register",
    description: "Create and manage programme records (name, slug, status).",
    href: "/cropfort/admin/programs",
    readiness: "ready",
  },
  {
    id: "farm_structure",
    label: "Farm Areas",
    interfaceKind: "hierarchy_explorer",
    interfaceLabel: "Farm areas register",
    description: "Farm areas linked to organizations.",
    href: "/cropfort/admin/farm-areas",
    readiness: "ready",
  },
  {
    id: "activity_taxonomy",
    label: "Activity Taxonomy",
    interfaceKind: "searchable_list",
    interfaceLabel: "Searchable list",
    description: "Tier 1–3 activities, service type, units, and manuals.",
    href: "/cropfort/activity-taxonomy",
    readiness: "ready",
  },
  {
    id: "benchmark_surveys",
    label: "Benchmark Surveys",
    interfaceKind: "focused_workflow",
    interfaceLabel: "Focused form / workflow",
    description: "Neighbor evidence → lock recommended rate.",
    href: "/cropfort/rate-cards/benchmark-surveys",
    readiness: "ready",
  },
  {
    id: "rate_cards",
    label: "Rate Cards",
    interfaceKind: "catalog",
    interfaceLabel: "Catalog",
    description: "Approved unit rates that price Core Ops.",
    href: "/cropfort/rate-cards/proposals",
    readiness: "ready",
  },
  {
    id: "core_operations",
    label: "Core Operations",
    interfaceKind: "planning_workspace",
    interfaceLabel: "Planning workspace + calendar",
    description: "Annual Tier 1 plan: activities, qty, schedule.",
    href: "/cropfort/planning/programmes",
    readiness: "ready",
  },
  {
    id: "projects",
    label: "Projects",
    interfaceKind: "project_workspace",
    interfaceLabel: "Project workspace",
    description: "Tier 2 project scopes and commercial agreements.",
    href: "/cropfort/projects",
    readiness: "ready",
  },
  {
    id: "interventions",
    label: "Interventions",
    interfaceKind: "action_workspace",
    interfaceLabel: "Focused action workspace",
    description: "Tier 3 interventions and one-off actions.",
    href: "/cropfort/interventions",
    readiness: "ready",
  },
  {
    id: "afp",
    label: "AFP",
    interfaceKind: "structured_document",
    interfaceLabel: "Structured plan / document",
    description: "Annual Farm Plans promoted from Core Ops.",
    href: "/cropfort/afp-register",
    readiness: "ready",
  },
  {
    id: "afe",
    label: "AFE",
    interfaceKind: "authorization_document",
    interfaceLabel: "Authorization / document",
    description: "Authority for Expenditure by band.",
    href: "/cropfort/afe",
    readiness: "ready",
  },
  {
    id: "approvals",
    label: "Approvals",
    interfaceKind: "review_queue",
    interfaceLabel: "Review queue",
    description: "Rates, plans, and AFEs waiting on a decision.",
    href: "/cropfort/approvals",
    readiness: "ready",
  },
  {
    id: "work_orders",
    label: "Work Orders",
    interfaceKind: "ops_board",
    interfaceLabel: "Operational list / board",
    description: "Move issued work from queue to done.",
    href: "/cropfort/work-orders",
    readiness: "ready",
  },
  {
    id: "field_execution",
    label: "Field Execution",
    interfaceKind: "mobile_task",
    interfaceLabel: "Simple mobile task screen",
    description: "Assign task tickets to vendors, site owners, and asset owners.",
    href: "/cropfort/field-tickets",
    readiness: "ready",
  },
  {
    id: "progress",
    label: "Progress",
    interfaceKind: "progress_tracker",
    interfaceLabel: "Activity / block progress",
    description: "Ticket completion by block, and who is holding the next step.",
    href: "/cropfort/progress",
    readiness: "ready",
  },
  {
    id: "budget",
    label: "Cost Management",
    interfaceKind: "financial_explorer",
    interfaceLabel: "Drill-down financial explorer",
    description: "Budget vs actual by category and activity.",
    href: "/cropfort/budget",
    readiness: "ready",
  },
  {
    id: "communications",
    label: "Communications",
    interfaceKind: "catalog",
    interfaceLabel: "Message threads",
    description: "SPX-mediated programme messages.",
    href: "/cropfort/communications",
    readiness: "ready",
  },
  {
    id: "reports",
    label: "Reports",
    interfaceKind: "readable_report",
    interfaceLabel: "Readable report",
    description: "Released narrative and operational reports.",
    href: "/cropfort/reports",
    readiness: "ready",
  },
  {
    id: "audit",
    label: "Audit",
    interfaceKind: "timeline",
    interfaceLabel: "Timeline",
    description: "Who changed what, and when.",
    href: "/cropfort/audit-trail",
    readiness: "ready",
  },
  {
    id: "archive",
    label: "Archive",
    interfaceKind: "searchable_library",
    interfaceLabel: "Searchable library",
    description: "Archived rate cards and closed plans.",
    href: "/cropfort/rate-cards/archive",
    readiness: "ready",
  },
  {
    id: "monthly_work_orders",
    label: "Monthly Work Orders",
    interfaceKind: "ops_board",
    interfaceLabel: "Monthly scope board",
    description: "Monthly work orders from the annual programme.",
    href: "/cropfort/monthly-work-orders",
    readiness: "ready",
  },
  {
    id: "weekly_plans",
    label: "Weekly Plans",
    interfaceKind: "ops_board",
    interfaceLabel: "Weekly implementation board",
    description: "Weekly plans that bridge to work orders.",
    href: "/cropfort/weekly-submissions",
    readiness: "ready",
  },
  {
    id: "daily_field_records",
    label: "Daily Field Records",
    interfaceKind: "mobile_task",
    interfaceLabel: "Daily actuals capture",
    description: "Field actuals against the weekly plan.",
    href: "/cropfort/daily-field-records",
    readiness: "ready",
  },
  {
    id: "validation_queue",
    label: "DFR Validation",
    interfaceKind: "review_queue",
    interfaceLabel: "Sch. 5 validation desk",
    description: "Site-check and validate Daily Field Records.",
    href: "/cropfort/validation-queue",
    readiness: "ready",
  },
  {
    id: "agreement_lifecycle",
    label: "Agreement lifecycle",
    interfaceKind: "planning_workspace",
    interfaceLabel: "Establishment + schedules",
    description: "Establishment, six-month review, and schedules.",
    href: "/cropfort/agreement-lifecycle",
    readiness: "ready",
  },
];

export function getCropfortArea(id: CropfortAreaId): CropfortAreaDef {
  const row = CROPFORT_AREAS.find((a) => a.id === id);
  if (!row) throw new Error(`Unknown Cropfort area: ${id}`);
  return row;
}

export function getCropfortAreaByHref(href: string): CropfortAreaDef | undefined {
  return CROPFORT_AREAS.find((a) => a.href === href || href.startsWith(a.href + "/"));
}
