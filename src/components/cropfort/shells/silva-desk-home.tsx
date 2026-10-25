"use client";

import { ArrowRight, CheckCircle2, ClipboardCheck, Leaf, WalletCards } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  AttentionItem,
  AttentionPanel,
} from "@/components/cropfort/attention-panel";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { useInterventions } from "@/lib/query/hooks/use-interventions";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { useProjects } from "@/lib/query/hooks/use-projects";
import { useSettlements } from "@/lib/query/hooks/use-payment-requests";
import { useWeeklyPlans } from "@/lib/query/hooks/use-weekly-plans";
import { fmtEtb } from "@/store/cropfortOpsStore";

type Decision = {
  id: string;
  title: string;
  meta: string;
  detail?: string;
};

function OwnerMetric({
  href,
  label,
  value,
  icon: Icon,
  emphasis = false,
}: {
  href: string;
  label: string;
  value: string;
  icon: typeof ClipboardCheck;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </span>
      <span className={`cf-numeric mt-4 block truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${emphasis ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
      <span className="mt-3 flex items-center justify-end text-primary opacity-70 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100">
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

/** Asset owner home — short header, clear position, attention only when needed. */
export function SilvaDeskHome() {
  const { activeProgram, user } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);

  const afesQuery = useAfes(enabled, "submitted");
  const afpQuery = useProgrammePlans(enabled, { status: "submitted" });
  const projectsQuery = useProjects(enabled, "submitted");
  const interventionsQuery = useInterventions(enabled, "submitted");
  const monthlyQuery = useMonthlyWorkOrders(enabled, "submitted");
  const weeklyQuery = useWeeklyPlans(enabled, "submitted");
  const settlementsQuery = useSettlements(enabled);

  const decisions = useMemo(() => {
    const rows: Decision[] = [];
    for (const p of afpQuery.data || []) {
      const included = Object.values(p.activities ?? {}).filter((a) => a.included).length;
      rows.push({
        id: `afp-${p.id}`,
        title: p.farmName ? `${p.farmName} Core Operations` : p.name || "Core Operations plan",
        meta: [p.budgetYearLabel, p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : null]
          .filter(Boolean)
          .join(" · "),
        detail: [
          typeof p.plannedCostEtb === "number" ? fmtEtb(p.plannedCostEtb) : null,
          included ? `${included} activities` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
    for (const a of afesQuery.data || []) {
      rows.push({
        id: `afe-${a.id}`,
        title: a.title,
        meta: `Band ${a.band}`,
        detail: fmtEtb(a.amountEtb),
      });
    }
    for (const p of projectsQuery.data || []) {
      rows.push({
        id: `proj-${p.id}`,
        title: p.title,
        meta: p.code,
      });
    }
    for (const i of interventionsQuery.data || []) {
      rows.push({
        id: `int-${i.id}`,
        title: i.title,
        meta: i.code,
      });
    }
    for (const o of monthlyQuery.data || []) {
      rows.push({
        id: `mo-${o.id}`,
        title: o.code,
        meta: o.farmName || "Estate",
      });
    }
    for (const w of weeklyQuery.data || []) {
      rows.push({
        id: `wk-${w.id}`,
        title: w.code,
        meta: w.weekLabel || "Week",
      });
    }
    return rows;
  }, [
    afpQuery.data,
    afesQuery.data,
    projectsQuery.data,
    interventionsQuery.data,
    monthlyQuery.data,
    weeklyQuery.data,
  ]);

  const settlementSnap = useMemo(() => {
    const rows = settlementsQuery.data || [];
    const authorized = rows.filter((r) => r.status === "authorized");
    const settled = rows.filter((r) => r.status === "settled");
    return {
      readyCount: authorized.length,
      readyValue: authorized.reduce((s, r) => s + (r.amountEtb || 0), 0),
      settledCount: settled.length,
      settledValue: settled.reduce((s, r) => s + (r.amountEtb || 0), 0),
    };
  }, [settlementsQuery.data]);

  const approvalsAwaiting = decisions.length;
  const loading =
    afesQuery.isLoading ||
    afpQuery.isLoading ||
    projectsQuery.isLoading ||
    interventionsQuery.isLoading ||
    monthlyQuery.isLoading ||
    weeklyQuery.isLoading ||
    settlementsQuery.isLoading;
  const hasError =
    afesQuery.isError ||
    afpQuery.isError ||
    projectsQuery.isError ||
    interventionsQuery.isError ||
    monthlyQuery.isError ||
    weeklyQuery.isError ||
    settlementsQuery.isError;
  const dataReady = enabled && !loading && !hasError;

  return (
    <div className="cf-page space-y-6">
      <header className="relative isolate flex min-h-32 items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-green-500 px-5 py-6 text-white shadow-sm sm:px-7">
        <span className="pointer-events-none absolute -right-8 -top-14 -z-10 size-48 rounded-full border-[22px] border-white/10" aria-hidden />
        <span className="pointer-events-none absolute -bottom-24 right-24 -z-10 size-40 rounded-full bg-white/[0.07]" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {user.name.trim().split(/\s+/)[0] || "there"}
        </h1>
        <span className="mr-2 hidden size-14 items-center justify-center rounded-2xl bg-white/15 text-white sm:flex">
          <Leaf className="size-7" aria-hidden />
        </span>
      </header>

      <AttentionPanel
        title="Items for your review"
        actionHref={CROPFORT_ROUTES.approvals}
        actionLabel="View all"
        empty={
          !enabled
            ? "Select an estate to see items waiting for your review."
            : loading
              ? "Checking for items that need your review…"
              : hasError
                ? "Review items could not be loaded. Please try again shortly."
                : "You're all caught up. New submissions will appear here."
        }
      >
        {decisions.slice(0, 5).map((row) => (
          <AttentionItem
            key={row.id}
            href={CROPFORT_ROUTES.approvals}
            title={row.title}
            meta={row.meta}
            detail={row.detail}
          />
        ))}
      </AttentionPanel>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <OwnerMetric
          href={CROPFORT_ROUTES.approvals}
          label="Waiting for your review"
          value={dataReady ? String(approvalsAwaiting) : "—"}
          icon={ClipboardCheck}
          emphasis={dataReady && approvalsAwaiting > 0}
        />
        <OwnerMetric
          href={CROPFORT_ROUTES.settlements}
          label="Ready to settle"
          value={dataReady ? fmtEtb(settlementSnap.readyValue) : "—"}
          icon={WalletCards}
          emphasis={dataReady && settlementSnap.readyCount > 0}
        />
        <OwnerMetric
          href={CROPFORT_ROUTES.settlements}
          label="Paid to date"
          value={dataReady ? fmtEtb(settlementSnap.settledValue) : "—"}
          icon={CheckCircle2}
        />
      </section>
    </div>
  );
}
