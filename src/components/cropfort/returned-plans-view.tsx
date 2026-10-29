"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { fmtEtb } from "@/store/cropfortOpsStore";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

/** Plans the asset owner sent back. Each opens its own fix page — never the full planner. */
export default function ReturnedPlansView() {
  const router = useRouter();
  const { activeProgram } = useCropfortAuth();
  const query = useProgrammePlans(Boolean(activeProgram?.id), { status: "returned" });
  const plans = query.data ?? [];
  const fixHref = (id: string) => `${CROPFORT_ROUTES.programmePlans}/${id}/fix`;

  return (
    <PageContainer className="cf-page-centered">
      <PageHeader
        title="Returned to fix"
        breadcrumbs={[{ label: "Plans", href: CROPFORT_ROUTES.programmePlans }, { label: "Returned to fix" }]}
      />

      <SectionCard flush>
        {query.isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold">Nothing to fix</p>
            <Link href={CROPFORT_ROUTES.programmePlans} className="text-sm font-medium text-primary hover:underline">
              Back to plans
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {plans.map((p) => {
              const flagged = p.returnedLineIds?.length ?? 0;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => router.push(fixHref(p.id))}
                    className="group flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400" aria-hidden>
                      <RotateCcw className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-semibold">{p.name || "Untitled plan"}</span>
                        {flagged ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            {flagged} to remove
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {[p.farmName, p.budgetYearLabel, fmtEtb(p.plannedCostEtb ?? 0), fmtDate(p.reviewedAt) ? `Returned ${fmtDate(p.reviewedAt)}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {p.returnedComment ? (
                        <span className="mt-2 line-clamp-2 block rounded-lg bg-amber-500/[0.07] px-3 py-2 text-sm">
                          {p.returnedComment}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      Fix
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
