import type { CropfortRole } from "@/types/cropfort";

/** Demo dataset for the Cropfort dashboard. Replace with API data in Phase 2. */

export interface SpendPoint {
  month: string;
  budget: number;
  actual: number;
}

export interface BlockProgress {
  block: string;
  hectares: number;
  completion: number;
  activity: string;
  status: "on_track" | "at_risk" | "overdue";
}

export interface QueueItem {
  id: string;
  reference: string;
  block: string;
  activity: string;
  submittedBy: string;
  submittedAt: string;
  amountUsd: number;
  status: "submitted" | "in_review" | "approved" | "rejected";
}

export interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  kind: "submit" | "approve" | "reject" | "issue" | "sync";
}

export interface LabourPoint {
  day: string;
  planned: number;
  actual: number;
}

export const SPEND_SERIES: SpendPoint[] = [
  { month: "Jan", budget: 82_000, actual: 76_400 },
  { month: "Feb", budget: 88_000, actual: 84_900 },
  { month: "Mar", budget: 104_000, actual: 111_200 },
  { month: "Apr", budget: 96_000, actual: 92_300 },
  { month: "May", budget: 118_000, actual: 121_800 },
  { month: "Jun", budget: 126_000, actual: 118_600 },
  { month: "Jul", budget: 132_000, actual: 128_400 },
  { month: "Aug", budget: 121_000, actual: 114_700 },
];

export const LABOUR_SERIES: LabourPoint[] = [
  { day: "Mon", planned: 240, actual: 232 },
  { day: "Tue", planned: 240, actual: 251 },
  { day: "Wed", planned: 260, actual: 244 },
  { day: "Thu", planned: 260, actual: 268 },
  { day: "Fri", planned: 248, actual: 239 },
  { day: "Sat", planned: 160, actual: 171 },
];

export const BLOCK_PROGRESS: BlockProgress[] = [
  { block: "SH-01 Ridge", hectares: 42, completion: 92, activity: "Selective pruning", status: "on_track" },
  { block: "SH-04 Riverside", hectares: 58, completion: 74, activity: "Stumping", status: "on_track" },
  { block: "SH-07 Upper", hectares: 36, completion: 51, activity: "Weeding cycle 3", status: "at_risk" },
  { block: "SH-09 Nursery", hectares: 12, completion: 38, activity: "Seedling transplant", status: "at_risk" },
  { block: "SH-12 Terrace", hectares: 64, completion: 21, activity: "Shade management", status: "overdue" },
];

export const VALIDATION_QUEUE: QueueItem[] = [
  {
    id: "q-1",
    reference: "WS-2026-W37-014",
    block: "SH-04 Riverside",
    activity: "Stumping",
    submittedBy: "Abebe Bekele",
    submittedAt: "2h ago",
    amountUsd: 12_480,
    status: "submitted",
  },
  {
    id: "q-2",
    reference: "WS-2026-W37-013",
    block: "SH-01 Ridge",
    activity: "Selective pruning",
    submittedBy: "Sara Mengistu",
    submittedAt: "5h ago",
    amountUsd: 8_240,
    status: "in_review",
  },
  {
    id: "q-3",
    reference: "WS-2026-W37-011",
    block: "SH-07 Upper",
    activity: "Weeding cycle 3",
    submittedBy: "Abebe Bekele",
    submittedAt: "Yesterday",
    amountUsd: 5_960,
    status: "submitted",
  },
  {
    id: "q-4",
    reference: "WS-2026-W36-042",
    block: "SH-12 Terrace",
    activity: "Shade management",
    submittedBy: "Tadesse Alemu",
    submittedAt: "2 days ago",
    amountUsd: 19_350,
    status: "in_review",
  },
];

export const ACTIVITY_FEED: ActivityEvent[] = [
  {
    id: "a-1",
    actor: "Daniel Okello",
    action: "approved",
    target: "AFE-2026-0032 · Band B",
    at: "12 min ago",
    kind: "approve",
  },
  {
    id: "a-2",
    actor: "Abebe Bekele",
    action: "submitted",
    target: "WS-2026-W37-014",
    at: "2h ago",
    kind: "submit",
  },
  {
    id: "a-3",
    actor: "System",
    action: "synced",
    target: "18 offline field tickets",
    at: "3h ago",
    kind: "sync",
  },
  {
    id: "a-4",
    actor: "Daniel Okello",
    action: "rejected",
    target: "WS-2026-W36-039 · rate mismatch",
    at: "Yesterday",
    kind: "reject",
  },
  {
    id: "a-5",
    actor: "Sara Mengistu",
    action: "issued",
    target: "WO-2026-0211 · SH-04",
    at: "Yesterday",
    kind: "issue",
  },
];

export const ACTIVITY_MIX = [
  { name: "Pruning", value: 34, fill: "hsl(152 42% 32%)" },
  { name: "Weeding", value: 26, fill: "hsl(168 45% 38%)" },
  { name: "Stumping", value: 18, fill: "hsl(36 90% 48%)" },
  { name: "Shade mgmt", value: 12, fill: "hsl(198 65% 44%)" },
  { name: "Nursery", value: 10, fill: "hsl(28 70% 52%)" },
];

export interface RoleDashboardCopy {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
}

export const ROLE_DASHBOARD_COPY: Record<CropfortRole, RoleDashboardCopy> = {
  field_supervisor: {
    eyebrow: "Field desk",
    title: "Today on the estate",
    description: "Capture tickets against issued work orders and keep this week's submission current.",
    primaryAction: "New field ticket",
  },
  bagro_office: {
    eyebrow: "RFSP office",
    title: "Weekly operations",
    description: "Consolidate field tickets into weekly submissions and keep block activities aligned to plan.",
    primaryAction: "Build submission",
  },
  spx_validator: {
    eyebrow: "SPX validation",
    title: "Validation control room",
    description: "Review submissions against the rate card, clear the queue, and keep AFP variance in band.",
    primaryAction: "Open queue",
  },
  farm_owner: {
    eyebrow: "Ownership",
    title: "Estate performance",
    description: "Budget, actuals, and variance across the programme — released and approved records only.",
    primaryAction: "Download report",
  },
  spx_platform_admin: {
    eyebrow: "Platform",
    title: "Tenant operations",
    description: "Monitor tenant health, user access, and configuration across every Cropfort deployment.",
    primaryAction: "Invite user",
  },
};

export function formatUsd(value: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

/** Short trailing series used for KPI sparklines. */
export const SPARKLINES = {
  spend: [62, 68, 66, 74, 71, 79, 83, 88],
  blocks: [8, 9, 9, 10, 10, 11, 11, 12],
  workforce: [214, 228, 236, 241, 238, 252, 260, 268],
  queue: [2, 4, 3, 6, 5, 3, 4, 4],
  tickets: [18, 22, 26, 24, 29, 31, 30, 34],
  variance: [12, 9, 14, 18, 16, 21, 19, 24],
  users: [104, 111, 118, 122, 129, 134, 138, 142],
  audit: [820, 910, 1040, 980, 1120, 1190, 1240, 1284],
} as const;

export interface AttentionItem {
  id: string;
  label: string;
  detail: string;
  tone: "critical" | "warning" | "info";
  href: string;
}

export const PROGRAMME_SUMMARY = {
  code: "AFP-2026-SHECHA",
  name: "Shecha Estate · Annual Farm Programme 2026",
  hectares: 212,
  budgetUsd: 1_480_000,
  actualUsd: 1_048_300,
  blocksActive: 12,
  workforce: 268,
  week: "Week 37",
};
