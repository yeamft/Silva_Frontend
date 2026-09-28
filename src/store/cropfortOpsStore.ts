import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bandForAmount, type AfeBand } from "@/lib/cropfort/ethiopian-year";

export type NodeKind = "program" | "farm" | "area" | "block";
export type NodeStatus = "active" | "inactive";
export type ProjectStatus = "draft" | "submitted" | "approved" | "in_progress" | "complete" | "returned";
export type InterventionStatus = "draft" | "active" | "submitted" | "approved" | "complete" | "returned";
export type AfeStatus = "draft" | "submitted" | "approved" | "issued" | "returned";
export type WoStatus = "draft" | "issued" | "in_progress" | "complete";
export type Attention = "none" | "overdue" | "insurance";
export type TicketStatus =
  | "assigned"
  | "accepted"
  | "in_progress"
  | "submitted"
  | "site_reviewed"
  | "validated"
  | "returned";
export type ApprovalKind = "project" | "intervention" | "afe";
export type ExecParty = "vendor" | "site_owner" | "asset_owner" | "spx";

export type FarmNode = {
  id: string;
  kind: NodeKind;
  parentId: string | null;
  name: string;
  code: string;
  hectares: number;
  status: NodeStatus;
};

export type Milestone = { id: string; title: string; done: boolean };

export type Project = {
  id: string;
  code: string;
  title: string;
  blockId: string;
  vendor: string;
  budgetEtb: number;
  band: AfeBand;
  status: ProjectStatus;
  notes: string;
  milestones: Milestone[];
};

export type Intervention = {
  id: string;
  code: string;
  title: string;
  blockId: string;
  vendor: string;
  costEtb: number;
  status: InterventionStatus;
  steps: Milestone[];
};

export type AfeDoc = {
  id: string;
  code: string;
  title: string;
  sourceType: "project" | "intervention" | "afp";
  sourceId: string;
  blockId: string;
  amountEtb: number;
  band: AfeBand;
  status: AfeStatus;
};

export type WorkOrder = {
  id: string;
  afeId: string;
  code: string;
  title: string;
  activity: string;
  block: string;
  farm: string;
  vendor: string;
  assignee: string;
  initials: string;
  status: WoStatus;
  week: string;
  etb: number;
  progress: number;
  ticketsDone: number;
  ticketsTotal: number;
  afe: string;
  due: string;
  attention: Attention;
  /** Lineage from monthly / weekly (RB03 / RB09.6). */
  monthlyWoId: string | null;
  monthlyWoCode: string | null;
  monthlyLineId: string | null;
  weeklyPlanId: string | null;
  weeklyPlanLineId: string | null;
  manualsRef: string;
};

export type TicketEvent = {
  id: string;
  at: string;
  actor: string;
  party: ExecParty;
  action: string;
};

export type FieldTicket = {
  id: string;
  code: string;
  workOrderId: string;
  title: string;
  description: string;
  block: string;
  vendor: string;
  vendorLead: string;
  siteOwner: string;
  assetOwner: string;
  assignedBy: string;
  status: TicketStatus;
  hours: number;
  amountEtb: number;
  due: string;
  createdAt: string;
  events: TicketEvent[];
};

export const EXEC_CREW = {
  vendors: [
    { name: "Abebe Bekele", org: "RFSP" },
    { name: "Solomon Desta", org: "RFSP" },
    { name: "Tigist Hailu", org: "GreenLine" },
  ],
  siteOwners: [
    { name: "Hana Mekonnen", site: "Nursery & terrace" },
    { name: "Dawit Lemma", site: "Ridge & riverside" },
  ],
  assetOwners: [{ name: "Chaka Buna reviewer", org: "Chaka Buna" }],
};

export function execPartyForRole(role: string): ExecParty {
  if (role === "bagro_office" || role.startsWith("vendor_")) return "vendor";
  if (role === "field_supervisor") return "site_owner";
  if (role === "farm_owner") return "asset_owner";
  return "spx";
}

export function ticketWaitingOn(status: TicketStatus): ExecParty | null {
  if (status === "validated") return null;
  if (status === "submitted") return "site_owner";
  if (status === "site_reviewed") return "asset_owner";
  return "vendor";
}

/** Legal next statuses for a party from the current ticket status. */
export function allowedTicketTransitions(
  status: TicketStatus,
  party: ExecParty,
): TicketStatus[] {
  const next = TICKET_NEXT[party][status];
  const out: TicketStatus[] = next ? [next.status] : [];
  if (
    (party === "site_owner" || party === "asset_owner" || party === "spx") &&
    (status === "submitted" || status === "site_reviewed")
  ) {
    out.push("returned");
  }
  return out;
}

export function canAdvanceTicket(
  status: TicketStatus,
  party: ExecParty,
  to: TicketStatus,
): boolean {
  return allowedTicketTransitions(status, party).includes(to);
}

export const TICKET_NEXT: Record<
  ExecParty,
  Partial<Record<TicketStatus, { status: TicketStatus; label: string }>>
