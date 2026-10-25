"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
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
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";
import type { CropfortRole } from "@/types/cropfort";

type QuickLink = {
  href: string;
  title: string;
  icon: LucideIcon;
  count?: number;
};

function isVendorRole(role: CropfortRole) {
  return role === "bagro_office";
}

function AttentionCard({ item, loading }: { item: QuickLink; loading: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex min-h-[5.5rem] items-center gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
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
  return <SpxDashboardView />;
}

function SpxDashboardView() {
  const { user, activeProgram } = useCropfortAuth();
  const canRates = canViewRateCard(user.role);
  const isOwner = canApproveAsAssetOwner(user.role);

  const { workOrders, tickets, afes, isLoading } = usePerformanceLiveData(
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
        href: CROPFORT_ROUTES.coreOperations,
        title: "Core Operations",
        icon: Briefcase,
      },
      {
        href: CROPFORT_ROUTES.fieldTickets,
        title: "Tickets",
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
        title: "AFEs",
        icon: WalletCards,
        count: queues.afesPending,
      },
    ];a
  }, [canRates, isOwner, queues, user.role]);

  return (
    <PageContainer className="gap-5">
      <section className="relative isolate overflow-hidden rounded-xl bg-primary px-5 py-5 text-primary-foreground shadow-sm sm:px-6 sm:py-6">
        <div className="absolute -right-10 -top-16 -z-10 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-24 right-28 -z-10 h-44 w-44 rounded-full border-[24px] border-white/10" aria-hidden />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {user.name.trim().split(/\s+/)[0] || "there"}
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/80 sm:text-base">
              {workspaceName} · Your work, all in one place.
            </p>
          </div>
          {attention[0] ? (
            <Button
              variant="secondary"
              className="w-full justify-between gap-4 rounded-lg sm:w-auto"
              asChild
            >
              <Link href={attention[0].href}>
                Go to {attention[0].title}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Your shortcuts</h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {attention.map((item) => (
            <li key={item.href + item.title}>
              <AttentionCard item={item} loading={isLoading} />
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
