"use client";

import { ArrowRight, ClipboardCheck, Leaf, WalletCards } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { listProgramRateCardProposals } from "@/lib/api/rate-card-proposals";
import { useQuery } from "@tanstack/react-query";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { listFarmAssessments } from "@/lib/api/farm-assessments";
import { fmtEtb } from "@/lib/cropfort/planning-helpers";

type Decision = {
  id: string;
  title: string;
  meta: string;
  detail?: string;
  href?: string;
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
    <Card className="group transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <Link
        href={href}
        className="flex min-h-[5.5rem] items-center gap-3 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
          <span className={`cf-numeric mt-1 block truncate text-xl font-semibold tracking-tight tabular-nums ${emphasis ? "text-primary" : "text-foreground"}`}>
            {value}
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary opacity-70 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
      </Link>
    </Card>
  );
}

/** Asset owner home — farm assessments, approvals, settlements. */
export function SilvaDeskHome() {
  const { activeProgram, user } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);

  const rateCardsQuery = useQuery({
    queryKey: ["approval-rate-cards", activeProgram?.id],
    queryFn: () => listProgramRateCardProposals({ status: "submitted", programWide: true }),
    enabled,
    refetchInterval: 10_000,
  });
  const afesQuery = useAfes(enabled, "submitted");
  const afpQuery = useProgrammePlans(enabled, { status: "submitted" });
  const assessmentsQuery = useQuery({
    queryKey: ["farm-assessments-owner", activeProgram?.id],
    queryFn: () => listFarmAssessments({ status: "submitted" }),
    enabled,
    refetchInterval: 15_000,
  });

  const decisions = useMemo(() => {
    const rows: Decision[] = [];

    for (const a of assessmentsQuery.data || []) {
      rows.push({
        id: `fa-${a.id}`,
        title: a.title || "Farm Assessment",
        meta: [a.farmName, a.cycleLabel].filter(Boolean).join(" · "),
        href: `${CROPFORT_ROUTES.farmAssessments}/${a.id}`,
      });
    }
    for (const p of afpQuery.data || []) {
      rows.push({
        id: `afp-${p.id}`,
        title: p.farmName ? `${p.farmName} Core Operations` : p.name || "Core Operations plan",
        meta: p.budgetYearLabel || "",
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
    for (const card of rateCardsQuery.data || []) {
      rows.push({
        id: `rate-card-${card.id}`,
        title: card.activityName || card.activityCode || "Rate card",
        meta: [card.kind, card.farmEstateName].filter(Boolean).join(" · "),
        detail: fmtEtb(card.proposedRate),
        href: `${CROPFORT_ROUTES.rateCardProposals}/${card.id}`,
      });
    }
    return rows;
  }, [assessmentsQuery.data, afpQuery.data, afesQuery.data, rateCardsQuery.data]);

const isLoading =
  afesQuery.isLoading ||
  rateCardsQuery.isLoading ||
  afpQuery.isLoading ||
  assessmentsQuery.isLoading;
  const hasError =
    afesQuery.isError || rateCardsQuery.isError || afpQuery.isError || assessmentsQuery.isError;
  const approvalsReady = enabled && !isLoading && !hasError;

  return (
    <div className="cf-page space-y-6">
      <Card className="relative isolate flex min-h-32 items-center justify-between overflow-hidden border-primary/20 bg-gradient-to-br from-emerald-700 via-emerald-600 to-green-500 text-primary-foreground shadow-sm">
        <span className="pointer-events-none absolute -right-8 -top-14 -z-10 size-48 rounded-full border-[22px] border-white/10" aria-hidden />
        <span className="pointer-events-none absolute -bottom-24 right-24 size-40 rounded-full bg-white/[0.07]" aria-hidden />
        <CardContent className="flex w-full items-center justify-between gap-4 px-5 py-6 sm:px-7">
          <div className="space-y-1">
            <CardDescription className="text-xs font-medium text-primary-foreground/80">
              Asset owner
            </CardDescription>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome back, {user.name.trim().split(/\s+/)[0] || "there"}
            </h1>
          </div>
          <span className="mr-2 hidden size-14 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white sm:flex">
            <Leaf className="size-7" aria-hidden />
          </span>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-3">
        <OwnerMetric
          href={CROPFORT_ROUTES.farmAssessments}
          label="Farm assessments awaiting review"
          value={approvalsReady ? String(assessmentsQuery.data?.length ?? 0) : "—"}
          icon={Leaf}
          emphasis={approvalsReady && (assessmentsQuery.data?.length ?? 0) > 0}
        />
        <OwnerMetric
          href={CROPFORT_ROUTES.approvals}
          label="Approvals pending"
          value={approvalsReady ? String(decisions.filter((d) => !d.id.startsWith("fa-")).length) : "—"}
          icon={ClipboardCheck}
          emphasis={approvalsReady && decisions.filter((d) => !d.id.startsWith("fa-")).length > 0}
        />
        <OwnerMetric
          href={CROPFORT_ROUTES.coreOperations}
          label="Core Operations"
          value={approvalsReady ? String(afpQuery.data?.length ?? 0) : "—"}
          icon={WalletCards}
        />
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Items for your review</CardTitle>
            <CardDescription>Submissions waiting for an asset-owner decision.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={CROPFORT_ROUTES.approvals}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {decisions.length > 0 ? (
            <ul className="space-y-3">
              {decisions.slice(0, 5).map((row) => (
                <li key={row.id}>
                  <Card className="transition-colors hover:border-primary/30 hover:bg-muted/20">
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="truncate text-sm">{row.title}</CardTitle>
                        {row.meta ? <CardDescription>{row.meta}</CardDescription> : null}
                        {row.detail ? <CardDescription>{row.detail}</CardDescription> : null}
                      </div>
                      <Button asChild variant="link" size="sm" className="shrink-0">
                        <Link href={row.href || CROPFORT_ROUTES.approvals}>
                          Review <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Alert className="justify-center border-dashed py-8 text-center">
              <AlertDescription>
                {!enabled
                  ? "Select an estate to see items waiting for your review."
                  : isLoading
                    ? "Checking for items that need your review…"
                    : hasError
                      ? "Review items could not be loaded. Please try again shortly."
                      : "You're all caught up. New submissions will appear here."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