> = {
  vendor: {
    assigned: { status: "accepted", label: "Accept" },
    accepted: { status: "in_progress", label: "Start work" },
    in_progress: { status: "submitted", label: "Submit work" },
    returned: { status: "in_progress", label: "Resume" },
  },
  site_owner: {
    submitted: { status: "site_reviewed", label: "Site check OK" },
  },
  asset_owner: {
    site_reviewed: { status: "validated", label: "Close ticket" },
  },
  spx: {
    site_reviewed: { status: "validated", label: "Close ticket" },
  },
};

export const WO_NEXT: Record<WoStatus, { status: WoStatus; label: string } | null> = {
  draft: { status: "issued", label: "Issue" },
  issued: { status: "in_progress", label: "Start" },
  in_progress: { status: "complete", label: "Mark done" },
  complete: null,
};

export function descendantsOf(nodes: FarmNode[], id: string): FarmNode[] {
  const out: FarmNode[] = [];
  const walk = (parentId: string) => {
    for (const n of nodes) {
      if (n.parentId === parentId) {
        out.push(n);
        walk(n.id);
      }
    }
  };
  walk(id);
  return out;
}

export function fmtEtb(n: number) {
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}

const NODES: FarmNode[] = [
  { id: "prog-1", kind: "program", parentId: null, name: "Sheka Turnaround 2026", code: "SHK-26", hectares: 264, status: "active" },
  { id: "farm-1", kind: "farm", parentId: "prog-1", name: "Sheka Estate", code: "SHEKA", hectares: 264, status: "active" },
  { id: "area-ridge", kind: "area", parentId: "farm-1", name: "Ridge", code: "RG", hectares: 42, status: "active" },
  { id: "area-river", kind: "area", parentId: "farm-1", name: "Riverside", code: "RV", hectares: 58, status: "active" },
  { id: "area-upper", kind: "area", parentId: "farm-1", name: "Upper", code: "UP", hectares: 36, status: "active" },
  { id: "area-nurs", kind: "area", parentId: "farm-1", name: "Nursery", code: "NUR", hectares: 20, status: "active" },
  { id: "area-terr", kind: "area", parentId: "farm-1", name: "Terrace", code: "TR", hectares: 108, status: "active" },
  { id: "blk-sh01", kind: "block", parentId: "area-ridge", name: "SH-01 Ridge", code: "SH-01", hectares: 42, status: "active" },
  { id: "blk-sh04", kind: "block", parentId: "area-river", name: "SH-04 Riverside", code: "SH-04", hectares: 58, status: "active" },
  { id: "blk-sh07", kind: "block", parentId: "area-upper", name: "SH-07 Upper", code: "SH-07", hectares: 36, status: "active" },
  { id: "blk-sh09", kind: "block", parentId: "area-nurs", name: "SH-09 Nursery", code: "SH-09", hectares: 12, status: "active" },
  { id: "blk-nur04", kind: "block", parentId: "area-nurs", name: "NUR-04", code: "NUR-04", hectares: 8, status: "active" },
  { id: "blk-sh12", kind: "block", parentId: "area-terr", name: "SH-12 Terrace", code: "SH-12", hectares: 64, status: "active" },
  { id: "blk-t1032", kind: "block", parentId: "area-terr", name: "T1-032", code: "T1-032", hectares: 18, status: "active" },
  { id: "blk-can12", kind: "block", parentId: "area-terr", name: "CAN-12", code: "CAN-12", hectares: 22, status: "active" },
  { id: "blk-south", kind: "block", parentId: "area-terr", name: "South access", code: "S-ACC", hectares: 4, status: "active" },
];

const PROJECTS: Project[] = [
  {
    id: "prj-1",
    code: "PRJ-04",
    title: "Nursery expansion",
    blockId: "blk-sh09",
    vendor: "Estate crew",
    budgetEtb: 420000,
    band: "A",
    status: "submitted",
    notes: "Shade house + bagging benches.",
    milestones: [
      { id: "m1", title: "Site prep", done: true },
      { id: "m2", title: "Structure", done: false },
      { id: "m3", title: "Commission", done: false },
    ],
  },
  {
    id: "prj-2",
    code: "PRJ-05",
    title: "Irrigation laterals",
    blockId: "blk-sh04",
    vendor: "GreenLine",
    budgetEtb: 780000,
    band: "B",
    status: "approved",
    notes: "Drip laterals for riverside.",
    milestones: [
      { id: "m1", title: "Survey", done: true },
      { id: "m2", title: "Lay pipe", done: true },
      { id: "m3", title: "Pressure test", done: false },
    ],
  },
  {
    id: "prj-3",
    code: "PRJ-03",
    title: "Shade thinning programme",
    blockId: "blk-sh07",
    vendor: "RFSP",
    budgetEtb: 28400,
    band: "A",
    status: "in_progress",
    notes: "Selective Grevillea thin.",
    milestones: [
      { id: "m1", title: "Mark trees", done: true },
      { id: "m2", title: "Cut & stack", done: false },
    ],
  },
];

