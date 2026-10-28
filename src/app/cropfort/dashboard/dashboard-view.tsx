"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Plus,
  Briefcase,
  CalendarRange,
  ClipboardCheck,
  FolderKanban,
  Leaf,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { useDeskMode } from "@/components/cropfort/desk-mode";
import { VendorDeskHome } from "@/components/cropfort/shells/vendor-desk-home";
import { SilvaDeskHome } from "@/components/cropfort/shells/silva-desk-home";
import { PageContainer } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  canApproveAsAssetOwner,
  canViewRateCard,
} from "@/lib/cropfortAccess";
import { canCreateProgrammePlan } from "@/lib/cropfort/platform-access";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { cn } from "@/lib/utils";
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";
import type { CropfortRole } from "@/types/cropfort";
import { SetupGuide } from "./setup-guide";
import { AccountManagerHome } from "./account-manager-home";

type QuickLink = {
  href: string;
  title: string;
  icon: LucideIcon;
  count?: number;
};

function isVendorRole(role: CropfortRole) {
  return role === "bagro_office";
}

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function AttentionCard({ item, loading }: { item: QuickLink; loading: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex min-h-[4.5rem] items-center gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-[background-color,color,transform] duration-200 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{item.title}</span>
          {item.count != null ? (
            <span className="cf-numeric rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
              {loading ? "—" : item.count}
            </span>
          ) : null}
        </span>
      </span>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}

export default function DashboardPage() {
  const desk = useDeskMode();
  if (desk === "vendor") return <VendorDeskHome />;
  if (desk === "silva") return <SilvaDeskHome />;
  return <SpxHome />;
}

function SpxHome() {
  const { user } = useCropfortAuth();
  // The SPX Account Manager gets the one-screen cockpit
  if (user.role === "spx_validator") return <AccountManagerHome />;
  return <SpxDashboardView />;
}

function SpxDashboardView() {
  const { user, activeProgram } = useCropfortAuth();
  const canRates = canViewRateCard(user.role);
  const isOwner = canApproveAsAssetOwner(user.role);

  const { workOrders, tickets, afes, isLoading, isError } = usePerformanceLiveData(
    Boolean(activeProgram?.id),
  );

  const queues = useMemo(
    () => ({
      vendor: tickets.filter((t) => ticketWaitingOn(t.status) === "vendor").length,
      site: tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner").length,
      asset: tickets.filter((t) => ticketWaitingOn(t.status) === "asset_owner").length,
      openWo: workOrders.filter((w) => w.status !== "complete").length,
      afesPending: afes.filter((a) => a.status === "submitted").length,
    }),
    [tickets, workOrders, afes],
  );

  const workspaceName = activeProgram?.name || "Workspace";
  const today = new Date();

  const attention: QuickLink[] = useMemo(() => {
    if (isVendorRole(user.role)) {
      return [
        {
          href: CROPFORT_ROUTES.fieldTickets,
          title: "Tickets",
          icon: CalendarRange,
          count: queues.vendor,
        },
      ];
    }
    if (!canRates) {
      return [
        {
          href: CROPFORT_ROUTES.fieldTickets,
          title: "Tickets",
          icon: CalendarRange,
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
          title: "Approvals",
          icon: ClipboardCheck,
          count: queues.afesPending || undefined,
        },
        {
          href: `${CROPFORT_ROUTES.rateCardProposals}?status=submitted`,
          title: "Rates",
          icon: WalletCards,
        },
        {
          href: CROPFORT_ROUTES.fieldTickets,
          title: "Tickets",
          icon: FolderKanban,
          count: queues.asset,
        },
        {
          href: CROPFORT_ROUTES.budget,
          title: "Costs",
          icon: TrendingUp,
        },
      ];
    }
    return [
      {
        href: CROPFORT_ROUTES.farmAssessments,
        title: "Farm Assessments",
        icon: Leaf,
      },
      {
        href: CROPFORT_ROUTES.coreOperations,
        title: "Core Operations",
        icon: Briefcase,
      },
      {
        href: CROPFORT_ROUTES.monthlyWorkOrders,
        title: "Monthly work orders",
        icon: CalendarRange,
      },
      {
        href: CROPFORT_ROUTES.workOrders,
        title: "Work orders",
        icon: Wrench,
        count: queues.openWo,
      },
    ];
  }, [canRates, isOwner, queues, user.role]);

  // What's waiting on the planner, in plain words — each opens the right list
  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id) && canCreateProgrammePlan(user.role), {});
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const needsYou = [
    {
      label: "Plans to finish",
      value: plans.filter((p) => !p.statusRaw || p.statusRaw === "draft" || p.statusRaw === "ready_for_review").length,
      href: CROPFORT_ROUTES.programmePlans,
      tone: "primary" as const,
    },
    {
      label: "Returned to fix",
      value: plans.filter((p) => p.statusRaw === "returned").length,
      href: CROPFORT_ROUTES.programmePlans,
      tone: "warn" as const,
    },
    {
      label: "Waiting approval",
      value: plans.filter((p) => p.statusRaw === "submitted").length,
      href: CROPFORT_ROUTES.programmePlans,
      tone: "info" as const,
    },
    { label: "Open work orders", value: queues.openWo, href: CROPFORT_ROUTES.workOrders, tone: "primary" as const },
  ];

  return (
    <PageContainer className="gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting(today)}, {user.name.trim().split(/\s+/)[0] || "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{workspaceName}</p>
        </div>
        {canCreateProgrammePlan(user.role) ? (
          <Button asChild>
            <Link href={`${CROPFORT_ROUTES.programmePlans}/new`}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              New plan
            </Link>
          </Button>
        ) : attention[0] ? (
          <Button asChild>
            <Link href={attention[0].href}>
              Go to {attention[0].title}
              <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </header>

      {isError ? (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          Some live data couldn&apos;t be loaded. Figures may be incomplete — it will retry automatically.
        </div>
      ) : null}


      {canCreateProgrammePlan(user.role) ? (
        <DashboardSection title="Needs you">
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {needsYou.map((tile, i) => {
              const busy = tile.value > 0;
              return (
                <motion.li
                  key={tile.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 + i * 0.05 }}
                >
                  <Link
                    href={tile.href}
                    className={cn(
                      "group flex h-full flex-col justify-between rounded-2xl border p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none",
                      busy
                        ? tile.tone === "warn"
                          ? "border-amber-500/40 bg-amber-500/[0.06]"
                          : tile.tone === "info"
                            ? "border-sky-500/30 bg-sky-500/[0.05]"
                            : "border-primary/30 bg-primary/[0.04]"
                        : "border-border bg-card",
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">{tile.label}</span>
                    <span className="mt-2 flex items-end justify-between">
                      <span
                        className={cn(
                          "text-3xl font-semibold tabular-nums tracking-tight",
                          !busy && "text-muted-foreground/60",
                          busy && tile.tone === "warn" && "text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {plansQuery.isLoading || isLoading ? "—" : tile.value}
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </DashboardSection>
      ) : null}

      {/* Planners get the setup checklist, then one "next step" prompt once set up */}
      {canCreateProgrammePlan(user.role) ? (
        <SetupGuide
          workOrderCount={workOrders.length}
          ticketsAwaitingSiteReview={queues.site}
          liveLoading={isLoading}
        />
      ) : null}

      <DashboardSection title="Go to">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {attention.map((item) => (
            <li key={item.href + item.title}>
              <AttentionCard item={item} loading={isLoading} />
            </li>
          ))}
        </ul>
      </DashboardSection>
    </PageContainer>
  );
}

function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
