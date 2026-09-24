import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  ticketWaitingOn,
  type FieldTicket,
  type WorkOrder,
} from "@/store/cropfortOpsStore";
import type { DailyFieldRecord, MonthlyWorkOrder, WeeklyPlan } from "@/types/agronomic-cycle";

export type InboxTone = "overdue" | "pending" | "info";

export type WorkspaceInboxItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: InboxTone;
  count: number;
};

type AfeLike = { status: string };
type ProjectLike = { status: string };
type InterventionLike = { status: string };

export type WorkspaceInboxInput = {
  role: string;
  userName: string;
  workOrders: WorkOrder[];
  tickets: FieldTicket[];
  afes: AfeLike[];
  projects: ProjectLike[];
  interventions: InterventionLike[];
  dfrs: DailyFieldRecord[];
  monthly: MonthlyWorkOrder[];
  weekly: WeeklyPlan[];
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

function isSilva(role: string) {
  const r = role.toLowerCase();
  return r.includes("silva") || r === "farm_owner";
}

function isSpx(role: string) {
  const r = role.toLowerCase();
  return (
    r.includes("spx") ||
    r === "system_admin" ||
    r === "spx_principal" ||
    r === "spx_validator" ||
    r === "spx_platform_admin"
  );
}

/** Vendor / RFSP field crew — not SPX, not farm owner. */
function isVendor(role: string) {
  if (isSpx(role) || isSilva(role)) return false;
  const r = role.toLowerCase();
  return r.includes("vendor") || r === "bagro_office" || r === "vendor_lead";
}

function isSite(role: string) {
  if (isSpx(role) || isSilva(role)) return false;
  const r = role.toLowerCase();
  return r === "field_supervisor" || r.includes("site");
}

function push(
  items: WorkspaceInboxItem[],
  item: WorkspaceInboxItem,
  limit: number,
) {
  if (item.count <= 0 || items.length >= limit) return;
  if (items.some((i) => i.id === item.id)) return;
  items.push(item);
}

/**
 * Compact, role-aware inbox for workspace picker and Needs attention.
 * Keeps at most 4 high-signal items for the signed-in desk.
 */
export function buildWorkspaceInbox(input: WorkspaceInboxInput): WorkspaceInboxItem[] {
  const { role, userName, workOrders, tickets, afes, projects, interventions, dfrs, monthly, weekly } =
    input;
  const mine = firstName(userName);
  const items: WorkspaceInboxItem[] = [];
  const limit = 5;

  const overdueWos = workOrders.filter(
    (w) => w.attention === "overdue" || w.attention === "insurance",
  );
  const myOpenWos = workOrders.filter((w) => {
    if (w.status === "complete") return false;
    return mine && firstName(w.assignee) === mine;
  });
  const returnedTickets = tickets.filter((t) => t.status === "returned");
  const vendorTickets = tickets.filter((t) => ticketWaitingOn(t.status) === "vendor");
  const siteTickets = tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner");
  const assetTickets = tickets.filter((t) => ticketWaitingOn(t.status) === "asset_owner");

  const pendingAfe = afes.filter((a) => a.status === "submitted").length;
  const pendingApprovals =
    pendingAfe +
    projects.filter((p) => p.status === "submitted").length +
    interventions.filter((i) => i.status === "submitted").length +
    monthly.filter((m) => m.status === "submitted").length +
    weekly.filter((w) => w.status === "submitted").length;

  const pendingDfr = dfrs.filter(
    (r) => r.status === "submitted" || r.status === "site_checked",
  ).length;

  // ——— SPX / platform manager desk ———
  if (isSpx(role)) {
    push(items, {
      id: "approvals",
      title: "Approvals",
      detail: "Submitted for your decision",
      href: CROPFORT_ROUTES.approvals,
      tone: "pending",
      count: pendingApprovals,
    }, limit);
    push(items, {
      id: "afe",
      title: "AFE register",
      detail: "Authorities awaiting submission or issue",
      href: CROPFORT_ROUTES.afe,
      tone: "pending",
      count: pendingAfe + afes.filter((a) => a.status === "approved").length,
    }, limit);
    push(items, {
      id: "validation",
      title: "Validation",
      detail: "Daily field records ready to review",
      href: CROPFORT_ROUTES.validationQueue,
      tone: "info",
      count: pendingDfr,
    }, limit);
    push(items, {
      id: "wo-attention",
      title: "Work orders at risk",
      detail: overdueWos.slice(0, 2).map((w) => w.code).join(" · ") || "Overdue or on hold",
      href: CROPFORT_ROUTES.workOrders,
      tone: "overdue",
      count: overdueWos.length,
    }, limit);
    return items;
  }

  // ——— Farm owner / Silva ———
  if (isSilva(role)) {
    push(items, {
      id: "approvals",
      title: "Approvals",
      detail: "Items awaiting farm decision",
      href: CROPFORT_ROUTES.approvals,
      tone: "pending",
      count: pendingApprovals,
    }, limit);
    push(items, {
      id: "afe",
      title: "AFE",
      detail: "Submitted authorities for your gate",
      href: CROPFORT_ROUTES.afe,
      tone: "pending",
      count: pendingAfe,
    }, limit);
    push(items, {
      id: "tk-asset",
      title: "Ticket close-out",
      detail: "Ready for asset owner sign-off",
      href: CROPFORT_ROUTES.fieldTickets,
      tone: "pending",
      count: assetTickets.length,
    }, limit);
    push(items, {
      id: "wo-attention",
      title: "Work orders at risk",
      detail: overdueWos.slice(0, 2).map((w) => w.code).join(" · ") || "Programme attention",
      href: CROPFORT_ROUTES.workOrders,
      tone: "overdue",
      count: overdueWos.length,
    }, limit);
    return items;
  }

  // ——— Site supervisor ———
  if (isSite(role)) {
    push(items, {
      id: "tk-site",
      title: "Site checks",
      detail: "Submitted work awaiting your review",
      href: CROPFORT_ROUTES.fieldTickets,
      tone: "pending",
      count: siteTickets.length,
    }, limit);
    push(items, {
      id: "validation",
      title: "Validation",
      detail: "Daily records ready for site confirmation",
      href: CROPFORT_ROUTES.validationQueue,
      tone: "info",
      count: pendingDfr,
    }, limit);
    push(items, {
      id: "wo-mine",
      title: "Your work orders",
      detail: "Assigned to you",
      href: CROPFORT_ROUTES.workOrders,
      tone: "pending",
      count: myOpenWos.length,
    }, limit);
    return items;
  }

  // ——— Vendor / RFSP ———
  if (isVendor(role)) {
    push(items, {
      id: "tk-returned",
      title: "Returned tickets",
      detail: returnedTickets.map((t) => t.code).join(" · ") || "Revise and resubmit",
      href: CROPFORT_ROUTES.fieldTickets,
      tone: "overdue",
      count: returnedTickets.length,
    }, limit);
    push(items, {
      id: "tk-vendor",
      title: "Your tickets",
      detail: "Assigned or in progress",
      href: CROPFORT_ROUTES.fieldTickets,
      tone: "pending",
      count: vendorTickets.length,
    }, limit);
    push(items, {
      id: "wo-mine",
      title: "Your work orders",
      detail: "Crew assignments",
      href: CROPFORT_ROUTES.workOrders,
      tone: "pending",
      count: myOpenWos.length || overdueWos.length,
    }, limit);
    push(items, {
      id: "validation",
      title: "Validation",
      detail: "Daily records awaiting review",
      href: CROPFORT_ROUTES.validationQueue,
      tone: "info",
      count: pendingDfr,
    }, limit);
    return items;
  }

  // ——— Fallback ———
  push(items, {
    id: "approvals",
    title: "Approvals",
    detail: "Submitted items",
    href: CROPFORT_ROUTES.approvals,
    tone: "pending",
    count: pendingApprovals,
  }, limit);
  push(items, {
    id: "afe",
    title: "AFE",
    detail: "Authorities in flight",
    href: CROPFORT_ROUTES.afe,
    tone: "pending",
    count: pendingAfe,
  }, limit);
  push(items, {
    id: "validation",
    title: "Validation",
    detail: "Daily field records",
    href: CROPFORT_ROUTES.validationQueue,
    tone: "info",
    count: pendingDfr,
  }, limit);
  push(items, {
    id: "wo-attention",
    title: "Work orders at risk",
    detail: "Overdue or on hold",
    href: CROPFORT_ROUTES.workOrders,
    tone: "overdue",
    count: overdueWos.length,
  }, limit);
  return items;
}

export function inboxTotal(items: WorkspaceInboxItem[]) {
  return items.reduce((s, i) => s + i.count, 0);
}

export function preferredProgramId(
  programs: { id: string }[],
  activeId?: string | null,
) {
  if (activeId && programs.some((p) => p.id === activeId)) return activeId;
  return programs[0]?.id ?? null;
}

export type WorkspaceQuickOpen = {
  id: string;
  label: string;
  href: string;
};

/** Role-aware shortcuts on the select-workspace sidebar. */
export function buildWorkspaceQuickOpens(role: string): WorkspaceQuickOpen[] {
  if (isSilva(role) || isSpx(role)) {
    return [
      { id: "approvals", label: "Approvals", href: CROPFORT_ROUTES.approvals },
      { id: "afe", label: "AFE", href: CROPFORT_ROUTES.afe },
      { id: "programme", label: "Programme", href: CROPFORT_ROUTES.coreOperations },
    ];
  }
  if (isSite(role) || isVendor(role)) {
    return [
      { id: "tickets", label: "Field tickets", href: CROPFORT_ROUTES.fieldTickets },
      { id: "validation", label: "Validation", href: CROPFORT_ROUTES.validationQueue },
      { id: "weekly", label: "Weekly plans", href: CROPFORT_ROUTES.weeklySubmissions },
    ];
  }
  return [
    { id: "approvals", label: "Approvals", href: CROPFORT_ROUTES.approvals },
    { id: "afe", label: "AFE", href: CROPFORT_ROUTES.afe },
    { id: "tickets", label: "Field tickets", href: CROPFORT_ROUTES.fieldTickets },
  ];
}