const INTERVENTIONS: Intervention[] = [
  {
    id: "int-1",
    code: "INT-12",
    title: "Drainage repair",
    blockId: "blk-sh12",
    vendor: "RFSP",
    costEtb: 41200,
    status: "active",
    steps: [
      { id: "s1", title: "Inspect culvert", done: true },
      { id: "s2", title: "Clear silt", done: false },
      { id: "s3", title: "Re-pack banks", done: false },
    ],
  },
  {
    id: "int-2",
    code: "INT-13",
    title: "CBD spot spray",
    blockId: "blk-sh01",
    vendor: "Estate crew",
    costEtb: 9600,
    status: "draft",
    steps: [
      { id: "s1", title: "Scout hotspots", done: false },
      { id: "s2", title: "Mix & apply", done: false },
      { id: "s3", title: "Record weather", done: false },
    ],
  },
  {
    id: "int-3",
    code: "INT-11",
    title: "Road washout patch",
    blockId: "blk-south",
    vendor: "RFSP",
    costEtb: 18500,
    status: "submitted",
    steps: [
      { id: "s1", title: "Grade surface", done: true },
      { id: "s2", title: "Compact", done: true },
    ],
  },
];

const AFES: AfeDoc[] = [
  {
    id: "afe-c1",
    code: "AFE-118",
    title: "Irrigation laterals",
    sourceType: "project",
    sourceId: "prj-2",
    blockId: "blk-sh04",
    amountEtb: 780000,
    band: "B",
    status: "approved",
  },
  {
    id: "afe-c2",
    code: "AFE-121",
    title: "Infill hole digging",
    sourceType: "project",
    sourceId: "prj-3",
    blockId: "blk-t1032",
    amountEtb: 17850,
    band: "A",
    status: "approved",
  },
  {
    id: "afe-c3",
    code: "AFE-124",
    title: "Nursery expansion — phase 1",
    sourceType: "project",
    sourceId: "prj-1",
    blockId: "blk-sh09",
    amountEtb: 210000,
    band: "A",
    status: "submitted",
  },
];

const WO_LINEAGE = {
  monthlyWoId: null as string | null,
  monthlyWoCode: null as string | null,
  monthlyLineId: null as string | null,
  weeklyPlanId: null as string | null,
  weeklyPlanLineId: null as string | null,
  manualsRef: "",
};

const WORK_ORDERS: WorkOrder[] = [
  { id: "wo-11", afeId: "afe-c2", code: "WO-2411", title: "Seed bed preparation", activity: "Nursery", block: "NUR-04", farm: "Sheka", vendor: "Estate crew", assignee: "Hana Mekonnen", initials: "HM", status: "draft", week: "W38", etb: 12400, progress: 0, ticketsDone: 0, ticketsTotal: 2, afe: "AFE-118", due: "Fri", attention: "none", ...WO_LINEAGE },
  { id: "wo-12", afeId: "afe-c2", code: "WO-2412", title: "Infill hole digging", activity: "Planting", block: "T1-032", farm: "Sheka", vendor: "RFSP", assignee: "Abebe Bekele", initials: "AB", status: "draft", week: "W38", etb: 17850, progress: 0, ticketsDone: 0, ticketsTotal: 3, afe: "AFE-121", due: "Sat", attention: "insurance", ...WO_LINEAGE },
  { id: "wo-08", afeId: "afe-c1", code: "WO-2408", title: "Selective pruning", activity: "Canopy", block: "SH-01 Ridge", farm: "Sheka", vendor: "RFSP", assignee: "Abebe Bekele", initials: "AB", status: "issued", week: "W37–38", etb: 42800, progress: 12, ticketsDone: 0, ticketsTotal: 4, afe: "AFE-104", due: "Thu", attention: "none", monthlyWoId: "mwo-demo-1", monthlyWoCode: "MWO-2609", monthlyLineId: "ml-1", weeklyPlanId: "wp-demo-1", weeklyPlanLineId: "wl-1", manualsRef: "Canopy Manual §4 — Selective pruning" },
  { id: "wo-09", afeId: "afe-c1", code: "WO-2409", title: "Weeding cycle 3", activity: "Weeding", block: "SH-07 Upper", farm: "Sheka", vendor: "GreenLine", assignee: "Tigist Hailu", initials: "TH", status: "issued", week: "W37", etb: 19600, progress: 8, ticketsDone: 0, ticketsTotal: 3, afe: "AFE-109", due: "Wed", attention: "overdue", ...WO_LINEAGE },
  { id: "wo-10", afeId: "afe-c1", code: "WO-2410", title: "Compost haul", activity: "Nutrition", block: "SH-04 Riverside", farm: "Sheka", vendor: "Estate crew", assignee: "Solomon Desta", initials: "SD", status: "issued", week: "W38", etb: 8600, progress: 0, ticketsDone: 0, ticketsTotal: 2, afe: "AFE-112", due: "Fri", attention: "none", ...WO_LINEAGE },
  { id: "wo-05", afeId: "afe-c1", code: "WO-2405", title: "Stumping — riverside", activity: "Rehabilitation", block: "SH-04 Riverside", farm: "Sheka", vendor: "RFSP", assignee: "Abebe Bekele", initials: "AB", status: "in_progress", week: "W36–37", etb: 61200, progress: 64, ticketsDone: 5, ticketsTotal: 8, afe: "AFE-091", due: "Tue", attention: "none", ...WO_LINEAGE },
  { id: "wo-06", afeId: "afe-c1", code: "WO-2406", title: "Seedling transplant", activity: "Nursery", block: "SH-09 Nursery", farm: "Sheka", vendor: "Estate crew", assignee: "Hana Mekonnen", initials: "HM", status: "in_progress", week: "W37", etb: 22100, progress: 41, ticketsDone: 2, ticketsTotal: 5, afe: "AFE-098", due: "Thu", attention: "overdue", ...WO_LINEAGE },
  { id: "wo-07", afeId: "afe-c1", code: "WO-2407", title: "Fertilizer application", activity: "Nutrition", block: "SH-01 Ridge", farm: "Sheka", vendor: "GreenLine", assignee: "Tigist Hailu", initials: "TH", status: "in_progress", week: "W37–38", etb: 35400, progress: 78, ticketsDone: 7, ticketsTotal: 9, afe: "AFE-101", due: "Fri", attention: "none", ...WO_LINEAGE },
  { id: "wo-01", afeId: "afe-c1", code: "WO-2401", title: "Block road repair", activity: "Access", block: "South access", farm: "Sheka", vendor: "RFSP", assignee: "Solomon Desta", initials: "SD", status: "complete", week: "W34", etb: 41000, progress: 100, ticketsDone: 3, ticketsTotal: 3, afe: "AFE-074", due: "Done", attention: "none", ...WO_LINEAGE },
  { id: "wo-02", afeId: "afe-c1", code: "WO-2402", title: "Pruning — canopy", activity: "Canopy", block: "CAN-12", farm: "Sheka", vendor: "RFSP", assignee: "Abebe Bekele", initials: "AB", status: "complete", week: "W35", etb: 18400, progress: 100, ticketsDone: 4, ticketsTotal: 4, afe: "AFE-081", due: "Done", attention: "none", ...WO_LINEAGE },
];

