import { CROPFORT_ROUTES } from "@/config/navigation";
import type { FieldTicket, WorkOrder } from "@/store/cropfortOpsStore";
import type { OpsReport } from "@/store/reportsStore";
import type {
  DailyFieldRecord,
  MonthlyWorkOrder,
  WeeklyPlan,
} from "@/types/agronomic-cycle";
import type { WorkflowAuditEvent } from "@/types/rate-card-workflow";

export type AuditSource =
  | "execution"
  | "rates"
  | "approvals"
  | "reports"
  | "planning"
  | "admin";

export type AuditFeedItem = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityLabel: string;
  entityCode?: string;
  href?: string;
  source: AuditSource;
  detail?: string;
};

const SOURCE_LABEL: Record<AuditSource, string> = {
  execution: "Execution",
  rates: "Rates",
  approvals: "Approvals",
  reports: "Reports",
  planning: "Planning",
  admin: "Admin",
};

export function auditSourceLabel(source: AuditSource) {
  return SOURCE_LABEL[source];
}

export function buildAuditFeed(input: {
  tickets: FieldTicket[];
  workOrders: WorkOrder[];
  afes: { id: string; code: string; title: string; status: string }[];
  projects: { id: string; code: string; title: string; status: string }[];
  interventions: { id: string; code: string; title: string; status: string }[];
  dfrs: DailyFieldRecord[];
  weekly: WeeklyPlan[];
  monthly: MonthlyWorkOrder[];
  reports: OpsReport[];
  rateAudit?: WorkflowAuditEvent[];
}): AuditFeedItem[] {
  const items: AuditFeedItem[] = [];

  for (const t of input.tickets) {
    for (const ev of t.events) {
      items.push({
        id: `tk-${t.id}-${ev.id}`,
        at: ev.at,
        actor: ev.actor,
        action: ev.action,
        entityLabel: t.title,
        entityCode: t.code,
        href: `${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`,
        source: "execution",
        detail: `${t.block} · ${ev.party.replace(/_/g, " ")}`,
      });
    }
  }

  for (const wo of input.workOrders) {
    if (wo.attention === "none") continue;
    items.push({
      id: `wo-attn-${wo.id}`,
      at: "2026-09-18T09:00:00.000Z",
      actor: wo.assignee || "System",
      action: `Attention: ${wo.attention}`,
      entityLabel: wo.title,
      entityCode: wo.code,
      href: CROPFORT_ROUTES.workOrders,
      source: "execution",
      detail: `${wo.block} · ${wo.status.replace(/_/g, " ")}`,
    });
  }

  for (const a of input.afes) {
    if (a.status !== "submitted" && a.status !== "approved" && a.status !== "returned") continue;
    items.push({
      id: `afe-${a.id}-${a.status}`,
      at: "2026-09-16T11:00:00.000Z",
      actor: "SPX",
      action: a.status,
      entityLabel: a.title,
      entityCode: a.code,
      href: CROPFORT_ROUTES.approvals,
      source: "approvals",
    });
  }

  for (const p of input.projects) {
    if (p.status !== "submitted" && p.status !== "approved" && p.status !== "returned") continue;
    items.push({
      id: `prj-${p.id}-${p.status}`,
      at: "2026-09-15T10:00:00.000Z",
      actor: "SPX",
      action: p.status,
      entityLabel: p.title,
      entityCode: p.code,
      href: CROPFORT_ROUTES.approvals,
      source: "approvals",
    });
  }

  for (const i of input.interventions) {
    if (i.status !== "submitted" && i.status !== "approved" && i.status !== "active") continue;
    items.push({
      id: `int-${i.id}-${i.status}`,
      at: "2026-09-14T09:00:00.000Z",
      actor: "SPX",
      action: i.status,
      entityLabel: i.title,
      entityCode: i.code,
      href: CROPFORT_ROUTES.interventions,
      source: "approvals",
    });
  }

  for (const r of input.dfrs) {
    items.push({
      id: `dfr-${r.id}`,
      at: r.updatedAt || r.createdAt,
      actor: "Field",
      action: r.status,
      entityLabel: r.activityName,
      entityCode: r.code,
      href: CROPFORT_ROUTES.validationQueue,
      source: "execution",
      detail: `${r.blockCode} · variance ${r.variancePct}%`,
    });
  }

  for (const w of input.weekly) {
    items.push({
      id: `wp-${w.id}`,
      at: w.updatedAt || w.createdAt,
      actor: "SPX",
      action: w.status,
      entityLabel: `Weekly plan ${w.weekLabel}`,
      entityCode: w.code,
      href: CROPFORT_ROUTES.weeklySubmissions,
      source: "planning",
      detail: w.note || undefined,
    });
  }

  for (const m of input.monthly) {
    items.push({
      id: `mwo-${m.id}`,
      at: m.updatedAt || m.createdAt,
      actor: "SPX",
      action: m.status,
      entityLabel: m.farmName,
      entityCode: m.code,
      href: CROPFORT_ROUTES.monthlyWorkOrders,
      source: "planning",
      detail: m.note || undefined,
    });
  }

  for (const r of input.reports) {
    items.push({
      id: `rpt-${r.id}`,
      at: r.releasedAt || r.updatedAt || r.createdAt,
      actor: r.releasedTo ? "SPX → Silva" : "SPX",
      action: r.status,
      entityLabel: r.title,
      entityCode: r.code,
      href: CROPFORT_ROUTES.reports,
      source: "reports",
      detail: r.periodLabel,
    });
  }

  for (const e of input.rateAudit ?? []) {
    items.push({
      id: e.id,
      at: e.at,
      actor: e.actorName,
      action: e.action.replace(/_/g, " "),
      entityLabel: e.entityType.replace(/_/g, " "),
      entityCode: e.entityId,
      href:
        e.entityType === "benchmark_survey"
          ? CROPFORT_ROUTES.benchmarkSurveys
          : CROPFORT_ROUTES.rateCardProposals,
      source: "rates",
      detail: e.comment || undefined,
    });
  }

  // Stable-ish sort: prefer real timestamps; WO/AFE synthetic “now” sink to bottom of their second
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
