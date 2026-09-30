"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarRange,
  ClipboardCheck,
  FolderKanban,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Network,
  Search,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { useDeskMode } from "@/components/cropfort/desk-mode";
import { VendorDeskHome } from "@/components/cropfort/shells/vendor-desk-home";
import { SilvaDeskHome } from "@/components/cropfort/shells/silva-desk-home";
import { PageContainer } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { CROPFORT_AREAS, type CropfortAreaDef } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { getWorkspacesForRole } from "@/config/cropfort-workspaces";
import { canChooseWorkspace, SELECT_WORKSPACE_PATH } from "@/lib/workspace-gate";
import {
  canApproveAsAssetOwner,
  canViewRateCard,
} from "@/lib/cropfortAccess";
import { cn } from "@/lib/utils";
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";
import type { CropfortRole } from "@/types/cropfort";

type HomeTab = "attention" | "workspace" | "modules";

type QuickLink = {
  href: string;
  title: string;
  icon: LucideIcon;
  emphasis?: boolean;
  count?: number;
};

type ActivityItem = {
  id: string;
  at: string;
  title: string;
  detail: string;
  href: string;
  tone: "default" | "warning" | "success";
};

const WO_CHART_CONFIG = {
  count: { label: "Work orders", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const QUEUE_CHART_CONFIG = {
  vendor: { label: "Vendor", color: "hsl(var(--chart-1))" },
  site: { label: "Site", color: "hsl(var(--chart-2))" },
  asset: { label: "Asset", color: "hsl(var(--chart-3))" },
  clear: { label: "Clear", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

const QUEUE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--muted-foreground) / 0.45)",
];

function isVendorRole(role: CropfortRole) {
  return role === "bagro_office";
}

function isAssetOwnerRole(role: CropfortRole) {
  return role === "farm_owner";
}

function hrefAllowed(allowed: Set<string>, href: string) {
  if (allowed.has(href)) return true;
  for (const h of allowed) {
    if (href === h || href.startsWith(`${h}/`) || h.startsWith(`${href}/`)) return true;
  }
  return false;
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function labelStatus(raw: string) {
  return raw.replace(/_/g, " ");
}

const AREA_ICONS: Partial<Record<CropfortAreaDef["id"], LucideIcon>> = {
  programs: FolderKanban,
  farm_structure: Network,
  core_operations: Briefcase,
  projects: FolderKanban,
  interventions: MapPin,
  approvals: ClipboardCheck,
  work_orders: Wrench,
  field_execution: CalendarRange,
  progress: TrendingUp,
  rate_cards: WalletCards,
  benchmark_surveys: WalletCards,
  afe: ClipboardCheck,
  afp: Briefcase,
  communications: MessageSquare,
};

function ModuleTile({ area }: { area: CropfortAreaDef }) {
  const Icon = AREA_ICONS[area.id] || LayoutGrid;
  return (
    <Link
      href={area.href}
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-card p-3.5",
        "transition-colors hover:border-foreground/20 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold tracking-tight text-foreground">{area.label}</p>
          <StatusBadge
            status={area.readiness === "ready" ? "approved" : "draft"}
            label={area.readiness === "ready" ? "Live" : "Soon"}
          />
        </div>
        <span className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function AttentionCard({ item }: { item: QuickLink }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4",
        "transition-colors hover:border-foreground/20 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        item.emphasis && "border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {item.count != null ? (
          <span className="cf-numeric text-2xl font-semibold tabular-nums">{item.count}</span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{item.title}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
        Continue
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const desk = useDeskMode();
  if (desk === "vendor") return <VendorDeskHome />;
  if (desk === "silva") return <SilvaDeskHome />;
  return <SpxDashboardView />;
}

function SpxDashboardView() {
  const { user, activeProgram, tenant, programs } = useCropfortAuth();
  const firstName = user.name.split(" ")[0];
  const canRates = canViewRateCard(user.role);
  const isOwner = canApproveAsAssetOwner(user.role);

  const [tab, setTab] = useState<HomeTab>("attention");
  const [query, setQuery] = useState("");
  const [activityExpanded, setActivityExpanded] = useState(false);

  const { workOrders, tickets, afes, dfrs, weekly, isLoading } = usePerformanceLiveData(
    Boolean(activeProgram?.id),
  );

  const queues = useMemo(
    () => ({
      vendor: tickets.filter((t) => ticketWaitingOn(t.status) === "vendor").length,
      site: tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner").length,
      asset: tickets.filter((t) => ticketWaitingOn(t.status) === "asset_owner").length,
      clear: tickets.filter((t) => ticketWaitingOn(t.status) === null).length,
      openWo: workOrders.filter((w) => w.status !== "complete").length,
      afesPending: afes.filter((a) => a.status === "submitted").length,
    }),
    [tickets, workOrders, afes],
  );

  const woStatusChart = useMemo(() => {
    const order = ["draft", "issued", "in_progress", "complete"] as const;
    const counts = Object.fromEntries(order.map((s) => [s, 0])) as Record<string, number>;
    for (const w of workOrders) {
      const key = w.status === "complete" ? "complete" : w.status;
      counts[key] = (counts[key] || 0) + 1;
    }
    return order.map((status) => ({
      status: labelStatus(status),
      count: counts[status] || 0,
    }));
  }, [workOrders]);

  const ticketQueueChart = useMemo(
    () =>
      [
        { name: "Vendor", key: "vendor", value: queues.vendor },
        { name: "Site", key: "site", value: queues.site },
        { name: "Asset", key: "asset", value: queues.asset },
        { name: "Clear", key: "clear", value: queues.clear },
      ].filter((d) => d.value > 0),
    [queues],
  );

  const activityFeed = useMemo(() => {
    const items: ActivityItem[] = [];

    for (const t of tickets) {
      const waiting = ticketWaitingOn(t.status);
      items.push({
        id: `tk-${t.id}`,
        at: t.createdAt,
        title: t.title || t.code,
        detail: `${t.code} · ${labelStatus(t.status)}${waiting ? ` · waiting ${waiting.replace(/_/g, " ")}` : ""}`,
        href: CROPFORT_ROUTES.fieldTickets,
        tone: waiting ? "warning" : "success",
      });
    }

    for (const a of afes) {
      items.push({
        id: `afe-${a.id}`,
        at: a.updatedAt || a.submittedAt || a.createdAt,
        title: a.title,
        detail: `AFE · ${labelStatus(a.status)} · Band ${a.band}`,
        href: CROPFORT_ROUTES.afe,
        tone:
          a.status === "submitted"
            ? "warning"
            : a.status === "approved"
              ? "success"
              : "default",
      });
    }

    for (const w of workOrders) {
      items.push({
        id: `wo-${w.id}`,
        at: w.due || "",
        title: w.title || w.code,
        detail: `${w.code} · ${labelStatus(w.status)} · ${w.ticketsDone}/${w.ticketsTotal} tickets`,
        href: CROPFORT_ROUTES.workOrders,
        tone: w.status === "complete" ? "success" : "default",
      });
    }

    for (const r of dfrs) {
      items.push({
        id: `dfr-${r.id}`,
        at: r.updatedAt || r.date || r.createdAt || "",
        title: r.activityName || r.code || "Field record",
        detail: `DFR · ${labelStatus(r.status)}${r.blockCode ? ` · ${r.blockCode}` : ""}`,
        href: CROPFORT_ROUTES.validationQueue,
        tone:
          r.status === "submitted" || r.status === "site_checked" ? "warning" : "default",
      });
    }

    for (const p of weekly) {
      items.push({
        id: `wk-${p.id}`,
        at: p.updatedAt || p.createdAt || "",
        title: p.weekLabel || p.code || "Weekly plan",
        detail: `Weekly · ${labelStatus(p.status)}`,
        href: CROPFORT_ROUTES.weeklySubmissions,
        tone: p.status === "submitted" ? "warning" : "default",
      });
    }

    return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 20);
  }, [tickets, afes, workOrders, dfrs, weekly]);

  const ACTIVITY_PREVIEW = 5;
  const visibleActivity = activityExpanded
    ? activityFeed
    : activityFeed.slice(0, ACTIVITY_PREVIEW);
  const activityHasMore = activityFeed.length > ACTIVITY_PREVIEW;

  const workspaceName = activeProgram?.name || "Workspace";
  const orgName = tenant?.displayName || tenant?.name || user.tenantName;

  const attention: QuickLink[] = useMemo(() => {
    if (isVendorRole(user.role)) {
      return [
        {
          href: CROPFORT_ROUTES.fieldTickets,
          title: "My tickets",
          icon: CalendarRange,
          emphasis: true,
          count: queues.vendor,
        },
      ];
    }
    if (!canRates) {
      return [
        {
          href: CROPFORT_ROUTES.fieldTickets,
          title: "My tickets",
          icon: CalendarRange,
          emphasis: true,
          count: queues.vendor + queues.site,
        },
        {
          href: CROPFORT_ROUTES.workOrders,
          title: "Work orders",
          icon: Wrench,
          count: queues.openWo,
        },
        {
          href: CROPFORT_ROUTES.progress,
          title: "Progress",
          icon: TrendingUp,
        },
      ];
    }
    if (isOwner) {
      return [
        {
          href: CROPFORT_ROUTES.approvals,
          title: "Approvals queue",
          icon: ClipboardCheck,
          emphasis: true,
          count: queues.afesPending || undefined,
        },
        {
          href: `${CROPFORT_ROUTES.rateCardProposals}?status=submitted`,
          title: "Rates to review",
          icon: WalletCards,
        },
        {
          href: CROPFORT_ROUTES.fieldTickets,
          title: "Close tickets",
          icon: FolderKanban,
          count: queues.asset,
        },
        {
          href: CROPFORT_ROUTES.budget,
          title: "Cost Management",
          icon: TrendingUp,
        },
      ];
    }
    return [
      {
        href: CROPFORT_ROUTES.coreOperations,
        title: "Continue Core Ops",
        icon: Briefcase,
        emphasis: true,
      },
      {
        href: CROPFORT_ROUTES.fieldTickets,
        title: "Assign tickets",
        icon: ClipboardCheck,
        count: queues.vendor + queues.site + queues.asset,
      },
      {
        href: CROPFORT_ROUTES.workOrders,
        title: "Work orders",
        icon: Wrench,
        count: queues.openWo,
      },
      {
        href: CROPFORT_ROUTES.afe,
        title: "AFEs pending",
        icon: WalletCards,
        count: queues.afesPending,
      },
    ];
  }, [canRates, isOwner, queues, user.role]);

  const allowedHrefs = useMemo(() => {
    const set = new Set<string>([CROPFORT_ROUTES.dashboard]);
    for (const ws of getWorkspacesForRole(user.role)) {
      set.add(ws.href);
      for (const m of ws.modules) set.add(m.href);
    }
    return set;
  }, [user.role]);

  const roleModules = useMemo(
    () =>
      CROPFORT_AREAS.filter(
        (a) => a.id !== "home" && hrefAllowed(allowedHrefs, a.href),
      ),
    [allowedHrefs],
  );

  const workspaceAreas = useMemo(() => {
    const preferred = [
      "programs",
      "farm_structure",
      "core_operations",
      "projects",
      "interventions",
      "approvals",
      "afe",
      "work_orders",
      "field_execution",
      "progress",
      "budget",
      "communications",
    ] as const;
    const preferredSet = new Set<string>(preferred);
    const fromPreferred = roleModules.filter((a) => preferredSet.has(a.id));
    return fromPreferred.length ? fromPreferred : roleModules;
  }, [roleModules]);

  const limitedDesk = isVendorRole(user.role) || isAssetOwnerRole(user.role);

  const filteredModules = useMemo(() => {
    const source =
      tab === "workspace" || limitedDesk ? workspaceAreas : roleModules;
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.interfaceLabel.toLowerCase().includes(q),
    );
  }, [tab, workspaceAreas, roleModules, query, limitedDesk]);

  const kpiStrip = useMemo(() => {
    if (isVendorRole(user.role)) {
      return [{ label: "My queue", value: queues.vendor }];
    }
    if (isAssetOwnerRole(user.role)) {
      return [
        { label: "Asset queue", value: queues.asset },
        { label: "Open WOs", value: queues.openWo },
      ];
    }
    return [
      { label: "Vendor queue", value: queues.vendor },
      { label: "Site queue", value: queues.site },
      { label: "Asset queue", value: queues.asset },
      { label: "Open WOs", value: queues.openWo },
    ];
  }, [user.role, queues]);

  const browseTabs = useMemo(() => {
    if (limitedDesk) {
      return [
        { id: "attention" as const, label: "Needs you" },
        { id: "workspace" as const, label: "My modules" },
      ];
    }
    return [
      { id: "attention" as const, label: "Needs you" },
      { id: "workspace" as const, label: "Workspace" },
      { id: "modules" as const, label: "All modules" },
    ];
  }, [limitedDesk]);

  const safeTab: HomeTab =
    limitedDesk && tab === "modules" ? "workspace" : tab;

  const hasChartData =
    woStatusChart.some((d) => d.count > 0) || ticketQueueChart.length > 0;

  return (
    <PageContainer className="max-w-none gap-6 xl:max-w-[90rem]">
      <section className="space-y-3 border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="cf-eyebrow">Action center</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              {workspaceName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Hi {firstName} · what needs attention, then where things stand
              {orgName ? ` · ${orgName}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canChooseWorkspace(user.role, programs.length) ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={SELECT_WORKSPACE_PATH}>Switch workspace</Link>
              </Button>
            ) : null}
            <Button size="sm" asChild>
              <Link href={attention[0]?.href || CROPFORT_ROUTES.fieldTickets}>
                {attention[0]?.title || "Open queue"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Needs your attention</h2>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {browseTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-xs font-medium transition-colors",
                  safeTab === t.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {safeTab !== "attention" ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules…"
              className="h-9 pl-9"
              aria-label="Search modules"
            />
          </div>
        ) : null}
        {safeTab === "attention" ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attention.map((item) => (
              <li key={item.href + item.title}>
                <AttentionCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredModules.length === 0 ? (
              <li className="col-span-full rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
                No modules match “{query}”.
              </li>
            ) : (
              filteredModules.map((area) => (
                <li key={area.id}>
                  <ModuleTile area={area} />
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Current position</h2>
        <div
          className={cn(
            "grid gap-3",
            kpiStrip.length === 1
              ? "grid-cols-1 sm:grid-cols-2 sm:max-w-md"
              : kpiStrip.length === 2
                ? "grid-cols-2 sm:max-w-lg"
                : "grid-cols-2 sm:grid-cols-4",
          )}
        >
          {kpiStrip.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              <p className="cf-numeric mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Operational progress</h2>
              <p className="text-xs text-muted-foreground">Live work orders and ticket queues</p>
            </div>
            {isLoading ? (
              <span className="text-[11px] text-muted-foreground">Loading…</span>
            ) : null}
          </div>

          {!hasChartData ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No execution data yet for this workspace.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Work orders by status
                </p>
                <ChartContainer config={WO_CHART_CONFIG} className="aspect-[4/3] w-full">
                  <BarChart data={woStatusChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="status"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={11}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      fontSize={11}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Ticket queue mix
                </p>
                {ticketQueueChart.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No open tickets</p>
                ) : (
                  <ChartContainer config={QUEUE_CHART_CONFIG} className="aspect-[4/3] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie
                        data={ticketQueueChart}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={2}
                      >
                        {ticketQueueChart.map((entry, i) => (
                          <Cell key={entry.key} fill={QUEUE_COLORS[i % QUEUE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex max-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <p className="text-xs text-muted-foreground">Tickets, AFEs, plans, and DFRs</p>
            </div>
            <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
              <Link href={CROPFORT_ROUTES.auditTrail}>Audit</Link>
            </Button>
          </div>
          {activityFeed.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {isLoading ? "Loading activity…" : "No recent activity yet."}
            </p>
          ) : (
            <>
              <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {visibleActivity.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          item.tone === "warning" && "bg-warning",
                          item.tone === "success" && "bg-primary",
                          item.tone === "default" && "bg-muted-foreground/40",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {formatRelative(item.at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {activityHasMore ? (
                <div className="shrink-0 border-t border-border px-4 py-2.5 sm:px-5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-full text-xs"
                    onClick={() => setActivityExpanded((v) => !v)}
                  >
                    {activityExpanded
                      ? "Show less"
                      : `See more (${activityFeed.length - ACTIVITY_PREVIEW} more)`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </PageContainer>
  );
}