function ev(actor: string, party: ExecParty, action: string): TicketEvent {
  return { id: uid("ev"), at: nowIso(), actor, party, action };
}

const TICKETS: FieldTicket[] = [
  {
    id: "ft-1",
    code: "TK-104",
    workOrderId: "wo-05",
    title: "Stack stumps — south bank",
    description: "Cut stumps stacked off the row for haul.",
    block: "SH-04 Riverside",
    vendor: "RFSP",
    vendorLead: "Abebe Bekele",
    siteOwner: "Dawit Lemma",
    assetOwner: "Chaka Buna reviewer",
    assignedBy: "SPX Account Manager",
    status: "site_reviewed",
    hours: 8,
    amountEtb: 6400,
    due: "Tue",
    createdAt: nowIso(),
    events: [
      ev("SPX Account Manager", "spx", "Assigned to RFSP"),
      ev("Abebe Bekele", "vendor", "Accepted"),
      ev("Abebe Bekele", "vendor", "Submitted work"),
      ev("Dawit Lemma", "site_owner", "Site check OK"),
    ],
  },
  {
    id: "ft-2",
    code: "TK-105",
    workOrderId: "wo-07",
    title: "NPK pass 1 — ridge",
    description: "First fertilizer pass on SH-01.",
    block: "SH-01 Ridge",
    vendor: "GreenLine",
    vendorLead: "Tigist Hailu",
    siteOwner: "Dawit Lemma",
    assetOwner: "Chaka Buna reviewer",
    assignedBy: "SPX Account Manager",
    status: "submitted",
    hours: 6,
    amountEtb: 4200,
    due: "Fri",
    createdAt: nowIso(),
    events: [
      ev("SPX Account Manager", "spx", "Assigned to GreenLine"),
      ev("Tigist Hailu", "vendor", "Started"),
      ev("Tigist Hailu", "vendor", "Submitted work"),
    ],
  },
  {
    id: "ft-3",
    code: "TK-106",
    workOrderId: "wo-08",
    title: "Selective prune — row 12–18",
    description: "Canopy prune on marked stems only.",
    block: "SH-01 Ridge",
    vendor: "RFSP",
    vendorLead: "Abebe Bekele",
    siteOwner: "Dawit Lemma",
    assetOwner: "Chaka Buna reviewer",
    assignedBy: "SPX Account Manager",
    status: "in_progress",
    hours: 8,
    amountEtb: 5100,
    due: "Thu",
    createdAt: nowIso(),
    events: [
      ev("SPX Account Manager", "spx", "Assigned to RFSP"),
      ev("Abebe Bekele", "vendor", "Accepted and started"),
    ],
  },
  {
    id: "ft-4",
    code: "TK-107",
    workOrderId: "wo-06",
    title: "Transplant trays A–C",
    description: "Move hardened seedlings to SH-09.",
    block: "SH-09 Nursery",
    vendor: "Estate crew",
    vendorLead: "Hana Mekonnen",
    siteOwner: "Hana Mekonnen",
    assetOwner: "Chaka Buna reviewer",
    assignedBy: "Chaka Buna reviewer",
    status: "assigned",
    hours: 5,
    amountEtb: 2800,
    due: "Thu",
    createdAt: nowIso(),
    events: [ev("Chaka Buna reviewer", "asset_owner", "Assigned to estate crew")],
  },
  {
    id: "ft-5",
    code: "TK-108",
    workOrderId: "wo-09",
    title: "Weeding cycle 3 — upper",
    description: "Hand weed around young stems.",
    block: "SH-07 Upper",
    vendor: "GreenLine",
    vendorLead: "Tigist Hailu",
    siteOwner: "Dawit Lemma",
    assetOwner: "Chaka Buna reviewer",
    assignedBy: "SPX Account Manager",
    status: "returned",
    hours: 7,
    amountEtb: 3600,
    due: "Wed",
    createdAt: nowIso(),
    events: [
      ev("SPX Account Manager", "spx", "Assigned to GreenLine"),
      ev("Tigist Hailu", "vendor", "Submitted work"),
      ev("Dawit Lemma", "site_owner", "Returned — missed two rows"),
    ],
  },
];

