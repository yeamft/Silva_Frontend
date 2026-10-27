"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Check, Lightbulb, X } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { listFarms } from "@/lib/api/benchmark-surveys";
import { listProgramRateCardProposals } from "@/lib/api/rate-card-proposals";
import { canManageOrgMap } from "@/lib/cropfortAccess";
import { useActivities } from "@/lib/query";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  hint: string;
  href: string;
  action: string;
  done: boolean;
};

type NextStep = { title: string; hint: string; href: string; action: string };

const HIDE_KEY = "cf-setup-guide-hidden";

function readHidden(programId: string) {
  try {
    return window.localStorage.getItem(`${HIDE_KEY}:${programId}`) === "1";
  } catch {
    return false;
  }
}

function writeHidden(programId: string, hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(`${HIDE_KEY}:${programId}`, "1");
    else window.localStorage.removeItem(`${HIDE_KEY}:${programId}`);
  } catch {
    /* storage unavailable — the guide simply shows again next visit */
  }
}

/**
 * Setup checklist for a new workspace, then a single "next step" prompt once it's set up.
 * Everything is derived from data the platform already has — no extra state on the server.
 */
export function SetupGuide({
  workOrderCount,
  ticketsAwaitingSiteReview,
  liveLoading,
}: {
  workOrderCount: number;
  ticketsAwaitingSiteReview: number;
  liveLoading: boolean;
}) {
  const { user, activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id ?? "";
  const enabled = Boolean(programId);

  const farmsQuery = useQuery({
    queryKey: ["farms", "dashboard-setup", programId],
    queryFn: () => listFarms(),
    enabled,
  });
  const activitiesQuery = useActivities({}, enabled);
  const rateCardsQuery = useQuery({
    queryKey: ["rate-cards", "dashboard-setup", programId],
    queryFn: () => listProgramRateCardProposals({ programWide: true }),
    enabled,
  });
  const plansQuery = useProgrammePlans(enabled, {});

  const loading =
    liveLoading ||
    farmsQuery.isLoading ||
    activitiesQuery.isLoading ||
    rateCardsQuery.isLoading ||
    plansQuery.isLoading;

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (programId) setHidden(readHidden(programId));
  }, [programId]);

  const rateCards = useMemo(() => rateCardsQuery.data ?? [], [rateCardsQuery.data]);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);

  const steps: Step[] = useMemo(() => {
    const isAdmin = canManageOrgMap(user.role);
    return [
      {
        id: "farms",
        title: "Add your farm areas",
        hint: isAdmin
          ? "Each farm area with its blocks, vendors and asset owners."
          : "A platform admin adds farm areas under Administration.",
        href: CROPFORT_ROUTES.farmAreas,
        action: "Add farm area",
        done: (farmsQuery.data?.length ?? 0) > 0,
      },
      {
        id: "activities",
        title: "Set up the activity list",
        hint: "The standard farm activities plans and rates are built from.",
        href: CROPFORT_ROUTES.activityTaxonomy,
        action: "Open activities",
        done: (activitiesQuery.data?.length ?? 0) > 0,
      },
      {
        id: "rates",
        title: "Get rate cards approved",
        hint: "Run a rate survey, create a rate card from it and submit it to the asset owner.",
        href: CROPFORT_ROUTES.rateCardProposals,
        action: "Open rate cards",
        done: rateCards.some((c) => c.status === "approved"),
      },
      {
        id: "plan",
        title: "Create a Core Operations plan",
        hint: "Pick the activities for a farm area, set quantities and schedule the months.",
        href: CROPFORT_ROUTES.programmePlans,
        action: "Create plan",
        done: plans.length > 0,
      },
      {
        id: "plan-approved",
        title: "Get the plan approved",
        hint: "Submit the plan to the asset owner for approval — no AFE needed.",
        href: CROPFORT_ROUTES.programmePlans,
        action: "Open plans",
        done: plans.some((p) => p.statusRaw === "approved" || p.statusRaw === "active"),
      },
      {
        id: "work-orders",
        title: "Issue work orders",
        hint: "On an approved plan, choose Create work orders — one per scheduled month — then activate them for vendors.",
        href: CROPFORT_ROUTES.workOrders,
        action: "Open work orders",
        done: workOrderCount > 0,
      },
    ];
  }, [user.role, farmsQuery.data, activitiesQuery.data, rateCards, plans, workOrderCount]);

  const nextStep: NextStep | null = useMemo(() => {
    const returnedPlan = plans.find((p) => p.statusRaw === "returned");
    if (returnedPlan) {
      return {
        title: `"${returnedPlan.name || "A plan"}" was returned with changes`,
        hint: "Open it to see the asset owner's comments, update it and submit again.",
        href: `${CROPFORT_ROUTES.programmePlans}/${returnedPlan.id}`,
        action: "Open plan",
      };
    }
    const returnedCards = rateCards.filter((c) => c.status === "returned").length;
    if (returnedCards) {
      return {
        title: `${returnedCards} rate card${returnedCards === 1 ? " was" : "s were"} returned`,
        hint: "Review the comments, adjust the rates and resubmit.",
        href: CROPFORT_ROUTES.rateCardProposals,
        action: "Open rate cards",
      };
    }
    const draftCards = rateCards.filter((c) => c.status === "draft").length;
    if (draftCards) {
      return {
        title: `${draftCards} draft rate card${draftCards === 1 ? "" : "s"} not yet submitted`,
        hint: "Submit them so the asset owner can approve the rates.",
        href: CROPFORT_ROUTES.rateCardProposals,
        action: "Open rate cards",
      };
    }
    const draftPlan = plans.find((p) => p.statusRaw === "draft" || p.statusRaw === "ready_for_review");
    if (draftPlan) {
      return {
        title: `Finish "${draftPlan.name || "your draft plan"}"`,
        hint: "Complete the activities and schedule, then submit it for approval.",
        href: `${CROPFORT_ROUTES.programmePlans}/${draftPlan.id}`,
        action: "Continue plan",
      };
    }
    if (ticketsAwaitingSiteReview) {
      return {
        title: `${ticketsAwaitingSiteReview} field ticket${ticketsAwaitingSiteReview === 1 ? "" : "s"} waiting for site review`,
        hint: "Check the recorded work and pass it on for validation.",
        href: CROPFORT_ROUTES.fieldTickets,
        action: "Review tickets",
      };
    }
    return null;
  }, [plans, rateCards, ticketsAwaitingSiteReview]);

  if (!enabled || loading) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const setupComplete = doneCount === steps.length;
  const current = steps.find((s) => !s.done);

  if (!setupComplete && !hidden) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        aria-labelledby="setup-guide-title"
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="setup-guide-title" className="text-base font-semibold tracking-tight">
              Get {activeProgram?.name || "your workspace"} ready
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {doneCount} of {steps.length} done · work through these in order.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-muted-foreground"
            onClick={() => {
              writeHidden(programId, true);
              setHidden(true);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" aria-hidden />
            Hide
          </Button>
        </div>

        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={doneCount}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(doneCount / steps.length) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <ol className="mt-4 space-y-1">
          {steps.map((step, index) => {
            const isCurrent = step.id === current?.id;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2.5",
                  isCurrent && "bg-primary/[0.06] ring-1 ring-primary/20",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.done
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-2 border-primary text-primary"
                        : "border border-border text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                    {step.title}
                    <span className="sr-only">{step.done ? " (done)" : isCurrent ? " (next)" : ""}</span>
                  </p>
                  {isCurrent ? <p className="mt-0.5 text-xs text-muted-foreground">{step.hint}</p> : null}
                </div>
                {isCurrent ? (
                  <Button asChild size="sm" className="shrink-0">
                    <Link href={step.href}>
                      {step.action}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                ) : !step.done ? (
                  <Link
                    href={step.href}
                    className="shrink-0 self-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Open
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      </motion.section>
    );
  }

  if (!nextStep) {
    // Setup was hidden while incomplete: offer a quiet way back to it
    return !setupComplete ? (
      <button
        type="button"
        onClick={() => {
          writeHidden(programId, false);
          setHidden(false);
        }}
        className="w-fit text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Show setup checklist ({doneCount} of {steps.length} done)
      </button>
    ) : null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-label="Next step"
      className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4 sm:flex-row sm:items-center"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Lightbulb className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next step</p>
        <p className="mt-0.5 text-sm font-semibold">{nextStep.title}</p>
        <p className="text-xs text-muted-foreground">{nextStep.hint}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={nextStep.href}>
          {nextStep.action}
          <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </motion.section>
  );
}
