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
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { PageContainer } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CROPFORT_AREAS, type CropfortAreaDef } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { getWorkspacesForRole } from "@/config/cropfort-workspaces";
import { SELECT_WORKSPACE_PATH } from "@/lib/workspace-gate";
import {
  canApproveAsAssetOwner,
  canProposeRateCard,
  canViewRateCard,
} from "@/lib/cropfortAccess";
import { cn } from "@/lib/utils";
import { ticketWaitingOn, useCropfortOpsStore } from "@/store/cropfortOpsStore";
import { CROPFORT_ROLE_LABELS, type CropfortRole } from "@/types/cropfort";

type HomeTab = "attention" | "workspace" | "modules";

type QuickLink = {
  href: string;
  title: string;
  icon: LucideIcon;
  emphasis?: boolean;
  count?: number;
};

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
  const { user, activeProgram, tenant } = useCropfortAuth();
  const firstName = user.name.split(" ")[0];
  const canRates = canViewRateCard(user.role);
  const isSpx = canProposeRateCard(user.role);
  const isOwner = canApproveAsAssetOwner(user.role);

  const [tab, setTab] = useState<HomeTab>("attention");
  const [query, setQuery] = useState("");

  const tickets = useCropfortOpsStore((s) => s.tickets);
  const workOrders = useCropfortOpsStore((s) => s.workOrders);
  const projects = useCropfortOpsStore((s) => s.projects);

  const queues = useMemo(
    () => ({
      vendor: tickets.filter((t) => ticketWaitingOn(t.status) === "vendor").length,
      site: tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner").length,
      asset: tickets.filter((t) => ticketWaitingOn(t.status) === "asset_owner").length,
      openWo: workOrders.filter((w) => w.status !== "complete").length,
      projects: projects.filter((p) => p.status !== "complete").length,
    }),
    [tickets, workOrders, projects],
  );

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
        href: CROPFORT_ROUTES.benchmarkSurveys,
        title: "Benchmark surveys",
        icon: WalletCards,
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

  const quickStarts = useMemo(() => {
    if (isVendorRole(user.role)) {
      return [
        { href: CROPFORT_ROUTES.fieldTickets, label: "Tickets", icon: CalendarRange },
        { href: CROPFORT_ROUTES.communications, label: "Messages", icon: MessageSquare },
      ];
    }
    if (isAssetOwnerRole(user.role)) {
      return [
        { href: CROPFORT_ROUTES.approvals, label: "Approvals", icon: ClipboardCheck },
        { href: CROPFORT_ROUTES.fieldTickets, label: "Tickets", icon: CalendarRange },
        { href: CROPFORT_ROUTES.budget, label: "Costs", icon: TrendingUp },
        { href: CROPFORT_ROUTES.rateCardProposals, label: "Rates", icon: WalletCards },
        { href: CROPFORT_ROUTES.progress, label: "Progress", icon: TrendingUp },
      ];
    }
    return [
      { href: CROPFORT_ROUTES.coreOperations, label: "Plan", icon: Briefcase },
      { href: CROPFORT_ROUTES.approvals, label: "Commit", icon: ClipboardCheck },
      { href: CROPFORT_ROUTES.workOrders, label: "Execute", icon: Wrench },
      { href: CROPFORT_ROUTES.fieldTickets, label: "Tickets", icon: CalendarRange },
      { href: CROPFORT_ROUTES.farmAreas, label: "Farm Areas", icon: Network },
      ...(isSpx || isOwner
        ? [{ href: CROPFORT_ROUTES.rateCardProposals, label: "Rates", icon: WalletCards }]
        : []),
    ];
  }, [user.role, isSpx, isOwner]);

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

  // Keep vendor/asset owner off the "all modules" tab if it was somehow selected.
  const safeTab: HomeTab =
    limitedDesk && tab === "modules" ? "workspace" : tab;
  return (
    <PageContainer className="max-w-none gap-6 xl:max-w-[90rem]">
      {/* Workspace masthead */}
      <section className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="cf-eyebrow">Overview</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              {workspaceName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Hi {firstName} · {CROPFORT_ROLE_LABELS[user.role]}
              {orgName ? ` · ${orgName}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={SELECT_WORKSPACE_PATH}>Switch workspace</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={CROPFORT_ROUTES.fieldTickets}>
                {isVendorRole(user.role) ? "My tickets" : "Open tickets"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {quickStarts.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href + q.label}
                href={q.href}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {q.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live strip */}
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
            className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs"
          >
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            <p className="cf-numeric mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {browseTabs.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={safeTab === t.id ? "secondary" : "ghost"}
              className="h-8"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
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
      </div>

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
    </PageContainer>
  );
}