export type ProjectFormState = {
  title: string;
  blockId: string;
  vendor: string;
  budget: string;
  notes: string;
};

const EMPTY_PROJECT_FORM: ProjectFormState = {
  title: "",
  blockId: "",
  vendor: "",
  budget: "120000",
  notes: "",
};

/** Vendor org names for project create (from EXEC_CREW + estate fallback). */
export function projectVendorOptions(): string[] {
  const orgs = [...new Set(EXEC_CREW.vendors.map((v) => v.org))];
  return orgs.length ? [...orgs, "Estate crew"] : ["RFSP", "GreenLine", "Estate crew"];
}

type Store = {
  nodes: FarmNode[];
  projects: Project[];
  interventions: Intervention[];
  afes: AfeDoc[];
  workOrders: WorkOrder[];
  tickets: FieldTicket[];
  /** Projects desk UI (not persisted). */
  projectsSearch: string;
  projectsPage: number;
  projectsCreateOpen: boolean;
  projectsManageId: string | null;
  projectsForm: ProjectFormState;
  setProjectsSearch: (q: string) => void;
  setProjectsPage: (page: number) => void;
  setProjectsCreateOpen: (open: boolean) => void;
  setProjectsManageId: (id: string | null) => void;
  patchProjectsForm: (patch: Partial<ProjectFormState>) => void;
  resetProjectsForm: () => void;
  activeBlocks: () => FarmNode[];
  addNode: (input: { kind: NodeKind; parentId: string | null; name: string; code: string; hectares: number }) => FarmNode;
  createProgram: (input: { name: string; code: string; hectares: number }) => FarmNode;
  createFarm: (input: { programId: string; name: string; code: string; hectares: number }) => FarmNode;
  updateNode: (id: string, patch: Partial<Pick<FarmNode, "name" | "code" | "hectares" | "status">>) => void;
  createProject: (input: { title: string; blockId: string; vendor: string; budgetEtb: number; notes: string }) => Project;
  submitProject: (id: string) => void;
  startProject: (id: string) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  createIntervention: (input: { title: string; blockId: string; vendor: string; costEtb: number }) => Intervention;
  startIntervention: (id: string) => void;
  submitIntervention: (id: string) => void;
  completeIntervention: (id: string) => void;
  toggleStep: (interventionId: string, stepId: string) => void;
  raiseAfe: (input: { title: string; sourceType: AfeDoc["sourceType"]; sourceId: string; blockId: string; amountEtb: number }) => AfeDoc;
  afeForSource: (sourceType: AfeDoc["sourceType"], sourceId: string) => AfeDoc | undefined;
  submitAfe: (id: string) => void;
  decide: (kind: ApprovalKind, id: string, decision: "approved" | "returned", note?: string) => void;
  issueWorkOrder: (
    afeId: string,
    lineage?: Partial<
      Pick<
        WorkOrder,
        | "week"
        | "activity"
        | "title"
        | "vendor"
        | "monthlyWoId"
        | "monthlyWoCode"
        | "monthlyLineId"
        | "weeklyPlanId"
        | "weeklyPlanLineId"
        | "manualsRef"
      >
    >,
  ) => WorkOrder;
  moveWorkOrder: (id: string, status: WoStatus) => void;
  advanceWorkOrder: (id: string) => void;
  assignTicket: (input: {
    workOrderId: string;
    title: string;
    description: string;
    vendor: string;
    vendorLead: string;
    siteOwner: string;
    assetOwner: string;
    assignedBy: string;
    hours: number;
    amountEtb: number;
    due: string;
  }) => FieldTicket;
  advanceTicket: (
    id: string,
    status: TicketStatus,
    actor: string,
    party: ExecParty,
    note?: string,
  ) => FieldTicket;
  reassignTicket: (
    id: string,
    patch: {
      vendorLead: string;
      vendor: string;
      siteOwner: string;
      assetOwner: string;
      due?: string;
    },
    actor: string,
  ) => FieldTicket;
  syncWorkOrderTickets: (workOrderId: string) => void;
  blockName: (id: string) => string;
  childrenOf: (id: string | null) => FarmNode[];
};

