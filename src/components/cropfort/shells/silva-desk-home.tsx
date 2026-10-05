"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import {
  AttentionItem,
  AttentionPanel,
  DeskMetric,
} from "@/components/cropfort/attention-panel";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { useInterventions } from "@/lib/query/hooks/use-interventions";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { useProjects } from "@/lib/query/hooks/use-projects";
import { useSettlements } from "@/lib/query/hooks/use-payment-requests";
import { useWeeklyPlans } from "@/lib/query/hooks/use-weekly-plans";
import { mapTicketDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";
import { fmtEtb, ticketWaitingOn } from "@/store/cropfortOpsStore";

type Decision = {
  id: string;
  kind: string;
  title: string;
  meta: string;
  detail?: string;
};

/** Asset owner home — short header, clear position, attention only when needed. */
export function SilvaDeskHome() {
  const { user, activeProgram } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);

  const woQuery = useWorkOrders(enabled);
  const afesQuery = useAfes(enabled, "submitted");
  const afpQuery = useProgrammePlans(enabled, { status: "submitted" });
  const projectsQuery = useProjects(enabled, "submitted");
  const interventionsQuery = useInterventions(enabled, "submitted");
  const monthlyQuery = useMonthlyWorkOrders(enabled, "submitted");
  const weeklyQuery = useWeeklyPlans(enabled, "submitted");
  const settlementsQuery = useSettlements(enabled);

  const signOffs = useMemo(() => {
    const tickets = (woQuery.data || []).flatMap((wo) =>
      (wo.tickets || []).map((t) => mapTicketDto(t, wo)),
    );
    return tickets.filter((t) => ticketWaitingOn(t.status) === "asset_owner");
  }, [woQuery.data]);

  const decisions = useMemo(() => {
    const rows: Decision[] = [];
    for (const p of afpQuery.data || []) {
      const included = Object.values(p.activities ?? {}).filter((a) => a.included).length;
      rows.push({
        id: `afp-${p.id}`,
        kind: "Programme plan",
        title: p.farmName ? `${p.farmName} programme` : p.name || "Programme plan",
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
        kind: "AFE",
        title: a.title,
        meta: `Band ${a.band}`,
        detail: fmtEtb(a.amountEtb),
      });
    }
    for (const p of projectsQuery.data || []) {
      rows.push({
        id: `proj-${p.id}`,
        kind: "Project",
        title: p.title,
        meta: p.code,
      });
    }
    for (const i of interventionsQuery.data || []) {
      rows.push({
        id: `int-${i.id}`,
        kind: "Intervention",
        title: i.title,
        meta: i.code,
      });
    }
    for (const o of monthlyQuery.data || []) {
      rows.push({
        id: `mo-${o.id}`,
        kind: "Monthly work order",
        title: o.code,
        meta: o.farmName || "Estate",
      });
    }
    for (const w of weeklyQuery.data || []) {
      rows.push({
        id: `wk-${w.id}`,
        kind: "Weekly plan",
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

  const firstName = user.name.split(" ")[0] || user.name;
  const estate = activeProgram?.name || "Your estate";
  const approvalsAwaiting = decisions.length;
  const loading =
    afesQuery.isLoading ||
    afpQuery.isLoading ||
    projectsQuery.isLoading ||
    interventionsQuery.isLoading ||
    monthlyQuery.isLoading ||
    weeklyQuery.isLoading ||
    woQuery.isLoading;

  const attentionCount = approvalsAwaiting + signOffs.length;
  const hasAttention = !loading && attentionCount > 0;
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="cf-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{estate}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {hello}, {firstName}
          </h1>
        </div>
        {!loading ? (
          hasAttention ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {attentionCount} to review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              All clear
            </span>
          )
        ) : null}
      </header>

      {hasAttention ? (
        <AttentionPanel
          title="Needs review"
          actionHref={CROPFORT_ROUTES.approvals}
          actionLabel="View all"
        >
          {decisions.slice(0, 5).map((row) => (
            <AttentionItem
              key={row.id}
              href={CROPFORT_ROUTES.approvals}
              eyebrow={row.kind}
              title={row.title}
              meta={row.meta}
              detail={row.detail}
              cta="Review"
            />
          ))}
          {signOffs.slice(0, 4).map((t) => (
            <AttentionItem
              key={t.id}
              href={`${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`}
              eyebrow="Field sign-off"
              title={t.code}
              meta={[t.title || t.description || "Field ticket", t.block]
                .filter(Boolean)
                .join(" · ")}
              cta="Review"
            />
          ))}
        </AttentionPanel>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DeskMetric
          href={CROPFORT_ROUTES.approvals}
          label="Approvals"
          value={loading ? "—" : String(approvalsAwaiting)}
          emphasis={!loading && approvalsAwaiting > 0}
        />
        <DeskMetric
          href={CROPFORT_ROUTES.fieldTickets}
          label="Sign-offs"
          value={loading ? "—" : String(signOffs.length)}
          emphasis={!loading && signOffs.length > 0}
        />
        <DeskMetric
          href={CROPFORT_ROUTES.settlements}
          label="To settle"
          value={loading ? "—" : fmtEtb(settlementSnap.readyValue)}
          hint={
            settlementSnap.readyCount > 0
              ? `${settlementSnap.readyCount} ready`
              : undefined
          }
          emphasis={!loading && settlementSnap.readyCount > 0}
        />
        <DeskMetric
          href={CROPFORT_ROUTES.settlements}
          label="Settled"
          value={loading ? "—" : fmtEtb(settlementSnap.settledValue)}
          hint={
            settlementSnap.settledCount > 0
              ? `${settlementSnap.settledCount} paid`
              : undefined
          }
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={CROPFORT_ROUTES.approvals}>
            Approvals
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={CROPFORT_ROUTES.settlements}>
            Settlements
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={CROPFORT_ROUTES.reports}>
            Reports
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