function patchList<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export const useCropfortOpsStore = create<Store>()(
  persist(
    (set, get) => ({
      nodes: [],
      projects: [],
      interventions: [],
      afes: [],
      workOrders: [],
      tickets: [],
      projectsSearch: "",
      projectsPage: 1,
      projectsCreateOpen: false,
      projectsManageId: null,
      projectsForm: { ...EMPTY_PROJECT_FORM },

      childrenOf: (id) => get().nodes.filter((n) => n.parentId === id),
      blockName: (id) => get().nodes.find((n) => n.id === id)?.name ?? "—",
      activeBlocks: () =>
        get().nodes.filter((n) => n.kind === "block" && n.status === "active"),

      setProjectsSearch: (q) => set({ projectsSearch: q, projectsPage: 1 }),
      setProjectsPage: (page) => set({ projectsPage: page }),
      setProjectsCreateOpen: (open) => {
        if (open) {
          const blocks = get().activeBlocks();
          const vendors = projectVendorOptions();
          set({
            projectsCreateOpen: true,
            projectsForm: {
              ...EMPTY_PROJECT_FORM,
              blockId: blocks[0]?.id ?? "",
              vendor: vendors[0] ?? "",
            },
          });
          return;
        }
        set({ projectsCreateOpen: false });
      },
      setProjectsManageId: (id) => set({ projectsManageId: id }),
      patchProjectsForm: (patch) =>
        set({ projectsForm: { ...get().projectsForm, ...patch } }),
      resetProjectsForm: () => set({ projectsForm: { ...EMPTY_PROJECT_FORM } }),

      addNode: ({ kind, parentId, name, code, hectares }) => {
        const prefix = kind === "program" ? "prog" : kind === "farm" ? "farm" : kind === "area" ? "area" : "blk";
        const node: FarmNode = {
          id: uid(prefix),
          kind,
          parentId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          hectares,
          status: "active",
        };
        set({ nodes: [...get().nodes, node] });
        return node;
      },

      createProgram: ({ name, code, hectares }) =>
        get().addNode({ kind: "program", parentId: null, name, code, hectares }),

      createFarm: ({ programId, name, code, hectares }) => {
        const program = get().nodes.find((n) => n.id === programId && n.kind === "program");
        if (!program) throw new Error("Program not found");
        return get().addNode({ kind: "farm", parentId: programId, name, code, hectares });
      },

      updateNode: (id, patch) => set({ nodes: patchList(get().nodes, id, patch) }),

      createProject: ({ title, blockId, vendor, budgetEtb, notes }) => {
        const n = get().projects.length + 6;
        const row: Project = {
          id: uid("prj"),
          code: `PRJ-${String(n).padStart(2, "0")}`,
          title: title.trim(),
          blockId,
          vendor,
          budgetEtb,
          band: bandForAmount(budgetEtb),
          status: "draft",
          notes,
          milestones: [
            { id: uid("m"), title: "Scope locked", done: false },
            { id: uid("m"), title: "Works complete", done: false },
          ],
        };
        set({
          projects: [row, ...get().projects],
          projectsCreateOpen: false,
          projectsManageId: row.id,
          projectsForm: { ...EMPTY_PROJECT_FORM },
        });
        return row;
      },

      submitProject: (id) => {
        const row = get().projects.find((p) => p.id === id);
        if (!row || (row.status !== "draft" && row.status !== "returned")) return;
        set({ projects: patchList(get().projects, id, { status: "submitted" }) });
      },

      startProject: (id) => {
        const row = get().projects.find((p) => p.id === id);
        if (!row || row.status !== "approved") return;
        set({ projects: patchList(get().projects, id, { status: "in_progress" }) });
      },

      toggleMilestone: (projectId, milestoneId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;
        if (project.status !== "in_progress" && project.status !== "approved") return;
        const milestones = project.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: !m.done } : m,
        );
        const allDone = milestones.every((m) => m.done);
        const nextStatus: ProjectStatus =
          allDone && (project.status === "in_progress" || project.status === "approved")
            ? "complete"
            : project.status === "approved"
              ? "in_progress"
              : project.status;
        set({
          projects: patchList(get().projects, projectId, {
            milestones,
            status: nextStatus,
          }),
        });
      },

      createIntervention: ({ title, blockId, vendor, costEtb }) => {
        const n = get().interventions.length + 14;
        const row: Intervention = {
          id: uid("int"),
          code: `INT-${n}`,
          title: title.trim(),
          blockId,
          vendor,
          costEtb,
          status: "draft",
          steps: [
            { id: uid("s"), title: "Prepare", done: false },
            { id: uid("s"), title: "Execute", done: false },
            { id: uid("s"), title: "Sign off", done: false },
          ],
        };
        set({ interventions: [row, ...get().interventions] });
        return row;
      },

      startIntervention: (id) => {
        const row = get().interventions.find((i) => i.id === id);
        if (!row || (row.status !== "draft" && row.status !== "returned")) return;
        set({ interventions: patchList(get().interventions, id, { status: "active" }) });
      },

      submitIntervention: (id) => {
        const row = get().interventions.find((i) => i.id === id);
        if (!row || (row.status !== "active" && row.status !== "returned")) return;
        set({ interventions: patchList(get().interventions, id, { status: "submitted" }) });
      },

      completeIntervention: (id) => {
        const row = get().interventions.find((i) => i.id === id);
        if (!row || row.status !== "approved") return;
        if (!row.steps.every((s) => s.done)) return;
        set({ interventions: patchList(get().interventions, id, { status: "complete" }) });
      },

      toggleStep: (interventionId, stepId) => {
        const row = get().interventions.find((i) => i.id === interventionId);
        if (!row) return;
        // Steps only while working or after approval (close-out); never auto-skip Approvals.
        if (
          row.status !== "active" &&
          row.status !== "approved" &&
          row.status !== "returned" &&
          row.status !== "draft"
        ) {
          return;
        }
        const steps = row.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
        set({
          interventions: patchList(get().interventions, interventionId, { steps }),
        });
      },

      afeForSource: (sourceType, sourceId) =>
        get().afes.find((a) => a.sourceType === sourceType && a.sourceId === sourceId),

      raiseAfe: ({ title, sourceType, sourceId, blockId, amountEtb }) => {
        const existing = get().afes.find(
          (a) =>
            a.sourceType === sourceType &&
            a.sourceId === sourceId &&
            a.status !== "returned",
        );
        if (existing) return existing;
        const n = 130 + get().afes.length;
        const row: AfeDoc = {
          id: uid("afe"),
          code: `AFE-${n}`,
          title: title.trim(),
          sourceType,
          sourceId,
          blockId,
          amountEtb,
          band: bandForAmount(amountEtb),
          status: "draft",
        };
        set({ afes: [row, ...get().afes] });
        return row;
      },

      submitAfe: (id) => set({ afes: patchList(get().afes, id, { status: "submitted" }) }),

      decide: (kind, id, decision, note) => {
        const remark = note?.trim();
        if (kind === "project") {
          const next: ProjectStatus = decision === "approved" ? "approved" : "returned";
          set({
            projects: patchList(get().projects, id, {
              status: next,
              ...(remark
                ? {
                    notes: [get().projects.find((p) => p.id === id)?.notes, remark]
                      .filter(Boolean)
                      .join("\n"),
                  }
                : {}),
            }),
          });
          return;
        }
        if (kind === "intervention") {
          const next: InterventionStatus = decision === "approved" ? "approved" : "returned";
          set({ interventions: patchList(get().interventions, id, { status: next }) });
          return;
        }
        set({ afes: patchList(get().afes, id, { status: decision }) });
      },

      issueWorkOrder: (afeId, lineage) => {
        const afe = get().afes.find((a) => a.id === afeId);
        if (!afe) throw new Error("AFE not found");
        if (afe.status !== "approved") throw new Error("Approve the AFE before issuing a work order");
        const block = get().blockName(afe.blockId);
        const n = 2413 + get().workOrders.length;
        const wo: WorkOrder = {
          id: uid("wo"),
          afeId,
          code: `WO-${n}`,
          title: lineage?.title ?? afe.title,
          activity: lineage?.activity ?? "Issued",
          block,
          farm: "Sheka",
          vendor: lineage?.vendor ?? "RFSP",
          assignee: "Abebe Bekele",
          initials: "AB",
          status: "issued",
          week: lineage?.week ?? "W38",
          etb: afe.amountEtb,
          progress: 0,
          ticketsDone: 0,
          ticketsTotal: 3,
          afe: afe.code,
          due: "Fri",
          attention: "none",
          monthlyWoId: lineage?.monthlyWoId ?? null,
          monthlyWoCode: lineage?.monthlyWoCode ?? null,
          monthlyLineId: lineage?.monthlyLineId ?? null,
          weeklyPlanId: lineage?.weeklyPlanId ?? null,
          weeklyPlanLineId: lineage?.weeklyPlanLineId ?? null,
          manualsRef: lineage?.manualsRef ?? "",
        };
        set({
          workOrders: [wo, ...get().workOrders],
          afes: patchList(get().afes, afeId, { status: "issued" }),
        });
        get().assignTicket({
          workOrderId: wo.id,
          title: wo.title,
          description: `First task from ${afe.code}${wo.monthlyWoCode ? ` · ${wo.monthlyWoCode}` : ""}`,
          vendor: wo.vendor,
          vendorLead: wo.assignee,
          siteOwner: EXEC_CREW.siteOwners[0].name,
          assetOwner: EXEC_CREW.assetOwners[0].name,
          assignedBy: "SPX Account Manager",
          hours: 8,
          amountEtb: Math.round(afe.amountEtb / 3),
          due: wo.due,
        });
        return get().workOrders.find((w) => w.id === wo.id) ?? wo;
      },

      moveWorkOrder: (id, status) => {
        set({
          workOrders: get().workOrders.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                  attention: status === "complete" ? "none" : item.attention,
                  progress: status === "complete" ? 100 : item.progress,
                  ticketsDone: status === "complete" ? item.ticketsTotal : item.ticketsDone,
                }
              : item,
          ),
        });
      },

      advanceWorkOrder: (id) => {
        const wo = get().workOrders.find((w) => w.id === id);
        const next = wo ? WO_NEXT[wo.status] : null;
        if (!wo || !next) return;
        get().moveWorkOrder(id, next.status);
      },

      syncWorkOrderTickets: (workOrderId: string) => {
        const wo = get().workOrders.find((w) => w.id === workOrderId);
        if (!wo) return;
        const tix = get().tickets.filter((t) => t.workOrderId === workOrderId);
        const total = Math.max(tix.length, wo.ticketsTotal);
        const done = tix.filter((t) => t.status === "validated").length;
        const live = tix.some((t) => t.status === "in_progress" || t.status === "submitted" || t.status === "site_reviewed");
        const progress = total ? Math.round((done / total) * 100) : wo.progress;
        let status: WoStatus = wo.status;
        if (tix.length && done === tix.length) status = "complete";
        else if (live) status = "in_progress";
        else if (tix.some((t) => t.status === "assigned" || t.status === "accepted") && wo.status === "draft") status = "issued";
        set({
          workOrders: patchList(get().workOrders, workOrderId, {
            ticketsDone: done,
            ticketsTotal: total,
            progress,
            status,
          }),
        });
      },

      assignTicket: ({
        workOrderId,
        title,
        description,
        vendor,
        vendorLead,
        siteOwner,
        assetOwner,
        assignedBy,
        hours,
        amountEtb,
        due,
      }) => {
        const wo = get().workOrders.find((w) => w.id === workOrderId);
        if (!wo) throw new Error("Work order not found");
        const n = 109 + get().tickets.length;
        const ticket: FieldTicket = {
          id: uid("ft"),
          code: `TK-${n}`,
          workOrderId,
          title: title.trim(),
          description: description.trim(),
          block: wo.block,
          vendor,
          vendorLead,
          siteOwner,
          assetOwner,
          assignedBy,
          status: "assigned",
          hours,
          amountEtb,
          due,
          createdAt: nowIso(),
          events: [ev(assignedBy, "spx", `Assigned to ${vendorLead} (${vendor}) · site ${siteOwner}`)],
        };
        set({ tickets: [ticket, ...get().tickets] });
        get().syncWorkOrderTickets(workOrderId);
        return ticket;
      },

      advanceTicket: (id, status, actor, party, note) => {
        const ticket = get().tickets.find((t) => t.id === id);
        if (!ticket) throw new Error("Ticket not found");
        if (!canAdvanceTicket(ticket.status, party, status)) {
          throw new Error(
            `${PARTY_LABEL_SAFE(party)} cannot move ticket from ${ticket.status} to ${status}`,
          );
        }
        if (status === "returned" && !note?.trim()) {
          throw new Error("Return note is required");
        }
        if (status === "submitted" && !note?.trim()) {
          // Allow empty but stamp a default
          note = "Work submitted for site check";
        }
        const action = note?.trim() || status.replace(/_/g, " ");
        const next: FieldTicket = {
          ...ticket,
          status,
          events: [...ticket.events, ev(actor, party, action)],
        };
        set({ tickets: patchList(get().tickets, id, next) });
        get().syncWorkOrderTickets(ticket.workOrderId);
        return get().tickets.find((t) => t.id === id) ?? next;
      },

      reassignTicket: (id, patch, actor) => {
        const ticket = get().tickets.find((t) => t.id === id);
        if (!ticket) throw new Error("Ticket not found");
        if (ticket.status === "validated") {
          throw new Error("Closed tickets cannot be reassigned");
        }
        const next: FieldTicket = {
          ...ticket,
          vendorLead: patch.vendorLead,
          vendor: patch.vendor,
          siteOwner: patch.siteOwner,
          assetOwner: patch.assetOwner,
          due: patch.due ?? ticket.due,
          status: "assigned",
          events: [
            ...ticket.events,
            ev(
              actor,
              "spx",
              `Reassigned to ${patch.vendorLead} · site ${patch.siteOwner}`,
            ),
          ],
        };
        set({ tickets: patchList(get().tickets, id, next) });
        get().syncWorkOrderTickets(ticket.workOrderId);
        return next;
      },
    }),
    {
      name: "cropfort.ops.v3",
      partialize: (s) => ({
        // Live desks use APIs; only keep optional local farm-tree overrides.
        nodes: s.nodes,
      }),
    },
  ),
);

function PARTY_LABEL_SAFE(party: ExecParty): string {
  if (party === "vendor") return "Vendor";
  if (party === "site_owner") return "Site owner";
  if (party === "asset_owner") return "Asset owner";
  return "SPX";
}
